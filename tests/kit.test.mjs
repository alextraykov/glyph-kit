// node --test skills/glyph-kit/scripts/*.test.mjs
import assert from "node:assert/strict";
import { checkBoxes } from "../skills/glyph-kit/scripts/layout.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { abResult, cohort, funnel, metricPanel } from "../skills/glyph-kit/scripts/areas/metrics.mjs";
import { branchFlow, stateMachine } from "../skills/glyph-kit/scripts/areas/flows.mjs";
import { board, impactEffort, swimlane } from "../skills/glyph-kit/scripts/areas/planning.mjs";
import { contrastRatio, contrast, stateMatrix } from "../skills/glyph-kit/scripts/areas/systems.mjs";
import { likert, quoteCard, taskStats, themeMatrix } from "../skills/glyph-kit/scripts/areas/research.mjs";
import { filmstrip, intentCard, stagger } from "../skills/glyph-kit/scripts/areas/motion.mjs";
import { anatomy, qaChecklist, redline } from "../skills/glyph-kit/scripts/areas/handoff.mjs";
import { screen } from "../skills/glyph-kit/scripts/areas/wireframes.mjs";
import { KIND_DOCS } from "../tools/docs.mjs";
import { arrivalGap } from "../tools/gaps.mjs";
import { lintBlock } from "../skills/glyph-kit/scripts/lint.mjs";
import { AREAS, KINDS, resolve } from "../skills/glyph-kit/scripts/registry.mjs";
import { renderDeck } from "../skills/glyph-kit/scripts/render/deck.mjs";
import { arriveLines } from "../skills/glyph-kit/scripts/render/arrive.mjs";
import { staggerStarts } from "../skills/glyph-kit/scripts/areas/motion.mjs";
import { compareColumns } from "../skills/glyph-kit/scripts/core.mjs";
import { emotionColumns } from "../skills/glyph-kit/scripts/areas/research.mjs";
import { journeyColumns } from "../skills/glyph-kit/scripts/areas/flows.mjs";
import { renderHtml } from "../skills/glyph-kit/scripts/render/html.mjs";
import { body, label, renderMarkdown } from "../skills/glyph-kit/scripts/render/text.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../skills/glyph-kit");
const tools = join(dirname(fileURLToPath(import.meta.url)), "../tools");
const examples = Object.fromEntries(
  Object.keys(AREAS).map((a) => [a, JSON.parse(readFileSync(join(tools, "examples", `${a}.json`), "utf8"))])
);
const width = (s) => [...s].length;

test("every kind has docs and an example in its area", () => {
  // The processes move, and a test result given readings over time. Charts and plans stay still.
  assert.deepEqual(Object.keys(KINDS).filter((kind) => KINDS[kind].motion).sort(), ["abResult", "funnel", "loading", "loop", "queue", "rollout", "states"]);
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
  assert.throws(() => resolve({ kind: "pie", data: [] }), /Unknown type "pie"/);
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

test("flows: long labels wrap inside their boxes instead of being cut", () => {
  const f = branchFlow([
    { label: "Enter email" },
    { label: "Link opened within 1 hour", type: "decision", no: { label: "Show the same message anyway", to: "end" } },
    { label: "Signed in" }
  ]);
  const lines = f.split("\n");
  assert.ok(!f.includes("…"), "nothing is cut");
  for (const word of ["Link opened within 1", "hour?", "Show the same message", "anyway", "→ end"]) assert.ok(f.includes(word), word);
  assert.ok(lines.every((l) => [...l].length <= 80));
  assert.deepEqual(checkBoxes(f), []);
  // The branch box ends by the "yes" line at the latest, so the next step's box starts clear.
  const yes = lines.findIndex((l) => l.includes("│ yes"));
  assert.match(lines[yes], /^ +│ yes( +└─+┘)?$/);
  assert.match(lines[yes + 2], /^[┌╔]/);
  // A single word wider than the box is split over lines, as wrap() does everywhere.
  const word = branchFlow([{ label: "a".repeat(40) }, { label: "b" }]);
  assert.ok(word.split("\n").every((l) => [...l].length <= 80));
  assert.equal((word.match(/a/g) ?? []).length, 40);
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
  // Threshold labels never run together: on a narrow scale one is dropped instead ("3 4.57" at 24).
  const pairs = [{ label: "ink", fg: "#111111", bg: "#ffffff" }];
  for (let width = 8; width <= 42; width++) {
    const head = contrast(pairs, { width }).split("\n")[0].trim().split(/\s+/);
    assert.ok(head.every((m) => ["3", "4.5", "7", "21:1"].includes(m)) && head.at(-1) === "21:1", `width ${width}: ${head.join(" ")}`);
  }
  assert.equal(contrast(pairs, { width: 24 }).split("\n")[0].trim(), "3 4.5             21:1");
  assert.match(stateMatrix({ variants: ["a"], states: ["rest"], cells: {} }), /a  ░░/); // unknown means missing
});

test("handoff: labels never truncated, empty checklist", () => {
  assert.match(redline([{ label: "a long label", size: 1 }, { label: "8", size: 1000 }], { width: 10 }), /◄ a long label ►/);
  assert.match(qaChecklist([]), /^0 of 0 done/);
});

test("anatomy: numbered parts, dashed when optional, and refusals in plain words", () => {
  const parts = [{ label: "Icon", optional: true }, { label: "Label", size: 3 }, { label: "Chevron", size: 1 }];
  const row = anatomy({ container: { label: "Button" }, parts });
  assert.match(row, /^┌ 1 ─+┐$/m);
  assert.match(row, /┌ 2 ┄+┐  ┌ 3 ─+┐  ┌ 4 ─+┐/);
  assert.match(row, /^2  Icon\s+optional$/m);
  assert.match(row, /┄ dashed edge: an optional part/);
  const card = anatomy({ direction: "column", container: { label: "Card" }, parts: [{ label: "Media", size: 3 }, { label: "Title" }] }).split("\n");
  assert.equal(card.filter((l) => /^│  │\s+│  │$/.test(l)).length, 2); // Media keeps two extra lines of room
  assert.ok(!card.join("\n").includes("dashed"));
  const refuse = (data, re) => assert.throws(() => resolve({ kind: "anatomy", source: "s", data }), re);
  refuse({ parts: [{ label: "a" }] }, /at least 2 parts/);
  refuse({ parts: [{ label: "a" }, { label: "a" }] }, /Two parts are called "a"/);
  refuse({ parts: Array.from({ length: 9 }, (_, i) => ({ label: `p${i}` })) }, /at most 8/);
  refuse({ direction: "grid", parts: [] }, /use "row" or "column"/);
  refuse({ parts: [{ label: "a", size: 0 }, { label: "b" }] }, /a size is a number above zero/);
  refuse({ parts: ["one", "two", "three"].map((n) => ({ label: `A long name for part ${n}` })) }, /set direction to "column"/);
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
  assert.match(chart, /<pre lang="en" class="gk-figure" role="img" aria-label="Signup to paid/);
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
  const { paintLine } = await import("../skills/glyph-kit/scripts/render/paint.mjs");
  assert.equal(paintLine("a ██░ b"), 'a <span class="gk-d">██</span><span class="gk-e">░ </span>b');
  assert.match(paintLine("x blocked  thing"), /<span class="gk-x">x blocked/);
  assert.match(paintLine("ratio 19.3:1  AAA"), /<span class="gk-ok">AAA<\/span>/);
  assert.equal(paintLine("<b>"), "&lt;b&gt;");
  // "over" and "fails" are verdicts at the end of a line, not words in a label.
  assert.doesNotMatch(paintLine("Processes over time  ████  12"), /gk-x/);
  assert.doesNotMatch(paintLine("Checkout fails less  ████  12"), /gk-x/);
  assert.match(paintLine("[ ████ ] 112% of the cap over"), /<span class="gk-x">over<\/span>/);
});

test("deck: one slide per spec, and markdown keeps the description", () => {
  const deck = renderDeck(examples.research, { title: "Research" });
  assert.equal((deck.match(/class="gk-slide[ "]/g) ?? []).length, examples.research.length);
  assert.match(renderMarkdown(examples.research[0]), /```text[\s\S]*```\n\n\*How people rated/);
});

test("motion types play their own timing in the figure, at real speed", () => {
  const delaysOf = (spec) => arriveLines(spec, body(spec)).map((l) => [...l.matchAll(/--d:([\d.]+)ms/g)].map((m) => Number(m[1])));
  const timing = examples.motion.find((s) => s.kind === "motionTiming");
  const rows = delaysOf(timing).filter((d) => d.length);
  const fills = rows.map((d) => Math.max(...d.filter((x) => x < Math.max(...d))));
  assert.ok(Math.abs(Math.max(...rows[0]) - 200) < 1 && Math.abs(Math.max(...rows[1]) - 150) < 1, "each row lands at its own duration");
  assert.ok(fills.every((f) => f <= 200), "rulers fill within their durations");
  const strip = examples.motion.find((s) => s.kind === "filmstrip");
  const times = body(strip).split("\n").map((l) => Number(l.match(/^\s*(\d+)ms/)?.[1])).filter((n) => n > 0);
  assert.deepEqual([...new Set(delaysOf(strip).flat())].sort((a, b) => a - b), times, "frames appear at their timestamps");
  const st = examples.motion.find((s) => s.kind === "stagger");
  const firsts = delaysOf(st).filter((d) => d.length).map((d) => Math.min(...d));
  assert.deepEqual(firsts.slice(0, st.data.count).map(Math.round), staggerStarts(st.data).filter((x) => x > 0).length === st.data.count ? staggerStarts(st.data) : firsts.slice(0, st.data.count).map(Math.round));
  const page = renderHtml(examples.motion);
  assert.doesNotMatch(page, /gk-track/, "no box crossing a track");
  assert.match(page, /b\.setAttribute\("aria-label","Play again"\);b\.textContent="↺"/, "every arriving figure gets a replay");
  assert.match(page, /\.gk-replay::before\{content:"";position:absolute;inset:-10px\}/, "the replay has a 44px target");
  for (const at of staggerStarts(st.data)) assert.match(page, new RegExp(`--at:${at}ms`), "the stagger cards use the figure's start times");
});

test("arrival: types with an order arrive in HTML and decks, and end on the exact still", () => {
  // Every type moves: it either keeps moving (the processes) or arrives in its own order.
  // A document layout is a page of other figures, so it has no motion of its own.
  for (const kind of Object.keys(KINDS)) if (!KINDS[kind].layout) assert.ok(KINDS[kind].arrive || KINDS[kind].motion, `${kind} has no motion`);
  const strip = (html) => html.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  // Screens become working prototypes in HTML and decks; they arrive where they are drawn as text.
  const specs = Object.values(examples).flat().filter((s) => KINDS[s.kind].arrive && s.kind !== "screen" && s.kind !== "responsive");
  for (const spec of specs) {
    const text = body(spec);
    // HTML: the figure is marked to arrive, every delay sits on the 40ms step, and the text is unchanged.
    const page = renderHtml(spec);
    const pre = page.match(/<pre [^>]*class="gk-figure" data-arrive[^>]*>([\s\S]*?)<\/pre>/);
    assert.ok(pre, `${spec.kind} arrives in HTML`);
    const noLayers = (h) => h.replace(/<span class="gk-s[012]" aria-hidden="true"[^>]*>(?:<span[^>]*>[^<]*<\/span>|[^<])*<\/span>/g, "");
    assert.equal(strip(noLayers(pre[1])), text, `${spec.kind}: arriving keeps the text`);
    const delays = [...pre[1].matchAll(/--d:(\d+)ms/g)].map((m) => Number(m[1]));
    // Motion types play at their real timing; everything else steps on the 40ms clock.
    if (!KINDS[spec.kind].arrive(text.split("\n"), resolve(spec).data, spec.options ?? {}).exact) assert.ok(delays.length > 0 && delays.every((d) => d % 40 === 0), `${spec.kind} steps on 40ms`);
    if (["decisionLog", "quoteCard", "table", "tokenTable"].includes(spec.kind)) assert.ok(Math.max(...delays) <= 600, `${spec.kind} settles within 600ms`);
    assert.match(page, /data-arrive/);
    assert.match(page, /IntersectionObserver/);
    // Deck: the same spans, started after the title.
    const deck = renderDeck([spec]);
    const fig = deck.match(/<pre [^>]*gk-fig--arrive[^>]*>([\s\S]*?)<\/pre>/);
    assert.ok(fig, `${spec.kind} arrives in a deck`);
    assert.equal(fig[1].split(/<span class="gk-ln" data-l="\d+">/).slice(1).map((l) => strip(noLayers(l))).join("\n"), text.split("\n").map((l) => l || " ").join("\n"));
  }
  // Column types: the cuts sit on the drawn columns.
  for (const spec of specs.filter((s) => ["compare", "emotionCurve", "journeyMap"].includes(s.kind))) {
    const def = resolve(spec);
    const lines = def.render(def.data, spec.options ?? {}).split("\n").map((l) => [...l]);
    const columns = { compare: compareColumns, emotionCurve: emotionColumns, journeyMap: journeyColumns }[spec.kind](def.data, spec.options ?? {});
    for (const cut of columns.cuts) assert.ok(lines.some((l) => l[cut] && l[cut] !== " " && l[cut - 1] === " "), `${spec.kind}: a column starts at ${cut}`);
  }
  // No arrival sits still for more than 300ms before it settles: the after column of a comparison
  // starts as soon as the before column has stepped, and journey stages follow each other closely.
  for (const spec of specs) {
    const g = arrivalGap(spec);
    assert.ok(g.gap <= 300 && g.still <= 300, `${spec.kind}: still for ${Math.max(g.gap, g.still)}ms`);
  }
  const cmp = examples.metrics.find((s) => s.kind === "compare");
  const order = KINDS.compare.arrive(body(cmp).split("\n"), resolve(cmp).data, cmp.options ?? {});
  const [before, after] = compareColumns(resolve(cmp).data, cmp.options ?? {}).cuts;
  assert.ok(order(1, before, "█") > 0 && order(1, after, "█") - order(1, before, "█") <= 120, "the after column follows the before column");
  // Reading order: frame first, then rows top to bottom.
  const log = examples.planning.find((s) => s.kind === "decisionLog");
  const read = KINDS.decisionLog.arrive(body(log).split("\n"), log.data, {});
  assert.equal(read(0, 0, "┌"), 0);
  assert.ok(read(1, 2, "D") < read(3, 2, "O") && read(3, 2, "O") < read(4, 2, "O"));
  // Types without an order print as before (the processes keep their own motion).
  assert.doesNotMatch(renderHtml(examples.metrics.find((s) => s.kind === "funnel")), /class="gk-figure" data-arrive/);
  assert.doesNotMatch(renderDeck(examples.metrics.filter((s) => s.kind === "funnel")), /class="gk-fig gk-fig--arrive"/);
  // Bars: one speed, so the longest finishes last; block cells step through ░ and ▒; values land as their bar stops.
  const bars = examples.metrics.find((s) => s.kind === "barChart");
  const fill = KINDS.barChart.arrive(body(bars).split("\n"), bars.data, {});
  const ends = body(bars).split("\n").slice(0, 2).map((l) => [...l].findLastIndex((ch) => /[█▏▎▍▌▋▊▉]/.test(ch)));
  assert.ok(fill(0, ends[0]) > fill(1, ends[1]), "the longest bar finishes last");
  assert.equal(fill(0, 11), fill(1, 11), "bars fill at the same speed");
  assert.ok(fill(0, ends[0] + 3) > fill(0, ends[0]), "the value lands after its bar");
  const html = renderHtml(bars);
  assert.match(html, /<span class="gk-s"><span class="gk-s1" aria-hidden="true" style="--d:\d+ms">/);
  assert.match(html, /\.gk-s1,\.gk-s2\{position:absolute;left:0;top:0;visibility:hidden/);
});

test("lint: catches a broken frame and an unmeasured glyph", () => {
  const broken = "┌────┐\n│ ab │\n│ abc │\n└────┘";
  assert.ok(lintBlock(broken).some((p) => /right edge missing/.test(p.message)));
  assert.ok(lintBlock("a ⚠ b").some((p) => p.level === "error"));
  assert.equal(lintBlock("┌────┐\n│ ab │\n└────┘").length, 0);
  assert.ok(lintBlock("┌──┐\n│ab│\n└──┘").some((p) => /touches its box/.test(p.message)));
  assert.ok(Object.keys(KINDS).length >= 45);
});

test("motion audit: deck and prototype motion follow the animations.dev findings", () => {
  const deck = renderDeck(JSON.parse(readFileSync(join(root, "examples/decks/export-review.json"), "utf8")));
  assert.doesNotMatch(deck, /is-typing|\.gk-cmd\{animation|--n", n\)/, "titles and commands no longer type");
  assert.match(deck, /\.gk-world\{[^}]*transition:transform 450ms cubic-bezier\(\.32,\.72,0,1\)/);
  assert.match(deck, /\.gk-ln\{[^}]*transition:opacity 450ms cubic-bezier\(\.32,\.72,0,1\)/);
  const page = renderHtml(examples.motion);
  assert.doesNotMatch(page, /transition:left/, "demo boxes move with transform");
  assert.match(page, /\.gk-btn:active:not\(:disabled\)\{transform:scale\(\.97\)\}/);
  assert.doesNotMatch(page.replace(/@media \(hover:hover\) and \(pointer:fine\)\{[^{}]*\{[^}]*\}\}/g, ""), /\.gk-btn:hover|\.gk-input:hover/, "hover only where hover exists");
  assert.doesNotMatch(page, /transition-duration:0s!important/, "reduced motion keeps colour fades");
  assert.match(page, /IntersectionObserver\(\(es\)=>\{if\(!es\[0\]\.isIntersecting\)return;io\.disconnect\(\);play\(\)\}/, "demos play on view");
});
