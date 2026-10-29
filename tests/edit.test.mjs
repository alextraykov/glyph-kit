// Editing figures: check lists every problem at once, redraw draws figures again from the spec kept
// beside them, and read turns an edited drawing back into its spec.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkDoc, checkMarkdown } from "../skills/glyph-kit/scripts/check.mjs";
import { figures, readEdits, redraw } from "../skills/glyph-kit/scripts/markdown.mjs";
import { READERS, readBack } from "../skills/glyph-kit/scripts/read.mjs";
import { body, renderMarkdown } from "../skills/glyph-kit/scripts/render/text.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "../skills/glyph-kit/scripts/glyph-kit.mjs");
const examples = readdirSync(join(here, "../tools/examples")).flatMap((f) => [JSON.parse(readFileSync(join(here, "../tools/examples", f), "utf8"))].flat(2)).filter((s) => s?.kind);
const log = examples.find((s) => s.kind === "decisionLog");
const bars = { kind: "barChart", title: "Visits", source: "Sample data, made up for this test", data: [{ label: "Home", value: 120 }, { label: "Pricing", value: 80 }] };
const doc = (...specs) => ["# Review", "", "A note from review, kept as it is.", "", ...specs.map((s) => renderMarkdown(s, { withSpec: true }) + "\n"), "The end."].join("\n");

test("check lists every problem at once, with where it is", () => {
  const problems = checkDoc([
    { kind: "barChart", title: "No source", data: [{ label: "A", value: 3 }] },
    { kind: "spacingScale", source: "Sample data", data: [{ name: "xs", value: -4, color: "#f00" }] },
    { kind: "nope", data: [] }
  ]);
  assert.ok(problems.length >= 4, JSON.stringify(problems));
  assert.ok(problems.some((p) => p.where === '"No source"' && /no source/.test(p.message)));
  assert.ok(problems.some((p) => p.where === "Spec 2" && /own colour/.test(p.message)));
  assert.ok(problems.some((p) => p.where === "Spec 2" && /negative|nonnegative/i.test(p.message)));
  assert.ok(problems.some((p) => p.where === "Spec 3" && /Unknown type "nope"/.test(p.message)));
  assert.deepEqual(checkDoc(log), []);
});

test("check notes labels that are cut, without failing", () => {
  const long = { ...bars, data: [{ label: "A label far longer than any bar chart has room for here", value: 3 }, { label: "B", value: 2 }] };
  const problems = checkDoc(long);
  assert.ok(problems.some((p) => p.level === "warn" && /is cut to \d+ cells/.test(p.message)), JSON.stringify(problems));
  assert.ok(!problems.some((p) => p.level === "error"));
});

test("--with-spec keeps the spec beside the figure, and figures() finds it", () => {
  const source = doc(bars, log);
  const found = figures(source);
  assert.equal(found.length, 2);
  assert.deepEqual(JSON.parse(found[1].json), log);
  assert.equal(found[0].text, body(bars));
});

test("redraw changes only the figure whose spec changed, and nothing else in the file", () => {
  const source = doc(bars, log);
  assert.equal(redraw(source).source, source);
  const changed = source.replace('"value": 80', '"value": 95');
  const out = redraw(changed);
  assert.equal(out.changed.length, 1);
  // Everything above the figure, and everything after its description, is unchanged.
  const fig = figures(changed)[0];
  const [before, after] = [changed.split("\n"), out.source.split("\n")];
  assert.deepEqual(after.slice(0, fig.start + 1), before.slice(0, fig.start + 1));
  const tail = before.length - fig.labelLine - 1;
  assert.deepEqual(after.slice(-tail), before.slice(-tail));
  assert.match(out.source, /Pricing.*95/);
  assert.match(out.source, /A note from review, kept as it is\./);
  assert.match(out.source, /The end\.$/);
});

test("redraw leaves a broken spec's figure alone and says where it is", () => {
  const source = doc(bars).replace('"kind": "barChart"', '"kind": "barChart",,');
  const out = redraw(source);
  assert.equal(out.source, source);
  assert.equal(out.problems.length, 1);
  assert.match(out.problems[0].message, /isn't valid JSON/);
});

test("a figure can keep its spec in a file named above it", () => {
  const dir = mkdtempSync(join(tmpdir(), "gk-edit-"));
  try {
    writeFileSync(join(dir, "bars.json"), JSON.stringify(bars));
    const file = join(dir, "doc.md");
    const source = ["Notes", "", "<!-- glyph-kit: bars.json -->", "```text", "old", "```", ""].join("\n");
    const out = redraw(source, file);
    assert.equal(out.changed.length, 1);
    assert.match(out.source, /Home/);
    assert.equal(out.source.split("\n")[2], "<!-- glyph-kit: bars.json -->");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every readable type reads back its own drawing exactly", () => {
  for (const kind of Object.keys(READERS)) {
    const spec = examples.find((s) => s.kind === kind);
    assert.ok(spec, kind);
    assert.deepEqual(readBack(spec, body(spec)).data, spec.data, kind);
  }
});

test("read takes an untidy edit, writes it to the spec and tidies the drawing", () => {
  const source = doc(log);
  const edited = source.replace("│ Oct 9 │ Parse dates in the browser │", "│ Oct 9 │ Parse dates on the client │");
  const out = readEdits(edited);
  assert.equal(out.read.length, 1, JSON.stringify(out.problems));
  const spec = JSON.parse(figures(out.source)[0].json);
  assert.equal(spec.data[1].decision, "Parse dates on the client");
  assert.equal(figures(out.source)[0].text, body(spec));
  assert.match(out.source, /\*Decisions\..*Parse dates on the client\*/);
  assert.equal(redraw(out.source).changed.length, 0);
});

test("read refuses an edit it can't read, and leaves the file alone", () => {
  const source = doc(bars);
  const edited = source.replace(/Home/, "Homepage");
  const out = readEdits(edited);
  assert.equal(out.source, edited);
  assert.match(out.problems[0].message, /can't be read back from its drawing/);
  const checklist = examples.find((s) => s.kind === "qaChecklist");
  const broken = doc(checklist).replace("█ done         Spacing", "? maybe        Spacing");
  assert.match(readEdits(broken).problems[0].message, /doesn't start with a status/);
});

test("the command line: check, redraw --check and read", () => {
  const dir = mkdtempSync(join(tmpdir(), "gk-edit-"));
  try {
    const file = join(dir, "doc.md");
    writeFileSync(file, doc(bars, log));
    const run = (...args) => {
      try {
        return { out: execFileSync("node", [cli, ...args], { encoding: "utf8" }), code: 0 };
      } catch (e) {
        return { out: e.stdout, code: e.status };
      }
    };
    assert.deepEqual(run("check", file), { out: "No problems.\n", code: 0 });
    assert.equal(run("redraw", file, "--check").code, 0);
    writeFileSync(file, readFileSync(file, "utf8").replace('"value": 80', '"value": 95'));
    const stale = run("redraw", file, "--check");
    assert.equal(stale.code, 1);
    assert.match(stale.out, /out of date {2}Line \d+/);
    assert.match(run("check", file).out, /doesn't match its spec/);
    assert.match(run("redraw", file).out, /Drew again: line \d+\./);
    assert.equal(run("redraw", file, "--check").code, 0);
    writeFileSync(file, readFileSync(file, "utf8").replace("│ Eng    │", "│ Ops    │"));
    assert.match(run("read", file).out, /Read back: line \d+\./);
    assert.match(readFileSync(file, "utf8"), /"owner": "Ops"/);
    const md = execFileSync("node", [cli, "render", "-", "--to", "markdown", "--with-spec"], { encoding: "utf8", input: JSON.stringify(bars) });
    assert.match(md, /<details><summary>Spec<\/summary>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
