import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadData, parseCsv } from "./data.mjs";
import { SAMPLE, hasNumbers, isSample } from "./guard.mjs";
import { renderLiveHtml } from "./live/html.mjs";
import { live, stillText } from "./live/kinds.mjs";
import { resolve } from "./registry.mjs";
import { renderDeck } from "./render/deck.mjs";
import { renderHtml } from "./render/html.mjs";
import { renderReport } from "./render/report.mjs";
import { renderSvg } from "./render/svg.mjs";
import { body, renderMarkdown, renderText } from "./render/text.mjs";
import { budget, compact, countTokens, estimateTextTokens } from "./tokens.mjs";

const funnel = (source, values = [100, 60, 20]) => ({ kind: "funnel", title: "Signups", source, data: values.map((value, i) => ({ label: `step ${i + 1}`, value })) });

test("no source, no numbers", () => {
  assert.throws(() => body(funnel(undefined)), /"Signups" has numbers but no source/);
  assert.throws(() => body(funnel("  ")), /no source/);
  assert.doesNotThrow(() => body(funnel("Analytics export, 1–30 Sep")));
  // Specs without numbers don't need one.
  assert.doesNotThrow(() => body({ kind: "flow", data: ["a", "b"] }));
  assert.ok(hasNumbers({ a: [{ b: 2 }] }));
  assert.ok(!hasNumbers({ a: ["2"] }));
});

test("made-up data is stamped in every format", () => {
  const spec = funnel("Illustrative: sample numbers");
  assert.ok(isSample("Sample data, made up") && isSample("illustrative") && !isSample("Survey, n=40, sampled in May"));
  const text = body(spec);
  assert.match(text.split("\n").at(-1), /^ +SAMPLE DATA$/);
  assert.match(renderText(spec), new RegExp(SAMPLE));
  assert.match(renderMarkdown(spec), new RegExp(SAMPLE));
  assert.match(renderSvg(spec), /SAMPLE/);
  assert.match(renderReport({ title: "R", sections: [{ title: "S", figures: [spec] }] }), /SAMPLE/);
  assert.match(renderDeck({ title: "D", slides: [spec] }), /SAMPLE DATA/);
  assert.match(renderHtml(spec), /SAMPLE DATA/);
  const screen = { kind: "screen", title: "S", source: "Sample data", data: { title: "S", rows: [{ type: "text", text: "Hi" }] } };
  assert.match(renderHtml(screen), /gk-chip--sample">Sample data/);
  // Real data is not stamped.
  assert.doesNotMatch(body(funnel("Analytics export")), /SAMPLE/);
});

test("the stamp goes under the figure, so deck steps still point at the right lines", () => {
  const plain = body(funnel("Analytics export")).split("\n");
  const stamped = body(funnel("Sample")).split("\n");
  assert.deepEqual(stamped.slice(0, plain.length), plain);
});

test("each kind checks its own data, in plain words", () => {
  assert.throws(() => body(funnel("x", [10, 20])), /larger than the step before it .* a funnel only loses people/);
  assert.throws(() => body(funnel("x", [10, -1])), /negative count/);
  assert.throws(() => body({ kind: "abResult", source: "x", data: [{ label: "new", value: 7, low: 3, high: 5 }] }), /should sit inside its range/);
  assert.throws(() => body({ kind: "gantt", source: "x", data: [{ label: "build", start: 5, end: 2 }] }), /end after it starts/);
  assert.throws(() => body({ kind: "decisionLog", data: [{ date: "Oct 9", decision: "b" }, { date: "Oct 2", decision: "a" }] }), /keep them in time order/);
  assert.throws(() => body({ kind: "meter", source: "x", data: { value: 120, cap: 100 } }), /outside 0 to 100/);
  assert.throws(() => body({ kind: "cohort", source: "x", data: [{ label: "Jan", size: 10, values: [1, 48] }] }), /write 48% as 0.48/);
  assert.throws(() => body({ kind: "taskStats", source: "x", data: [{ label: "t", min: 1, q1: 2, median: 3, q3: 4, max: 5, done: 9, of: 8 }] }), /9 finished out of 8/);
});

test("moving diagrams follow the same rules", () => {
  const states = { kind: "states", title: "Save", source: "Illustrative", data: { states: ["A", "B"], transitions: [{ from: "A", to: "B" }], path: ["A", "B", "A"] } };
  assert.throws(() => live(states), /goes from B to A, but there's no transition/);
  assert.throws(() => live({ kind: "rollout", source: "x", data: { stages: [1, 5, 50], breachAt: 25 } }), /isn't one of the stages/);
  assert.throws(() => live({ kind: "funnel", data: { steps: [{ label: "a", value: 1 }] } }), /no source/);
  const ok = { kind: "funnel", title: "F", source: "Sample data", data: { steps: [{ label: "a", value: 10 }, { label: "b", value: 5 }] } };
  assert.match(stillText(ok), /SAMPLE DATA$/);
  assert.match(renderLiveHtml(ok), /class="stamp">Sample data/);
});

test("data from files: CSV with quotes, numbers, and a source that names the file", () => {
  const rows = parseCsv('label,value,note\n"signed up, any plan",6100,"said ""fine"""\r\npaid,610,\n');
  assert.deepEqual(rows, [{ label: "signed up, any plan", value: 6100, note: 'said "fine"' }, { label: "paid", value: 610, note: "" }]);
  const dir = mkdtempSync(join(tmpdir(), "gk-data-"));
  try {
    writeFileSync(join(dir, "f.csv"), "label,value\nvisited,100\npaid,10\n");
    writeFileSync(join(dir, "f.json"), JSON.stringify({ value: 3, cap: 10 }));
    const report = loadData({ title: "R", sections: [{ figures: [{ kind: "funnel", data: "@f.csv" }, { kind: "meter", source: "Survey", data: "@f.json" }] }] }, dir);
    const [a, b] = report.sections[0].figures;
    assert.equal(a.source, "Data from f.csv");
    assert.equal(a.data[1].value, 10);
    assert.equal(b.source, "Survey");
    assert.match(body(a), /visited/);
    assert.throws(() => loadData({ kind: "funnel", data: "@missing.csv" }, dir), /wasn't found next to the spec/);
    assert.throws(() => resolve({ kind: "funnel", data: "@f.csv" }), /hasn't been loaded/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("compact mode is plain ASCII with the same layout", () => {
  for (const spec of [funnel("x"), { kind: "branchFlow", data: [{ label: "start" }, { label: "ok", type: "decision", no: { label: "fix" } }, { label: "done" }] }]) {
    const full = body(spec);
    const small = compact(full);
    assert.match(small, /^[\x00-\x7f]*$/);
    assert.deepEqual(small.split("\n").map((l) => l.length), full.split("\n").map((l) => [...l].length));
  }
  assert.equal(compact("┌─┐│▓▒░·►"), "+-+|#=:.>");
});

test("token budget: an estimate, a warning when text costs more, and a real count when a key is set", async () => {
  assert.ok(estimateTextTokens("hello world") <= 5);
  assert.equal(estimateTextTokens("▓▓▓▓"), 4);
  const dense = Array.from({ length: 20 }, () => "▓".repeat(80)).join("\n");
  assert.ok(budget(dense).costlier);
  assert.ok(budget(dense).asCompact < budget(dense).asText);
  assert.ok(!budget(body(funnel("x"))).costlier);
  assert.equal(await countTokens("hi", { key: "" }), null);
  let sent;
  const fake = async (url, init) => ((sent = { url, init }), { ok: true, json: async () => ({ input_tokens: 42 }) });
  assert.equal(await countTokens("hi", { key: "test-key", fetch: fake }), 42);
  assert.match(sent.url, /\/v1\/messages\/count_tokens$/);
  assert.equal(sent.init.headers["x-api-key"], "test-key");
  assert.equal(JSON.parse(sent.init.body).messages[0].content, "hi");
});
