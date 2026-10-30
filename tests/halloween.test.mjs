// The halloween palette: every role defined, its own ramp in order, contrast on the page and the panel,
// problems and passes apart by more than hue, and every form and the site's Colours menu pick it up.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PALETTES, RAMPS, ROLES, contrastRatio, luminance, resolveTheme, themeCss } from "../skills/glyph-kit/scripts/render/themes.mjs";
import { renderHtml } from "../skills/glyph-kit/scripts/render/html.mjs";
import { renderSvg } from "../skills/glyph-kit/scripts/render/svg.mjs";
import { THEMES, renderDeck } from "../skills/glyph-kit/scripts/render/deck.mjs";
import { renderReport } from "../skills/glyph-kit/scripts/render/report.mjs";
import { ansi, ansiCodes } from "../skills/glyph-kit/scripts/render/ansi.mjs";
import { body, renderText } from "../skills/glyph-kit/scripts/render/text.mjs";
import { seenWith } from "../tools/palette-figures.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const metrics = JSON.parse(readFileSync(join(here, "../tools/examples/metrics.json"), "utf8"));
const funnel = metrics.find((s) => s.kind === "funnel");
const heatmap = metrics.find((s) => s.kind === "heatmap");
const h = PALETTES.halloween;
const ramp = RAMPS.halloween;
const HEX6 = /^#[0-9a-f]{6}$/;
const truecolour = { COLORTERM: "truecolor" };
const code = (hex) => `\x1b[38;2;${parseInt(hex.slice(1, 3), 16)};${parseInt(hex.slice(3, 5), 16)};${parseInt(hex.slice(5, 7), 16)}m`;

test("halloween: every role has a colour, and the ramp has four", () => {
  assert.deepEqual(Object.keys(h).sort(), [...ROLES].sort());
  for (const role of ROLES) assert.match(h[role], HEX6, role);
  assert.equal(ramp.length, 4);
  for (const c of ramp) assert.match(c, HEX6);
  assert.ok(luminance(h.bg) < 0.01, "a near-black page");
  assert.equal(resolveTheme("halloween").dark, true);
  assert.deepEqual(resolveTheme("halloween").ramp, ramp);
});

test("halloween: words reach 4.5 to 1, marks 3 and lines 1.5, on the page and the panel", () => {
  for (const ground of [h.bg, h.panel]) {
    for (const role of ["ink", "muted", "flag", "ok"]) assert.ok(contrastRatio(h[role], ground) >= 4.5, `${role} on ${ground}`);
    assert.ok(contrastRatio(h.data, ground) >= 3, `data on ${ground}`);
    assert.ok(contrastRatio(h.frame, ground) >= 1.5, `frame on ${ground}`);
    assert.ok(contrastRatio(ramp[3], ground) >= 3, `ramp █ on ${ground}`);
  }
  // The kit's own check, ramp included: a changed page colour runs it.
  assert.doesNotThrow(() => resolveTheme({ base: "halloween", bg: h.bg }));
});

test("halloween: the ramp gets steadily stronger, bruise purple to pumpkin", () => {
  for (let i = 1; i < 4; i++) {
    assert.ok(contrastRatio(ramp[i], h.bg) > contrastRatio(ramp[i - 1], h.bg), `step ${i + 1} stands further from the page`);
    assert.ok(contrastRatio(ramp[i], ramp[i - 1]) >= 1.2, `step ${i + 1} is apart from step ${i}`);
  }
  // Each step a similar distance on from the last, so no two read as one.
  const steps = ramp.slice(1).map((c, i) => contrastRatio(c, ramp[i]));
  assert.ok(Math.max(...steps) / Math.min(...steps) < 1.5, steps.join(" "));
  assert.equal(ramp[3], h.data);
});

test("halloween: problems and passes differ in lightness, not only in hue", () => {
  assert.ok(contrastRatio(h.flag, h.ok) >= 2.4, `${contrastRatio(h.flag, h.ok).toFixed(2)} to 1`);
  assert.ok(luminance(h.flag) < luminance(h.ok), "the problem colour is the darker one");
  assert.notEqual(h.flag, h.data);
  assert.notEqual(h.ok, h.data);
});

test("halloween: with weak red or weak green, problems still read as words and stay apart from passes", () => {
  for (const view of ["weak red", "weak green"]) {
    const [flag, ok, panel, bg] = [h.flag, h.ok, h.panel, h.bg].map((c) => seenWith(c, view));
    for (const ground of [panel, bg]) {
      assert.ok(contrastRatio(flag, ground) >= 4.5, `problem, ${view}: ${contrastRatio(flag, ground).toFixed(2)}`);
      assert.ok(contrastRatio(ok, ground) >= 4.5, `good, ${view}`);
    }
    assert.ok(contrastRatio(flag, ok) >= 2, `problem and good, ${view}: ${contrastRatio(flag, ok).toFixed(2)}`);
  }
});

test("halloween: HTML, SVG, decks and reports draw in its colours, density grids in its ramp", () => {
  assert.match(renderHtml(funnel, { theme: "halloween" }), /--gk-data:#f2801f/);
  assert.match(renderHtml(heatmap, { theme: "halloween" }), /--gk-ramp1:#3b2a4c;--gk-ramp2:#6b3f78;--gk-ramp3:#b8572f;--gk-ramp4:#f2801f;--gk-ramp-o:1/);
  assert.match(themeCss("halloween"), /--gk-r-ramp4:#f2801f/);
  const svg = renderSvg(heatmap, { theme: "halloween" });
  assert.match(svg, /<rect width="100%" height="100%" fill="#0f0c11"\/>/);
  for (const c of ramp) assert.match(svg, new RegExp(`fill="${c}"`));
  assert.match(renderDeck([funnel], { theme: "halloween" }), /--gk-deck-bg:#0f0c11/);
  assert.equal(THEMES.halloween["deck-flag"], h.flag);
  assert.match(renderReport({ title: "R", sections: [{ title: "S", figures: [funnel] }] }, { theme: "halloween" }), /--data:#f2801f/);
});

test("halloween: other palettes keep drawing density grids in their data colour", () => {
  for (const name of Object.keys(PALETTES).filter((n) => n !== "halloween")) assert.equal(resolveTheme(name).ramp, null, name);
  assert.doesNotMatch(renderSvg(heatmap, { theme: "ink" }), /fill="#3b2a4c"/);
});

test("halloween: a 24-bit terminal takes its colours and ramp; the 16 colours and the text are as they were", () => {
  const codes = ansiCodes("halloween", truecolour);
  assert.equal(codes.x, code(h.flag));
  assert.equal(codes.ok, code(h.ok));
  assert.equal(codes.r1, code(ramp[0]));
  assert.equal(codes.r4, code(ramp[3]));
  assert.ok(ansi(body(heatmap), { spec: heatmap, theme: "halloween", env: truecolour }).includes(code(ramp[2])));
  assert.deepEqual(ansiCodes("halloween", {}), ansiCodes(undefined, {}));
  assert.equal(renderText({ ...funnel, theme: "halloween" }), renderText(funnel));
});

test("halloween: its palette figure puts every word colour above ▲", () => {
  const spec = JSON.parse(readFileSync(join(here, "../docs/palettes/halloween.json"), "utf8"));
  const lines = body(spec).split("\n");
  const marked = lines.findIndex((l) => l.includes("▲"));
  assert.match(lines[marked], /^problem/);
  for (const role of ["secondary text", "good", "text"]) assert.ok(lines.findIndex((l) => l.startsWith(role)) > marked, role);
  for (const role of ["lines", "ramp 1", "ramp 2", "ramp 3"]) assert.ok(lines.findIndex((l) => l.startsWith(role)) < marked, role);
});

test("every kit palette is in the site's Colours menu", () => {
  const src = readFileSync(join(here, "../site/src/try.js"), "utf8");
  const names = src.match(/const PALETTE_NAMES = (\{[^}]*\})/)[1];
  for (const name of Object.keys(PALETTES)) assert.match(names, new RegExp(`\\b${name}: "`), name);
  assert.match(names, /halloween: "Halloween"/);
});
