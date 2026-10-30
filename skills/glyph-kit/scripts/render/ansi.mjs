// Colour by role in the terminal. The roles are the ones paint.mjs gives HTML; only the codes differ.
// Without a theme: the 16 standard colours, so the terminal's own palette decides the exact shade.
//   problems red, passes green, frame and empty cells dim, data and text the terminal's own colour.
// In a terminal that says it takes 24-bit colour (COLORTERM=truecolor or 24bit): a theme's own
// colours when one is given, and swatches (██ #hex) in their own colour. Every role still has a word or a
// glyph, so nothing is lost without colour.
import { classify, paintOptions } from "./paint.mjs";
import { resolveTheme } from "./themes.mjs";
import { cellWidth, graphemes } from "../text.mjs";

const RESET = "\x1b[0m";
// Receded cells (m, and m1…m4 for ramp steps) are dim: in 24-bit colour, dim in their own colour.
const DIM = "\x1b[2m";
const BASIC = { d: "", m: DIM, e: DIM, f: DIM, x: "\x1b[31m", ok: "\x1b[32m", r1: DIM, r2: "", r3: "", r4: "\x1b[1m", m1: DIM, m2: DIM, m3: DIM, m4: DIM };
const ROLE = { d: "data", e: "data", m: "data", f: "frame", x: "flag", ok: "ok" };

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `\x1b[38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m`;
};

/** The escape code for each role. A theme is used only where the terminal takes 24-bit colour. */
export function ansiCodes(theme, env = process.env) {
  if (theme == null || !/^(truecolor|24bit)$/i.test(env.COLORTERM ?? "")) return BASIC;
  const t = resolveTheme(theme);
  const codes = { ...BASIC };
  for (const [role, name] of Object.entries(ROLE)) codes[role] = (role === "e" || role === "m" ? DIM : "") + rgb(t.colors[name]);
  for (let i = 1; i <= 4; i++) codes[`m${i}`] = DIM + rgb(t.ramp?.[i - 1] ?? t.colors.data);
  if (t.ramp) t.ramp.forEach((hex, i) => (codes[`r${i + 1}`] = rgb(hex)));
  return codes;
}

/** Whether to colour: --color and --no-color win, then NO_COLOR, then whether the output is a terminal. */
export const wantsColour = ({ force, stream = process.stdout, env = process.env } = {}) =>
  force ?? (env.NO_COLOR ? false : Boolean(stream.isTTY));

/** A figure's text with colour codes by role. spec gives the ramp for density grids. */
export function ansi(text, { spec, theme, env } = {}) {
  const codes = ansiCodes(theme ?? spec?.theme, env);
  const truecolour = /^(truecolor|24bit)$/i.test((env ?? process.env).COLORTERM ?? "");
  const opts = paintOptions(spec, text);
  return text
    .split("\n")
    .map((line, row) => {
      const roles = classify(line, { ...opts, row });
      let out = "";
      let open = "";
      let col = 0;
      for (const ch of graphemes(line)) {
        const role = roles[col];
        const code = ch === " " ? open : role?.startsWith("sw-") ? (truecolour ? rgb(`#${role.slice(3)}`) : "") : codes[role] ?? "";
        if (code !== open) {
          out += (open ? RESET : "") + code;
          open = code;
        }
        out += ch;
        col += cellWidth(ch);
      }
      return out + (open ? RESET : "");
    })
    .join("\n");
}
