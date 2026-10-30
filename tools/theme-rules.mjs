// Writes two figures into docs/theme-rules/ and prints them as text, with every note behind them:
//   palettes.json  the four rules of how a theme's colours relate, on each built-in palette and on
//                  Halloween (branch claude/halloween-palette-f90dc0, not on this branch yet);
//   mixed.json     cut D's mixed theme before and after, role by role, in OKLCH.
// Run after changing a palette or the rules: node tools/theme-rules.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTES, ROLES, relations, resolveTheme } from "../skills/glyph-kit/scripts/render/themes.mjs";
import { oklch } from "../skills/glyph-kit/scripts/render/oklch.mjs";
import { body } from "../skills/glyph-kit/scripts/render/text.mjs";

const out = join(dirname(fileURLToPath(import.meta.url)), "../docs/theme-rules");
mkdirSync(out, { recursive: true });

const HALLOWEEN = { bg: "#0f0c11", panel: "#1a1420", ink: "#ece3d0", muted: "#a99db0", data: "#f2801f", frame: "#5d4673", flag: "#ff5a8a", ok: "#d6f590", ramp: ["#3b2a4c", "#6b3f78", "#b8572f", "#f2801f"] };
// Cut D's mixed theme as it was (film/030/specs/theme-mixed.json at 5681ed8 on claude/film-030).
export const MIXED_BEFORE = { base: "ink", bg: "#16051a", panel: "#240d29", ink: "#f9ece1", muted: "#bfa2c6", frame: "#603e68", data: "#fb40ad", flag: "#ffb330", ok: "#37ebda", ramp: ["#2c2463", "#5b3aa6", "#b64fd0", "#f59ad8"] };
// And as it is: every role from one violet hue, on a dark page.
export const MIXED_AFTER = { base: "ink", mixed: 285 };

// Which rule each warning belongs to, and the few words a table cell has room for.
const REASONS = [
  [/^Ramp step\S* [\d, and]+ \(.*?\) (is|are) .* off the data hue/, "ramp", () => "hue drifts"],
  [/^The ramp's strongest step/, "ramp", () => "█ isn't data"],
  [/^Problems \(#\w+\) are (\d+)° from data/, "problems", (m) => `${m[1]}° from data`],
  [/^Data \(#\w+\) is as colourful/, "problems", () => "data louder"],
  [/^Passes \(#\w+\) are more colourful than data/, "problems", () => "passes out-shout data"],
  [/^(The \w+ colour|Ramp step \d) \(#\w+\) is (as|more) colourful/, "problems", () => "a neutral louder"],
  [/^Problems \(#\w+\) and passes \(#\w+\) are ([\d.]+) apart in lightness/, "passes", (m) => `${m[1]} apart`],
  [/^Problems \(#\w+\) and passes \(#\w+\) are \d+° apart in hue/, "passes", () => "same hue"],
  [/^Passes \(#\w+\) are as colourful as problems/, "passes", () => "louder"],
  [/^The [\w, ]+ colours? (isn't|aren't) the data hue/, "neutrals", (m, w) => (/\d+° off/.test(w) ? "off the data hue" : "too colourful")]
];

/** One row: each rule ok, fails with what breaks it, or why it has nothing to check. */
function verdicts(colors, ramp) {
  const fails = { ramp: [], problems: [], passes: [], neutrals: [] };
  for (const w of relations(colors, ramp)) {
    const hit = REASONS.find(([re]) => re.test(w));
    fails[hit[1]].push(hit[2](w.match(hit[0]), w));
  }
  const grey = oklch(colors.data).c < 0.04;
  const cell = (rule, skip) => (fails[rule].length ? `fails (${fails[rule].join(", ")})` : skip ?? "ok");
  return [cell("ramp", ramp ? null : "no ramp"), cell("problems"), cell("passes"), cell("neutrals", grey ? "grey data" : null)];
}

const palettes = { ...Object.fromEntries(Object.entries(PALETTES).map(([n, p]) => [n, [p, null]])), halloween: [HALLOWEEN, HALLOWEEN.ramp] };
const audit = {
  kind: "table",
  title: "How each palette's colours relate",
  intent: "The four rules: the ramp follows the data hue, problems sit opposite data and are loudest, passes read apart from problems without colour, neutrals carry the data hue.",
  source: "Glyph kit's palettes, measured in OKLCH by the theme rules (reference/colour.md)",
  data: [["PALETTE", "RAMP", "PROBLEMS", "PASSES", "NEUTRALS"], ...Object.entries(palettes).map(([n, [c, r]]) => [n, ...verdicts(c, r)])]
};

const lch = (hex) => {
  const o = oklch(hex);
  return [o.l.toFixed(2), o.c.toFixed(2), String(Math.round(o.h))];
};
const before = resolveTheme(MIXED_BEFORE);
const after = resolveTheme(MIXED_AFTER);
const NAMES = { bg: "page", panel: "panel", ink: "text", muted: "secondary", frame: "lines", data: "data", flag: "problems", ok: "passes" };
const rows = [...ROLES.map((r) => [NAMES[r], before.colors[r], after.colors[r]]), ...[0, 1, 2, 3].map((i) => [`ramp ${i + 1}`, before.ramp[i], after.ramp[i]])];
const mixed = {
  kind: "table",
  title: "Cut D's mixed theme, before and after",
  intent: "L is lightness, C is how colourful, h is the hue in degrees. After, every role comes from one violet hue.",
  source: "film/030/specs/theme-mixed.json; after, the kit's mixed theme from hue 285 on a dark page",
  data: [["ROLE", "BEFORE", "L", "C", "h", "AFTER", "L", "C", "h"], ...rows.map(([name, a, b]) => [name, a, ...lch(a), b, ...lch(b)])]
};

for (const [name, spec] of Object.entries({ palettes: audit, mixed })) {
  writeFileSync(join(out, `${name}.json`), JSON.stringify(spec, null, 2) + "\n");
  console.log(body(spec) + "\n");
}
console.log(`Before: ${before.warnings.length} notes. After: ${after.warnings.length}.`);
for (const [n, [c, r]] of Object.entries(palettes)) for (const w of relations(c, r)) console.log(`${n}: ${w}`);
