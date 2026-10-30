// Shared by the teasers: the frame, type, the kit's figures, the dither press, the glyph-drawn files,
// the end card and the wiring (seek, cues, storyboard, a player). The launch film (scene.js) keeps
// its own copy so it stays exactly as approved.
import { Grid } from "../skills/glyph-kit/scripts/live/grid.mjs";
import { buildFrame, cellsFromText, centre, planBuild, size } from "../site/src/showcase-core.mjs";
import { classify } from "../skills/glyph-kit/scripts/render/paint.mjs";

export const SIZE = 1080;
export const M = 72;
export const FOOT = SIZE - M - 48;
export const STAGE = { x: M, y: 150, w: SIZE - 2 * M, h: FOOT - 150 - 40 };
export const C = { paper: "#fbfbf8", ink: "#080808", caption: "rgba(8,8,8,0.6)", ok: "#04764e", fail: "#b8421f" };
export const FONT = '"Departure Mono"';
export const CW = 0.6364;
export const BPM = 120;
export const B = 60 / BPM;
export const beat = (n) => n * B;

export const canvas = document.getElementById("c");
export const ctx = canvas.getContext("2d");

const colour = (cls) =>
  ({ "gk-e": "rgba(8,8,8,0.45)", "gk-f": C.caption, "gk-x": C.fail, "gk-ok": C.ok, "gl-ok": C.ok, "gl-fail": C.fail, "gl-mute": C.caption })[cls] ?? C.ink;

export function text(s, x, y, size, col = C.ink, align = "left") {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
}

/** A box of cells at (x, y) top-left; `tint` recolours every run (for a flash). */
export function cells(box, x, y, fs, tint) {
  const cw = fs * CW, lh = fs * 1.25;
  ctx.font = `${fs}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  box.ch.forEach((row, r) => {
    let start = 0;
    for (let c = 1; c <= row.length; c++) {
      if (c === row.length || box.cl[r][c] !== box.cl[r][start]) {
        const run = row.slice(start, c).join("");
        if (run.trim()) {
          ctx.fillStyle = tint ?? colour(box.cl[r][start]);
          ctx.fillText(run, x + start * cw, y + r * lh + fs * 0.12);
        }
        start = c;
      }
    }
  });
}
export const boxSize = (box, fs) => ({ w: size(box).cols * fs * CW, h: box.ch.length * fs * 1.25 });

export function typed(s, t, t0, t1, x, y, size, col = C.ink, align = "left") {
  if (t < t0) return;
  const n = Math.min(s.length, Math.floor(((t - t0) / (t1 - t0)) * s.length) + 1);
  const shown = s.slice(0, n), cw = size * CW;
  const x0 = align === "center" ? x - (s.length * cw) / 2 : x;
  text(shown, x0, y, size, col);
  const on = Math.floor((t - t0) / (B / 2)) % 2 === 0;
  if (t < t1 || (t < t1 + B && on)) text("_", x0 + shown.length * cw, y, size, C.caption);
}

/** A number counting in 40 ms steps, formatted with commas. */
export function counted(value, t, t0, t1) {
  if (t < t0) return null;
  const steps = Math.max(1, Math.round((t1 - t0) / 0.04));
  const k = Math.min(steps, Math.floor((t - t0) / 0.04));
  return Math.round((value * k) / steps).toLocaleString("en-US");
}

export function footer() {
  // The kit's logo, ░▒▓█ side by side in Departure Mono, on the address's baseline (docs/brand.md).
  text("░▒▓█", M, FOOT + 32, 22, C.ink);
  text("traykov.cc/glyph-kit", SIZE - M, FOOT + 32, 22, C.caption, "right");
}

/** A figure's text as a box that builds in (the site's build-in), then holds. */
export function figure(textBody) {
  const base = cellsFromText(textBody, classify);
  const box = centre(base, base.ch.length, size(base).cols);
  return { box, plan: planBuild(box) };
}
export function building(fig, t, t0, speed = 0.75) {
  const ms = ((t - t0) * 1000) / speed;
  return ms < fig.plan.total ? buildFrame(fig.box, fig.plan, ms) : fig.box;
}

// ── The dither press over the whole frame, footer included ──────────────────────────────────────
export const PRESS = { cell: 12, step: 0.04, spread: 0.36, cover: [2, 4, 6, 8], reveal: [6, 4, 2, 0] };
PRESS.swap = PRESS.spread + PRESS.cover.length * PRESS.step;
PRESS.total = PRESS.swap + PRESS.spread + PRESS.reveal.length * PRESS.step;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const curve = (x) => (x >= 1 ? 1 : (1 - Math.pow(2, -8 * x)) / (1 - Math.pow(2, -8)));
/** Draw any press running at t; `at` lists the moments each press is fully covered. */
export function press(t, at) {
  const p = at.find((a) => t >= a - PRESS.swap && t < a - PRESS.swap + PRESS.total);
  if (p === undefined) return;
  const e = t - (p - PRESS.swap), cols = Math.ceil(SIZE / PRESS.cell), dot = PRESS.cell / 4;
  ctx.fillStyle = C.ink;
  for (let x = 0; x < cols; x++) {
    const d = curve(x / (cols - 1)) * PRESS.spread;
    let level;
    if (e < PRESS.swap) {
      const k = Math.floor((e - d) / PRESS.step);
      level = k < 0 ? 0 : PRESS.cover[Math.min(k, 3)];
    } else {
      const k = Math.floor((e - PRESS.swap - d) / PRESS.step);
      level = k < 0 ? 8 : PRESS.reveal[Math.min(k, 3)];
    }
    if (!level) continue;
    if (level >= 8) {
      ctx.fillRect(x * PRESS.cell, 0, PRESS.cell, SIZE);
      continue;
    }
    for (let y = 0; y < SIZE; y += PRESS.cell)
      for (let k = 0; k < 16; k++) if (BAYER[k] < level * 2) ctx.fillRect(x * PRESS.cell + (k % 4) * dot, y + Math.floor(k / 4) * dot, dot, dot);
  }
}
/** The press's sound cue, starting so it is covered at `t`. */
export const pressCue = (t, o = {}) => ({ t: +(t - PRESS.swap).toFixed(4), type: "press", swap: PRESS.swap, ...o });

// ── Glyph-drawn files, moving with the kit's own motion once built ──────────────────────────────
export function file(name, lines, motion) {
  const box = centre(cellsFromText(lines.join("\n"), classify), lines.length, 29);
  return { name, lines, box, plan: planBuild(box), motion };
}
export function fileFrame(f, t, t0, speed = 0.5) {
  const ms = ((t - t0) * 1000) / speed;
  if (ms < f.plan.total) return buildFrame(f.box, f.plan, ms);
  const s = (ms - f.plan.total) * speed / 120;
  const g = new Grid(f.lines.length, 29);
  f.lines.forEach((l, r) => g.text(r, 0, l));
  f.motion?.(g, s);
  const edge = g.perimeter(0, 0, 29, f.lines.length).filter(([r, c]) => "─│┌┐└┘".includes([...f.lines[r]][c]));
  g.comet(edge, s * 1.2 + f.lines.length, "", 4, true);
  return centre(cellsFromText(g.toText(), classify), f.lines.length, 29);
}

// ── The end card: the four glyphs and the name ──────────────────────────────────────────────────
export function endCard(t, t0) {
  const big = 88, cw = big * CW, x0 = (SIZE - 7 * cw) / 2;
  if (t >= t0) ["░", "▒", "▓", "█"].forEach((g, i) => text(g, x0 + i * 2 * cw, 500, big));
  typed("Glyph kit", t, t0 + beat(0.5), t0 + beat(1.25), SIZE / 2, 610, 55, C.ink, "center");
}
export const endCardCues = (t0) => [{ t: +(t0 + beat(0.5)).toFixed(4), type: "type", d: beat(0.75), g: 0.8 }];

// ── Wiring ──────────────────────────────────────────────────────────────────────────────────────
export async function wire({ dur, draw, cues, storyboard, prepare }) {
  if (new URLSearchParams(location.search).has("render")) document.body.classList.add("render");
  await document.fonts.load(`33px ${FONT}`);
  await prepare?.();
  const frame = (t) => {
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, SIZE, SIZE);
    draw(Math.max(0, Math.min(dur, t)));
  };
  window.DUR = dur;
  window.seek = frame;
  window.__cues = () => ({ dur, bpm: BPM, cues: cues().sort((a, b) => a.t - b.t) });
  window.__storyboard = storyboard.map(([t, picture, words, sound], i) => ({ id: String(i + 1).padStart(2, "0"), t: +t.toFixed(2), picture, words, sound }));
  frame(0);
  window.__ready = true;
  const scrub = document.getElementById("scrub"), time = document.getElementById("time"), play = document.getElementById("play");
  scrub.max = String(dur);
  let playing = false, start = 0;
  const loop = (now) => {
    if (!playing) return;
    const t = (now - start) / 1000;
    if (t >= dur) return (playing = false), (play.textContent = "Play");
    scrub.value = String(t);
    time.textContent = `${t.toFixed(2)} s`;
    frame(t);
    requestAnimationFrame(loop);
  };
  play.onclick = () => {
    playing = !playing;
    play.textContent = playing ? "Pause" : "Play";
    if (playing) (start = performance.now() - Number(scrub.value) * 1000), requestAnimationFrame(loop);
  };
  scrub.oninput = () => ((time.textContent = `${Number(scrub.value).toFixed(2)} s`), frame(Number(scrub.value)));
}
