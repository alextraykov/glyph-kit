// Colour by role in the terminal. The roles are the ones paint.mjs gives HTML; only the codes differ.
// Without a theme: the 16 standard colours, so the terminal's own palette decides the exact shade.
//   problems red, passes green, frame and empty cells dim, data and text the terminal's own colour.
// With a theme and a terminal that says it takes 24-bit colour (COLORTERM=truecolor or 24bit): the
// theme's own colours. Every role still has a word or a glyph, so nothing is lost without colour.
import { classify, paintOptions } from "./paint.mjs";
import { resolveTheme } from "./themes.mjs";
import { cellWidth, graphemes } from "../text.mjs";

const RESET = "\x1b[0m";
const BASIC = { d: "", e: "\x1b[2m", f: "\x1b[2m", x: "\x1b[31m", ok: "\x1b[32m", r1: "\x1b[2m", r2: "", r3: "", r4: "\x1b[1m" };
const ROLE = { d: "data", e: "data", f: "frame", x: "flag", ok: "ok" };

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `\x1b[38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m`;
};

/** The escape code for each role. A theme is used only where the terminal takes 24-bit colour. */
export function ansiCodes(theme, env = process.env) {
  if (theme == null || !/^(truecolor|24bit)$/i.test(env.COLORTERM ?? "")) return BASIC;
  const t = resolveTheme(theme);
  const codes = { ...BASIC };
  for (const [role, name] of Object.entries(ROLE)) codes[role] = (role === "e" ? "\x1b[2m" : "") + rgb(t.colors[name]);
  if (t.ramp) t.ramp.forEach((hex, i) => (codes[`r${i + 1}`] = rgb(hex)));
  return codes;
}

/** Whether to colour: --color and --no-color win, then NO_COLOR, then whether the output is a terminal. */
export const wantsColour = ({ force, stream = process.stdout, env = process.env } = {}) =>
  force ?? (env.NO_COLOR ? false : Boolean(stream.isTTY));

/** A figure's text with colour codes by role. spec gives the ramp for density grids. */
export function ansi(text, { spec, theme, env } = {}) {
  const codes = ansiCodes(theme ?? spec?.theme, env);
  const opts = paintOptions(spec);
  return text
    .split("\n")
    .map((line) => {
      const roles = classify(line, opts);
      let out = "";
      let open = "";
      let col = 0;
      for (const ch of graphemes(line)) {
        const code = ch === " " ? open : codes[roles[col]] ?? "";
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
