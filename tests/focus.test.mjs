// Focus: one way for every type to say "look here", the same in text, colour and motion.
import assert from "node:assert/strict";
import { test } from "node:test";
import { body } from "../skills/glyph-kit/scripts/render/text.mjs";
import { classify, paint, paintOptions, PAINT_CSS } from "../skills/glyph-kit/scripts/render/paint.mjs";
import { arriveLines } from "../skills/glyph-kit/scripts/render/arrive.mjs";
import { renderSvg } from "../skills/glyph-kit/scripts/render/svg.mjs";
import { ansi } from "../skills/glyph-kit/scripts/render/ansi.mjs";
import { focusCells } from "../skills/glyph-kit/scripts/render/focus.mjs";
import { checkDoc } from "../skills/glyph-kit/scripts/check.mjs";

const source = "Product analytics, Jan–Mar";
const cohort = {
  kind: "cohort",
  title: "Where retention drops",
  source,
  options: { periods: ["M0", "M1", "M2", "M3"] },
  data: [
    { label: "Jan", size: 120, values: [1, 0.82, 0.46, 0.41] },
    { label: "Feb", size: 140, values: [1, 0.85, 0.44, 0.4] },
    { label: "Mar", size: 98, values: [1, 0.81, 0.43] }
  ],
  focus: { on: ["M2"], tone: "problem", say: "Every cohort halves between M1 and M2." }
};
const marked = (spec) => {
  const text = body(spec);
  const lines = text.split("\n");
  return [...paintOptions(spec, text).mask].map(([r, cols]) => [...cols].map((c) => lines[r][c]).join(""));
};

test("the text says what to look at, so the point holds without colour", () => {
  const text = body(cohort);
  assert.match(text, /\n\n► Every cohort halves between M1 and M2\.$/);
  assert.match(body({ ...cohort, focus: { on: ["M2", "Mar"] } }), /► M2, Mar$/);
  assert.equal(body({ ...cohort, focus: undefined }).includes("►"), false);
});

test("a column heading marks its column, a row label its row, and both the cells where they cross", () => {
  assert.deepEqual(marked(cohort), ["▒▒", "▒▒", "▒▒"]);
  assert.deepEqual(marked({ ...cohort, focus: { on: ["Feb"] } }), ["████▒▒▒▒"]);
  assert.deepEqual(marked({ ...cohort, focus: { on: ["Feb", "M2"] } }), ["▒▒"]);
});

test("figures of words mark their words: a table row, a table column, a checklist item, a flow box", () => {
  const table = { kind: "table", source, data: [["Name", "Columns"], ["phone", "4"], ["tablet", "8"]] };
  assert.deepEqual(marked({ ...table, focus: { on: ["tablet"] } }), ["tablet8"]);
  assert.deepEqual(marked({ ...table, focus: { on: ["Columns"] } }), ["4", "8"]);
  const checklist = { kind: "qaChecklist", data: [{ text: "Spacing", status: "done" }, { text: "Icon set", status: "blocked" }] };
  assert.deepEqual(marked({ ...checklist, focus: { on: ["Icon set"] } }), ["Icon set"]);
});

test("the focus takes its tone's colour, and only its own block recedes", () => {
  const text = body(cohort);
  const opts = paintOptions(cohort, text);
  const lines = text.split("\n");
  const jan = lines.findIndex((l) => l.startsWith("Jan"));
  const roles = classify(lines[jan], { ...opts, row: jan });
  assert.equal(roles[lines[jan].indexOf("▒")], "x");
  assert.equal(roles[lines[jan].indexOf("█")], "m4");
  assert.equal(roles[lines[jan].lastIndexOf("▒")], "m2");
  const key = lines.findIndex((l) => l.startsWith("█ 80%"));
  assert.doesNotMatch(classify(lines[key], { ...opts, row: key })[0], /^m/);
  assert.equal(classify(lines[jan], { ...paintOptions({ ...cohort, focus: { on: ["M2"], tone: "good" } }, text), row: jan })[lines[jan].indexOf("▒")], "ok");
  assert.match(paint(text, opts), /<span class="gk-m4">/);
});

// The ramp step is the data, so a receded cell keeps it, only dimmed; a plain focus keeps it at full strength.
const ramp = ["#c6d8f5", "#8fb3ea", "#4a7fd4", "#1f4fb0"];
const blue = { ...cohort, theme: { base: "paper", ramp }, focus: { on: ["Feb"], tone: "plain" } };

test("receded ramp cells keep their step, dimmed, and a plain focus keeps its step", () => {
  const text = body(blue);
  const opts = paintOptions(blue, text);
  const lines = text.split("\n");
  const jan = lines.findIndex((l) => l.startsWith("Jan"));
  const feb = lines.findIndex((l) => l.startsWith("Feb"));
  const janRoles = classify(lines[jan], { ...opts, row: jan });
  assert.equal(janRoles[lines[jan].indexOf("█")], "m4");
  assert.equal(janRoles[lines[jan].indexOf("▒")], "m2");
  const febRoles = classify(lines[feb], { ...opts, row: feb });
  assert.equal(febRoles[lines[feb].indexOf("█")], "r4");
  assert.equal(febRoles[lines[feb].indexOf("▒")], "r2");
});

test("every coloured form dims a receded ramp cell in its own ramp colour", () => {
  assert.match(PAINT_CSS("--gk-"), /\.gk-m4\{color:var\(--gk-ramp4,var\(--gk-data\)\);opacity:0\.28\}/);
  const svg = renderSvg(blue, { theme: blue.theme });
  // #1f4fb0 at 28% over the paper panel: still blue, not grey.
  const dimmed = [...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
  assert.ok(dimmed.includes("#1f4fb0"), "the focused row keeps the strongest step");
  assert.ok(dimmed.some((hex) => parseInt(hex.slice(5, 7), 16) > parseInt(hex.slice(1, 3), 16) + 20 && hex !== "#1f4fb0" && !ramp.includes(hex)), "a receded cell is a dimmed blue");
  const out = ansi(body(blue), { spec: blue, env: { COLORTERM: "truecolor" } });
  const [jan, feb] = ["Jan", "Feb"].map((label) => out.split("\n").find((l) => l.startsWith(label)));
  assert.match(jan, /\x1b\[2m\x1b\[38;2;31;79;176m██/);
  assert.match(feb, /\x1b\[38;2;31;79;176m██/);
  assert.doesNotMatch(feb, /\x1b\[2m/);
});

test("every coloured form shows the focus: SVG in the flag colour, the terminal in red", () => {
  assert.match(renderSvg(cohort), /fill="#651b13"/);
  assert.match(ansi(body(cohort), { spec: cohort, env: {} }), /\x1b\[31m▒▒/);
});

test("in HTML the focus arrives last, its flash ends by 600ms, stepping or not", () => {
  const heatmap = { kind: "heatmap", source, options: { rowLabels: ["Mon", "Tue", "Wed"], colLabels: "a b c d" }, data: [[0.1, 0.5, 0.9, 1], [0.3, 0.6, 1, 0.8], [0.2, 0.4, 0.7, 0.9]], focus: { on: ["Tue"] } };
  // The cohort's M2 cells are all ▒ and snap in; the heatmap's Tue row steps through ░ and ▒.
  for (const spec of [cohort, heatmap, { ...cohort, focus: { on: ["Feb"], tone: "problem" } }]) {
    const html = arriveLines(spec, body(spec)).join("\n");
    const flashes = [...html.matchAll(/class="gk-s3" aria-hidden="true" style="--d:(\d+)ms"/g)].map((m) => Number(m[1]));
    // Every landing: the focus's own, after its shade steps, and everything else's.
    const lands = [...html.matchAll(/class="gk-a" style="--d:(\d+)ms">((?:<span[^>]*>[^<]*<\/span>|[^<])*)<\/span>/g)].map((m) => Number(m[1]));
    const focus = Math.max(...flashes);
    assert.ok(flashes.length > 0, `${spec.kind}: the focus flashes`);
    assert.ok(focus <= 480 && focus + 120 <= 600, `${spec.kind}: the focus lands at ${focus}ms`);
    assert.equal(Math.max(...lands), focus, `${spec.kind}: the focus lands last`);
    const rest = Math.max(...lands.filter((d) => d < focus));
    assert.ok(rest <= 360, `${spec.kind}: the rest lands at ${rest}ms`);
    assert.ok([...html.matchAll(/--d:(\d+)ms/g)].every((m) => Number(m[1]) % 40 === 0));
  }
});

test("a focus that names something not drawn, or has a bad tone, is refused in plain words", () => {
  assert.throws(() => body({ ...cohort, focus: { on: ["M9"] } }), /Focus names "M9", which isn't in the figure/);
  assert.throws(() => body({ ...cohort, focus: { on: ["M2"], tone: "loud" } }), /tone is problem, good or plain/);
  assert.throws(() => body({ ...cohort, focus: "M2" }), /Write focus as/);
  assert.ok(checkDoc({ ...cohort, focus: { on: ["M9"] } }).some((p) => /isn't in the figure/.test(p.message)));
});

test("whole words only: M1 is not found inside M10", () => {
  const text = "      M1  M10\nA     ██  ██";
  assert.deepEqual([...focusCells(text, { on: ["M1"] }).mask.get(1)], [6, 7]);
});
