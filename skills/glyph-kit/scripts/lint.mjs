#!/usr/bin/env node
// Checks the ```text blocks in Markdown files:
//   1. letters, numbers, marks and punctuation in any script pass; drawing symbols stay measured;
//   2. every framed box has rows of equal width, from its top corner to its bottom corner;
//   3. text inside a box keeps at least one space from each side (reference/layout.md);
//   4. a warning when a figure likely costs more tokens as text than as an image (an estimate).
// Usage: node scripts/lint.mjs <file.md>…   Exits 1 when anything fails.
import { checkBoxes } from "./layout.mjs";
import { budget } from "./tokens.mjs";
import { cells, graphemes, width, isRtl } from "./text.mjs";
import { readFileSync } from "node:fs";

// Measured at exactly one cell in Departure Mono 11px and Menlo 13px (Chrome, macOS).
export const MEASURED =
  "░▒▓█▀▄▌▐▏▎▍▋▊▉▁▂▃▅▆▇▕·■□▲▼◄►→↕–“”×┊" + "─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬╭╮╰╯" + "┄┆╎╷╵";
// One cell in Menlo but 0.95 in Departure Mono: allowed with a warning.
export const DRIFTS = "↺▶✓✗≡▸";

const TOP = /[┌╔┏╭]/;
const BOTTOM = /[└╚┗╰]/;

/** Problems in one text block. Returns [{ level, line, message }]. */
export function lintBlock(text, offset = 0) {
  const problems = [];
  const lines = text.split("\n");
  if (isRtl(text)) problems.push({ level: "info", line: offset + 1, message: "Mixed RTL text can reorder in a browser pre; prefer SVG or PNG for cell-positioned labels." });
  lines.forEach((line, i) => {
    for (const cluster of new Set(graphemes(line))) {
      if (/\p{Emoji_Presentation}|\p{Regional_Indicator}|\ufe0f/u.test(cluster)) {
        problems.push({ level: "warn", line: offset + i + 1, message: `"${cluster}" may use an emoji font; check that it stays on the cell grid` });
        continue;
      }
      for (const ch of cluster) {
        const code = ch.codePointAt(0);
        if (code <= 126 || MEASURED.includes(ch) || /[\p{Letter}\p{Number}\p{Mark}\p{Punctuation}\p{Separator}]/u.test(ch)) continue;
        problems.push({
          level: DRIFTS.includes(ch) ? "warn" : "error",
          line: offset + i + 1,
          message: DRIFTS.includes(ch)
            ? `"${ch}" is narrower in Departure Mono (0.95 of a cell)`
            : `"${ch}" (U+${code.toString(16).toUpperCase().padStart(4, "0")}) isn't in the measured set; check its width`
        });
      }
    }
    if (width(line) > 80) problems.push({ level: "warn", line: offset + i + 1, message: `line is ${width(line)} cells wide; keep figures at 80 or fewer` });
  });
  // Each top-left corner opens a frame that ends at the next top-right corner on the same line.
  // Every row below must keep a left and right edge in those columns until the bottom corners.
  const rows = lines.map(cells);
  const LEFT = "│║┃├╠┣└╚┗╰";
  const RIGHT = "│║┃┤╣┫┘╝┛╯▲▼■░▒▓█·"; // scrollbars and the moving grid's held edge markers
  rows.forEach((row, i) => {
    row.forEach((ch, c) => {
      if (!TOP.test(ch)) return;
      const end = row.findIndex((x, k) => k > c && /[┐╗┓╮]/.test(x));
      if (end < 0) return;
      for (let j = i + 1; j < rows.length; j++) {
        const left = rows[j][c];
        if (!left || !LEFT.includes(left)) return; // not a frame we can follow (an overlay, a diagram)
        const right = rows[j][end];
        if (!right || !RIGHT.includes(right)) {
          problems.push({ level: "error", line: offset + j + 1, message: `right edge missing at column ${end + 1} (frame opened on line ${offset + i + 1})` });
          return;
        }
        if (BOTTOM.test(left)) return;
      }
    });
  });
  // Text inside a box keeps at least one space from each side (reference/layout.md).
  for (const p of checkBoxes(text)) problems.push({ level: "error", line: offset + p.line, message: `"${p.text}" touches its box; keep at least one space each side` });
  // Token budget (an estimate, see tokens.mjs): warn when the text likely costs more than a picture of it.
  const b = budget(text);
  if (b.costlier)
    problems.push({ level: "warn", line: offset + 1, message: `as text this figure is about ${b.asText} tokens, more than the ~${b.asImage} of an image of it. For model context, pass the spec or use --compact (about ${b.asCompact})` });
  return problems;
}

/** All problems in a Markdown file's text blocks. */
export function lintMarkdown(source) {
  const problems = [];
  const re = /```text\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(source))) {
    const offset = source.slice(0, m.index).split("\n").length;
    problems.push(...lintBlock(m[1].replace(/\n$/, ""), offset));
  }
  return problems;
}

if (typeof process !== "undefined" && process.argv?.[1] && import.meta.url === `file://${process.argv[1]}`) {
  let failed = false;
  for (const file of process.argv.slice(2)) {
    for (const p of lintMarkdown(readFileSync(file, "utf8"))) {
      if (p.level === "error") failed = true;
      console.log(`${file}:${p.line}  ${p.level}  ${p.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}
