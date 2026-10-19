import assert from "node:assert/strict";
import { test } from "node:test";
import { checkBoxes } from "../skills/glyph-kit/scripts/layout.mjs";
import { lintBlock } from "../skills/glyph-kit/scripts/lint.mjs";
import { Grid } from "../skills/glyph-kit/scripts/live/grid.mjs";
import {
  cellWidth,
  cells,
  cut,
  graphemes,
  padEnd,
  padStart,
  width,
  wrap
} from "../skills/glyph-kit/scripts/text.mjs";

test("width: scripts, marks and emoji use display cells", () => {
  assert.equal(width("ASCII"), 5);
  assert.equal(width("Кирил"), 5);
  assert.equal(width("Ελλάς"), 5);
  assert.equal(width("漢字"), 4);
  assert.equal(width("한글"), 4);
  assert.equal(width("العربية"), 7);
  assert.equal(width("हि"), 1);
  assert.equal(width("✈️"), 2);
  assert.equal(width("👩‍💻"), 2);
  assert.equal(width("🇧🇬"), 2);
  assert.equal(cellWidth("\u0301"), 0);
});

test("cells: one entry per cell with a continuation for wide clusters", () => {
  assert.deepEqual(cells("A界B"), ["A", "界", "", "B"]);
  assert.deepEqual(cells("a\u0301"), ["a\u0301"]);
});

test("cut: never splits a grapheme and always marks removed text", () => {
  const family = "👨‍👩‍👧‍👦";
  assert.equal(graphemes(family).length, 1);
  assert.equal(cut(`A${family}B`, 3), "A…");
  assert.equal(cut("界AB", 3), "界…");
  assert.equal(width(cut("界AB", 3)), 3);
});

test("padding and CJK wrapping use cells", () => {
  assert.equal(width(padEnd("界", 4)), 4);
  assert.equal(width(padStart("界", 4)), 4);
  const lines = wrap("日本語テスト", 4, "ja");
  assert.equal(lines.join(""), "日本語テスト");
  assert.ok(lines.every((line) => width(line) <= 4));
});

test("fallback without Intl.Segmenter uses code points safely", () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter");
  Object.defineProperty(Intl, "Segmenter", { configurable: true, value: undefined });
  try {
    assert.deepEqual(graphemes("A界"), ["A", "界"]);
    assert.equal(width("a\u0301界"), 3);
    assert.deepEqual(cells("a\u0301"), ["a\u0301"]);
  } finally {
    if (descriptor) Object.defineProperty(Intl, "Segmenter", descriptor);
    else delete Intl.Segmenter;
  }
});

test("grid writes wide clusters and clears both halves when overwritten", () => {
  const g = new Grid(1, 4);
  g.text(0, 0, "界A");
  assert.equal(width(g.toText()), 3);
  const over = new Grid(1, 4);
  over.text(0, 0, "界");
  over.put(0, 1, "x");
  assert.equal(over.toText(), " x");
});

test("lint accepts text in any script, counts wide cells and warns for emoji", () => {
  const multilingual = "Привет Ελληνικά 漢字 العربية हिन्दी";
  assert.deepEqual(lintBlock(multilingual).filter((p) => p.level === "error"), []);
  assert.ok(lintBlock("emoji 👩‍💻").some((p) => p.level === "warn" && /emoji font/.test(p.message)));
  assert.ok(lintBlock("界".repeat(41)).some((p) => p.level === "warn" && /82 cells/.test(p.message)));
  const box = "┌────┐\n│ 界 │\n└────┘";
  assert.deepEqual(lintBlock(box).filter((p) => p.level === "error"), []);
  assert.deepEqual(checkBoxes(box), []);
});
