// Writes two figures for each seasonal palette into docs/palettes/: <name>.json, a palette figure of
// every colour faintest to strongest on its panel, and <name>-colour-blind.json, a contrast figure of
// the problem and good colours on the panel as drawn and as seen with weak red or weak green cones.
// The views use Machado, Oliveira and Fernandes (2009) at full strength, applied in linear RGB.
// Run after changing a palette: node tools/palette-figures.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTES, RAMPS, luminance } from "../skills/glyph-kit/scripts/render/themes.mjs";

const MATRIX = {
  "weak red": [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  "weak green": [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]]
};
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) => 255 * ((c = Math.min(1, Math.max(0, c))) <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** A colour as seen with weak red or weak green cones. */
export function seenWith(hex, view) {
  const rgb = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
  return "#" + MATRIX[view].map((row) => Math.round(gamma(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])).toString(16).padStart(2, "0")).join("");
}

// The Christmas palette is a proposal (docs/christmas-palette.md), not a shipped theme.
export const CHRISTMAS = {
  colors: { bg: "#0d1611", panel: "#142019", ink: "#f4f1ea", muted: "#a9b5ad", data: "#f6d466", frame: "#3e5c4a", flag: "#ff6490", ok: "#daf0ff" },
  ramp: ["#1f3b2c", "#33704a", "#94a940", "#f6d466"]
};

const NAMES = { frame: "lines", flag: "problem", muted: "secondary text", ok: "good", ink: "text" };

/** A palette figure: every colour of a palette and its ramp, faintest to strongest on its panel. */
export function paletteFigure(title, { colors, ramp }, source) {
  const steps = [...ramp.slice(0, 3).map((value, i) => ({ name: `ramp ${i + 1}`, value })), { name: "data, ramp 4", value: colors.data }];
  for (const role of ["frame", "flag", "muted", "ok", "ink"]) steps.push({ name: NAMES[role], value: colors[role] });
  steps.sort((a, b) => luminance(a.value) - luminance(b.value));
  return {
    kind: "palette",
    title,
    intent: "Every colour, faintest to strongest, on the surface figures sit on. Words start at ▲.",
    source,
    data: { page: colors.panel, hues: [{ name: "On the panel", steps }] }
  };
}

/** A contrast figure: the problem and good colours on the panel, as drawn and in each weak view. */
export function colourBlindFigure(title, { colors }, source) {
  const views = [["as drawn", (v) => v], ["weak red", (v) => seenWith(v, "weak red")], ["weak green", (v) => seenWith(v, "weak green")]];
  const pairs = ["flag", "ok"].flatMap((role) => views.map(([view, f]) => ({ label: `${NAMES[role]}, ${view}`, fg: f(colors[role]), bg: f(colors.panel) })));
  return { kind: "contrast", title, intent: "The problem and good colours keep 4.5 to 1 on the panel when red or green is seen weakly.", source, data: pairs };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(dirname(fileURLToPath(import.meta.url)), "../docs/palettes");
  const write = (name, spec) => writeFileSync(join(out, `${name}.json`), JSON.stringify(spec, null, 2) + "\n");
  const sim = "weak views simulated (Machado 2009)";
  const halloween = { colors: PALETTES.halloween, ramp: RAMPS.halloween };
  const xmasTheme = { base: "ink", ...CHRISTMAS.colors, ramp: CHRISTMAS.ramp };
  write("halloween", { ...paletteFigure("Halloween on its panel", halloween, "Glyph kit's halloween palette, scripts/render/themes.mjs"), theme: "halloween" });
  write("halloween-colour-blind", { ...colourBlindFigure("Halloween's problems and passes, colour-blind", halloween, `The halloween palette; ${sim}`), theme: "halloween" });
  write("christmas", { ...paletteFigure("Christmas, proposed, on its panel", CHRISTMAS, "Proposed values in docs/christmas-palette.md"), theme: xmasTheme });
  write("christmas-colour-blind", { ...colourBlindFigure("Christmas problems and passes, colour-blind", CHRISTMAS, `Proposed values; ${sim}`), theme: xmasTheme });
}
