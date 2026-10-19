// Colour by role, for the HTML and deck forms. The text form stays plain.
// Each character is classed by what it does, so colour carries meaning instead of decoration:
//   gk-d  data      █ ▓ ▒ eighth blocks, sparkline steps, ■        (the measured thing)
//   gk-e  empty     ░                                              (the rest of a scale, projected, missing)
//   gk-f  frame     box drawing, rulers, · and arrows              (structure)
//   gk-x  problem   "fails", "blocked", "x missing", "▼▼ bad", "over"
//   gk-ok success   "AAA", "AA", "done", "ok", "▲▲ great"
const DATA = "█▓▒▀▄▌▐▏▎▍▋▊▉▁▂▃▅▆▇■";
const EMPTY = "░";
const FRAME = "─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬▕·┊►◄▲▼→↺";
const PROBLEM = /\b(fails|blocked|x missing[a-z ]*|over)\b|▼▼ bad|\bx (?=[a-z])/g;
const SAMPLE_STAMP = /SAMPLE DATA/g;
const SUCCESS = /\b(AAA|AA large text only|AA|done|ok, approve|ok)\b|▲▲ great/g;

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const roleOf = (ch) => (DATA.includes(ch) ? "d" : ch === EMPTY ? "e" : FRAME.includes(ch) ? "f" : "");

/** The role of every character in a line: "d", "e", "f", "x", "ok" or "" (plain text). */
export function classify(line) {
  const chars = [...line];
  const word = Array(line.length).fill("");
  for (const [re, role] of [[SAMPLE_STAMP, "f"], [PROBLEM, "x"], [SUCCESS, "ok"]]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) for (let i = m.index; i < m.index + m[0].length; i++) word[i] ||= role;
  }
  // word[] is indexed by UTF-16 position; map it onto characters.
  let pos = 0;
  return chars.map((ch) => {
    const role = word[pos] || roleOf(ch);
    pos += ch.length;
    return role;
  });
}

/** One line of a figure as HTML with role spans. */
export function paintLine(line) {
  // Mark word-level roles first, by character position.
  const word = Array(line.length).fill("");
  for (const [re, role] of [[SAMPLE_STAMP, "f"], [PROBLEM, "x"], [SUCCESS, "ok"]]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) for (let i = m.index; i < m.index + m[0].length; i++) word[i] ||= role;
  }
  let out = "";
  let run = "";
  let runRole = null;
  const flush = () => {
    if (!run) return;
    out += runRole ? `<span class="gk-${runRole}">${esc(run)}</span>` : esc(run);
    run = "";
  };
  [...line].forEach((ch, i) => {
    const role = word[i] || (ch === " " ? runRole : roleOf(ch)) || "";
    if (role !== runRole) {
      flush();
      runRole = role;
    }
    run += ch;
  });
  flush();
  return out;
}

/** A whole figure. */
export const paint = (text) => text.split("\n").map(paintLine).join("\n");

/** The CSS for the roles, given custom properties for each colour. */
export const PAINT_CSS = (p) =>
  `.gk-d{color:var(${p}data)}.gk-e{color:var(${p}data);opacity:.45}.gk-f{color:var(${p}frame)}.gk-x{color:var(${p}flag)}.gk-ok{color:var(${p}ok)}`;
