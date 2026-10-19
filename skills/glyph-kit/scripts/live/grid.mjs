// Moving diagrams: a character grid that animates. No DOM, no dependencies.
//
// Two layers. The structure (boxes, lines, labels, meters) sits on the grid and changes in steps.
// Everything that travels (work, cursors, moving boxes) is deposited as light at fractional
// positions and turned into · ░ ▒ ▓ when the grid is written out, so it glides smoothly while every
// mark stays a character.
//   - packet / stream: ▓▒░ heads glide along a route, round corners included
//   - flash:    a box that receives work lights its border ▓ → ▒ → ░ → line
//   - chase:    a waiting box has a ▓▒░ run going round its border
//   - scramble: changed text settles left to right through " .:+*#%@"
//   - drawIn / dissolveLine: lines appear cell by cell, or break up ▓ → ▒ → ░ → ·
//
// Sizes and the density ladder come from ../layout.mjs: boxes fit their text with LAYOUT.pad cells
// each side, and ▓ is kept for what is current, measured or done.
//
// A diagram is a function (step, frac) → Grid. step is a whole tick (STEP_MS each), frac the
// fraction of the next one; structure reads step, anything gliding reads step + frac.

export const STEP_MS = 120;
export const TRAIL = ["▓", "▒", "░"];
export const FADE = ["▓", "▒", "░", "·"];
const RAMP = " .:+*#%@";
const HEADS = { right: "►", left: "◄", down: "▼", up: "▲" };
import { LAYOUT, fit } from "../layout.mjs";

export { LAYOUT, fit };
const esc = (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c);

/** A seeded random number generator, so every run of a diagram is the same. */
export const rand = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const hash = (a, b) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const quant = (v, n) => Math.round(v * n) / n;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const mod = (v, n) => ((v % n) + n) % n;
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Remembers when a value last changed, so text can scramble only when it changes. */
export const changes = () => {
  const seen = new Map();
  return (key, value, step) => {
    const prev = seen.get(key);
    if (!prev || prev.value !== value) seen.set(key, { value, at: prev ? step : -99 });
    return step - seen.get(key).at;
  };
};

export class Grid {
  /** While true, scrambled text shows settled: for stills, print and Markdown. */
  static settled = false;
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.ch = Array.from({ length: rows }, () => Array(cols).fill(" "));
    this.cl = Array.from({ length: rows }, () => Array(cols).fill(""));
    this.lum = new Map();
  }
  get(r, c) { return this.ch[r]?.[c]; }
  put(r, c, ch, cls = "") {
    if (this.ch[r]?.[c] === undefined) return;
    this.ch[r][c] = ch;
    this.cl[r][c] = cls;
  }
  // Light a cell with an intensity (0–1). The strongest light on a cell wins.
  deposit(r, c, v, cls = "") {
    if (this.ch[r]?.[c] === undefined || v <= 0) return;
    const key = r * this.cols + c;
    const prev = this.lum.get(key);
    if (!prev || v > prev.v) this.lum.set(key, { v, cls });
  }
  glide(r, c, ch, cls = "") {
    const level = { "▓": 1, "▒": 0.7, "░": 0.45, "·": 0.2 }[ch];
    if (level) this.deposit(Math.round(r), Math.round(c), level, cls);
    else this.put(Math.round(r), Math.round(c), ch, cls);
  }
  text(r, c, s, cls = "") { [...s].forEach((ch, i) => this.put(r, c + i, ch, cls)); }
  /** Centre text between columns c0 and c1. */
  center(r, c0, c1, s, cls = "") { this.text(r, Math.round((c0 + c1 + 1 - s.length) / 2), s, cls); }
  /** Centred text that stays on top of anything gliding underneath it. */
  label(r, c0, c1, s, cls = "") {
    const c = Math.round((c0 + c1 + 1 - s.length) / 2);
    this.text(r, c, s, cls);
    for (let i = 0; i < s.length; i++) this.lum.delete(r * this.cols + c + i);
  }

  scramble(r, c, s, age, step, cls = "") {
    if (Grid.settled) age = Infinity;
    const frame = Math.floor(step);
    [...s].forEach((ch, i) => {
      const settled = age >= i * 0.25 + 2;
      const glyph = settled || ch === " " ? ch : RAMP[1 + Math.floor(hash(frame, i + r * 7) * (RAMP.length - 1))];
      this.put(r, c + i, glyph, cls);
    });
  }

  boxLines(w, label, style = "solid") {
    const inner = w - 2;
    const left = Math.floor((inner - label.length) / 2);
    const h = style === "dotted" ? "┄" : "─";
    const v = style === "dotted" ? "┆" : "│";
    const mid = `${v}${" ".repeat(Math.max(0, left))}${label}${" ".repeat(Math.max(0, inner - left - label.length))}${v}`;
    return [`┌${h.repeat(inner)}┐`, mid, `└${h.repeat(inner)}┘`];
  }
  box(r, c, w, label, cls = "", style = "solid") {
    this.boxLines(w, label, style).forEach((line, i) => this.text(r + i, c, line, cls));
  }
  /** A box with changing text in it (a counter), centred with equal padding. Size it with fit() on
   *  the longest text it will hold. */
  counter(r, c, w, text, cls = "", { age = Infinity, step = 0, style = "solid" } = {}) {
    this.box(r, c, w, "", cls, style);
    this.scramble(r + 1, c + 1 + Math.floor((w - 2 - [...text].length) / 2), text, age, step, cls);
  }
  glideBox(r, c, w, label, cls = "") { this.box(Math.round(r), Math.round(c), w, label, cls); }
  perimeter(r, c, w, h = 3) {
    const cells = [];
    for (let x = c; x < c + w; x++) cells.push([r, x]);
    for (let y = r + 1; y < r + h; y++) cells.push([y, c + w - 1]);
    for (let x = c + w - 2; x >= c; x--) cells.push([r + h - 1, x]);
    for (let y = r + h - 2; y > r; y--) cells.push([y, c]);
    return cells;
  }
  flash(r, c, w, level, cls = "") {
    const lv = Math.ceil(level);
    if (lv <= 0) return;
    const ch = TRAIL[3 - Math.min(3, lv)];
    this.perimeter(r, c, w).forEach(([y, x]) => this.put(y, x, ch, cls));
  }
  // A comet of light: a soft leading edge, a full head and a tail that fades over `tail` cells.
  comet(cells, f, cls = "", tail = 3.2, wrap = false) {
    const n = cells.length;
    for (let x = Math.floor(f - tail) - 1; x <= Math.ceil(f); x++) {
      const d = f - x;
      const v = d < 0 ? 1 + d : clamp(1 - d / tail);
      const cell = wrap ? cells[mod(x, n)] : cells[x];
      if (cell) this.deposit(cell[0], cell[1], v, cls);
    }
  }
  chase(r, c, w, pos, cls = "") { this.comet(this.perimeter(r, c, w), pos, cls, 4, true); }
  drawIn(r, c, w, label, progress, cls = "") {
    const cells = this.perimeter(r, c, w);
    const lines = this.boxLines(w, label);
    const n = Math.floor(progress * cells.length);
    cells.forEach(([y, x], i) => {
      if (i < n) this.put(y, x, lines[y - r][x - c], cls);
      else if (i < n + 3) this.put(y, x, TRAIL[i - n], cls);
    });
    if (progress >= 1) this.text(r + 1, c + 1, lines[1].slice(1, -1), cls);
  }
  meter(r, c, w, value, step, cls = "") {
    const full = value * w;
    const lead = Math.floor(full);
    for (let i = 0; i < w; i++) {
      const v = full - i;
      let ch = v >= 1 ? "▓" : v >= 0.66 ? "▒" : v >= 0.33 ? "░" : "·";
      if (i === lead && value > 0 && value < 1) ch = Math.floor(step * 2) % 2 ? "▒" : "░";
      this.put(r, c + i, ch, v > 0.33 || (i === lead && value > 0) ? cls : "mute");
    }
  }

  route(points) {
    const cells = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const [r1, c1] = points[i];
      let [r, c] = cells[cells.length - 1];
      while (r !== r1 || c !== c1) {
        r += Math.sign(r1 - r);
        c += Math.sign(c1 - c);
        cells.push([r, c]);
      }
    }
    return cells;
  }
  glyphs(cells, head = true) {
    const side = (a, b) => (b[0] < a[0] ? "up" : b[0] > a[0] ? "down" : b[1] < a[1] ? "left" : "right");
    return cells.map((cell, i) => {
      const prev = cells[i - 1];
      const next = cells[i + 1];
      if (!next) return head ? HEADS[side(prev, cell)] : cell[1] === prev[1] ? "│" : "─";
      if (!prev || side(prev, cell) === side(cell, next)) return cell[1] === next[1] ? "│" : "─";
      const ends = new Set([side(cell, prev), side(cell, next)]);
      return ends.has("up") ? (ends.has("right") ? "└" : "┘") : ends.has("right") ? "┌" : "┐";
    });
  }
  line(points, cls = "", { head = true, progress = 1 } = {}) {
    const cells = this.route(points);
    const glyphs = this.glyphs(cells, head);
    const n = Math.round(progress * cells.length);
    cells.forEach(([r, c], i) => {
      if (i < n) this.put(r, c, glyphs[i], cls);
      else if (i < n + 2 && progress < 1) this.put(r, c, TRAIL[i - n + 1], cls);
    });
    return head ? cells.slice(0, -1) : cells;
  }
  dissolveLine(points, age, cls = "") {
    const cells = this.route(points);
    const glyphs = this.glyphs(cells);
    cells.forEach(([r, c], i) => {
      const k = Math.floor(age - hash(r, c) * 3);
      if (k < 0) this.put(r, c, glyphs[i], cls);
      else if (k < FADE.length) this.put(r, c, FADE[k], cls);
    });
  }
  /** Break the whole grid up into dither and blank it, for the end of a loop. k runs 0 → 1. */
  dissolve(k) {
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const f = Math.floor(k * 6 - hash(r, c) * 3);
      if (this.ch[r][c] !== " " && f >= 0) this.put(r, c, f < 4 ? FADE[f] : " ", this.cl[r][c]);
    }
    this.lum.clear();
  }

  /** A fractional position along a route, interpolated between cells (and round corners). */
  at(route, f) {
    const i = Math.floor(f);
    const a = route[i];
    const b = route[i + 1] || a;
    const t = f - i;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  packet(route, f, cls = "") {
    if (f < -1 || f > route.length + 3) return;
    this.comet(route, f, cls);
  }
  // Packets every `spacing` cells, moved on by `shift`. Returns how long ago (in steps) one
  // last reached the end of the route.
  stream(route, shift, spacing, cls = "") {
    for (let head = mod(shift, spacing); head < route.length + 3; head += spacing) this.packet(route, head, cls);
    return mod(shift - (route.length - 1), spacing);
  }

  #settle() {
    this.lum.forEach(({ v, cls }, key) => {
      const ch = v >= 0.82 ? "▓" : v >= 0.58 ? "▒" : v >= 0.33 ? "░" : v >= 0.12 ? "·" : null;
      if (ch) this.put(Math.floor(key / this.cols), key % this.cols, ch, cls);
    });
    this.lum.clear();
  }
  /** Plain text, for Markdown, tickets and anywhere colour doesn't travel. */
  toText() {
    this.#settle();
    return this.ch.map((row) => row.join("").replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
  }
  /** HTML with a span per run of one role: `${prefix}ok`, `${prefix}fail`, `${prefix}mute`. */
  toHtml(prefix = "gl-") {
    this.#settle();
    return this.ch.map((row, r) => {
      let out = "";
      let open = "";
      row.forEach((ch, c) => {
        const cls = this.cl[r][c];
        if (cls !== open) {
          if (open) out += "</span>";
          if (cls) out += `<span class="${prefix}${cls}">`;
          open = cls;
        }
        out += esc(ch);
      });
      if (open) out += "</span>";
      return out.replace(/\s+$/, "");
    }).join("\n");
  }
}
