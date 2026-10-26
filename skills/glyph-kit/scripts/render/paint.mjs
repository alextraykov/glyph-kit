// Colour by role, for the HTML and deck forms. The text form stays plain.
// Each character is classed by what it does, so colour carries meaning instead of decoration:
//   gk-d  data      █ ▓ ▒ eighth blocks, sparkline steps, ■        (the measured thing)
//   gk-e  empty     ░                                              (the rest of a scale, projected, missing)
//   gk-f  frame     box drawing, rulers, · and arrows              (structure)
//   gk-x  problem   "fails", "blocked", "x missing", "▼▼ bad", "over"
//   gk-ok success   "AAA", "AA", "done", "ok", "▲▲ great"
//   gk-u  under     a page under a layer (drawer, sheet, popover, menu, toast), in the muted colour
import { cellWidth, graphemes } from "../text.mjs";

const DATA = "█▓▒▀▄▌▐▏▎▍▋▊▉▁▂▃▅▆▇■";
const EMPTY = "░";
const FRAME = "─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬▕·┊►◄▲▼→↺";
const PROBLEM = /\b(fails|blocked|x missing[a-z ]*|over)\b|▼▼ bad|\bx (?=[a-z])|^x(?=  )/g;
const SAMPLE_STAMP = /SAMPLE DATA/g;
const SUCCESS = /\b(AAA|AA large text only|AA|done|ok, approve|ok)\b|▲▲ great/g;

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const roleOf = (ch) => (DATA.includes(ch) ? "d" : ch === EMPTY ? "e" : FRAME.includes(ch) ? "f" : "");

/** The role of every character in a line: "d", "e", "f", "x", "ok", "u" (with a mask) or "" (plain
 *  text). opts.mask: one letter per cell, p page, l layer, s shadow (a page kind's mask). Page cells
 *  under a layer are "u", except its rules; shadow cells are frame; layer cells keep their roles. */
export function classify(line, { mask } = {}) {
  const word = Array(line.length).fill("");
  for (const [re, role] of [[SAMPLE_STAMP, "f"], [PROBLEM, "x"], [SUCCESS, "ok"]]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) for (let i = m.index; i < m.index + m[0].length; i++) word[i] ||= role;
  }
  // word[] is indexed by UTF-16 position; map it onto grapheme cells.
  let pos = 0;
  const roles = [];
  for (const cluster of graphemes(line)) {
    const role = word[pos] || roleOf(cluster);
    roles.push(...Array(cellWidth(cluster)).fill(role));
    pos += cluster.length;
  }
  if (!mask) return roles;
  return roles.map((role, col) => (mask[col] === "p" ? (role === "f" ? "f" : "u") : mask[col] === "s" ? "f" : role));
}

/** One line of a figure as HTML with role spans. opts: { mask } (see classify). */
export function paintLine(line, opts = {}) {
  const roles = classify(line, opts);
  let out = "";
  let run = "";
  let runRole = null;
  const flush = () => {
    if (!run) return;
    out += runRole ? `<span class="gk-${runRole}">${esc(run)}</span>` : esc(run);
    run = "";
  };
  let col = 0;
  graphemes(line).forEach((ch) => {
    const role = (ch === " " ? runRole : roles[col]) || "";
    if (role !== runRole) {
      flush();
      runRole = role;
    }
    run += ch;
    col += cellWidth(ch);
  });
  flush();
  return out;
}

/** A whole figure. opts.mask: the figure's mask, one string a line. */
export const paint = (text, opts = {}) => text.split("\n").map((line, i) => paintLine(line, { ...opts, mask: opts.mask?.[i] })).join("\n");

/** The CSS for the roles, given custom properties for each colour. */
export const PAINT_CSS = (p) =>
  `.gk-d{color:var(${p}data)}.gk-e{color:var(${p}data);opacity:.45}.gk-f{color:var(${p}frame)}.gk-x{color:var(${p}flag)}.gk-ok{color:var(${p}ok)}.gk-u{color:var(${p}muted)}`;
