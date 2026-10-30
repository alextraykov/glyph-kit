// Focus: one way for every type to say "look here", the same in text, colour and motion.
import assert from "node:assert/strict";
import { test } from "node:test";
import { body } from "../skills/glyph-kit/scripts/render/text.mjs";
import { classify, paint, paintOptions } from "../skills/glyph-kit/scripts/render/paint.mjs";
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
  assert.equal(roles[lines[jan].indexOf("█")], "m");
  const key = lines.findIndex((l) => l.startsWith("█ 80%"));
  assert.notEqual(classify(lines[key], { ...opts, row: key })[0], "m");
  assert.equal(classify(lines[jan], { ...paintOptions({ ...cohort, focus: { on: ["M2"], tone: "good" } }, text), row: jan })[lines[jan].indexOf("▒")], "ok");
  assert.match(paint(text, opts), /<span class="gk-m">/);
});

test("every coloured form shows the focus: SVG in the flag colour, the terminal in red", () => {
  assert.match(renderSvg(cohort), /fill="#6e2218"/);
  assert.match(ansi(body(cohort), { spec: cohort, env: {} }), /\x1b\[31m▒▒/);
});

test("in HTML the focus arrives last, and the figure still settles within 600ms", () => {
  const html = arriveLines(cohort, body(cohort)).join("\n");
  const delays = [...html.matchAll(/--d:(\d+)ms/g)].map((m) => Number(m[1]));
  const focus = [...html.matchAll(/--d:(\d+)ms"><span class="gk-x"/g)].map((m) => Number(m[1]));
  assert.ok(focus.length > 0);
  assert.equal(Math.min(...focus), Math.max(...delays));
  assert.ok(Math.max(...delays) + 120 <= 600, `lands at ${Math.max(...delays)}ms`);
  assert.ok(delays.every((d) => d % 40 === 0));
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
