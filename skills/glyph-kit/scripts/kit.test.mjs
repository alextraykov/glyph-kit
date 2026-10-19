// node --test skills/glyph-kit/scripts/*.test.mjs
import assert from "node:assert/strict";
import { checkBoxes } from "./layout.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { abResult, cohort, funnel, metricPanel } from "./areas/metrics.mjs";
import { branchFlow, stateMachine } from "./areas/flows.mjs";
import { board, impactEffort, swimlane } from "./areas/planning.mjs";
import { contrastRatio, contrast, stateMatrix } from "./areas/systems.mjs";
import { likert, quoteCard, taskStats, themeMatrix } from "./areas/research.mjs";
import { filmstrip, intentCard, stagger } from "./areas/motion.mjs";
import { qaChecklist, redline } from "./areas/handoff.mjs";
import { screen } from "./areas/wireframes.mjs";
import { KIND_DOCS } from "./docs.mjs";
import { lintBlock } from "./lint.mjs";
import { AREAS, KINDS, resolve } from "./registry.mjs";
import { renderDeck } from "./render/deck.mjs";
import { renderHtml } from "./render/html.mjs";
import { body, label, renderMarkdown } from "./render/text.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const examples = Object.fromEntries(
  Object.keys(AREAS).map((a) => [a, JSON.parse(readFileSync(join(root, "examples", `${a}.json`), "utf8"))])
);
const width = (s) => [...s].length;

test("every kind has docs and an example in its area", () => {
  for (const [area, { kinds }] of Object.entries(AREAS)) {
    for (const kind of Object.keys(kinds)) {
      assert.ok(KIND_DOCS[kind]?.when && KIND_DOCS[kind]?.traps, `${kind} needs docs`);
      assert.ok(examples[area].some((s) => s.kind === kind), `${area} needs an example of ${kind}`);
    }
  }
});

test("every example renders, lints clean and has a readable label", () => {
  for (const specs of Object.values(examples)) {
    for (const spec of specs) {
      const text = body(spec);
      assert.ok(text.trim().length > 0, spec.kind);
      const errors = lintBlock(text).filter((p) => p.level === "error");
      assert.deepEqual(errors, [], `${spec.kind}: ${JSON.stringify(errors)}`);
      const l = label(spec);
      assert.ok(l.length > 10 && !/undefined|NaN|\[object/.test(l), `${spec.kind} label: ${l}`);
      assert.ok(!/undefined|NaN/.test(text), `${spec.kind} text`);
    }
  }
});

test("specs are checked in plain words", () => {
  assert.throws(() => resolve({ kind: "pie", data: [] }), /Unknown kind "pie"/);
  assert.throws(() => resolve({ kind: "funnel" }), /has no data/);
  assert.throws(() => screen({ rows: [{ type: "carousel" }] }), /Unknown wireframe primitive: carousel/);
});

test("research: empty and lopsided answers", () => {
  const out = likert([{ label: "none", counts: [0, 0, 0, 0, 0] }, { label: "all agree", counts: [0, 0, 0, 0, 9] }]);
  assert.match(out, /none .*0% agree/);
  assert.match(out, /all agree .*100% agree/);
  const m = themeMatrix([{ label: "a", by: ["P2", "P10", "P1"] }]).split("\n");
  assert.match(m[0], /P1 +P2 +P10/); // numeric order, not P1, P10, P2
  const card = quoteCard({ quote: "x ".repeat(80), who: "P1", source: "s1" }).split("\n");
  assert.ok(card.every((l) => width(l) === width(card[0])));
  assert.match(taskStats([{ label: "t", min: 0, q1: 0, median: 0, q3: 0, max: 0, done: 0, of: 3 }], { scale: 10 }), /0\/3 done/);
});

test("metrics: funnel, cohort gaps, intervals, deltas", () => {
  assert.match(funnel([{ label: "a", value: 0 }, { label: "b", value: 0 }]), /a/);
  const c = cohort([{ label: "Jan", values: [1, 0.5] }, { label: "Feb", values: [1] }]).split("\n");
  assert.equal(c[2].trimEnd(), "Feb  ██"); // a missing period stays blank, it isn't drawn as zero
  assert.match(abResult([{ label: "a", value: 4, low: 3, high: 5 }, { label: "b", value: 4.5, low: 4, high: 6 }]), /overlap: no clear difference/);
  assert.match(abResult([{ label: "a", value: 4, low: 3, high: 4.2 }, { label: "b", value: 5, low: 4.5, high: 6 }]), /don't overlap/);
  assert.match(metricPanel([{ label: "flat", values: [5, 5] }]), /· 0%$/);
});

test("flows: decisions, unreachable states", () => {
  const f = branchFlow([{ label: "start" }, { label: "ok", type: "decision", no: { label: "fix" } }, { label: "done" }]);
  assert.match(f, /┆ +ok\? +├─+ no ─+►│ +fix +│/);
  assert.match(f, /│ yes/);
  assert.match(f, /║ +done +║/);
  assert.deepEqual(checkBoxes(f), []);
  const s = stateMachine([{ from: "a", event: "go", to: "b" }, { from: "c", event: "go", to: "a" }]);
  assert.match(s, /Ends: b\. Unreachable: c\./);
});

test("planning: board rows, grid labels, swimlane return", () => {
  const b = board({ now: ["one"], next: [], later: ["two", "three"] }).split("\n");
  assert.ok(b.every((l) => width(l) === width(b[0])));
  const g = impactEffort([{ label: "corner", impact: 1, effort: 1 }, { label: "zero", impact: 0, effort: 0 }]);
  assert.match(g, /\[1\] corner/);
  assert.match(g, /\[2\] zero/);
  const sw = swimlane(["A", "B"], [[{ lane: 1, text: "x" }], { back: { from: 1, to: 0, text: "back" } }], { colWidth: 10 });
  assert.equal(sw.split("\n")[3].indexOf("┘"), 10);
});

test("systems: contrast is computed, not guessed", () => {
  assert.equal(contrastRatio("#000000", "#ffffff").toFixed(0), "21");
  assert.equal(contrastRatio("#fff", "#777777").toFixed(2), "4.48");
  assert.match(contrast([{ label: "grey", fg: "#777777", bg: "#ffffff" }]), /4\.5:1  AA large text only/);
  assert.match(stateMatrix({ variants: ["a"], states: ["rest"], cells: {} }), /a  ░░/); // unknown means missing
});

test("handoff: labels never truncated, empty checklist", () => {
  assert.match(redline([{ label: "a long label", size: 1 }, { label: "8", size: 1000 }], { width: 10 }), /◄ a long label ►/);
  assert.match(qaChecklist([]), /^0 of 0 done/);
});

test("motion: stagger spacing, overshoot, wrapped intent", () => {
  const even = stagger({ count: 3, duration: 100, delay: 50 });
  assert.match(even, /0ms–100ms[\s\S]*50ms–150ms[\s\S]*100ms–200ms/);
  assert.match(filmstrip({ frames: 8, easing: [0.44, 1.3, 0.15, 1] }), /overshoot/);
  const card = intentCard({ name: "n", purpose: "p ".repeat(60), trigger: "t", from: "a", to: "b", ms: 200, easing: "ease", reduced: "r" }).split("\n");
  assert.ok(card.every((l) => width(l) === width(card[0])));
});

test("wireframes: frame widths hold with notes, overlay and long text", () => {
  for (const spec of examples.wireframes.filter((s) => s.kind === "screen")) {
    const lines = body(spec).split("\n").filter((l) => /^[╔║╠╚]/.test(l)).map((l) => l.replace(/ \[\d+\]$/, ""));
    assert.ok(lines.every((l) => width(l) === width(lines[0])), spec.title);
  }
  const long = screen({ width: 20, rows: [{ type: "text", text: "a very long sentence that has to wrap inside the frame" }] }).split("\n");
  assert.ok(long.every((l) => width(l) === 20));
});

test("html: charts stay labelled text, screens become elements named by the map", () => {
  const chart = renderHtml(examples.metrics[0]);
  assert.match(chart, /<pre class="gk-figure" role="img" aria-label="Signup to paid/);
  const map = { tokens: { accent: "#3355ff" }, components: { button: { name: "Button" }, toggle: { name: "Switch" } } };
  const page = renderHtml(examples.wireframes[0], { map });
  assert.match(page, /--gk-accent:#3355ff/);
  assert.match(page, /<button type="button" class="gk-btn gk-btn--primary" data-component="Button" disabled data-until-change>Save<\/button>/);
  assert.match(page, /<label for="gk-f\d+">Email me when a report is ready<\/label><input class="gk-switch" id="gk-f\d+" type="checkbox" role="switch" checked data-component="Switch">/);
  assert.match(page, /<span class="gk-pin" aria-hidden="true">1<\/span>/);
  assert.match(renderHtml(examples.motion[1]), /prefers-reduced-motion:reduce/);
  assert.ok(!/undefined/.test(page));
});

test("deck file: title, section and statement slides, camera steps, notes", () => {
  const file = JSON.parse(readFileSync(join(root, "examples/decks/export-review.json"), "utf8"));
  const deck = renderDeck(file);
  assert.equal((deck.match(/class="gk-slide[ "]/g) ?? []).length, file.slides.length);
  assert.match(deck, /gk-slide--title/);
  assert.match(deck, /gk-slide--statement/);
  assert.match(deck, /data-steps="\[\{&quot;lines&quot;:\[1,1\]/);
  assert.match(deck, /<span class="gk-cmd">\$ <b>glyph-kit render themes\.json<\/b>/);
  assert.match(deck, /prefers-reduced-motion:reduce/);
  assert.throws(() => renderDeck({ title: "x", slides: [{ type: "poster" }] }), /Unknown slide type "poster"/);
});

test("every example deck renders, and every camera step points at real lines", () => {
  for (const name of ["export-review", "motion-audit", "usage-case"]) {
    const file = JSON.parse(readFileSync(join(root, `examples/decks/${name}.json`), "utf8"));
    const deck = renderDeck(file);
    assert.equal((deck.match(/class="gk-slide[ "]/g) ?? []).length, file.slides.length, name);
    assert.ok(!/undefined|NaN/.test(deck), name);
    for (const s of file.slides.filter((x) => x.present?.steps)) {
      const n = body(s).split("\n").length;
      for (const st of s.present.steps) assert.ok(st.lines[0] >= 0 && st.lines[1] < n && st.lines[0] <= st.lines[1], `${name}: ${s.title}`);
    }
  }
});

test("paint: roles, not decoration", async () => {
  const { paintLine } = await import("./render/paint.mjs");
  assert.equal(paintLine("a ██░ b"), 'a <span class="gk-d">██</span><span class="gk-e">░ </span>b');
  assert.match(paintLine("x blocked  thing"), /<span class="gk-x">x blocked/);
  assert.match(paintLine("ratio 19.3:1  AAA"), /<span class="gk-ok">AAA<\/span>/);
  assert.equal(paintLine("<b>"), "&lt;b&gt;");
});

test("deck: one slide per spec, and markdown keeps the description", () => {
  const deck = renderDeck(examples.research, { title: "Research" });
  assert.equal((deck.match(/class="gk-slide[ "]/g) ?? []).length, examples.research.length);
  assert.match(renderMarkdown(examples.research[0]), /```text[\s\S]*```\n\n\*How people rated/);
});

test("lint: catches a broken frame and an unmeasured glyph", () => {
  const broken = "┌────┐\n│ ab │\n│ abc │\n└────┘";
  assert.ok(lintBlock(broken).some((p) => /right edge missing/.test(p.message)));
  assert.ok(lintBlock("a ⚠ b").some((p) => p.level === "error"));
  assert.equal(lintBlock("┌────┐\n│ ab │\n└────┘").length, 0);
  assert.ok(lintBlock("┌──┐\n│ab│\n└──┘").some((p) => /touches its box/.test(p.message)));
  assert.ok(Object.keys(KINDS).length >= 45);
});
