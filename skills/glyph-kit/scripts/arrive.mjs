// Arrival: how a figure comes into view, once, in the order that carries its point.
// A type's `arrive(lines, data, options)` returns a function giving each cell its delay in ms. Text
// snaps in when its delay has passed; the figure then stays still. Rules from the motion language:
// order means something, steps inside and curves across, and the rest state is the figure itself.
import { cellWidth, graphemes } from "./text.mjs";

export const ARRIVE_STEP = 40; // ms, the site's step
export const ARRIVE_MAX = 600; // a figure settles within this
// Block cells don't snap: in HTML they step blank → ░ → ▒ → final, so they land two steps after their delay.
export const STEPPED = /[█▓▒■▁▂▃▄▅▆▇▏▎▍▌▋▊▉]/u;
export const STEPPED_LAND = 2 * ARRIVE_STEP;

const BOX = "─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬┄┆";
const snap = (ms) => Math.round(ms / ARRIVE_STEP) * ARRIVE_STEP;

/** Delays for n things in order, so the group arrives on an ease-out curve: the first come in quick
 *  succession and the tail settles. The share arrived by time t follows the curve, so each delay is
 *  the curve's inverse. */
export function stagger(n, gap = 80) {
  const total = Math.min(ARRIVE_MAX - ARRIVE_STEP, gap * Math.max(0, n - 1));
  // The group's arrival follows a quadratic ease-out, so the gaps between things grow smoothly.
  const at = (i) => 1 - Math.sqrt(1 - i / n);
  const out = Array.from({ length: n }, (_, i) => snap(n < 2 ? 0 : (total * at(i)) / at(n - 1)));
  // Each thing lands at least one step after the one before, or the order is lost to rounding; past
  // the budget the tail lands together.
  for (let i = 1; i < n; i++) out[i] = Math.min(Math.max(out[i], out[i - 1] + ARRIVE_STEP), ARRIVE_MAX - ARRIVE_STEP);
  return out;
}

/** Each cell's column in cells, line by line, so orders can work in cells rather than characters. */
export function cellsOf(lines) {
  return lines.map((line) => {
    const out = [];
    let col = 0;
    for (const ch of graphemes(line)) {
      out.push({ ch, col });
      col += cellWidth(ch);
    }
    return out;
  });
}

/** Reading order: the frame first, then each line that has content, top to bottom. */
export function readingOrder(lines, { gap = 80 } = {}) {
  const content = lines.map((line) => [...line].some((ch) => ch !== " " && !BOX.includes(ch)));
  const order = content.map((has, r) => (has ? content.slice(0, r).filter(Boolean).length : -1));
  const delays = stagger(content.filter(Boolean).length, gap);
  return (r, col, ch) => (order[r] < 0 || BOX.includes(ch) ? 0 : ARRIVE_STEP + delays[order[r]]);
}

/** Column by column: cells before cuts[0] first, then one group per cut, `step` ms apart. Rules and
 *  dotted lines are there from the start, so the frame stands before the columns arrive. */
export function byColumns({ cuts, step }) {
  return (r, col, ch) => ("─━┄·".includes(ch) ? 0 : cuts.filter((c) => c <= col).length * step);
}

const BAR = /[█▓▒░■▏▎▍▌▋▊▉]/u;

/** Bars fill from their left end at one speed, so a long bar takes longer and the longest finishes
 *  last. The speed is set so the longest bar fits the budget. Labels before a bar are there from the
 *  start; whatever follows a bar lands when the bar stops. */
export function barsFill(lines) {
  const cells = cellsOf(lines);
  const bars = cells.map((row) => {
    const marks = row.filter((c) => BAR.test(c.ch));
    return marks.length ? { start: marks[0].col, end: marks.at(-1).col } : null;
  });
  const longest = Math.max(1, ...bars.filter(Boolean).map((b) => b.end - b.start + 1));
  const steps = Math.floor((ARRIVE_MAX - 3 * ARRIVE_STEP) / ARRIVE_STEP);
  const perStep = Math.ceil(longest / steps);
  const at = (b, col) => ARRIVE_STEP + Math.floor((col - b.start) / perStep) * ARRIVE_STEP;
  return (r, col) => {
    const b = bars[r];
    if (!b || col < b.start) return 0;
    if (col <= b.end) return at(b, col);
    return at(b, b.end) + 2 * ARRIVE_STEP;
  };
}

// Real time, for the motion types: the figure plays the timing it describes, at its real speed.
// These orders are marked `exact`, so their cells snap at their moment instead of stepping.
const exact = (fn) => Object.assign(fn, { exact: true });
const SPEED = /[▁▂▃▄▅▆▇█]/u;

/** Bars labelled "Xms–Yms" fill from their start to their end at real speed; the label lands at the end. */
export function timeline(lines) {
  const cells = cellsOf(lines);
  const rows = cells.map((row, r) => {
    const m = lines[r].match(/(\d+)ms–(\d+)ms/);
    const marks = row.filter((c) => /[█▏▎▍▌▋▊▉]/u.test(c.ch));
    return m && marks.length ? { start: +m[1], end: +m[2], first: marks[0].col, last: marks.at(-1).col } : null;
  });
  return exact((r, col, ch) => {
    const b = rows[r];
    if (!b || "·".includes(ch)) return 0;
    if (col < b.first) return b.start;
    if (col > b.last) return b.end;
    return b.start + ((col - b.first) / (b.last - b.first + 1)) * (b.end - b.start);
  });
}

/** Duration rulers (▕████····▏) fill over their real duration, all starting together, then the rest of
 *  the row lands; a speed graph after the ruler draws over the same duration. */
export function rulerFill(lines, { scaleMs = 500, base = () => 0 } = {}) {
  const cells = cellsOf(lines);
  const rows = cells.map((row, r) => {
    const open = row.find((c) => c.ch === "▕");
    const close = row.find((c) => c.ch === "▏");
    if (!open || !close) return null;
    const ms = Number(lines[r].slice(lines[r].indexOf("▏")).match(/(\d+)ms/)?.[1] ?? 0);
    const speed = row.filter((c) => c.col > close.col && SPEED.test(c.ch));
    return { from: open.col + 1, n: close.col - open.col - 1, close: close.col, ms, speed };
  });
  return exact((r, col, ch) => {
    const b = rows[r];
    const at = base(r, col, ch);
    if (!b) return at;
    if (col <= b.close) return col < b.from || col === b.close || ch === "·" ? 0 : at + (col - b.from) * (scaleMs / b.n);
    if ("│║┃".includes(ch)) return 0;
    const i = b.speed.findIndex((c) => c.col === col);
    if (i >= 0) return at + (i / b.speed.length) * b.ms;
    return at + Math.min(b.ms, scaleMs);
  });
}

/** Frames appear at their own timestamps ("30ms"), one row each. */
export function framesAtTime(lines) {
  return exact((r) => Number(lines[r].match(/^\s*(\d+)ms/)?.[1] ?? 0));
}

/** Speed graphs draw left to right over `ms`, at the pace of time. */
export function speedOverTime(lines, { ms = 500 } = {}) {
  const cells = cellsOf(lines);
  const graphs = cells.map((row) => {
    const first = row.findIndex((c) => SPEED.test(c.ch));
    if (first < 0) return null;
    let end = first;
    while (row[end + 1] && SPEED.test(row[end + 1].ch)) end++;
    return { from: row[first].col, n: end - first + 1 };
  });
  return exact((r, col) => {
    const g = graphs[r];
    return g && col >= g.from && col < g.from + g.n ? ((col - g.from) / g.n) * ms : 0;
  });
}
