// node --test tests/layouts.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { body } from "../skills/glyph-kit/scripts/render/text.mjs";
import { renderHtml } from "../skills/glyph-kit/scripts/render/html.mjs";
import { renderLayoutPage } from "../skills/glyph-kit/scripts/render/page.mjs";
import { classify } from "../skills/glyph-kit/scripts/render/paint.mjs";
import { assertFits, checkBoxes } from "../skills/glyph-kit/scripts/layout.mjs";
import { pack } from "../skills/glyph-kit/scripts/areas/layouts.mjs";
import { lintBlock } from "../skills/glyph-kit/scripts/lint.mjs";
import { loadData } from "../skills/glyph-kit/scripts/data.mjs";
import { width } from "../skills/glyph-kit/scripts/text.mjs";

const meter = (title, value, extra = {}) => ({ kind: "meter", title, data: { value, cap: 100 }, options: { width: 12 }, ...extra });
const spark = (title, values = [1, 3, 2, 5]) => ({ kind: "sparkline", title, data: { label: "n", values } });
const ab = { kind: "abResult", title: "Conversion", data: [{ label: "control", value: 4.1, low: 3.6, high: 4.6 }, { label: "new", value: 5.3, low: 4.8, high: 5.9 }], options: { min: 3, max: 7 } };
const readout = (data, extra = {}) => ({ kind: "readout", source: "Amplitude", data: { headline: "It worked.", evidence: [ab], ...data }, ...extra });

test("figures keep their order and share a row only when they fit in 80 cells", () => {
  const item = (w) => ({ w, lines: [""], caption: "" });
  assert.deepEqual(pack([item(30), item(30), item(30)]).map((r) => r.map((i) => i.w)), [[30, 30], [30]]);
  assert.deepEqual(pack([item(70), item(10), item(10)]).map((r) => r.map((i) => i.w)), [[70], [10, 10]]);
  assert.deepEqual(pack([item(20), item(20), item(20), item(8)]).map((r) => r.length), [3, 1]);
  const text = body(readout({ evidence: [meter("A", 10), meter("B", 20), ab] }));
  assertFits(text);
  const lines = text.split("\n");
  assert.ok(lines.some((l) => /^A\s+B$/.test(l)), "the two meters share a row");
  assert.ok(lines.findIndex((l) => l.startsWith("Conversion")) > lines.findIndex((l) => /^A\s+B$/.test(l)));
});

test("stacked rows of figures are separated by a blank row", () => {
  const lines = body(readout({ evidence: [ab, ab] })).split("\n");
  const second = lines.lastIndexOf("Conversion");
  assert.equal(lines[second - 1], "");
});

test("figures are never squeezed: a wide one takes its own row at its natural width", () => {
  const text = body({ kind: "dashboard", source: "s", data: { tiles: [spark("One"), spark("Two"), ab] } });
  assertFits(text);
  assert.match(text, /^One\s+Two$/m);
  assert.equal(text.split("\n").find((l) => l.startsWith("control")), body({ ...ab, source: "s" }).split("\n").find((l) => l.startsWith("control")));
});

test("figures use the layout's source unless they have their own; one without either is refused", () => {
  const text = body(readout({ evidence: [ab, { ...meter("Rollout", 62), source: "Admin panel" }] }));
  assert.match(text, /Sources: Admin panel/);
  assert.throws(() => body({ ...readout({}), source: undefined }), /In "evidence": "Conversion" has numbers but no source/);
});

test("made-up data is stamped once for the whole layout", () => {
  const text = body(readout({}, { source: "Illustrative" }));
  assert.equal(text.match(/SAMPLE DATA/g).length, 1);
});

test("slot mistakes are refused in plain words", () => {
  assert.throws(() => body({ kind: "readout", source: "s", data: { evidence: [ab] } }), /A readout needs "headline"/);
  assert.throws(() => body(readout({ chart: ab })), /A readout has no slot called "chart"\. Its slots are headline, summary, evidence, next\./);
  assert.throws(() => body({ kind: "dashboard", source: "s", data: { tiles: [spark("One")] } }), /at least 2 figures in "tiles"; it has 1/);
  assert.throws(() => body(readout({ evidence: [readout({})] })), /a layout can't go inside another layout/);
  assert.throws(() => body(readout({ summary: "one line" })), /"summary" is a list of short lines/);
  assert.throws(() => body(readout({ headline: "word ".repeat(60) })), /keep it to one sentence of 3 lines or fewer/);
});

test("too many figures or items are cut with a count; too tall a page is refused", () => {
  const text = body(readout({ evidence: [1, 2, 3, 4, 5, 6].map((n) => meter(`M${n}`, n)), next: ["a", "b", "c", "d", "e", "f", "g"] }));
  assert.match(text, /… and 2 more figures/);
  assert.match(text, /… and 2 more items/);
  const tall = { kind: "table", data: Array.from({ length: 16 }, (_, i) => [`Row ${i}`, "a long value that keeps this table wide"]) };
  assert.throws(() => body(readout({ evidence: [tall, tall, tall, tall] })), /rows; 80 fit on one page/);
});

test("lists wrap under their mark and blocked items are coloured as problems", () => {
  const text = body({ kind: "statusUpdate", source: "s", data: { period: "Week 3.", blocked: ["Waiting on legal " + "and more words ".repeat(8)] } });
  const lines = text.split("\n").filter((l) => l.startsWith("x  ") || l.startsWith("   "));
  assert.ok(lines.length >= 2 && lines.every((l) => width(l) <= 80));
  assert.equal(classify("x  Waiting on legal")[0], "x");
});

test("a pair draws before and after side by side when both fit", () => {
  const text = body({ kind: "prSummary", source: "s", data: { change: "Shorter.", before: meter(undefined, 40), after: meter(undefined, 60) } });
  assert.match(text, /^Before\s+After$/m);
});

test("the page uses the kit's type and palette and carries the same text", () => {
  const spec = readout({ summary: ["One."] }, { title: "Week 3" });
  const html = renderLayoutPage(spec, { theme: "ink" });
  assert.match(html, /@font-face\{font-family:"Departure Mono"/);
  assert.match(html, /--mono:"Departure Mono"/);
  assert.doesNotMatch(html, /system-ui|ui-sans-serif/);
  assert.match(html, /--bg:#0d0d0c/);
  assert.match(html, /<h2>Summary<\/h2>/);
  assert.ok(html.includes("It worked."));
  assert.equal(renderHtml(spec), renderLayoutPage(spec));
});

test("data files inside a layout's figures are read", () => {
  const dir = mkdtempSync(join(tmpdir(), "gk-layout-"));
  writeFileSync(join(dir, "ab.json"), JSON.stringify(ab.data));
  const spec = loadData({ kind: "readout", data: { headline: "It worked.", evidence: [{ ...ab, data: "@ab.json" }] } }, dir);
  assert.match(body(spec), /control/);
  assert.match(body(spec), /Sources: Data from ab\.json/);
});

test("screen layouts close their frames and check their sizes", () => {
  const app = body({ kind: "appShell", data: { title: "App", header: [{ type: "search" }], sidebar: [{ type: "list", items: ["One", "Two"] }], content: [{ type: "heading", text: "Hi" }, { type: "divider" }, { type: "text", text: "Body" }] } });
  assertFits(app);
  assert.deepEqual(checkBoxes(app), []);
  assert.match(app, /╦/);
  assert.match(app, /╩/);
  assert.deepEqual(lintBlock(app).filter((p) => p.level === "error"), []);
  const grid = body({ kind: "cardGrid", data: { width: 80, cards: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ title: `Card ${n}`, rows: [{ type: "text", text: "x" }] })) } });
  assertFits(grid);
  assert.match(grid, /… and 1 more card/);
  assert.equal(grid.split("\n").find((l) => l.includes("Card 1")).match(/┌/g).length, 3);
  assert.throws(() => body({ kind: "appShell", data: { width: 40, sidebarWidth: 30, sidebar: [], content: [] } }), /sidebar can be 10 to 16 cells/);
  assert.throws(() => body({ kind: "cardGrid", data: { cards: [] } }), /at least one card/);
  const detail = body({ kind: "listDetail", data: { list: ["A", "B"], selected: "B", detail: [{ type: "text", text: "B's detail" }] } });
  assert.match(detail, /█ B/);
  const modal = body({ kind: "modal", data: { page: [{ type: "skeleton", lines: 6 }], dialog: { title: "Sure?", rows: [{ type: "text", text: "Really." }] } } });
  assert.match(modal, /Sure\?/);
});
