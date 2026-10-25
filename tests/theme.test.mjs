// Colour by role: themes, the map's roles block, contrast checks, the ramp, and every rendered form.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PALETTES, contrastRatio, resolveTheme, themeCss } from "../skills/glyph-kit/scripts/render/themes.mjs";
import { PAINT_CSS, paint, paintOptions } from "../skills/glyph-kit/scripts/render/paint.mjs";
import { renderHtml } from "../skills/glyph-kit/scripts/render/html.mjs";
import { renderSvg } from "../skills/glyph-kit/scripts/render/svg.mjs";
import { renderDeck } from "../skills/glyph-kit/scripts/render/deck.mjs";
import { renderReport } from "../skills/glyph-kit/scripts/render/report.mjs";
import { renderLayoutPage } from "../skills/glyph-kit/scripts/render/page.mjs";
import { renderLiveHtml } from "../skills/glyph-kit/scripts/live/html.mjs";
import { renderText } from "../skills/glyph-kit/scripts/render/text.mjs";
import { body } from "../skills/glyph-kit/scripts/render/text.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const examples = (area) => JSON.parse(readFileSync(join(here, "../tools/examples", `${area}.json`), "utf8"));
const metrics = examples("metrics");
const funnel = metrics.find((s) => s.kind === "funnel");
const heatmap = metrics.find((s) => s.kind === "heatmap");
const readout = examples("layouts").find((s) => s.kind === "readout");
const moving = examples("process")[0];
const custom = { base: "paper", data: "#1f4fd6", flag: "#b8421f", ramp: ["#e8eefb", "#b9c8f0", "#6f8fe0", "#1f4fd6"] };
const map = { tokens: { accent: "var(--color-primary, #1f4fd6)", danger: "var(--color-danger, #b8421f)", plain: "var(--color-plain)" }, roles: { data: "accent", flag: "danger" } };

test("the four built-in palettes pass their own contrast rules", () => {
  for (const [name, p] of Object.entries(PALETTES)) assert.doesNotThrow(() => resolveTheme({ base: name, bg: p.bg }), name);
});

test("paper's problem colour now reaches 4.5 to 1 on its panel", () => {
  assert.ok(contrastRatio(PALETTES.paper.flag, PALETTES.paper.panel) >= 4.5);
  assert.ok(contrastRatio(PALETTES.paper.muted, PALETTES.paper.panel) >= 4.5);
});

test("a theme is a name or a base plus the roles it changes", () => {
  assert.deepEqual(resolveTheme("ink").colors, PALETTES.ink);
  assert.deepEqual(resolveTheme(undefined).colors, PALETTES.paper);
  const t = resolveTheme(custom);
  assert.equal(t.colors.data, "#1f4fd6");
  assert.equal(t.colors.ink, PALETTES.paper.ink);
  assert.deepEqual(t.ramp, custom.ramp);
  assert.equal(resolveTheme("ink").dark, true);
  assert.equal(resolveTheme("paper").dark, false);
});

test("each role is refused below its threshold, naming the pair and a colour that passes", () => {
  const cases = [
    ["flag", "#f08080", "Words", 4.5],
    ["muted", "#c8c6be", "Words", 4.5],
    ["data", "#d0d4f0", "Marks", 3],
    ["frame", "#ecebe5", "Lines", 1.5]
  ];
  for (const [role, hex, what, need] of cases) {
    let message = "";
    try {
      resolveTheme({ [role]: hex });
    } catch (e) {
      message = e.message;
    }
    assert.match(message, new RegExp(`^The ${role} colour ${hex} on the (page|panel) colour #[0-9a-f]{6} is [\\d.]+ to 1\\. ${what} in this colour need ${need} to 1\\. (#[0-9a-f]{6}) passes\\.$`), role);
    const fix = message.match(/(#[0-9a-f]{6}) passes/)[1];
    assert.doesNotThrow(() => resolveTheme({ [role]: fix }), `${role} suggestion ${fix}`);
  }
});

test("a changed page colour checks every role against it", () => {
  assert.throws(() => resolveTheme({ bg: "#151513" }), /on the page colour #151513/);
});

test("bad themes are refused in plain words", () => {
  assert.throws(() => resolveTheme("neon"), /There is no theme called neon\. Use paper, ink, phosphor, gilt/);
  assert.throws(() => resolveTheme({ accent: "#000000" }), /no role called accent/);
  assert.throws(() => resolveTheme({ data: "blue" }), /hex value like #1f4fd6, not blue/);
});

test("the ramp runs from light to strong, and its top step reads as a mark", () => {
  assert.throws(() => resolveTheme({ ramp: ["#e8eefb", "#b9c8f0"] }), /four hex colours/);
  assert.throws(() => resolveTheme({ ramp: ["#6f8fe0", "#b9c8f0", "#e8eefb", "#1f4fd6"] }), /Ramp step 2/);
  assert.throws(() => resolveTheme({ ramp: ["#eeeeee", "#cfcfcf", "#b0b0b0", "#999999"] }), /strongest step #999999 on the page colour #f7f6f1 is [\d.]+ to 1\. Marks need 3 to 1\. #[0-9a-f]{6} passes\./);
});

test("the map's roles use the token in CSS and its fallback everywhere else", () => {
  const t = resolveTheme("paper", { map });
  assert.equal(t.css.data, "var(--color-primary, #1f4fd6)");
  assert.equal(t.colors.data, "#1f4fd6");
  assert.match(themeCss(t, "--"), /--data:var\(--color-primary, #1f4fd6\)/);
  assert.throws(() => resolveTheme("paper", { map: { ...map, roles: { data: "plain" } } }), /The token plain has no fallback colour, so its contrast can't be checked\. Write it as var\(--color-primary, #1f4fd6\)\./);
  assert.throws(() => resolveTheme("paper", { map: { ...map, roles: { data: "missing" } } }), /token missing, which isn't in its tokens/);
  assert.throws(() => resolveTheme("paper", { map: { ...map, roles: { accent: "accent" } } }), /names accent, which isn't a role/);
});

test("the example map's roles pass on paper", () => {
  const example = JSON.parse(readFileSync(join(here, "../skills/glyph-kit/templates/design-system.map.example.json"), "utf8"));
  assert.doesNotThrow(() => resolveTheme("paper", { map: example }));
});

test("the theme's colours reach HTML, SVG, decks, reports, layout pages and moving pages", () => {
  assert.match(renderHtml(funnel, { theme: custom }), /--gk-data:#1f4fd6/);
  assert.match(renderHtml(funnel, { map }), /--gk-data:var\(--color-primary, #1f4fd6\)/);
  assert.match(renderSvg(funnel, { theme: custom }), /fill="#1f4fd6"/);
  assert.match(renderSvg(funnel, { map }), /fill="#1f4fd6"/);
  assert.match(renderDeck([funnel], { theme: custom }), /--gk-deck-data:#1f4fd6/);
  assert.match(renderReport({ title: "R", sections: [{ title: "S", figures: [funnel] }] }, { theme: custom }), /--data:#1f4fd6/);
  assert.match(renderLayoutPage(readout, { theme: custom }), /--data:#1f4fd6/);
  assert.match(renderLiveHtml(moving, { theme: { base: "ink", data: "#58d68d" } }), /color-scheme:dark/);
});

test("without a theme or roles, HTML is what it was", () => {
  assert.doesNotMatch(renderHtml(funnel), /--gk-data:#/);
  assert.equal(renderHtml(funnel, { map: { tokens: {} } }), renderHtml(funnel, { map: { tokens: {} } }));
});

test("the text form is the same with or without a theme", () => {
  assert.equal(renderText({ ...funnel, theme: custom }), renderText(funnel));
});

test("density grids paint ░ ▒ ▓ █ as ramp steps; other kinds keep data and empty", () => {
  assert.deepEqual(paintOptions(heatmap), { ramp: true });
  assert.deepEqual(paintOptions(funnel), { ramp: false });
  const grid = paint(body(heatmap), paintOptions(heatmap));
  assert.match(grid, /gk-r4/);
  assert.doesNotMatch(grid, /gk-e/);
  assert.doesNotMatch(paint(body(heatmap)), /gk-r\d/);
  // With no ramp in the theme, ramp cells fall back to exactly the data and empty look.
  assert.match(PAINT_CSS("--"), /\.gk-r1\{color:var\(--ramp1,var\(--data\)\);opacity:var\(--ramp-o,\.45\)\}/);
  assert.match(renderSvg(heatmap, { theme: custom }), /fill="#6f8fe0"/);
  assert.doesNotMatch(renderSvg(heatmap), /fill="#6f8fe0"/);
});

test("a colour on a node, bar or row is refused", () => {
  const spec = { ...funnel, data: funnel.data.map((d, i) => (i ? d : { ...d, color: "#ff0000" })) };
  assert.throws(() => renderText(spec), /sets its own colour at data\[0\]\.color\. Colour follows meaning, not decoration/);
});

test("the command line takes a theme file", () => {
  const dir = mkdtempSync(join(tmpdir(), "gk-theme-"));
  try {
    writeFileSync(join(dir, "spec.json"), JSON.stringify(funnel));
    writeFileSync(join(dir, "theme.json"), JSON.stringify(custom));
    const cli = join(here, "../skills/glyph-kit/scripts/glyph-kit.mjs");
    const html = execFileSync("node", [cli, "render", join(dir, "spec.json"), "--to", "html", "--theme", join(dir, "theme.json")], { encoding: "utf8" });
    assert.match(html, /--gk-data:#1f4fd6/);
    writeFileSync(join(dir, "bad.json"), JSON.stringify({ flag: "#f08080" }));
    assert.throws(() => execFileSync("node", [cli, "render", join(dir, "spec.json"), "--to", "html", "--theme", join(dir, "bad.json")], { encoding: "utf8", stdio: "pipe" }), /Words in this colour need 4\.5 to 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
