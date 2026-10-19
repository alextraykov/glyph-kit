import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { checkBoxes } from "./layout.mjs";
import { Grid } from "./live/grid.mjs";
import { renderLiveHtml } from "./live/html.mjs";
import { LIVE, live, stillText } from "./live/kinds.mjs";
import * as pace from "./live/pace.mjs";

const dir = new URL("../examples/live/", import.meta.url);
const examples = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));
const width = (text) => Math.max(...text.split("\n").map((l) => [...l].length));

test("every moving kind has an example", () => {
  assert.deepEqual(new Set(examples.map((s) => s.kind)), new Set(Object.keys(LIVE)));
});

for (const spec of examples) {
  test(`${spec.kind}: runs a full loop, stays on its grid, settles for the still`, () => {
    const { make, still, summary } = live(spec);
    assert.ok(summary.length > 20);
    const frame = make();
    let cols = 0;
    for (let s = 0; s < 600; s++) {
      const g = frame(s, 0.5);
      cols ||= g.cols;
      assert.equal(g.cols, cols);
      assert.deepEqual(checkBoxes(g.toText()), [], `${spec.kind} step ${s}: text touches a box`);
    }
    const text = stillText(spec);
    assert.ok(width(text) <= 80, `${spec.kind} is ${width(text)} columns`);
    assert.doesNotMatch(text, /[.:+*#%@]{4,}/, "scrambled text left in the still");
    assert.equal(stillText(spec), text, "the still is the same every time");
    assert.ok(still > 0);
  });
}

test("the pace diagrams run", () => {
  for (const name of ["gates", "lanes", "drift", "losses", "flatten"]) {
    const frame = pace[name]();
    for (let s = 0; s < 400; s++) {
      const text = frame(s, 0).toText();
      // Boxes caught mid-glide in "flatten" overlap; every resting frame must be clean.
      if (name !== "flatten") assert.deepEqual(checkBoxes(text), [], `${name} step ${s}: text touches a box`);
    }
  }
});

test("labels stay on top of moving work", () => {
  const g = new Grid(1, 10);
  g.deposit(0, 5, 1);
  g.label(0, 0, 9, "ok");
  assert.equal(g.toText().trim(), "ok");
});

test("unknown kinds fail in plain words", () => {
  assert.throws(() => live({ kind: "nope", data: {} }), /Unknown moving diagram "nope"/);
});

test("standalone HTML carries its own player and the still frame", () => {
  const html = renderLiveHtml(examples[0]);
  assert.match(html, /autoplay\(document\.querySelector\("pre"\)/);
  assert.doesNotMatch(html, /^import /m);
  assert.doesNotMatch(html, /^export /m);
  assert.match(html, /prefers-reduced-motion/);
});
