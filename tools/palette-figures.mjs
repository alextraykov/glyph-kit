// Writes two figures for each seasonal palette into docs/palettes/: <name>.json, a palette figure of
// every colour faintest to strongest on its panel, and <name>-colour-blind.json, a contrast figure of
// the problem and good colours on the panel as drawn and as seen with weak red or weak green cones.
// Also three for the problem and pass change in 0.3.0: lightness-gap.json and lightness-words-{before,after}.json.
// The views use Machado, Oliveira and Fernandes (2009) at full strength, applied in linear RGB.
// Run after changing a palette: node tools/palette-figures.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTES, RAMPS, contrastRatio, luminance } from "../skills/glyph-kit/scripts/render/themes.mjs";

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

// Problem and good colours before 0.3.0 made them differ in lightness (docs/palette-lightness.md).
export const BEFORE = {
  paper: { flag: "#b8391a", ok: "#0a7a50" },
  ink: { flag: "#ef7c56", ok: "#4cc58f" },
  phosphor: { flag: "#f0883e", ok: "#58d68d" },
  gilt: { flag: "#e49a7d", ok: "#c9a227" }
};

const NAMES = { frame: "lines", flag: "problem", muted: "secondary text", ok: "good", ink: "text" };
const VIEWS = [["as drawn", (v) => v], ["weak red", (v) => seenWith(v, "weak red")], ["weak green", (v) => seenWith(v, "weak green")]];
const ratio = (r) => `${r.toFixed(1)} to 1`;

/** A compare figure: how far apart problem and good are in lightness, before and after, in each view. */
export function gapFigure(title, before, after, source) {
  const data = Object.keys(after).flatMap((name) => VIEWS.map(([view, f]) => {
    const [a, b] = [before[name], after[name]].map((p) => contrastRatio(f(p.flag), f(p.ok)));
    return { label: `${name}, ${view}`, a: Math.min(1, (a - 1) / 2), aText: ratio(a), b: Math.min(1, (b - 1) / 2), bText: ratio(b) };
  }));
  return {
    kind: "compare",
    title,
    intent: "Empty is 1 to 1, the two the same lightness; full is 3 to 1. The goal is about 2 to 1 in every view.",
    source,
    data,
    options: { headers: ["PALETTE, VIEW", "BEFORE", "AFTER"] }
  };
}

/** A contrast figure: each palette's problem and good colours on its panel, in whichever view they read worst. */
export function weakestFigure(title, palettes, source) {
  const data = Object.entries(palettes).flatMap(([name, p]) => ["flag", "ok"].map((role) => {
    const [, f] = VIEWS.reduce((worst, v) => (contrastRatio(v[1](p[role]), v[1](p.panel)) < contrastRatio(worst[1](p[role]), worst[1](p.panel)) ? v : worst));
    return { label: `${name} ${NAMES[role]}`, fg: f(p[role]), bg: f(p.panel) };
  }));
  return { kind: "contrast", title, intent: "Problems and passes are words, so each needs 4.5 to 1 on the panel in every view.", source, data };
}

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
  const pairs = ["flag", "ok"].flatMap((role) => VIEWS.map(([view, f]) => ({ label: `${NAMES[role]}, ${view}`, fg: f(colors[role]), bg: f(colors.panel) })));
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
  const before = Object.fromEntries(Object.keys(BEFORE).map((name) => [name, { ...PALETTES[name], ...BEFORE[name] }]));
  const after = Object.fromEntries(Object.keys(BEFORE).map((name) => [name, PALETTES[name]]));
  write("lightness-gap", gapFigure("Problems against passes, in lightness", before, after, `Kit palettes before and after 0.3.0; ${sim}`));
  write("lightness-words-before", weakestFigure("Problems and passes as words, before", before, `Kit palettes before 0.3.0; ${sim}`));
  write("lightness-words-after", weakestFigure("Problems and passes as words, after", after, `Glyph kit's palettes; ${sim}`));
  write("christmas-colour-blind", { ...colourBlindFigure("Christmas problems and passes, colour-blind", CHRISTMAS, `Proposed values; ${sim}`), theme: xmasTheme });
}
