// Glyph kit, a 30 second film for LinkedIn. 1:1, light, 120 BPM: every key below sits on a beat.
// Every frame is drawn from time alone (seek(t)), so stills, the board and the film come from one
// source. The figures are drawn by the kit itself; the build-in and the dither press are the site's.
// The page also reports its sound cues (window.__cues), which synth.mjs turns into the soundtrack.
import { Grid } from "../skills/glyph-kit/scripts/live/grid.mjs";
import { live, stillGrid } from "../skills/glyph-kit/scripts/live/kinds.mjs";
import { STEP_MS as GRID_STEP } from "../skills/glyph-kit/scripts/live/grid.mjs";
import { resolve } from "../skills/glyph-kit/scripts/registry.mjs";
import { PRIMITIVES } from "../skills/glyph-kit/scripts/areas/wireframes.mjs";
import { classify } from "../skills/glyph-kit/scripts/render/paint.mjs";
import { buildFrame, cellsFromGrid, cellsFromText, centre, planBuild, size } from "../site/src/showcase-core.mjs";

// ── Frame, colour, type ─────────────────────────────────────────────────────────────────────────
const SIZE = 1080;
const M = 72; // margin
const FOOT = SIZE - M - 48; // top of the footer row
const STAGE = { x: M, y: 150, w: SIZE - 2 * M, h: FOOT - 150 - 40 };
const C = { paper: "#fbfbf8", ink: "#080808", caption: "rgba(8,8,8,0.6)", panel: "rgba(8,8,8,0.035)", ok: "#04764e", fail: "#b8421f" };
const FONT = '"Departure Mono"';
const CW = 0.6364; // Departure Mono's advance, as a share of its size (7 px at 11 px)
// In the figures, the shades ▓▒░ are drawn as fine dots, as they read in the kit's HTML files, not
// as Departure Mono's big pixels: a 4 × 4 ordered dither at a small dot, one cell each.
const SHADE = { "░": 4, "▒": 8, "▓": 12, "█": 16 }; // a full block is drawn too, so bars have no seams

// Borders stay still in the film: work moves along the lines and inside the views, not round boxes.
Grid.prototype.chase = () => {};
Grid.prototype.flash = () => {};

// ── Time ────────────────────────────────────────────────────────────────────────────────────────
const BPM = 120;
const B = 60 / BPM; // seconds per beat
const beat = (n) => n * B;
export const DUR = beat(133); // 66.5 s
const T = {
  glyphs: [2, 3, 4, 5].map(beat), // the four clicks
  mark: beat(6), // the glyphs step up into the corner
  make: [beat(6.5), beat(7.5)], // "Less to make." types
  send: [beat(9), beat(10)], // "Less to send." types
  stats: [beat(14), beat(21)], // seven beats each, time to read
  components: beat(28), // the kit's parts build in, then get used
  compare: beat(40), // most ASCII tools against Glyph kit, a row a beat
  examples: [56, 64, 72, 80, 88].map(beat), // one per eight beats; the press covers at each
  formats: beat(96), // one file, every format: six full views, three and a half beats each
  close: beat(118), // the last press covers, then reveals an empty frame
  join: [119.5, 120.5, 121.5, 122.5].map(beat), // the four glyphs click together, one per beat
  name: [beat(124), beat(124.75)], // "Glyph kit" types
  free: [beat(126), beat(126.75)], // "Free forever."
  domain: [beat(128.5), beat(129.5)] // then the address
};

// ── The dither press, as on the site's buttons, over the stage ──────────────────────────────────
const PRESS = { cell: 12, step: 0.04, spread: 0.36, cover: [2, 4, 6, 8], reveal: [6, 4, 2, 0] };
PRESS.swap = PRESS.spread + PRESS.cover.length * PRESS.step; // fully covered here
PRESS.total = PRESS.swap + PRESS.spread + PRESS.reveal.length * PRESS.step;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const curve = (x) => (x >= 1 ? 1 : (1 - Math.pow(2, -8 * x)) / (1 - Math.pow(2, -8)));
const pressAt = [T.components, T.compare, ...T.examples, T.formats, T.close]; // each press is fully covered at these times

// ── The examples: six kinds, drawn by the kit ───────────────────────────────────────────────────
// The examples live in tools/examples now; the skill's own folder is the fallback.
const load = async (p) => {
  for (const dir of ["../tools/examples", "../skills/glyph-kit/examples"]) {
    const r = await fetch(`${dir}/${p}`);
    if (r.ok) return r.json();
  }
  throw new Error(`Example not found: ${p}`);
};
let EX = [];
let FUNNEL = null; // drawn whole under the first stat
async function prepare() {
  const [wire, metrics, research, motion, loop, queue] = await Promise.all(["wireframes.json", "metrics.json", "research.json", "motion.json", "live/rework-loop.json", "live/review-queue.json"].map(load));
  const pick = (list, kind) => list.find((s) => s.kind === kind);
  const text = (spec, options) => ({ spec: { ...spec, options: { ...spec.options, ...options } } });
  const list = [
    { title: "Screen wireframe", ...text(pick(wire, "screen")) },
    { title: "Funnel", ...text(pick(metrics, "funnel"), { width: 20 }) },
    { title: "Rework loop", live: loop },
    { title: "Motion intent", ...text(pick(motion, "intentCard"), { width: 46 }) },
    { title: "Work queue", live: queue }
  ];
  EX = list.map((ex) => {
    let cells;
    if (ex.live) {
      const { make, still } = live(ex.live);
      const g = stillGrid(make, still);
      g.toText();
      ex.make = make;
      ex.still = still;
      ex.crop = inkBounds(make, still + 80);
      cells = crop(cellsFromGrid(g), ex.crop);
    } else {
      const s = ex.spec;
      cells = cellsFromText(resolve(s).render(s.data, s.options ?? {}), classify);
    }
    const { rows, cols } = size(cells);
    // The largest whole size that fits the stage, never above 33 px.
    const fs = Math.floor(Math.min(33, STAGE.w / (cols * CW), STAGE.h / (rows * 1.25)));
    const box = centre(cells, rows, cols);
    return { ...ex, box, plan: planBuild(box), rows, cols, fs };
  });
  // The first stat shows the funnel whole, before it builds in as an example.
  FUNNEL = EX.find((e) => e.title === "Funnel");
  prepareCompare();
  prepareViews();
}

// The rows and columns a moving diagram ever puts ink in, over its first steps; frames are cropped
// to them so the figure is sized by what it draws, not by its grid.
function inkBounds(make, steps) {
  const frame = make();
  const b = { r0: Infinity, r1: -1, c0: Infinity, c1: -1 };
  for (let s = 0; s <= steps; s++) {
    const g = frame(s, 0);
    if (s % 4) continue;
    g.toText();
    g.ch.forEach((row, r) => row.forEach((ch, c) => {
      if (ch === " ") return;
      b.r0 = Math.min(b.r0, r); b.r1 = Math.max(b.r1, r); b.c0 = Math.min(b.c0, c); b.c1 = Math.max(b.c1, c);
    }));
  }
  return b;
}
const crop = (cells, b) => ({
  ch: cells.ch.slice(b.r0, b.r1 + 1).map((row) => row.slice(b.c0, b.c1 + 1)),
  cl: cells.cl.slice(b.r0, b.r1 + 1).map((row) => row.slice(b.c0, b.c1 + 1))
});

// A moving example's grid, ms after its build finished: stepped from the start each time, so any
// frame can be drawn on its own.
function liveBox(ex, ms) {
  const frame = ex.make();
  const pos = ex.still + ms / GRID_STEP;
  for (let s = 0; s < Math.floor(pos); s++) frame(s, 0);
  const g = frame(Math.floor(pos), pos - Math.floor(pos));
  g.toText();
  return centre(crop(cellsFromGrid(g), ex.crop), ex.rows, ex.cols);
}

// ── Drawing ─────────────────────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
// ?scale=2 draws the same 1080 frame at twice the pixels, for a sharper master.
const SCALE = Number(new URLSearchParams(location.search).get("scale") ?? 1) || 1;
if (SCALE !== 1) {
  canvas.width = canvas.height = SIZE * SCALE;
  canvas.style.width = canvas.style.height = `${SIZE * SCALE}px`;
}
let LOGO = null;
const colour = (cls) =>
  ({ "gk-e": "rgba(8,8,8,0.45)", "gk-f": C.caption, "gk-x": C.fail, "gk-ok": C.ok, "gl-ok": C.ok, "gl-fail": C.fail, "gl-mute": C.caption })[cls] ?? C.ink;

function text(s, x, y, size, col = C.ink, align = "left") {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
}

/** A box of cells, one run of one colour at a time, at (x, y) top-left. */
function cells(box, x, y, fs) {
  const cw = fs * CW;
  const lh = fs * 1.25;
  const dot = 2;
  ctx.font = `${fs}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  box.ch.forEach((row, r) => {
    let start = 0;
    const flush = (c) => {
      const run = row.slice(start, c).join("");
      if (run.trim()) {
        ctx.fillStyle = colour(box.cl[r][start]);
        ctx.fillText(run, x + start * cw, y + r * lh + fs * 0.12);
      }
    };
    for (let c = 0; c <= row.length; c++) {
      const shade = SHADE[row[c]];
      if (c === row.length || shade || box.cl[r][c] !== box.cl[r][start] || SHADE[row[start]]) {
        if (c > start && !SHADE[row[start]]) flush(c);
        start = c;
      }
      if (!shade) continue;
      // The shade's cell, filled with dots on a fixed grid so neighbouring cells join up.
      ctx.fillStyle = colour(box.cl[r][c]);
      // A light shade fills its whole line, so a ░ backdrop has no stripes; the darker ones keep a gap
      // between rows, so stacked bars stay apart.
      const full = row[c] === "░";
      const x0 = x + c * cw, y0 = y + r * lh + (full ? 0 : fs * 0.06), h = full ? lh : fs * 1.13;
      const snap = (v) => Math.round(v / dot) * dot; // neighbouring cells share their edge exactly
      for (let py = snap(y0); py < snap(y0 + h); py += dot)
        for (let px = snap(x0); px < snap(x0 + cw); px += dot)
          if (BAYER[((py / dot) % 4) * 4 + ((px / dot) % 4)] < shade) ctx.fillRect(px, py, dot, dot);
      start = c + 1;
    }
  });
}

/** Typed text: characters arrive one at a time between t0 and t1, with a block cursor while typing. */
function typed(s, t, t0, t1, x, y, size, col = C.ink, align = "left") {
  if (t < t0) return;
  const n = Math.min(s.length, Math.floor(((t - t0) / (t1 - t0)) * s.length) + 1);
  const shown = s.slice(0, n);
  const cw = size * CW;
  const x0 = align === "center" ? x - (s.length * cw) / 2 : x;
  text(shown, x0, y, size, col);
  const blinkOn = Math.floor((t - t0) / (B / 2)) % 2 === 0;
  if (t < t1 || (t < t1 + B && blinkOn)) text("_", x0 + shown.length * cw, y, size, C.caption);
}

/** A number counting up in 40 ms steps (one per site tick), then holding its value. */
function counted(value, decimals, t, t0, t1) {
  if (t < t0) return null;
  const steps = Math.max(1, Math.round((t1 - t0) / 0.04));
  const k = Math.min(steps, Math.floor((t - t0) / 0.04));
  const v = (value * k) / steps;
  // Whole numbers start at 1, so a multiple never reads "0× smaller".
  return (decimals ? v : Math.max(1, v)).toFixed(decimals);
}

function footer() {
  if (LOGO) ctx.drawImage(LOGO, M, FOOT, 46, 46 * (908.79 / 873.71));
  text("glyph-kit.traykov.cc", SIZE - M, FOOT + 32, 22, C.caption, "right");
}

function header(t, title) {
  if (t >= T.mark && t < T.close + PRESS.swap) text("░▒▓█", M, M + 22, 33, C.ink);
  if (title) text(title, SIZE - M, M + 22, 22, C.caption, "right");
}

// ── Scenes ──────────────────────────────────────────────────────────────────────────────────────
const GLYPHS = ["░", "▒", "▓", "█"];
const big = 132;

function intro(t) {
  const cw = big * CW;
  const x0 = (SIZE - 7 * cw) / 2;
  const y = 580;
  const n = T.glyphs.filter((g) => t >= g).length;
  GLYPHS.slice(0, n).forEach((g, i) => text(g, x0 + i * 2 * cw, y, big));
  // The cursor blinks in steps until the first glyph and moves along as they type; once all four
  // are in, it goes.
  const on = Math.floor(t / (B / 2)) % 2 === 0;
  if (n < 4 && (on || n > 0)) text("_", x0 + n * 2 * cw, y, big, C.caption);
}

function lines(t) {
  typed("Less to make.", t, ...T.make, M, 520, 88);
  typed("Less to send.", t, ...T.send, M, 650, 88);
}

const STATS = [
  { label: "To draw a figure", value: 4.0, decimals: 1, unit: " μs", note: "Median of 48 figures, in Node." },
  { label: "As text, against its picture", value: 65, decimals: 0, unit: "× smaller", note: "354 bytes as text, 22.8 KB as an image." },
];

function stat(t, k) {
  const t0 = T.stats[k];
  const s = STATS[k];
  typed(s.label, t, t0, t0 + beat(0.5), M, 330, 33, C.caption);
  const v = counted(s.value, s.decimals, t, t0 + beat(1), t0 + beat(2));
  if (v !== null) {
    text(v, M, 500, big);
    text(s.unit, M + v.length * big * CW, 500, 44, C.ink);
  }
  const g = t0 + beat(2);
  if (k === 0 && t >= g) {
    // Already drawn: the figure appears whole, in one frame.
    const f = FUNNEL;
    cells(f.box, M, 560, 22);
  }
  if (k === 1) bars(t, g - beat(1));
  if (t >= t0 + beat(1)) text(s.note, M, 820, 22, C.caption);
}

/** 354 bytes against 22.8 KB, grown cell by cell, inside the frame. */
function bars(t, t0) {
  if (t < t0) return;
  const fs = 33, cw = fs * CW, x = M + 9 * cw;
  const n = Math.floor((SIZE - M - x) / cw) - 9; // room for the label after the bar
  const img = Math.min(n, Math.floor((t - t0) / 0.03));
  const done = t >= t0 + n * 0.03;
  text("text", M, 610, fs, C.caption);
  text("▎", x, 610, fs, C.ok);
  if (done) text("354 B", x + 2 * cw, 610, fs, C.caption);
  text("picture", M, 670, fs, C.caption);
  if (img > 0) text("█".repeat(img), x, 670, fs, C.ink);
  if (done) text("22.8 KB", x + (n + 1) * cw, 670, fs, C.caption);
}

/** The range of image tokens, 76 to 918, with the median, drawn on left to right. */
// ── Components: the kit's own wireframe parts, built in one after another, then used ────────────
const PART_W = 26;
const PARTS = [
  ["Button", { type: "buttons", items: [{ label: "Cancel" }, { label: "Save", primary: true }] }],
  ["Input", { type: "input", label: "Email", labelWidth: 7, value: "team@example.com" }],
  ["Toggle", { type: "toggle", label: "Weekly summary", on: false }],
  ["Select", { type: "select", label: "Day", value: "Monday" }],
  ["Checkbox", { type: "checkbox", label: "Remember me", checked: false }],
  ["Radio", { type: "radio", options: ["Daily", "Weekly"], selected: "Daily" }],
  ["Tabs", { type: "tabs", items: ["Profile", "Billing", "Team"], selected: "Profile" }],
  ["Skeleton", { type: "skeleton", lines: 2 }],
  ["List", { type: "list", items: [{ text: "Inbox", meta: "12", selected: true }, { text: "Drafts", meta: "3" }, { text: "Archive", disabled: true }] }],
  ["Search", { type: "search", placeholder: "Search reports", hint: "/" }]
];
// Each part is used once it's built, in turn: [seconds after the scene starts, the part's new state].
const USE_AT = 1.8, USE_EVERY = 0.5;
const USED = {
  Toggle: { on: true },
  Checkbox: { checked: true },
  Radio: { selected: "Weekly" },
  Select: { value: "Friday" },
  Tabs: { selected: "Billing" },
  Button: "press",
  List: { items: [{ text: "Inbox", meta: "12" }, { text: "Drafts", meta: "3", selected: true }, { text: "Archive", disabled: true }] }
};
const USE_ORDER = ["Toggle", "Checkbox", "Radio", "Select", "Tabs", "List", "Button"];
const partLines = (row) => PRIMITIVES[row.type](row, PART_W).map((l) => [...l].length < PART_W ? l + " ".repeat(PART_W - [...l].length) : l);
const partBox = (row) => {
  const lines = partLines(row);
  return centre(cellsFromText(lines.join("\n"), classify), lines.length, PART_W);
};
let PART_FIGS = null;
function components(t) {
  const t0 = T.components;
  caption(t, t0 + beat(0.5), "The parts a wireframe is made of.");
  const fs = 25, cw = fs * CW, lh = fs * 1.25, gap = 6 * cw;
  PART_FIGS ??= PARTS.map(([name, row]) => ({ name, row, box: partBox(row), plan: planBuild(partBox(row)) }));
  const rowH = [1, 1, 1, 2, 3].map((n) => n * lh + 52);
  const totalH = rowH.reduce((a, b) => a + b, 0) - 52 + 24; // captions sit 24 px above each part
  const x0 = (SIZE - (2 * PART_W * cw + gap)) / 2;
  let y = STAGE.y + (STAGE.h - totalH) / 2 + 24;
  PART_FIGS.forEach((p, k) => {
    const col = k % 2, row = Math.floor(k / 2);
    if (col === 0 && row > 0) y += rowH[row - 1];
    const tk = t0 + k * beat(0.125); // one part per eighth beat
    if (t < tk) return;
    const x = x0 + col * (PART_W * cw + gap);
    const ms = ((t - tk) * 1000) / 0.5;
    let box;
    if (ms < p.plan.total) box = buildFrame(p.box, p.plan, ms);
    else box = partNow(p, t - t0);
    cells(box, x, y, fs);
    if (ms > 120) text(p.name, x, y - 12, 18, C.caption);
  });
}
// A part in use: its state once its turn has come, with a moving caret or shimmer where it waits.
function partNow(p, sec) {
  const k = USE_ORDER.indexOf(p.name);
  const at = USE_AT + k * USE_EVERY;
  const used = k >= 0 && sec >= at;
  const change = USED[p.name];
  if (change === "press") {
    const step = Math.floor((sec - at) / 0.06);
    if (!used || step >= 3) return p.box;
    return onGrid(p.box, PART_W, (g) => {
      const [r, c] = find(p.box, "[[ Save ]]");
      for (let i = 2; i < 8; i++) g.put(r, c + i, ["▓", "▒", "░"][step]);
    });
  }
  let box = used ? partBox({ ...p.row, ...change }) : p.box;
  // The switch slides through a half step.
  if (p.name === "Toggle" && used && sec < at + 0.06) box = onGrid(box, PART_W, (g) => { const [r, c] = find(box, "[ ■]"); g.text(r, c, "[▒▒]"); });
  if (p.name === "Input") return onGrid(box, PART_W, (g) => { const [r, c] = find(box, "team@example.com"); if (Math.floor(sec / 0.2) % 2 === 0) g.put(r, c + 16, "█"); });
  if (p.name === "Search") return onGrid(box, PART_W, (g) => { if (Math.floor(sec / 0.2) % 2 === 1) g.put(0, 2, "█"); });
  if (p.name === "Skeleton") return onGrid(box, PART_W, (g) => box.ch.forEach((row, r) => {
    const run = row.map((ch, c) => (ch === "░" ? [r, c] : null)).filter(Boolean);
    const pos = ((sec * 18 + r * 5) % (run.length + 8)) - 3;
    [[-1, "▒"], [0, "▓"], [1, "▒"]].forEach(([d, ch]) => { const cell = run[Math.floor(pos) + d]; if (cell) g.put(cell[0], cell[1], ch); });
  }));
  return box;
}

/** A plain line over a scene, in the stats' label style; a later caption replaces an earlier one. */
const CAPTIONS = [];
function caption(t, t0, line, replaces = false) {
  if (t < t0) return;
  if (replaces) CAPTIONS.length = 0;
  CAPTIONS.push([t0, line]);
}
function drawCaptions(t) {
  const last = CAPTIONS.filter(([t0]) => t >= t0).at(-1);
  if (last) typed(last[1], t, last[0], last[0] + Math.min(beat(1), last[1].length * 0.02), M, STAGE.y + 70, 33, C.caption);
  CAPTIONS.length = 0;
}

// ── Compared: most ASCII tools against Glyph kit. The table's frame draws on, then the header and
// one row a beat, each settling left to right through the scramble ramp. The kit's column is green.
const COMPARE = [
  ["", "Most ASCII tools", "Glyph kit"],
  ["Made by", "hand, or guessed", "code, from data"],
  ["Covers", "one chart, or boxes", "45 design figures"],
  ["Moves", "no", "6 moving diagrams"],
  ["Ends as", "mostly text", "text, deck, PDF, SVG"],
  ["Made-up data", "looks real", "stamped SAMPLE DATA"]
];
const CMP_AT = { header: 0.8, rows: 1.6, every: 0.9 };
const TABLE_CH = "─│┌┐└┘├┤┬┴┼";
let CMP = null;
function prepareCompare() {
  const spec = { kind: "table", data: COMPARE };
  const lines = resolve(spec).render(spec.data, {}).split("\n").map((l) => [...l]);
  const cols = Math.max(...lines.map((l) => l.length));
  const box = centre(cellsFromText(lines.map((l) => l.join("")).join("\n"), classify), lines.length, cols);
  const bars = lines[1].map((ch, c) => (ch === "│" ? c : -1)).filter((c) => c >= 0);
  const column = (c) => bars.filter((b) => b < c).length - 1; // 0 labels, 1 most tools, 2 Glyph kit
  box.cl = box.cl.map((row, r) => row.map((cl, c) => (TABLE_CH.includes(box.ch[r][c]) ? "gk-f" : column(c) === 1 ? "gk-f" : column(c) === 2 ? "gk-ok" : cl)));
  const frame = { ch: box.ch.map((row) => row.map((ch) => (TABLE_CH.includes(ch) ? ch : " "))), cl: box.cl };
  CMP = { box, frame, plan: planBuild(frame), cols, rows: lines.length };
}
// The moment each table row's words arrive: the header, then the five rows.
const cmpRowAt = (r) => (r === 1 ? CMP_AT.header : r >= 3 && r < CMP.rows - 1 ? CMP_AT.rows + (r - 3) * CMP_AT.every : null);
function compared(t) {
  const sec = t - T.compare, fs = 24;
  const x = (SIZE - CMP.cols * fs * CW) / 2, y = STAGE.y + (STAGE.h - CMP.rows * fs * 1.25) / 2;
  const ms = (sec * 1000) / 0.6;
  const lines = ms < CMP.plan.total ? buildFrame(CMP.frame, CMP.plan, ms) : CMP.frame;
  const out = { ch: lines.ch.map((row) => row.slice()), cl: CMP.box.cl };
  const tick = Math.floor(sec / 0.04);
  CMP.box.ch.forEach((row, r) => {
    const at = cmpRowAt(r);
    if (at === null || sec < at) return;
    row.forEach((ch, c) => {
      if (ch === " " || TABLE_CH.includes(ch)) return;
      const shown = at + c * 0.008, settled = shown + 0.12;
      if (sec < shown) return;
      out.ch[r][c] = sec >= settled ? ch : " .:+*#%@"[1 + ((r * 31 + c * 17 + tick * 7) % 7)];
    });
  });
  cells(out, x, y, fs);
}

// The still examples keep moving once built, inside the view only, never round its border:
// a shimmer along the bars; the screen is used; the motion card plays its own timing.
const BLOCK_CH = "█▉▊▋▌▍▎▏▓▒";
function onGrid(box, cols, move) {
  const rows = box.ch.length;
  const g = new Grid(rows, cols);
  box.ch.forEach((row, r) => g.text(r, 0, row.join("")));
  const tint = [];
  move(g, (r, c, n, cl) => { for (let i = 0; i < n; i++) tint.push([r, c + i, cl]); });
  // Keep the original colours (the queue's red and green); new words take their own.
  const out = cellsFromText(g.toText(), classify);
  // Rows keep their full width, so nothing re-centres and shifts when a row's end changes.
  out.ch = out.ch.map((row) => [...row, ...Array(Math.max(0, cols - row.length)).fill(" ")]);
  out.cl = out.cl.map((row) => [...row, ...Array(Math.max(0, cols - row.length)).fill("")]);
  out.cl = out.cl.map((row, r) => row.map((cl, c) => box.cl[r]?.[c] || cl));
  tint.forEach(([r, c, cl]) => (out.cl[r][c] = cl));
  return centre(out, rows, cols);
}
const find = (box, str) => {
  for (let r = 0; r < box.ch.length; r++) {
    const c = box.ch[r].join("").indexOf(str);
    if (c >= 0) return [r, c];
  }
  return [-1, -1];
};
// A light passing along a solid run, ▓▒▓, that never thins the run into gaps.
function glint(g, run, pos) {
  const at = Math.floor(pos);
  [[-1, "▓"], [0, "▒"], [1, "▓"]].forEach(([d, ch]) => {
    const cell = run[at + d];
    if (cell) g.put(cell[0], cell[1], ch);
  });
}
function shimmer(g, box, s) {
  box.ch.forEach((row, r) => {
    const run = row.map((ch, c) => (BLOCK_CH.includes(ch) ? [r, c] : null)).filter(Boolean);
    if (run.length > 2) glint(g, run, (s * 1.1 + r * 6) % (run.length + 10) - 4);
  });
}
function stillMotion(ex, ms, box = ex.box) {
  if (ex.title === "Screen wireframe") return screenMotion(ex, ms);
  if (ex.title === "Motion intent") return intentMotion(ex, ms);
  return onGrid(box, ex.cols, (g) => shimmer(g, box, ms / 120));
}

// The settings screen in use: the cursor blinks in the address while Save is still disabled; the
// weekly summary switches on, so Save wakes up; the digest day changes; Save is pressed and says so.
const SCREEN = { toggle: 0.6, day: 1.4, save: 2.2 }; // seconds after the build; the press comes at about 3.3
function screenMotion(ex, ms) {
  const box = ex.box, sec = ms / 1000, step = ms / 120;
  return onGrid(box, ex.cols, (g, tint) => {
    const [er, ec] = find(box, "team@example.com");
    if (Math.floor(ms / 240) % 2 === 0) g.put(er, ec + 16, "█"); // the address field keeps focus
    const [wr, wc] = find(box, "[■ ] off");
    if (sec >= SCREEN.toggle) g.text(wr, wc, sec < SCREEN.toggle + 0.08 ? "[▒▒] off" : "[ ■] on ");
    const [dr, dc] = find(box, "Monday");
    if (sec >= SCREEN.day) g.scramble(dr, dc, "Friday", (ms - SCREEN.day * 1000) / 120, step);
    const [sr, sc] = find(box, "[[ Save ]]");
    if (sec < SCREEN.toggle) tint(sr, sc, 10, "gk-f");
    const p = Math.floor((sec - SCREEN.save) / 0.08);
    if (p >= 0 && p < 3) for (let i = 2; i < 8; i++) g.put(sr, sc + i, ["▓", "▒", "░"][p]);
    if (p >= 3) {
      const [, fc] = find(box, "║");
      g.scramble(sr, fc + 2, "Saved", (ms - SCREEN.save * 1000 - 240) / 120, step);
      tint(sr, fc + 2, 5, "gk-ok");
    }
  });
}

// The motion card plays the toast it describes: the timing bar fills along its easing while the
// easing curve draws in step, then both hold a moment and play again.
function intentMotion(ex, ms) {
  const box = ex.box;
  return onGrid(box, ex.cols, (g) => {
    const [tr] = find(box, "timing");
    const row = box.ch[tr].join("");
    const a = row.indexOf("▕") + 1, b = row.indexOf("▏");
    const [cr] = find(box, "easing");
    const crow = box.ch[cr].join("");
    const ca = crow.search(/[█▆▅▄▃▂▁]/);
    const lap = (ms % 1200) / 900; // 0.9 s playing, 0.3 s held
    const k = Math.min(1, lap), eased = 1 - Math.pow(1 - k, 3);
    const full = row.slice(a, b).lastIndexOf("█") + 1;
    for (let i = 0; i < b - a; i++) g.put(tr, a + i, i < Math.round(eased * full) ? "█" : "·");
    for (let i = Math.ceil(k * 8); i < 8; i++) g.put(cr, ca + i, " ");
  });
}

function example(t, i) {
  const ex = EX[i];
  const t0 = T.examples[i];
  const w = ex.cols * ex.fs * CW;
  const h = ex.rows * ex.fs * 1.25;
  const x = STAGE.x + (STAGE.w - w) / 2;
  const y = STAGE.y + (STAGE.h - h) / 2;
  const ms = ((t - t0) * 1000) / 0.75; // the site's build, a quarter faster for film
  // Moving examples move from their first frame: the build-in reveals the live picture as it runs.
  let now = ex.live ? liveBox(ex, Math.max(0, (t - t0) * 1000)) : ms < ex.plan.total ? ex.box : stillMotion(ex, ms - ex.plan.total);
  // The queue has quiet stretches between cards moving; a shimmer along its cards keeps it alive.
  if (ex.title === "Work queue") now = onGrid(now, ex.cols, (g) => shimmer(g, now, ms / 120));
  cells(ms < ex.plan.total ? buildFrame(now, ex.plan, ms) : now, x, y, ex.fs);
}

// One file, every format: the same funnel shown six ways, each a full view, one after another.
// The bars come from the kit itself; each view is drawn the way its format looks, in the same
// block and box characters as everything else. A view wipes in over the last one, left to right,
// building as it comes, then keeps one small motion of its own.
const VIEW_BEATS = 3.5;
const padTo = (str, w) => { const n = [...str].length; return n >= w ? str : str + " ".repeat(w - n); };
// A box of width w with a name in its top edge.
function boxed(name, body, w, style = "─│┌┐└┘") {
  const [h, v, tl, tr, bl, br] = [...style];
  const top = name ? `${tl}${h} ${name} ${h.repeat(Math.max(0, w - [...name].length - 5))}${tr}` : `${tl}${h.repeat(w - 2)}${tr}`;
  return [top, ...body.map((l) => `${v} ${padTo(l, w - 4)} ${v}`), `${bl}${h.repeat(w - 2)}${br}`];
}
let VIEWS = [];
function prepareViews() {
  const data = [["visited", 12400, "12.4k"], ["signed up", 6100, "6.1k"], ["activated", 2300, "2.3k"], ["paid", 610, "610"]].map(([label, value, text]) => ({ label, value, text }));
  const spec = { kind: "barChart", source: "Analytics export", data, options: { width: 16 } };
  const bars = resolve(spec).render(spec.data, spec.options).split("\n");
  const W = 46;
  const list = [
    ["Markdown", boxed("funnel.md", ["### Signup to paid, last 30 days", "", "```text", ...bars, "```", "", "4 steps; 5% of visitors reach paid.", "Source: analytics export"], W)],
    ["MDX", boxed("funnel.mdx", ['import Glyph from "./Glyph.astro";', "", "## Signup to paid", "<Glyph spec={funnel} />", ...boxed("", bars, W - 4)], W)],
    ["Prototype", boxed("settings.html", ["■ ■ ■  [ localhost:4321/settings    ]", "", "Settings", "Profile │ Notifications │ Billing", "          ━━━━━━━━━━━━━", "Email me when a report is ready  [ ■] on", "Weekly summary                   [■ ] off", "Digest day  [ Monday           ▼]", "", "                  [ Cancel ]  [[ Save ]]"], W)],
    ["Deck", boxed("review.html", ["", "HOW PEOPLE GET TO PAID", "", ...bars, "", "", "▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░    03 / 12"], W)],
    ["PDF report", boxed("audit.pdf", ["░▒▓█                    Signup report", "", "Signup to paid", "▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒", "▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒", "", ...bars, "", "", "", "                                1 / 6"], 42)],
    ["SVG · PNG", [...Array(2).fill("░".repeat(W)), ...bars.map((l) => `░░ ${padTo(l, W - 6)} ░░`), ...Array(2).fill("░".repeat(W)), "", padTo("", W - 21) + "funnel.svg · 1080 × 540"]]
  ];
  VIEWS = list.map(([name, lines]) => {
    const cols = Math.max(...lines.map((l) => [...l].length));
    const box = centre(cellsFromText(lines.join("\n"), classify), lines.length, cols);
    // The SVG's backdrop stands for transparency, so it sits back in grey.
    if (name === "SVG · PNG") box.cl = box.cl.map((row, r) => row.map((cl, c) => (box.ch[r][c] === "░" ? "gk-f" : cl)));
    if (name === "Prototype") box.cl[1] = box.cl[1].map((cl, c) => (c < 8 ? "gk-f" : cl));
    const fs = Math.floor(Math.min(28, STAGE.w / (cols * CW), (STAGE.h - 90) / (lines.length * 1.25)));
    return { name, lines, box, plan: planBuild(box), cols, rows: lines.length, fs };
  });
}
const viewAt = (k) => T.formats + beat(0.5 + k * VIEW_BEATS);
// Each view's own motion, s seconds after it starts.
const VIEW_MOTION = {
  Markdown: (g, s, v) => { if (Math.floor(s / 0.24) % 2 === 0) g.put(v.rows - 3, 2 + 35, "█"); }, // the cursor after the last line
  MDX: (g, s, v) => v.box.ch.forEach((row, r) => {
    if (r < 6) return;
    const run = row.map((ch, c) => (ch === "█" ? [r, c] : null)).filter(Boolean);
    if (run.length > 2) glint(g, run, (s * 9 + r * 5) % (run.length + 10) - 4);
  }),
  Prototype: (g, s, v) => {
    const [ar, ac] = find(v.box, "localhost:4321/settings");
    if (Math.floor(s / 0.24) % 2 === 0) g.put(ar, ac + 23, "█");
    const [wr, wc] = find(v.box, "[■ ] off");
    if (s > 0.9) g.text(wr, wc, s < 0.98 ? "[▒▒] off" : "[ ■] on ");
    const [sr, sc] = find(v.box, "[[ Save ]]");
    const p = Math.floor((s - 1.3) / 0.08);
    if (p >= 0 && p < 3) for (let i = 2; i < 8; i++) g.put(sr, sc + i, ["▓", "▒", "░"][p]);
  },
  Deck: (g, s, v) => {
    const [pr, pc] = find(v.box, "▓▓▓░");
    const n = Math.min(31, 3 + Math.floor(s / 0.12));
    for (let i = 0; i < 31; i++) g.put(pr, pc + i, i < n ? "▓" : "░");
    if (s > 0.9) g.text(pr, pc + 35, "04 / 12");
  },
  "PDF report": (g, s, v) => {
    const [r1, c1] = find(v.box, "▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒");
    [[r1, 28], [r1 + 1, 20]].forEach(([r, w], i) => {
      const n = Math.max(0, Math.min(w, Math.floor((s - i * 0.5) / 0.05)));
      for (let k = 0; k < w; k++) g.put(r, c1 + k, k < n ? "█" : "▒");
    });
  },
  "SVG · PNG": (g, s, v) => v.box.ch.forEach((row, r) => {
    const run = row.map((ch, c) => (ch === "█" ? [r, c] : null)).filter(Boolean);
    if (run.length > 2) glint(g, run, (s * 9 + r * 5) % (run.length + 10) - 4);
  })
};
function viewFrame(v, s) {
  const ms = (s * 1000) / 0.6;
  if (ms < v.plan.total) return buildFrame(v.box, v.plan, ms);
  return onGrid(v.box, v.cols, (g) => VIEW_MOTION[v.name]?.(g, s, v));
}
function drawView(k, t) {
  const v = VIEWS[k], s = t - viewAt(k);
  const w = v.cols * v.fs * CW, h = v.rows * v.fs * 1.25;
  cells(viewFrame(v, s), (SIZE - w) / 2, STAGE.y + 70 + (STAGE.h - 70 - h) / 2, v.fs);
}
const WIPE = 0.45;
function formats(t) {
  const t0 = T.formats;
  typed("One file, every format.", t, t0, t0 + beat(0.75), M, STAGE.y + 8, 44);
  const k = VIEWS.findLastIndex((_, i) => t >= viewAt(i));
  if (k < 0) return "";
  const p = (t - viewAt(k)) / WIPE;
  if (k > 0 && p < 1) {
    // The new view wipes in from the left over the last one, stepping on the 40 ms tick.
    const x = STAGE.x - 20 + (STAGE.w + 40) * (Math.floor((p * WIPE) / 0.04) * 0.04 / WIPE);
    ctx.save(); ctx.beginPath(); ctx.rect(x, 0, SIZE - x, SIZE); ctx.clip(); drawView(k - 1, t); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, SIZE); ctx.clip(); drawView(k, t); ctx.restore();
  } else drawView(k, t);
  return VIEWS[k].name;
}

// The end: the four glyphs wait spaced across the frame, then slide together one at a time, each
// clicking into place, ▒ first, then ▓ beside it, then ░ and █ on either side. Moves step on the
// site's 40 ms tick and overshoot a little before they settle.
const JOIN_ORDER = [1, 2, 0, 3];
const JOIN_MOVE = 0.36;
function joined(t) {
  const cw = big * CW, cx = SIZE / 2, y = 500;
  const slot = (i) => cx - 2 * cw + i * cw;
  const start = (i) => M + 10 + i * ((SIZE - 2 * M - 20 - cw) / 3);
  const tick = Math.floor(t / 0.04) * 0.04;
  GLYPHS.forEach((g, i) => {
    const arrive = T.join[JOIN_ORDER.indexOf(i)];
    const k = Math.max(0, Math.min(1, (tick - (arrive - JOIN_MOVE)) / JOIN_MOVE));
    const back = 1.6, e = k >= 1 ? 1 : 1 + (back + 1) * (k - 1) ** 3 + back * (k - 1) ** 2; // ease out, a little past and back
    text(g, start(i) + (slot(i) - start(i)) * e, y, big);
  });
}
function close(t) {
  joined(t);
  typed("Glyph kit", t, ...T.name, SIZE / 2, 640, 88, C.ink, "center");
  typed("Free forever.", t, ...T.free, SIZE / 2, 720, 44, C.ink, "center");
  typed("glyph-kit.traykov.cc", t, ...T.domain, SIZE / 2, 800, 33, C.caption, "center");
}

/** The press over the stage, if one is running at t. */
function press(t) {
  const at = pressAt.find((p) => t >= p - PRESS.swap && t < p - PRESS.swap + PRESS.total);
  if (at === undefined) return;
  const e = t - (at - PRESS.swap);
  const cols = Math.ceil(SIZE / PRESS.cell);
  const top = 0;
  const bottom = SIZE; // the whole frame, footer included
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
    ctx.fillStyle = C.ink;
    if (level >= 8) {
      ctx.fillRect(x * PRESS.cell, top, PRESS.cell, bottom - top);
      continue;
    }
    const dot = PRESS.cell / 4;
    for (let y = top; y < bottom; y += PRESS.cell)
      for (let k = 0; k < 16; k++) if (BAYER[k] < level * 2) ctx.fillRect(x * PRESS.cell + (k % 4) * dot, y + Math.floor(k / 4) * dot, dot, dot);
  }
}

// ── One frame ───────────────────────────────────────────────────────────────────────────────────
function draw(t) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, SIZE, SIZE);
  let title = "";
  if (t < T.mark) intro(t);
  else if (t < T.stats[0]) lines(t);
  else if (t < T.components) stat(t, t < T.stats[1] ? 0 : 1);
  else if (t < T.compare) {
    components(t);
    title = "Components";
  } else if (t < T.examples[0]) {
    compared(t);
    title = "Compared";
  }
  else if (t >= T.formats && t < T.close) {
    title = formats(t) || "Formats";
  } else if (t < T.close) {
    const i = T.examples.filter((e) => t >= e).length - 1;
    // Before the first example is covered, the last stat stays under the press.
    if (i < 0) stat(t, 2);
    else {
      example(t, i);
      title = EX[i].title;
    }
  } else if (t >= T.close) close(t);
  drawCaptions(t);
  header(t, title);
  footer();
  press(t);
}

// ── The soundtrack's cues, from the same timeline ───────────────────────────────────────────────
function cues() {
  const c = [];
  const at = (t, type, o = {}) => c.push({ t: +t.toFixed(4), type, ...o });
  at(0, "boot", { quick: true, g: 0.55 }); // under the blinking cursor, done before the first glyph
  T.glyphs.forEach((t) => at(t, "key"));
  at(T.make[0], "type", { d: T.make[1] - T.make[0] });
  at(T.send[0], "type", { d: T.send[1] - T.send[0] });
  at(0.5, "ambient", { d: DUR - 0.5 }); // the bed, under the whole film
  T.stats.forEach((t0, k) => {
    at(t0, "type", { d: beat(0.5), g: 0.6 });
    at(t0 + beat(1), "roll", { d: beat(1) });
    at(t0 + beat(2), "land", { deg: [5, 3, 1][k], oct: 5 });
    if (k === 1) at(t0 + beat(1), "fill", { steps: 4, dir: 1, every: 0.3 });
  });
  [T.components, T.compare, ...T.examples, T.formats].forEach((t) => at(t - PRESS.swap, "press", { swap: PRESS.swap }));
  // Components: a soft key as each part is used.
  USE_ORDER.forEach((_, k) => at(T.components + USE_AT + k * USE_EVERY, "key", { g: 0.35 }));
  // The components' caption types softly; in the comparison, the header types and each row lands
  // with a soft key.
  at(T.components + beat(0.5), "type", { d: 0.6, g: 0.45 });
  at(T.compare + CMP_AT.header, "type", { d: 0.4, g: 0.45 });
  for (let r = 0; r < COMPARE.length - 1; r++) at(T.compare + CMP_AT.rows + r * CMP_AT.every, "key", { g: 0.4 });
  at(T.formats, "type", { d: beat(0.75), g: 0.6 });
  for (let k = 1; k < 6; k++) at(viewAt(k), "key", { g: 0.4 }); // each format view lands
  at(T.close - PRESS.swap, "press", { swap: PRESS.swap, quietReveal: true });
  // The glyphs click together, one key each, then the name, the line and the address type.
  T.join.forEach((t) => at(t, "key", { g: 0.9 }));
  // A warm swell opens as the name types in.
  at(T.name[0], "swell", { d: DUR - T.name[0], g: 0.55 });
  at(T.name[0], "type", { d: T.name[1] - T.name[0], g: 0.8 });
  at(T.free[0], "type", { d: T.free[1] - T.free[0], g: 0.6 });
  at(T.domain[0], "type", { d: T.domain[1] - T.domain[0], g: 0.5 });
  return { dur: DUR, bpm: BPM, key: "A minor", cues: c.sort((x, y) => x.t - y.t) };
}

// ── The board's frames: what each one shows and sounds like ─────────────────────────────────────
export const STORYBOARD = [
  [0.1, "An empty printed-paper frame. The cursor blinks in steps.", "", "A quick boot under it."],
  [beat(5.6), "░ ▒ ▓ █ typed, one per beat.", "", "One key click per glyph. The ambient bed fades in."],
  [beat(12), "The glyphs step into the corner. Two lines type.", "Less to make. Less to send.", "Typing."],
  [beat(18), "The count lands on 4.0 μs; a funnel appears whole in one frame.", "To draw a figure", "Hard-disk chatter as it counts, a blip as it lands."],
  [beat(25), "The bars grow cell by cell: 354 B against 22.8 KB.", "65× smaller", "Floppy head steps; the blip on 65×."],
  [beat(31), "Ten of the kit's interface parts build in, each labelled.", "The parts a wireframe is made of.", "The press, then soft typing."],
  [beat(37), "Each part is used in turn: the switch flips, the box is ticked, the radio moves, the day changes, the tab moves, the list moves, Save is pressed.", "The parts a wireframe is made of.", "A soft key click per part."],
  [beat(43), "Compared: the table's frame draws on, the header types.", "Most ASCII tools · Glyph kit", "The press, then typing."],
  [beat(51), "One row a beat; the Glyph kit column lands in green.", "Made by · Covers · Moves · Ends as · Made-up data", "A soft key as each row lands."],
  [beat(60), "A screen wireframe builds in, then gets used: the switch, the day, Save.", "Screen wireframe", "The press between each example."],
  [beat(68), "A funnel: the bars grow, the numbers count up, then a light passes along the bars.", "Funnel", ""],
  [beat(76), "The rework loop moves: work flows along the lines, a third comes back from QA.", "Rework loop", ""],
  [beat(84), "The motion card plays the toast it describes.", "Motion intent", ""],
  [beat(92), "The work queue moves; Review holds everything up.", "Work queue", ""],
  [beat(98.5), "One file, every format: the funnel as a Markdown file, built in; the cursor blinks after its last line.", "One file, every format. · Markdown", "The press, then typing."],
  [beat(102), "The same funnel in MDX: the import, the component tag and the rendered box, a light passing along its bars.", "MDX", "A soft key as each view lands."],
  [beat(105.5), "A prototype in a browser window: the weekly summary switches on, Save is pressed.", "Prototype", ""],
  [beat(109), "A slide: the funnel large, the progress bar fills and the count steps to 04 / 12.", "Deck", ""],
  [beat(112.5), "A report page: the summary lines fill in above the funnel; 1 / 6 at the foot.", "PDF report", ""],
  [beat(116), "The funnel alone on a fine backdrop that stands for transparency, labelled funnel.svg · 1080 × 540.", "SVG · PNG", ""],
  [beat(121), "The frame clears. The four glyphs wait spaced apart, then slide together one at a time.", "", "A click as each one lands."],
  [beat(131), "The name, the line and the address type under them.", "Glyph kit · Free forever. · glyph-kit.traykov.cc", "A warm swell, then typing."]
].map(([t, picture, words, sound], i) => ({ id: String(i + 1).padStart(2, "0"), t: +t.toFixed(2), picture, words, sound }));

// ── Wiring: seek for the renderer, a player for people ──────────────────────────────────────────
const params = new URLSearchParams(location.search);
if (params.has("render")) document.body.classList.add("render");
await document.fonts.load(`33px ${FONT}`);
LOGO = await new Promise((ok) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => ok(null);
  img.src = "assets/logo.svg";
});
await prepare();
window.DUR = DUR;
window.seek = (t) => draw(Math.max(0, Math.min(DUR, t)));
window.__cues = cues;
window.__storyboard = STORYBOARD;
// For the audit (audit.mjs): where presses run, which views should always be moving, and hard cuts.
window.__sections = () => [
  ...pressAt.map((p) => ({ kind: "press", from: p - PRESS.swap, to: p - PRESS.swap + PRESS.total })),
  { kind: "moving", name: "Components", from: T.components + USE_AT, to: T.compare - PRESS.swap },
  ...T.examples.map((e, i) => ({ kind: "moving", name: EX[i].title, from: e, to: (T.examples[i + 1] ?? T.formats) - PRESS.swap })),
  { kind: "moving", name: "Formats", from: viewAt(0) + 0.8, to: T.close - PRESS.swap },
  ...[T.mark, ...T.stats].map((t) => ({ kind: "cut", from: t }))
];
window.__ex = () => EX.map((e) => [e.title, e.plan.total, e.fs]);
window.seek(0);
window.__ready = true;

const scrub = document.getElementById("scrub");
const time = document.getElementById("time");
const play = document.getElementById("play");
scrub.max = String(DUR);
let playing = false;
let start = 0;
const loop = (now) => {
  if (!playing) return;
  const t = (now - start) / 1000;
  if (t >= DUR) return (playing = false), (play.textContent = "Play");
  scrub.value = String(t);
  time.textContent = `${t.toFixed(2)} s`;
  window.seek(t);
  requestAnimationFrame(loop);
};
play.addEventListener("click", () => {
  playing = !playing;
  play.textContent = playing ? "Pause" : "Play";
  if (playing) {
    start = performance.now() - Number(scrub.value) * 1000;
    requestAnimationFrame(loop);
  }
});
scrub.addEventListener("input", () => {
  time.textContent = `${Number(scrub.value).toFixed(2)} s`;
  window.seek(Number(scrub.value));
});
