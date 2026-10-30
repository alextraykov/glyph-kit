// Colour by role, for the HTML and deck forms. The text form stays plain.
// Each character is classed by what it does, so colour carries meaning instead of decoration:
//   gk-d  data      █ ▓ ▒ eighth blocks, sparkline steps, ■        (the measured thing)
//   gk-e  empty     ░                                              (the rest of a scale, projected, missing)
//   gk-f  frame     box drawing, rulers, · and arrows              (structure)
//   gk-x  problem   "fails", "blocked", "x missing", "▼▼ bad", "over" (a verdict, at the line's end)
//   gk-ok success   "AAA", "AA", "done", "ok", "▲▲ great"
//   gk-r1…4 ramp    ░ ▒ ▓ █ in the density grids (heatmap, cohort, calendar strip), one colour a step
//   gk-sw   swatch  ██ followed by its own hex value (palette, colour roles): drawn in that colour
//   gk-m    receded a measure outside the figure's focus (render/focus.mjs)
//   gk-m1…4 receded ramp step: a density grid's cell outside the focus keeps its ramp colour, dimmed
import { cellWidth, graphemes } from "../text.mjs";
import { TONE_ROLE, focusCells } from "./focus.mjs";

const DATA = "█▓▒▀▄▌▐▏▎▍▋▊▉▁▂▃▅▆▇■";
const EMPTY = "░";
const FRAME = "─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬▕·┊►◄▲▼→↺";
// "fails" and "over" are verdicts: they count only at the end of a line, after the value, so a label
// such as "Processes over time" stays plain.
// A verdict is a word on its own: never part of a name like --ok, $done or ok-text.
const PROBLEM = /(?<![\w$.-])(fails|over)(?=\s*$)|(?<![\w$.-])(blocked|x missing[a-z ]*)(?![\w-])|▼▼ bad|(?<![\w$.-])x (?=[a-z])|^x(?=  )/g;
const SAMPLE_STAMP = /SAMPLE DATA/g;
// A swatch shows a colour the figure is about, so it is the one place a cell takes a colour of its own.
const SWATCH = /██(?= (#[0-9a-fA-F]{6})\b)/g;
const SUCCESS = /(?<![\w$.-])(AAA|AA large text only|AA|done|ok, approve|ok)(?![\w-])|▲▲ great/g;

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const RAMP = "░▒▓█";
const roleOf = (ch, ramp) => (ramp && RAMP.includes(ch) ? `r${RAMP.indexOf(ch) + 1}` : DATA.includes(ch) ? "d" : ch === EMPTY ? "e" : FRAME.includes(ch) ? "f" : "");

/** Kinds whose shades are a scale of their own, drawn with the theme's ramp. */
export const RAMP_KINDS = new Set(["heatmap", "cohort", "calendarStrip"]);
/** Paint options for a spec: the ramp for density grids, and, given the drawn text, its focus. Pass
 *  `row` with each line when painting line by line, so the focus lands on the right cells. */
export function paintOptions(spec, text) {
  const opts = { ramp: RAMP_KINDS.has(spec?.kind) };
  if (!spec?.focus || text == null) return opts;
  const { mask, region, tone } = focusCells(text, spec.focus);
  return { ...opts, mask, region, tone };
}
const RECEDES = new Set(["d", "e", "r1", "r2", "r3", "r4"]);
const RAMP_ROLE = /^r[1-4]$/;
// Outside a focus a measure recedes; a ramp step keeps its own colour, dimmed (m1…m4), so a density grid
// still reads light to strong. Inside it, a problem or a pass takes its tone's colour, because the tone
// is the point and the shade glyph still shows the step; a plain focus has no verdict to show, so a ramp
// step keeps its colour and the rest receding is what calls it out.
const receded = (role) => (RAMP_ROLE.test(role) ? `m${role[1]}` : "m");
const focused = (role, tone) => (tone === "plain" && RAMP_ROLE.test(role) ? role : TONE_ROLE[tone] ?? "d");

/** The role of every character in a line: "d", "e", "f", "x", "ok", "r1"…"r4" (with `ramp`), "sw-<hex>", "m" or "m1"…"m4" (receded, outside a focus) or "" (plain text). */
export function classify(line, { ramp = false, mask = null, region = null, tone = "plain", row = -1 } = {}) {
  const word = Array(line.length).fill("");
  SWATCH.lastIndex = 0;
  for (let m; (m = SWATCH.exec(line)); ) word[m.index] = word[m.index + 1] = `sw-${m[1].slice(1).toLowerCase()}`;
  for (const [re, role] of [[SAMPLE_STAMP, "f"], [PROBLEM, "x"], [SUCCESS, "ok"]]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) for (let i = m.index; i < m.index + m[0].length; i++) word[i] ||= role;
  }
  // word[] is indexed by UTF-16 position; map it onto grapheme cells.
  let pos = 0;
  const roles = [];
  for (const cluster of graphemes(line)) {
    const role = word[pos] || roleOf(cluster, ramp);
    roles.push(...Array(cellWidth(cluster)).fill(role));
    pos += cluster.length;
  }
  // A focus: its cells take the tone's role and every other measure recedes.
  if (mask) {
    const here = mask.get(row);
    roles.forEach((role, c) => {
      if (here?.has(c)) roles[c] = focused(role, tone);
      else if (RECEDES.has(role) && region?.has(row)) roles[c] = receded(role);
    });
  }
  return roles;
}

/** One line of a figure as HTML with role spans. opts: { ramp } (see paintOptions), or `roles` when the
 *  line is a piece of a longer one and its roles were read from the whole line. */
export function paintLine(line, opts = {}) {
  const roles = opts.roles ?? classify(line, opts);
  let out = "";
  let run = "";
  let runRole = null;
  const flush = () => {
    if (!run) return;
    out += !runRole ? esc(run) : runRole.startsWith("sw-") ? `<span class="gk-sw" style="color:#${runRole.slice(3)}">${esc(run)}</span>` : `<span class="gk-${runRole}">${esc(run)}</span>`;
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

/** A whole figure. */
export const paint = (text, opts = {}) => text.split("\n").map((line, row) => paintLine(line, { ...opts, row })).join("\n");

/** How far a measure outside the focus recedes: its colour at this opacity. */
export const RECEDE = 0.28;

/** The CSS for the roles, given custom properties for each colour. Without a ramp, ramp cells look
 *  exactly like data and empty cells, receded or not; a theme's ramp sets ${p}ramp1…4 and ${p}ramp-o. */
export const PAINT_CSS = (p) =>
  `.gk-d{color:var(${p}data)}.gk-e{color:var(${p}data);opacity:.45}.gk-m{color:var(${p}data);opacity:${RECEDE}}.gk-f{color:var(${p}frame)}.gk-x{color:var(${p}flag)}.gk-ok{color:var(${p}ok)}` +
  `.gk-r1{color:var(${p}ramp1,var(${p}data));opacity:var(${p}ramp-o,.45)}.gk-r2{color:var(${p}ramp2,var(${p}data))}.gk-r3{color:var(${p}ramp3,var(${p}data))}.gk-r4{color:var(${p}ramp4,var(${p}data))}` +
  [1, 2, 3, 4].map((i) => `.gk-m${i}{color:var(${p}ramp${i},var(${p}data));opacity:${RECEDE}}`).join("");
