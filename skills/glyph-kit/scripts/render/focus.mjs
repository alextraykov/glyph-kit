// Focus: what a figure wants you to look at, for every type, in every form.
//
//   "focus": { "on": ["M2"], "tone": "problem", "say": "Half of every cohort is gone by M2." }
//
// `on` names things as they are drawn: a row's label, a column's heading, or any text in the figure.
// A row and a column together mean the cells where they cross. `tone` is problem, good or plain.
// The kit then does the same thing everywhere:
//   text      a ► line under the figure says what to look at, so it reads without colour;
//   colour    the focused cells take the tone's role (flag, ok, or data at full) and the rest recede;
//   motion    the focused cells arrive last and land with the inverted flash (render/arrive.mjs).
import { cells } from "../text.mjs";

export const TONES = ["problem", "good", "plain"];
/** The role each tone paints its cells with. */
export const TONE_ROLE = { problem: "x", good: "ok", plain: "d" };
// Cells that hold a measure: blocks, shades, eighths and marks. These recede outside the focus.
const MEASURE = /[█▓▒░▀▄▌▐▏▎▍▋▊▉▁▂▃▅▆▇■□·]/u;
const EDGE = /[│║┃┆ ]/u;
const LINE = /[\u2500-\u257f]/u;
const RULE = /[├╞╟╠┝]/u;
/** The line that says what to look at. Its first glyph marks it, so it is never matched itself. */
export const FOCUS_MARK = "►";

const names = (focus) => [focus?.on ?? []].flat().map(String).filter(Boolean);

/** The sentence under a focused figure: its own words, or the names it points at. */
export const focusLine = (focus) => `${FOCUS_MARK} ${focus.say ?? names(focus).join(", ")}`;

/** Every place `name` is drawn in a line of cells, as [start, end) column ranges. */
function find(row, name) {
  const want = cells(name).filter((c) => c !== "");
  const found = [];
  const glyphs = row.map((c, i) => [c, i]).filter(([c]) => c !== "");
  for (let i = 0; i + want.length <= glyphs.length; i++) {
    if (want.every((ch, k) => glyphs[i + k][0] === ch)) {
      const before = glyphs[i - 1]?.[0];
      const after = glyphs[i + want.length]?.[0];
      // Whole words only: "M1" is not found inside "M10".
      if ((!before || !/[\p{L}\p{N}]/u.test(before)) && (!after || !/[\p{L}\p{N}]/u.test(after))) found.push([glyphs[i][1], glyphs[i + want.length - 1][1] + 1]);
    }
  }
  return found;
}

/**
 * The cells a focus points at in a drawn figure: { mask: Map(line → Set(column)), region: Set(line)
 * (the block around it, where everything else recedes), tone, missing }.
 * `missing` lists names that aren't in the figure, so a spec can be refused in plain words.
 */
export function focusCells(text, focus) {
  const lines = text.split("\n").map(cells);
  // Stop at the focus line itself and at the stamp; neither is part of the figure.
  const end = lines.findIndex((l) => l[0] === FOCUS_MARK);
  const figure = end < 0 ? lines : lines.slice(0, end);
  const rows = new Set();
  const spans = [];
  const loose = [];
  const missing = [];
  for (const name of names(focus)) {
    let hit = false;
    figure.forEach((row, r) => {
      for (const [a, b] of find(row, name)) {
        hit = true;
        const lead = row.findIndex((c) => c !== "" && !EDGE.test(c));
        const below = figure.slice(r + 1).findIndex((l) => l.some((c) => MEASURE.test(c)));
        // A heading sits above every measure in its block, or over a table's ├─┤ rule.
        const ruled = RULE.test(figure[r + 1]?.find((c) => c !== "" && c !== " ") ?? "");
        let top = r;
        while (top > 0 && figure[top - 1].some((c) => c !== "" && c !== " ")) top--;
        const above = figure.slice(top, r).some((l) => l.some((c) => MEASURE.test(c)));
        const heading = !row.some((c) => MEASURE.test(c)) && ((below >= 0 && !above) || ruled);
        if (heading) {
          // A heading: its column runs from here to the next heading on the same line.
          const next = row.findIndex((c, i) => i > b && c !== "" && c !== " ");
          spans.push([r, a, next < 0 ? Infinity : next]);
        } else if (a === lead) rows.add(r);
        else loose.push([r, a, b]);
      }
    });
    if (!hit) missing.push(name);
  }
  const mask = new Map();
  const add = (r, c) => (mask.get(r) ?? mask.set(r, new Set()).get(r)).add(c);
  // What a row or column marks: its measures, or, in a figure of words (a table, a checklist, a
  // screen), its words.
  const pick = (r, test) => figure[r].flatMap((c, i) => (test(c) && c !== "" ? [i] : []));
  const measures = (r) => {
    const found = pick(r, (c) => MEASURE.test(c));
    return found.length ? found : pick(r, (c) => c !== " " && !LINE.test(c) && !EDGE.test(c));
  };
  const inSpan = (r, c) => spans.some(([h, a, b]) => r > h && c >= a && c < b);
  // Below a heading, its column runs down until the first blank line.
  const columnRows = (h) => {
    const out = [];
    for (let r = h + 1; r < figure.length && figure[r].some((c) => c !== "" && c !== " "); r++) out.push(r);
    return out;
  };
  if (rows.size && spans.length) for (const r of rows) measures(r).filter((c) => inSpan(r, c)).forEach((c) => add(r, c));
  else {
    for (const r of rows) measures(r).forEach((c) => add(r, c));
    for (const [h, a, b] of spans) for (const r of columnRows(h)) measures(r).filter((c) => c >= a && c < b).forEach((c) => add(r, c));
  }
  for (const [r, a, b] of loose) for (let c = a; c < b; c++) add(r, c);
  // Only the block the focus sits in recedes: a key or a note below a blank line keeps its colour.
  const region = new Set();
  const blank = (r) => !figure[r].some((c) => c !== "" && c !== " ");
  for (const r of mask.keys()) {
    for (let up = r; up >= 0 && !blank(up); up--) region.add(up);
    for (let down = r; down < figure.length && !blank(down); down++) region.add(down);
  }
  return { mask, region, tone: TONES.includes(focus?.tone) ? focus.tone : "plain", missing };
}

/** Problems with a focus, before anything is drawn. */
export function focusProblems(focus) {
  if (focus == null) return [];
  if (typeof focus !== "object" || Array.isArray(focus)) return ['Write focus as { "on": ["a label or heading"], "tone": "problem", "say": "what to see" }.'];
  const out = [];
  if (!names(focus).length) out.push('Focus needs "on": the row labels or column headings to look at, as they are drawn.');
  if (focus.tone != null && !TONES.includes(focus.tone)) out.push(`Focus tone is problem, good or plain, not ${focus.tone}.`);
  return out;
}
