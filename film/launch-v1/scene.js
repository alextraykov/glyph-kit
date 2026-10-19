// Glyph kit, a 30 second film for LinkedIn. 1:1, light, 120 BPM: every key below sits on a beat.
// Every frame is drawn from time alone (seek(t)), so stills, the board and the film come from one
// source. The figures are drawn by the kit itself; the build-in and the dither press are the site's.
// The page also reports its sound cues (window.__cues), which synth.mjs turns into the soundtrack.
import { Grid } from "../skills/glyph-kit/scripts/live/grid.mjs";
import { live, stillGrid } from "../skills/glyph-kit/scripts/live/kinds.mjs";
import { STEP_MS as GRID_STEP } from "../skills/glyph-kit/scripts/live/grid.mjs";
import { resolve } from "../skills/glyph-kit/scripts/registry.mjs";
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

// ── Time ────────────────────────────────────────────────────────────────────────────────────────
const BPM = 120;
const B = 60 / BPM; // seconds per beat
const beat = (n) => n * B;
export const DUR = beat(60); // 30 s
const T = {
  glyphs: [2, 3, 4, 5].map(beat), // the four clicks
  mark: beat(6), // the glyphs step up into the corner
  make: [beat(6), beat(7)], // "Less to make." types
  send: [beat(8.5), beat(9.5)], // "Less to send." types
  stats: [beat(12), beat(16), beat(20)],
  examples: [24, 29, 34, 39, 44].map(beat), // one per five beats; the press covers at each
  formats: beat(49), // one file, every format: six tiles, one per half beat
  close: beat(54), // the last press covers, then reveals an empty frame
  logo: [55, 55.5, 56, 56.5].map(beat), // the sound logo: the four glyphs again
  name: [beat(57), beat(57.75)] // "Glyph kit" types
};

// ── The dither press, as on the site's buttons, over the stage ──────────────────────────────────
const PRESS = { cell: 12, step: 0.04, spread: 0.36, cover: [2, 4, 6, 8], reveal: [6, 4, 2, 0] };
PRESS.swap = PRESS.spread + PRESS.cover.length * PRESS.step; // fully covered here
PRESS.total = PRESS.swap + PRESS.spread + PRESS.reveal.length * PRESS.step;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const curve = (x) => (x >= 1 ? 1 : (1 - Math.pow(2, -8 * x)) / (1 - Math.pow(2, -8)));
const pressAt = [...T.examples, T.formats, T.close]; // each press is fully covered at these times

// ── The examples: six kinds, drawn by the kit ───────────────────────────────────────────────────
const load = (p) => fetch(`../skills/glyph-kit/examples/${p}`).then((r) => r.json());
let EX = [];
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
  ctx.font = `${fs}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  box.ch.forEach((row, r) => {
    let start = 0;
    for (let c = 1; c <= row.length; c++) {
      if (c === row.length || box.cl[r][c] !== box.cl[r][start]) {
        const run = row.slice(start, c).join("");
        if (run.trim()) {
          ctx.fillStyle = colour(box.cl[r][start]);
          ctx.fillText(run, x + start * cw, y + r * lh + fs * 0.12);
        }
        start = c;
      }
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
  return ((value * k) / steps).toFixed(decimals);
}

function footer() {
  if (LOGO) ctx.drawImage(LOGO, M, FOOT, 46, 46 * (908.79 / 873.71));
  text("traykov.cc/glyph-kit", SIZE - M, FOOT + 32, 22, C.caption, "right");
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
  { label: "Size as text, against its picture", value: 65, decimals: 0, unit: "× smaller", note: "354 bytes as text, 22.8 KB as an image." },
  { label: "For a model to look at the picture", value: 297, decimals: 0, unit: " tokens", note: "Median image tokens, 76 to 918." }
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
    const f = EX[1];
    cells(f.box, M, 560, 22);
  }
  if (k === 1) bars(t, g - beat(1));
  if (k === 2) range(t, g - beat(1));
  if (t >= t0 + beat(1)) text(s.note, M, 820, 22, C.caption);
}

/** 354 bytes against 22.8 KB, grown cell by cell. */
function bars(t, t0) {
  if (t < t0) return;
  const n = 40;
  const grow = (cellsWanted) => Math.min(cellsWanted, Math.floor((t - t0) / 0.03));
  const img = grow(n);
  const row = (label, w, extra, y, col) => {
    text(label, M, y, 33, C.caption);
    const x = M + 9 * 33 * CW;
    text(w > 0 ? "█".repeat(w) : "▎", x, y, 33, col);
    if (extra && t >= t0 + n * 0.03) text(extra, x + (Math.max(w, 1) + 1) * 33 * CW, y, 33, C.caption);
  };
  row("text", 0, "354 B", 610, C.ok);
  row("picture", img, "22.8 KB", 670, C.ink);
}

/** The range of image tokens, 76 to 918, with the median, drawn on left to right. */
function range(t, t0) {
  if (t < t0) return;
  const n = 36;
  const lo = 76;
  const hi = 918;
  const med = Math.round(((297 - lo) / (hi - lo)) * (n - 1));
  const shown = Math.min(n, Math.floor((t - t0) / 0.025));
  const line = Array.from({ length: n }, (_, i) => (i === 0 ? "├" : i === n - 1 ? "┤" : i === med ? "█" : "─")).slice(0, shown).join("");
  const x = M + 4 * 33 * CW;
  text("76", M, 640, 33, C.caption);
  text(line, x, 640, 33, C.ink);
  if (shown >= n) text("918", x + (n + 1) * 33 * CW, 640, 33, C.caption);
  if (shown > med) text("297", x + (med - 1) * 33 * CW, 700, 33, C.ink);
}

function example(t, i) {
  const ex = EX[i];
  const t0 = T.examples[i];
  const w = ex.cols * ex.fs * CW;
  const h = ex.rows * ex.fs * 1.25;
  const x = STAGE.x + (STAGE.w - w) / 2;
  const y = STAGE.y + (STAGE.h - h) / 2;
  const ms = ((t - t0) * 1000) / 0.75; // the site's build, a quarter faster for film
  if (ms < ex.plan.total) cells(buildFrame(ex.box, ex.plan, ms), x, y, ex.fs);
  else cells(ex.live ? liveBox(ex, ms - ex.plan.total) : ex.box, x, y, ex.fs);
}

// One file, every format: each format drawn as its own file, in the same block and box characters
// as everything else, and built in the same way as the examples. Six files, one per quarter beat.
const FILES = [
  ["Markdown", [
    "┌─ funnel.md ───────────────┐",
    "│ ### Signup to paid        │",
    "│ ```text                   │",
    "│ visited   ████████  12.4k │",
    "│ signed up ████      6.1k  │",
    "│ activated ██        2.3k  │",
    "│ paid      ▌         610   │",
    "│ ```                       │",
    "│ ░░░░░░░░░░░░ ░░░░░░░░     │",
    "│ Source: analytics export  │",
    "└───────────────────────────┘"]],
  ["MDX", [
    "┌─ funnel.mdx ──────────────┐",
    "│ import Glyph from         │",
    "│   \"./Glyph.astro\";        │",
    "│                           │",
    "│ <Glyph spec={funnel} />   │",
    "│ ┌───────────────────────┐ │",
    "│ │ ████████████   12.4k  │ │",
    "│ │ ██████          6.1k  │ │",
    "│ │ ██              2.3k  │ │",
    "│ └───────────────────────┘ │",
    "└───────────────────────────┘"]],
  ["Prototype", [
    "┌─ settings.html ───────────┐",
    "│ Settings                  │",
    "│ Profile │ Notifications   │",
    "│           ━━━━━━━━━━━━━   │",
    "│ Email me when ready [ ■]  │",
    "│ Weekly summary      [■ ]  │",
    "│ Digest day [ Monday   ▼]  │",
    "│                           │",
    "│     [ Cancel ] [[ Save ]] │",
    "│ ░░░░░░░░░░░░░             │",
    "└───────────────────────────┘"]],
  ["Deck", [
    "┌─ review.html ─────────────┐",
    "│ HOW IT WAS READ           │",
    "│ Every stylesheet read     │",
    "│                           │",
    "│ ┌─────┐  ┌─────┐  ┌────┐  │",
    "│ │ 350 ├─►│ 750 ├─►│ 47 │  │",
    "│ └─────┘  └─────┘  └────┘  │",
    "│                           │",
    "│ ▓▓▓▓░░░░░░░░      04 / 12 │",
    "│                           │",
    "└───────────────────────────┘"]],
  ["PDF report", [
    "┌─ audit.pdf ───────────────┐",
    "│ ░▒▓█                      │",
    "│ Pave motion audit         │",
    "│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒      │",
    "│ ┌───────────────────────┐ │",
    "│ │ 01 ░░░░░░░░░░░░░░░░░░ │ │",
    "│ │ 02 ░░░░░░░░░░░░░      │ │",
    "│ │ 03 ░░░░░░░░░░░░░░░░   │ │",
    "│ └───────────────────────┘ │",
    "│                     1 / 6 │",
    "└───────────────────────────┘"]],
  ["SVG · PNG", [
    "┌─ funnel.svg ──────────────┐",
    "│                           │",
    "│ ████████████████  12,400  │",
    "│ ████████          6,100   │",
    "│ ███               2,300   │",
    "│ ▊                 610     │",
    "│                           │",
    "│ ░░░░░░░░░░░░░░░░░░░░░░░   │",
    "│ 1080 × 540 · 2×           │",
    "│                           │",
    "└───────────────────────────┘"]]
].map(([name, lines]) => {
  const box = centre(cellsFromText(lines.join("\n"), classify), lines.length, 29);
  return { name, lines, box, plan: planBuild(box) };
});

// Once a file is built, it keeps moving with the kit's own motion (live/grid.mjs): a ▓▒░ run
// chases round its frame, and each file moves its own part. All of it in 120 ms steps.
const FILE_MOTION = {
  Markdown: (g, s) => { if (Math.floor(s / 4) % 2 === 0) g.put(7, 5, "_"); }, // the cursor after the fence blinks
  MDX: (g, s) => g.comet(g.perimeter(5, 2, 25, 5), s * 1.6, "", 3.2, true), // the rendered component is live
  Prototype: (g, s) => {
    // The weekly summary switches on, and Save wakes up because something changed.
    const on = Math.floor(s / 10) % 2 === 1;
    g.text(5, 22, on ? "[ ■]" : "[■ ]");
    g.text(8, 17, on ? "[[ Save ]]" : " [ Save ] ");
  },
  Deck: (g, s) => {
    g.stream(g.route([[5, 8], [5, 10]]), s * 0.6, 3); // work passes along the flow
    g.stream(g.route([[5, 17], [5, 19]]), s * 0.6 + 1, 3);
    g.meter(8, 2, 12, (Math.floor(s / 6) % 13) / 12, s); // the deck's progress
  },
  "PDF report": (g, s) => [5, 6, 7].forEach((r, i) => g.meter(r, 7, 18 - i * 3, Math.min(1, Math.max(0, (s - i * 8) / 24)), s)), // the summary fills in
  "SVG · PNG": (g, s) => [[2, 16], [3, 8], [4, 3], [5, 1]].forEach(([r, w], i) => g.meter(r, 2, 16, (w / 16) * (0.85 + 0.15 * Math.sin((s + i * 3) / 6)), s)) // the bars breathe
};
function fileLive(f, ms) {
  const s = ms / 120;
  const g = new Grid(f.lines.length, 29);
  f.lines.forEach((l, r) => g.text(r, 0, l));
  FILE_MOTION[f.name]?.(g, s);
  // The run chases round the frame lines only, so it never covers the file's name.
  const edge = g.perimeter(0, 0, 29, f.lines.length).filter(([r, c]) => "─│┌┐└┘".includes([...f.lines[r]][c]));
  g.comet(edge, s * 1.2 + f.lines.length, "", 4, true);
  return centre(cellsFromText(g.toText(), classify), f.lines.length, 29);
}

function formats(t) {
  const t0 = T.formats;
  typed("One file, every format.", t, t0, t0 + beat(0.75), M, STAGE.y + 8, 44);
  const cols = 3, gap = 24;
  const w = (STAGE.w - gap * (cols - 1)) / cols;
  const fs = Math.floor(w / (29 * CW));
  const h = 11 * fs * 1.25;
  const gridH = 2 * (h + 30) + gap;
  const top = STAGE.y + 64 + Math.max(0, (STAGE.h - 64 - gridH) / 2);
  FILES.forEach((f, k) => {
    const tk = t0 + beat(0.75 + k * 0.25); // one file per quarter beat
    if (t < tk) return;
    const x = M + (k % cols) * (w + gap), y = top + Math.floor(k / cols) * (h + gap + 30);
    const ms = ((t - tk) * 1000) / 0.5; // built twice as fast as the examples, so all six are read in time
    cells(ms < f.plan.total ? buildFrame(f.box, f.plan, ms) : fileLive(f, ms * 0.5 - f.plan.total * 0.5), x, y, fs);
    if (ms > 200) text(f.name, x, y + h + 26, 18, C.caption);
  });
}

function close(t) {
  const cw = big * CW;
  const x0 = (SIZE - 7 * cw) / 2;
  const n = T.logo.filter((g) => t >= g).length;
  GLYPHS.slice(0, n).forEach((g, i) => text(g, x0 + i * 2 * cw, 520, big));
  typed("Glyph kit", t, ...T.name, SIZE / 2, 660, 88, C.ink, "center");
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
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, SIZE, SIZE);
  let title = "";
  if (t < T.mark) intro(t);
  else if (t < T.stats[0]) lines(t);
  else if (t < T.examples[0]) stat(t, t < T.stats[1] ? 0 : t < T.stats[2] ? 1 : 2);
  else if (t >= T.formats && t < T.close) {
    formats(t);
    title = "Formats";
  } else if (t < T.close) {
    const i = T.examples.filter((e) => t >= e).length - 1;
    // Before the first example is covered, the last stat stays under the press.
    if (i < 0) stat(t, 2);
    else {
      example(t, i);
      title = EX[i].title;
    }
  } else if (t >= T.close) close(t);
  header(t, title);
  footer();
  press(t);
}

// ── The soundtrack's cues, from the same timeline ───────────────────────────────────────────────
function cues() {
  const c = [];
  const at = (t, type, o = {}) => c.push({ t: +t.toFixed(4), type, ...o });
  at(0, "room", { d: DUR });
  at(0, "boot", { quick: true }); // under the blinking cursor, done before the first glyph
  T.glyphs.forEach((t) => at(t, "key"));
  at(T.make[0], "type", { d: T.make[1] - T.make[0] });
  at(T.send[0], "type", { d: T.send[1] - T.send[0] });
  at(T.stats[0], "pad", { d: T.close - T.stats[0] + 1, every: 6 });
  T.stats.forEach((t0, k) => {
    at(t0, "type", { d: beat(0.5), g: 0.6 });
    at(t0 + beat(1), "roll", { d: beat(1) });
    at(t0 + beat(2), "land", { deg: [5, 3, 1][k], oct: 5 });
    if (k === 1) at(t0 + beat(1), "fill", { steps: 4, dir: 1, every: 0.3 });
  });
  [...T.examples, T.formats].forEach((t) => at(t - PRESS.swap, "press", { swap: PRESS.swap }));
  at(T.formats, "type", { d: beat(0.75), g: 0.6 });
  for (let b = 24; b < 54; b++) if ((b - 24) % 5) at(beat(b), "tick");
  at(T.close - PRESS.swap, "press", { swap: PRESS.swap, quietReveal: true });
  // Half a beat of silence, then the sound logo: four soft tones rising F, A, C, E, one per glyph,
  // opening into a warm swell as the name types in.
  T.logo.forEach((t, k) => at(t, "logoKey", { deg: [6, 8, 10, 12][k], oct: 4, step: k }));
  at(T.name[0], "swell", { d: DUR - T.name[0] });
  at(T.name[0], "type", { d: T.name[1] - T.name[0], g: 0.8 });
  return { dur: DUR, bpm: BPM, key: "A minor", cues: c.sort((x, y) => x.t - y.t) };
}

// ── The board's frames: what each one shows and sounds like ─────────────────────────────────────
export const STORYBOARD = [
  [0.1, "An empty printed-paper frame. The cursor blinks in steps.", "", "The computer boots under it: power, fan, the floppy seek, the BIOS beep. The room's hum stays, very quiet."],
  [beat(4.2), "░ ▒ ▓ typed, one per beat.", "", "One keyboard click per glyph, on the beat."],
  [beat(5.6), "All four glyphs.", "", "The fourth click."],
  [beat(7.4), "The glyphs step into the corner. The first line types.", "Less to make.", "Typing."],
  [beat(11), "The second line.", "Less to send.", "Typing."],
  [beat(14.6), "The count lands on 4.0 μs; a funnel appears whole in one frame.", "To draw a figure", "Hard-disk chatter as it counts, a PC-speaker blip as it lands. The bed comes in: calm, warm lo-fi."],
  [beat(18.8), "The bars grow cell by cell: 354 B against 22.8 KB.", "65× smaller", "Floppy head steps as the bars grow; the blip on 65×."],
  [beat(22.6), "The range of image tokens draws on, 76 to 918, the median marked.", "297 tokens", "Chatter, then the blip."],
  [beat(24) - 0.06, "The dither press covers the frame.", "", "The press: soft digital blips stepping up, a low tick at full cover."],
  [beat(25.5), "A screen wireframe builds in: lines draw on, words scramble and settle.", "Screen wireframe", "The blips step down as it reveals. A hard-disk tick on each beat from here."],
  [beat(31.5), "A funnel: the bars grow, the numbers count up.", "Funnel", "The press between each example; ticks on the beat."],
  [beat(37), "The rework loop moves: work flows, a third comes back from QA.", "Rework loop", ""],
  [beat(42), "The motion intent card builds in.", "Motion intent", ""],
  [beat(47.5), "The work queue moves; Review holds everything up.", "Work queue", ""],
  [beat(50.6), "One file, every format: each format arrives as its own file, drawn in glyphs and built in, one per quarter beat.", "One file, every format.", "The press, then typing for the line."],
  [beat(52.7), "All six files, each moving with the kit's own motion: a ▓▒░ run chases round every frame; the prototype's switch flips and Save wakes up; work passes along the deck's flow; the report's summary fills in; the SVG's bars breathe.", "One file, every format.", "Ticks on the beat."],
  [beat(56.2), "The last press clears to an empty frame; after half a beat of silence the four glyphs type again.", "", "The sound logo: four soft tones rising F, A, C, E, one per glyph."],
  [beat(59.5), "The name types under them. The footer stays.", "Glyph kit", "The tones open into a warm swell as the name types; the swell rings out."]
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
