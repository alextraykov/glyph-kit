import { Grid } from "../live/grid.mjs";
import { cells, cut, width, padStart } from "../text.mjs";

// Existing 120ms clock; new chart sequences advance six logical steps per tick.
// A 180-step sequence settles in 3.6s, with a 2.4s readable hold.
export const MOTION_RATE = 6;
export const staggerDelay = (index, count, span = 36) => count < 2 ? 0 : span * (1 - 2 ** (-8 * index / (count - 1))) / (1 - 2 ** -8);
export const cycle = (step, frac = 0, end = 180, period = 300) => Grid.settled ? end : (step % period) + frac;
export const motionProgress = (time, start = 0, duration = 90) => Math.max(0, Math.min(1, (time - start) / Math.max(1, duration)));

/** Layout and cell coordinates are computed once, never in the frame loop. */
export function motionCanvas(text, extraRows = 0) {
  const lines = text.split("\n");
  const matrix = lines.map(cells);
  const cols = Math.max(1, ...lines.map(width));
  if (cols > 80) throw new Error("This moving figure needs more than 80 cells; shorten its labels or use fewer columns.");
  return { lines, matrix, cols, rows: lines.length + extraRows, grid() { const grid = new Grid(lines.length + extraRows, cols); lines.forEach((line, row) => grid.text(row, 0, line)); return grid; } };
}

export function motionFactory(canvas, draw, still = 180) {
  return { still, make: () => (step, frac = 0) => { const grid = canvas.grid(); draw(grid, cycle(step * MOTION_RATE, frac * MOTION_RATE, still, still + 120), Math.floor(step * MOTION_RATE)); return grid; } };
}

export function growBar(grid, row, marks, progress, { reverse = false, head = false } = {}) {
  const ordered = reverse ? [...marks].reverse() : marks;
  const count = Math.ceil(ordered.length * progress);
  ordered.forEach((col, index) => {
    if (index >= count) grid.put(row, col, "·", "mute");
    else if (head && index === count - 1 && progress < 1) grid.put(row, col, "▓");
  });
}

export function countUp(grid, row, column, target, progress, size, format = String) {
  if (progress >= 1) return;
  grid.text(row, column, padStart(cut(format(Math.round(target * progress)), size), size));
}

export function timeCursor(grid, row, start, end, progress, role = "") {
  const column = start + (end - start) * progress;
  grid.glide(row, column, "▓", role);
  if (column - 1 >= start) grid.glide(row, column - 1, "▒", role);
  if (column - 2 >= start) grid.glide(row, column - 2, "░", role);
}

export function motionMarks(canvas, pattern) {
  return canvas.matrix.map((row) => row.flatMap((char, col) => char && pattern.test(char) ? [col] : []));
}

export function motionCounters(canvas, marks, lang) {
  const parts = new Intl.NumberFormat(lang ?? "en-US").formatToParts(12345.6);
  const group = parts.find(p => p.type === "group")?.value ?? ",";
  const decimal = parts.find(p => p.type === "decimal")?.value ?? ".";
  const parse = (text) => Number(text.split(group).join("").replace(decimal, "."));
  const format = lang ? (n) => new Intl.NumberFormat(lang).format(n) : String;
  return canvas.lines.flatMap((line, row) => {
    if (!marks[row]?.length) return [];
    const start = marks[row].at(-1) + 1;
    const tail = canvas.matrix[row].slice(start).join("");
    return [...tail.matchAll(/-?\d+(?:[,.]\d+)*(?:e[+-]?\d+)?/g)].filter(match => !/[<>~≈]/u.test(tail.slice(0, match.index))).map((match) => ({ row, col: start + width(tail.slice(0, match.index)), size: width(match[0]), value: parse(match[0]), format })).filter((item) => Number.isFinite(item.value));
  });
}

/** The still step of a fresh diagram, with text settled. Every kind draws a frame from its step
 *  alone (the queue catches itself up), so no earlier frames need drawing first. */
export function stillGrid(make, still) {
  const frame = make();
  let g;
  Grid.settled = true;
  try { g = frame(still, 0); } finally { Grid.settled = false; }
  return g;
}


