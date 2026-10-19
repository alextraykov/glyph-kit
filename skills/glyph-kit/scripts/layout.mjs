// The kit's layout rules for the inside of a figure: padding, gaps, labels and how much is solid.
// Generators and the moving grid read these numbers; lint.mjs and the tests check the result.
// reference/layout.md explains each rule with examples.

/** Sizes, in character cells and rows. */
export const LAYOUT = {
  pad: 2, // spaces between a box's side and its text, each side (never under 1, sides differ by at most 1)
  gap: 4, // cells between two boxes on one line: room for an arrow ──►
  labelGap: 2, // cells between a label and the meter, bar or line it names
  band: 1, // blank rows between two bands of a figure (two lanes, two teams)
  maxWidth: 80 // columns; wider figures scroll in their own box
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
export const fit = (text, pad = LAYOUT.pad) => [...text].length + pad * 2 + 2;

/**
 * Find closed boxes in a figure and report text that touches a side.
 * Returns [{ line, col, text }] (1-based), one entry per offending row.
 */
export function checkBoxes(figure) {
  const rows = figure.split("\n").map((l) => [...l]);
  const problems = [];
  rows.forEach((row, r) => {
    row.forEach((ch, c) => {
      if (!TOP_LEFT.includes(ch)) return;
      const d = row.findIndex((x, i) => i > c && TOP_RIGHT.includes(x));
      if (d < 0) return;
      const content = [];
      for (let y = r + 1; y < rows.length; y++) {
        const a = rows[y][c];
        const b = rows[y][d];
        if (BOTTOM_LEFT.includes(a) && BOTTOM_RIGHT.includes(b)) {
          content.forEach((yy) => {
            const inner = rows[yy].slice(c + 1, d).join("");
            if (!inner.trim()) return;
            // A shade fill (a dimmed backdrop, a skeleton) may run to the frame; text may not.
            const fill = (x) => !x || FILL.includes(x);
            const left = inner.length - inner.trimStart().length;
            const right = inner.length - inner.trimEnd().length;
            if ((left || fill(inner[0])) && (right || fill(inner.at(-1)))) return;
            if (left < 1 || right < 1) problems.push({ line: yy + 1, col: c + 1, text: inner.trim() });
          });
          return;
        }
        if (DIVIDER_LEFT.includes(a)) continue;
        if (!SIDE.includes(a) || !SIDE.includes(b)) return;
        content.push(y);
      }
    });
  });
  return problems;
}
