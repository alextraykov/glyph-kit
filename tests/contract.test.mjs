import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { AREAS } from "../skills/glyph-kit/scripts/registry.mjs";
import { body } from "../skills/glyph-kit/scripts/render/text.mjs";
import { assertFits } from "../skills/glyph-kit/scripts/layout.mjs";
import { lintBlock } from "../skills/glyph-kit/scripts/lint.mjs";
import { variants } from "./gen.mjs";
import { live, stillGrid } from "../skills/glyph-kit/scripts/live/kinds.mjs";
import { cut, width } from "../skills/glyph-kit/scripts/text.mjs";

function labels(value, key = "") {
  if (typeof value === "string") return ["label", "name", "property"].includes(key) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((item) => labels(item, key));
  // An open modal intentionally obscures its background (approved exception).
  if (value?.overlay) return labels(value.overlay);
  return value && typeof value === "object" ? Object.entries(value).flatMap(([k, v]) => labels(v, k)) : [];
}

function assertLabels(spec, text) {
  // Box text is read down each column too, so a label wrapped over several lines of one box counts.
  const compact = (value) => value.toUpperCase().replace(/[\s│║┃┆]/gu, "");
  const tableRows = text.split("\n").filter((line) => /^[│║┃┆]/u.test(line)).map((line) => line.split(/[│║┃┆├┤]/u));
  const columns = Array.from({ length: Math.max(0, ...tableRows.map((row) => row.length)) }, (_, col) => tableRows.map((row) => row[col] ?? "").join(" "));
  const output = compact([text, ...columns].join("\n"));
  const missing = labels(spec.data).filter((label) => {
    if (output.includes(compact(label))) return false;
    for (let size = 2; size < width(label); size++) if (output.includes(compact(cut(label, size)))) return false;
    return true;
  });
  const omitted = [...text.matchAll(/… and (\d+) more /g)].reduce((n, match) => n + Number(match[1]), 0);
  assert.ok(missing.length <= omitted, `Labels disappeared without a cut mark or row count: ${missing.join(", ")}`);
}

const liveDirectory = new URL("../skills/glyph-kit/examples/live/", import.meta.url);
for (const file of readdirSync(liveDirectory).filter((name) => name.endsWith(".json"))) {
  const spec = JSON.parse(readFileSync(new URL(file, liveDirectory)));
  for (const [name, variant] of variants(spec)) test(`moving/${spec.kind}/${name}: frame contract`, () => {
    let moving;
    try { moving = live(variant); }
    catch (error) {
      assert.equal(error.constructor, Error, error.message);
      assert.doesNotMatch(error.message, /undefined|Cannot read|NaN|Invalid|out of range/i);
      return;
    }
    const { make, still } = moving;
    const first = make();
    const second = live(variant).make();
    let cols;
    for (let step = 0; step < 600; step++) {
      const grid = first(step, 0.5);
      cols ??= grid.cols;
      assert.equal(grid.cols, cols);
      assert.ok(cols <= 80, `${spec.kind} allocates ${cols} cells`);
      assertFits(grid.toText());
      assert.equal(second(step, 0.5).toText(), grid.toText());
    }
    assert.ok(still > 0);
    const text = stillGrid(make, still).toText();
    assertFits(text);
    assertLabels(variant, text);
    assert.doesNotMatch(text, /[.:+*#%@]{4,}/);
  });
}

for (const area of Object.keys(AREAS)) {
  const examples = JSON.parse(readFileSync(new URL(`../tools/examples/${area}.json`, import.meta.url)));
  for (const [index, spec] of examples.entries()) for (const [name, variant] of variants(spec)) {
    test(`${area}/${spec.kind}/${index}: ${name}`, () => {
      let text;
      try { text = body(variant); }
      catch (error) {
        assert.equal(error.constructor, Error, error.message);
        assert.doesNotMatch(error.message, /undefined|Cannot read|NaN|Invalid|out of range/i);
        return;
      }
      assertFits(text);
      assert.deepEqual(lintBlock(text).filter((p) => p.level === "error"), []);
      assert.doesNotMatch(text, /undefined|NaN|\[object/);
      assert.equal(body(variant), text);
      assertLabels(variant, text);
    });
  }
}
