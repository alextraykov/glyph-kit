// The two colour types, palette and colourRoles: their checks, their widths, and swatches drawn in
// their own colour in every form that has colour.
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderText, body } from "../skills/glyph-kit/scripts/render/text.mjs";
import { renderHtml } from "../skills/glyph-kit/scripts/render/html.mjs";
import { renderSvg } from "../skills/glyph-kit/scripts/render/svg.mjs";
import { ansi } from "../skills/glyph-kit/scripts/render/ansi.mjs";
import { classify } from "../skills/glyph-kit/scripts/render/paint.mjs";
import { contrastRatio } from "../skills/glyph-kit/scripts/render/themes.mjs";
import { len } from "../skills/glyph-kit/scripts/core.mjs";

const source = "Sample data, made up for this test";
const ramp = (name, values) => ({ name, steps: values.map((value, i) => ({ name: String((i + 1) * 100), value })) });
const blue = ramp("Blue", ["#dbe6ff", "#8eaaf2", "#4269d6", "#263f8f", "#121c40"]);
const palette = (hues, page) => ({ kind: "palette", source, data: { hues, ...(page ? { page } : {}) } });
const roles = (list, page = { light: "#ffffff", dark: "#000000" }) => ({ kind: "colourRoles", source, data: { page, roles: list } });

test("palette: one row per step, ▲ on the first step that reads as words", () => {
  const text = body(palette([blue]));
  const lines = text.split("\n");
  assert.match(lines[0], /Blue/);
  assert.equal(lines.filter((l) => /██ #/.test(l)).length, 5);
  const marked = lines.find((l) => l.includes("▲"));
  assert.match(marked, /#4269d6/);
  assert.ok(contrastRatio("#4269d6", "#ffffff") >= 4.5 && contrastRatio("#8eaaf2", "#ffffff") < 4.5);
});

test("palette: four hues fit in 80 cells, a fifth is refused in plain words", () => {
  const four = body(palette([blue, blue, blue, blue]));
  assert.ok(Math.max(...four.split("\n").map(len)) <= 80);
  assert.throws(() => body(palette([blue, blue, blue, blue, blue])), /fits 4 hues at 80 cells; this one has 5\. Split it/);
});

test("palette: a step out of order and a colour that isn't hex are named", () => {
  assert.throws(() => body(palette([ramp("Blue", ["#dbe6ff", "#4269d6", "#8eaaf2", "#121c40"])])), /Blue 300 is lighter than 200/);
  assert.throws(() => body(palette([ramp("Blue", ["#dbe6ff", "blue"])])), /Blue 200: write the colour as a hex value/);
  assert.throws(() => body(palette([])), /needs hues/);
});

test("palette: more steps than fit are cut with a note, every line within 80 cells", () => {
  const many = ramp("Grey", Array.from({ length: 24 }, (_, i) => `#${(250 - i * 10).toString(16).padStart(2, "0").repeat(3)}`));
  const text = body(palette([many]));
  assert.match(text, /and \d+ more steps/);
  assert.ok(Math.max(...text.split("\n").map(len)) <= 80);
});

test("colourRoles: light and dark side by side, with the same thresholds as the theme check", () => {
  const text = body(roles([
    { role: "words", token: "--text", light: "#151513", dark: "#f2f0e8", use: "words" },
    { role: "faint", token: "--faint", light: "#aaaaaa", dark: "#555555", use: "words" },
    { role: "bars", token: "--data", light: "#767676", dark: "#767676", use: "marks" },
    { role: "rules", token: "--line", light: "#d0d0d0", dark: "#333333", use: "lines" }
  ]));
  const row = (name) => text.split("\n").find((l) => l.startsWith(name));
  assert.match(row("words"), /AAA$/);
  assert.match(row("faint"), /fails$/);
  assert.match(row("bars"), /ok$/);
  assert.match(row("rules"), /ok$/);
  assert.match(text.split("\n")[0], /light #ffffff\s+dark #000000/);
});

test("colourRoles: without dark colours there is no dark column", () => {
  const text = body(roles([{ role: "words", token: "--text", light: "#151513" }], { light: "#ffffff" }));
  assert.doesNotMatch(text, /dark/);
  assert.match(text, /AAA/);
});

test("colourRoles: missing pages, bad colours and unknown uses are named", () => {
  assert.throws(() => body(roles([{ role: "words", light: "#151513" }], {})), /need the page colours/);
  assert.throws(() => body(roles([{ role: "words", light: "black" }])), /words light: write the colour as a hex value/);
  assert.throws(() => body(roles([{ role: "words", light: "#151513", use: "headings" }])), /use is words, marks or lines/);
});

test("a swatch is drawn in its own colour in HTML, SVG and 24-bit terminals, and plain elsewhere", () => {
  const spec = palette([blue]);
  assert.match(renderHtml(spec), /<span class="gk-sw" style="color:#4269d6">██ ?<\/span>/);
  assert.match(renderSvg(spec), /fill="#4269d6"/);
  const text = renderText(spec);
  assert.match(ansi(text, { spec, env: { COLORTERM: "truecolor" } }), /\x1b\[38;2;66;105;214m██/);
  assert.doesNotMatch(ansi(text, { spec, env: {} }), /\x1b\[38;2/);
  assert.deepEqual(classify("██ #4269d6").slice(0, 3), ["sw-4269d6", "sw-4269d6", ""]);
  assert.equal(classify("██ 4269d6")[0], "d");
});
