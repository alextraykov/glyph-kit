// node --test skills/glyph-kit/scripts/core.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bar,
  barChart,
  box,
  calendarStrip,
  cells,
  compare,
  flow,
  forecast,
  gantt,
  heatmap,
  meter,
  ruler,
  sparkline,
  statusKey,
  table,
  tree,
  velocity
} from "./core.mjs";

const width = (s) => [...s].length;

test("bar: zero is empty, a tiny positive value is never empty", () => {
  assert.equal(bar(0, 100, { width: 10, empty: "·" }), "··········");
  assert.equal(bar(0.01, 100, { width: 10, empty: "·" }), "▏·········");
});

test("bar: a remainder that rounds to 8/8 carries into a whole cell", () => {
  // 57/100*16 = 9.12 cells; and 0.96 of a cell must not vanish
  assert.equal(bar(57, 100, { width: 16 }).trimEnd(), "█████████▏");
  assert.equal(bar(5.98, 10, { width: 10 }).trimEnd(), "██████");
});

test("bar: overflow fills and is marked", () => {
  assert.equal(bar(150, 100, { width: 4 }), "████+");
});

test("bar: always the requested width", () => {
  for (const v of [0, 0.3, 12.5, 49.99, 50, 99.9, 100]) assert.equal(width(bar(v, 100, { width: 20 })), 20);
});

test("cells: ░ keeps the scale; positive never rounds to zero", () => {
  assert.equal(cells(0), "░░░░░░░░░░");
  assert.equal(cells(0.01), "█░░░░░░░░░");
  assert.equal(cells(0.23), "██░░░░░░░░");
  assert.equal(cells(1), "██████████");
});

test("barChart: labels align and values print as text", () => {
  const out = barChart(
    [
      { label: "Jul", value: 1 },
      { label: "Sept", value: 4.1, text: "4.1×" }
    ],
    { width: 8 }
  ).split("\n");
  assert.equal(out[0].indexOf("█"), out[1].indexOf("█"));
  assert.match(out[1], /4\.1×$/);
});

test("compare: header and rows line up", () => {
  const out = compare(
    [
      { label: "moving", a: 1, aText: "100%", b: 0.23, bText: "23%" },
      { label: "rows", a: 0, aText: "0%", b: 0.11, bText: "11%" }
    ],
    { headers: ["MEASURE", "HERO", "PRODUCT"] }
  ).split("\n");
  const col = out[0].indexOf("PRODUCT");
  assert.equal(out[1].indexOf("██░"), col);
  assert.equal(out[2].indexOf("█░░"), col);
});

test("forecast: measured is █, projected is ░, legend only when projecting", () => {
  const out = forecast(
    [
      { label: "Sep", measured: 4, text: "4×" },
      { label: "Oct", measured: 2, projected: 3, text: "on pace for ~5×" }
    ],
    { width: 10 }
  ).split("\n");
  assert.match(out[0], /^Sep ████████/);
  assert.match(out[1], /^Oct ████░░░░░░/);
  assert.equal(out.length, 3);
  assert.equal(forecast([{ label: "a", measured: 1 }]).split("\n").length, 1);
});

test("meter: shows used, left and overflow", () => {
  assert.equal(meter(84, 100, { width: 10 }), "[ ████████░░ ] 84% of the cap");
  assert.match(meter(120, 100, { width: 10 }), /120% of the cap over$/);
});

test("sparkline: min to max, gaps for missing", () => {
  assert.equal(sparkline([0, 7]), "▁█");
  assert.equal(sparkline([1, null, 1]), "▁ ▁");
  assert.equal(sparkline([]), "");
});

test("heatmap: 0 is blank, 1 is █, partial values never vanish", () => {
  assert.equal(heatmap([[0, 0.01, 0.5, 1]], { cellWidth: 1 }), " ░▒█");
});

test("calendarStrip", () => {
  assert.equal(calendarStrip([true, false, null], { gap: "" }), "■· ");
});

test("gantt: rows share one width and loops are marked", () => {
  const out = gantt(
    [
      { label: "fade", start: 0, end: 240 },
      { label: "pulse", start: 0, end: 1000, loop: true }
    ],
    { scale: 1000, width: 20 }
  ).split("\n");
  assert.match(out[0], /^fade  █████···············  0ms–240ms$/);
  assert.match(out[1], /→ 0ms, repeats$/);
  assert.match(out[2], /0ms.*500ms.*1s$/);
});

test("ruler: the audit's own example", () => {
  assert.equal(ruler(200), "████████············");
  assert.equal(ruler(320), "████████████▌·······");
  assert.equal(ruler(1500), "████████████████████+");
});

test("velocity: known curves", () => {
  assert.equal(velocity("linear"), "████████");
  assert.equal(velocity("ease"), "▅█▇▅▄▃▂▁");
  assert.match(velocity([0.44, 1.3, 0.15, 1]), /↺$/);
});

test("box, flow, tree, table: every row is the same width", () => {
  for (const out of [
    box("hello\nworld", { title: "Note" }),
    box("x", { style: "double" }),
    flow(["idea", "plan", "build"]),
    table(
      [
        ["Glyph", "Use"],
        ["░", "texture"],
        ["█", "done"]
      ],
      { style: "light" }
    )
  ]) {
    const rows = out.split("\n").map(width);
    assert.ok(rows.every((w) => w === rows[0]), out);
  }
  assert.equal(
    tree({ name: "feature/", children: [{ name: "motion.md" }, { name: "states.md", children: [{ name: "x" }] }] }),
    "feature/\n├── motion.md\n└── states.md\n    └── x"
  );
});

test("statusKey", () => {
  assert.equal(statusKey([{ level: 4, label: "done" }], { width: 3 }), "███  done");
});
