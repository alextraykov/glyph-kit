// The kit's layout rules for the inside of a figure: padding, gaps, labels and how much is solid.
// Generators and the moving grid read these numbers; lint.mjs and the tests check the result.
// reference/layout.md explains each rule with examples.

import { cells, cut, width } from "./text.mjs";

/** Sizes, in character cells and rows. */
export const LAYOUT = {
  pad: 2, // spaces between a box's side and its text, each side (never under 1, sides differ by at most 1)
  gap: 4, // cells between two boxes on one line: room for an arrow ──►
  labelGap: 2, // cells between a label and the meter, bar or line it names
  band: 1, // blank rows between two bands of a figure (two lanes, two teams)
  maxWidth: 80, // columns; generated figures never grow past this
  labelMax: 24,
  rowsMax: 16
};

/** The density ladder, the same scale as the site: what each shade may mean. */
export const DENSITY = {
  "▓": "current, measured, done or shipped: what the eye should land on",
  "▒": "in progress, waiting or blocked",
  "░": "supporting: a trail, a projection, the empty part of a scale",
  "·": "not yet, or an empty cell"
};

const TOP_LEFT = "┌╔┏";
const TOP_RIGHT = "┐╗┓";
const BOTTOM_LEFT = "└╚┗";
const BOTTOM_RIGHT = "┘╝┛";
const SIDE = "│║┃┆";
const DIVIDER_LEFT = "├╠┣╟╞";
const FILL = "░▒▓█·";

/** Width of a box that fits `text` with the standard padding. */
/** Rows that carry marks (sparklines, speed curves, bars) never touch: a blank row goes between
 *  them, so each row reads on its own. Every figure with stacked mark rows uses this. */
export const stack = (rows) => rows.flatMap((row, i) => (i ? ["", row] : [row]));

export const fit = (text, pad = LAYOUT.pad) => width(text) + pad * 2 + 2;

/** Cut a set of labels to the shared limit, always marking removed text. */
export const fitLabels = (labels, max = LAYOUT.labelMax) => labels.map((label) => cut(String(label ?? ""), max));

/** Keep the first rows and report exactly what was left out. */
export function capRows(rows, max = LAYOUT.rowsMax, noun = "rows") {
  const list = Array.from(rows ?? []);
  const omitted = Math.max(0, list.length - max);
  return {
    rows: list.slice(0, max),
    omitted,
    note: omitted ? `… and ${omitted} more ${omitted === 1 ? noun.replace(/s$/, "") : noun}` : ""
  };
}

/** Column widths for a framed table. Widest columns give up space first. */
export function fitColumns(rows, { maxWidth = LAYOUT.maxWidth, min = 4 } = {}) {
  const cols = Math.max(0, ...rows.map((row) => row.length));
  if (!cols) return [];
  const overhead = cols * 3 + 1; // one space each side, dividers, outer sides
  if (overhead + cols * min > maxWidth) throw new Error(`This table has ${cols} columns; ${Math.floor((maxWidth - 1) / (min + 3))} fit at ${maxWidth} cells.`);
  const widths = Array.from({ length: cols }, (_, c) => Math.max(min, ...rows.map((row) => width(String(row[c] ?? "")))));
  while (widths.reduce((a, b) => a + b, overhead) > maxWidth) {
    const widest = Math.max(...widths);
    const c = widths.findIndex((n) => n === widest && n > min);
    if (c < 0) break;
    widths[c]--;
  }
  return widths;
}

/** Test helper: the generated figure obeys the width and closed-frame contract. */
export function assertFits(figure, maxWidth = LAYOUT.maxWidth) {
  const line = figure.split("\n").find((row) => width(row) > maxWidth);
  if (line) throw new Error(`A generated line is ${width(line)} cells wide; the limit is ${maxWidth}.`);
  const boxes = checkBoxes(figure);
  if (boxes.length) throw new Error(`A generated frame is open or its text touches the side on line ${boxes[0].line}.`);
  return figure;
}

/**
 * Find closed boxes in a figure and report text that touches a side.
 * Returns [{ line, col, text }] (1-based), one entry per offending row.
 */
export function checkBoxes(figure) {
  const rows = figure.split("\n").map(cells);
  const problems = [];
  rows.forEach((row, r) => {
    row.forEach((ch, c) => {
      if (!ch || !TOP_LEFT.includes(ch)) return;
      const d = row.findIndex((x, i) => i > c && x && TOP_RIGHT.includes(x));
      if (d < 0) return;
      const content = [];
      for (let y = r + 1; y < rows.length; y++) {
        const a = rows[y][c];
        const b = rows[y][d];
        if (a && b && BOTTOM_LEFT.includes(a) && BOTTOM_RIGHT.includes(b)) {
          content.forEach((yy) => {
            const innerCells = rows[yy].slice(c + 1, d);
            const inner = innerCells.join("");
            if (!inner.trim()) return;
            // A shade fill (a dimmed backdrop, a skeleton) may run to the frame; text may not.
            const fill = (x) => !x || FILL.includes(x);
            const left = innerCells.findIndex((x) => x !== " ");
            const last = innerCells.findLastIndex((x) => x !== " ");
            const right = last < 0 ? innerCells.length : innerCells.length - last - 1;
            if ((left > 0 || fill(innerCells[0])) && (right > 0 || fill(innerCells.at(-1)))) return;
            if (left < 1 || right < 1) problems.push({ line: yy + 1, col: c + 1, text: inner.trim() });
          });
          return;
        }
        if (a && DIVIDER_LEFT.includes(a)) continue;
        if (!a || !b || !SIDE.includes(a) || !SIDE.includes(b)) return;
        content.push(y);
      }
    });
  });
  return problems;
}
