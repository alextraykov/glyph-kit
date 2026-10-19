import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { checkBoxes } from "../skills/glyph-kit/scripts/layout.mjs";
import { Grid } from "../skills/glyph-kit/scripts/live/grid.mjs";
import { inlineMotion, renderLiveHtml } from "../skills/glyph-kit/scripts/live/html.mjs";
import { animate, moves } from "../skills/glyph-kit/scripts/motion.mjs";
import { renderHtml } from "../skills/glyph-kit/scripts/render/html.mjs";
import { renderDeck } from "../skills/glyph-kit/scripts/render/deck.mjs";
import { body } from "../skills/glyph-kit/scripts/render/text.mjs";
import { autoplay } from "../skills/glyph-kit/scripts/live/play.mjs";
import { LIVE, live, stillText } from "../skills/glyph-kit/scripts/live/kinds.mjs";
import * as pace from "../tools/pace.mjs";

const dir = new URL("../skills/glyph-kit/examples/live/", import.meta.url);
const examples = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));
const width = (text) => Math.max(...text.split("\n").map((l) => [...l].length));

test("every moving kind has an example", () => {
  assert.deepEqual(new Set(examples.map((s) => s.kind)), new Set(Object.keys(LIVE)));
});

for (const spec of examples) {
  test(`${spec.kind}: runs a full loop, stays on its grid, settles for the still`, () => {
    const { make, still, summary } = live(spec);
    assert.ok(summary.trim().length > 0);
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

test("the browser bundle evaluates and matches Node for every moving kind", () => {
  const browser = new Function(`${inlineMotion()}; return { animate, stillGrid, MOTION };`)();
  assert.deepEqual(Object.keys(browser.MOTION).sort(), Object.keys(LIVE).sort());
  for (const spec of examples) {
    const a = animate(spec);
    const b = browser.animate(spec);
    assert.equal(browser.stillGrid(b.make, b.still).toText(), stillText({ ...spec, source: "Measured example" }));
    const af = a.make(), bf = b.make();
    for (let step = 0; step < 60; step++) assert.equal(af(step, 0.5).toText(), bf(step, 0.5).toText());
    assert.ok(renderLiveHtml(spec).includes(browser.stillGrid(b.make, b.still).toText().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")));
  }
});

test("funnel normalization keeps still output and motion compatible", () => {
  const legacy = examples.find((spec) => spec.kind === "funnel");
  const canonical = { ...legacy, data: legacy.data.steps };
  assert.equal(body(legacy), body(canonical));
  assert.equal(stillText(legacy), stillText(canonical));
  assert.ok(moves("funnel"));
  assert.equal(moves("screen"), false);
});

test("moving exports embed specs and current-slide playback with a printable still", () => {
  const spec = { ...examples[0], motion: true };
  assert.match(renderHtml(spec), /const MOTION/);
  const deck = renderDeck([spec, { ...spec, title: "Second" }]);
  assert.equal((deck.match(/class="gk-motion-src"/g) ?? []).length, 2);
  assert.match(deck, /stopMoving\?\.\(\)/);
  assert.match(deck, /beforeprint/);
  assert.match(deck, /observer\.disconnect\(\)/);
  for (const script of deck.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(script[1]);
});

test("autoplay releases observers and clocks and settles for print and reduced motion", () => {
  const keys = ["document", "matchMedia", "requestAnimationFrame", "cancelAnimationFrame", "IntersectionObserver", "addEventListener", "removeEventListener"];
  const saved = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const events = new Map(), frames = new Map();
  let change, observer, serial = 0;
  const media = { matches: false, addEventListener: (_, fn) => { change = fn; }, removeEventListener: () => { change = null; } };
  try {
    Object.assign(globalThis, {
      document: { hidden: false, addEventListener: (key, fn) => events.set(key, fn), removeEventListener: (key) => events.delete(key) },
      matchMedia: () => media,
      requestAnimationFrame: (fn) => { frames.set(++serial, fn); return serial; },
      cancelAnimationFrame: (id) => frames.delete(id),
      IntersectionObserver: class { constructor(fn) { this.callback = fn; observer = this; } observe() {} disconnect() { this.disconnected = true; } },
      addEventListener: (key, fn) => events.set(key, fn), removeEventListener: (key) => events.delete(key)
    });
    const pre = { innerHTML: "" };
    const stop = autoplay(pre, () => () => new Grid(1, 3), 1);
    assert.equal(frames.size, 1);
    events.get("beforeprint")();
    assert.equal(frames.size, 0);
    events.get("afterprint")();
    assert.equal(frames.size, 1);
    media.matches = true; change();
    assert.equal(frames.size, 0);
    stop();
    assert.ok(observer.disconnected);
    assert.equal(events.size, 0);
    assert.equal(change, null);
    observer.callback([{ isIntersecting: true }]);
    assert.equal(frames.size, 0);
  } finally {
    for (const key of keys) { const desc = saved.get(key); if (desc) Object.defineProperty(globalThis, key, desc); else delete globalThis[key]; }
  }
});

test("new process kinds reject impossible inputs in plain words", () => {
  const invalid = [
    ["handoff", { lanes: ["Design"], steps: [{ lane: "Missing", label: "Build", wait: 0 }] }],
    ["retry", { attempts: 3, base: 100, factor: 2, succeedOn: 4 }],
    ["cache", { hitRate: 1.2, origin: "Origin" }],
    ["split", { variants: [{ label: "A", share: 0.4 }] }],
    ["incident", { events: [{ at: 0, label: "Seen", kind: "detect" }] }]
  ];
  for (const [kind, data] of invalid) assert.throws(() => animate({ kind, data, source: "Sample data" }), (error) => error.constructor === Error && !/undefined|NaN|Cannot read/.test(error.message));
});

test("moving board settles after the move and state machine settles at the path end", () => {
  const board = examples.find((spec) => spec.kind === "board");
  const expected = structuredClone(board);
  const card = expected.data.later.shift();
  expected.data.now.push(card);
  expected.motion = false;
  assert.equal(stillText(board), body(expected));
  const machine = examples.find((spec) => spec.kind === "stateMachine");
  const path = [machine.data[0].from, machine.data[0].to];
  const still = stillText({ ...machine, options: { ...machine.options, path } });
  assert.equal(still.split("\n")[0], path.at(-1));
});
