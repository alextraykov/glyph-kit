// Pages: the page tree, components, layers, the grammar's refusals, the mask, arrival, the prototype
// and the map. The old screen kinds keep their 0.2.0 bytes.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { KINDS } from "../skills/glyph-kit/scripts/registry.mjs";
import { body, renderText } from "../skills/glyph-kit/scripts/render/text.mjs";
import { assertFits } from "../skills/glyph-kit/scripts/layout.mjs";
import { lintBlock } from "../skills/glyph-kit/scripts/lint.mjs";
import { cells, width } from "../skills/glyph-kit/scripts/text.mjs";
import { pieces } from "../skills/glyph-kit/scripts/areas/components.mjs";
import { checkPage, closest } from "../skills/glyph-kit/scripts/areas/grammar.mjs";
import { layerFrames, layoutPage, page, pageArrival } from "../skills/glyph-kit/scripts/areas/page.mjs";
import { classify, paintLine } from "../skills/glyph-kit/scripts/render/paint.mjs";
import { arriveLines, ARRIVE_CSS } from "../skills/glyph-kit/scripts/render/arrive.mjs";
import { renderHtml } from "../skills/glyph-kit/scripts/render/html.mjs";
import { renderDeck } from "../skills/glyph-kit/scripts/render/deck.mjs";
import { maskOf } from "../skills/glyph-kit/scripts/render/mask.mjs";

const cli = new URL("../skills/glyph-kit/scripts/glyph-kit.mjs", import.meta.url).pathname;
const run = (args, input) => spawnSync("node", [cli, ...args], { encoding: "utf8", input });
const PATTERNS = ["pricing", "settings", "list-filters", "inbox", "dashboard", "sign-in"];
const pattern = (name) => JSON.parse(readFileSync(new URL(`../skills/glyph-kit/templates/patterns/${name}.json`, import.meta.url)));
const clean = (text) => lintBlock(text).filter((p) => p.level === "error");

const nav = { type: "nav", brand: "Acme", items: ["Projects", "Reports"], selected: "Projects", actions: [{ label: "More" }, { label: "New", primary: true }] };
const table = { type: "dataTable", columns: ["name", "owner", "updated"], rows: [["Checkout", "Mia", "2 h ago"], ["Onboarding", "Sam", "1 d ago"], ["Billing", "Ana", "3 d ago"], ["Search", "Lee", "1 w ago"], ["Invoices", "Kai", "2 w ago"]] };
const base = (layers = [], width = 64) => ({ title: "Acme", width, sections: [{ rows: [nav] }, { rows: [table] }], layers });

// Awkward words for every component: long, empty, CJK, and the Turkish and German cases.
const WORDS = { plain: "Projects", long: "An unusually long label that will not fit anywhere", empty: "", cjk: "漢字日本語の表", tr: "istanbul ılık", de: "Straße" };
const component = (w) => [
  { type: "nav", brand: w, items: [w, "Two"], selected: w, actions: [{ label: w || "Go" }] },
  { type: "tabsBar", items: [{ text: w, count: 12 }, "Two"], selected: w, actions: [{ label: "Export" }] },
  { type: "fieldGroup", title: w, help: w, fields: [{ type: "input", label: w, value: w }, { type: "select", label: "Time zone", value: w }, { type: "toggle", label: w, on: true }] },
  { type: "dataTable", search: w, actions: [{ label: "Filter" }], selectable: true, checked: [0], columns: [w, "owner", "status"], rows: Array.from({ length: 14 }, (_, i) => [w, `P${i}`, "live"]), total: 18 },
  { type: "card", title: w, meta: w, rows: [{ type: "heading", text: w }], footer: [{ label: w || "Go" }] },
  { type: "emptyState", title: w, text: w, action: w || "New", secondary: "Import" }
];

test("components fit 40 to 80 cells with awkward words, lint clean, the same bytes twice", () => {
  for (const W of [40, 48, 64, 80])
    for (const [name, w] of Object.entries(WORDS))
      for (const piece of component(w)) {
        const spec = { kind: "page", data: { width: W, sections: [{ rows: [piece] }] } };
        const text = body(spec);
        assertFits(text, W);
        assert.ok(text.split("\n").every((l) => width(l) <= W), `${piece.type} ${name} at ${W}`);
        assert.deepEqual(clean(text), [], `${piece.type} ${name} at ${W}`);
        assert.equal(body(spec), text);
      }
});

test("components: label columns line up, table columns never overflow, cards share one height", () => {
  const form = pieces([{ type: "fieldGroup", fields: [{ type: "input", label: "Name" }, { type: "input", label: "Email address" }, { type: "select", label: "Day", value: "Monday" }] }], 44);
  assert.equal(new Set(form.map((l) => l.indexOf("["))).size, 1);
  for (const w of [20, 30, 44, 76]) {
    const t = pieces([{ type: "dataTable", columns: ["a long column name", "b", "c"], rows: [["x".repeat(40), "y", "z"]] }], w);
    assert.ok(t.every((l) => width(l) === w || width(l) <= w), `table at ${w}`);
  }
  const cardsPage = { kind: "page", data: { width: 64, sections: [{ cards: [{ title: "A", rows: [{ type: "text", text: "one" }] }, { title: "B", rows: [{ type: "text", text: "one" }, { type: "text", text: "two" }, { type: "text", text: "three" }] }] }] } };
  const lines = body(cardsPage).split("\n");
  const bottoms = lines.filter((l) => l.includes("└"));
  assert.equal(bottoms.length, 1);
  assert.equal(bottoms[0].split("└").length - 1, 2);
  const stats = pieces([{ type: "stats", items: [{ label: "A", value: "1" }, { label: "B", value: "2" }, { label: "C", value: "3" }] }], 60);
  assert.ok(stats.every((l) => width(l) === 60));
});

test("the page tree: separators, joints, frames and limits", () => {
  const text = body({ kind: "page", data: { title: "Acme", width: 60, url: "acme.com", sections: [
    { rows: [nav] },
    { split: "1:3", columns: [[{ type: "text", text: "Side" }], [{ type: "text", text: "Main" }]] },
    { split: "1:3", columns: [[{ type: "text", text: "Side" }], [{ type: "text", text: "Main" }]] },
    { rows: [{ type: "text", text: "under the columns" }] },
    { above: "line", rows: [{ type: "text", text: "after a line" }] },
    { above: "space", rule: false, columns: [[{ type: "text", text: "a" }], [{ type: "text", text: "b" }]] }] } });
  const lines = text.split("\n");
  assert.match(lines[1], /◄ ►  \[acme\.com_+\]/);
  assert.ok(lines.some((l) => /^╠═+╦═+╣$/.test(l)), "a column rule takes ╦ above");
  assert.ok(lines.some((l) => /^╠═+╬═+╣$/.test(l)), "two column sections meet at ╬");
  assert.ok(lines.some((l) => /^╠═+╩═+╣$/.test(l)), "and ╩ below");
  assert.ok(lines.some((l) => /^║ ─+ ║$/.test(l)), "a line separator is inset");
  assert.match(lines.at(-1), /^╚═+╝$/);
  assertFits(text);
  assert.deepEqual(clean(text), []);
  // The title stops short of the first joint in the top frame.
  const top = body({ kind: "page", data: { title: "A title much longer than the side column", width: 60, sections: [{ split: "1:3", columns: [[], []] }] } }).split("\n")[0];
  assert.match(top, /^╔═ A title mu… ╦═+╗$/);
  // Past 8 sections, the rest is counted.
  const many = body({ kind: "page", data: { width: 40, sections: Array.from({ length: 10 }, (_, i) => ({ rows: [{ type: "text", text: `S${i}` }] })) } });
  assert.match(many, /… and 2 more sections/);
  assert.throws(() => page({ width: 40, sections: Array.from({ length: 8 }, () => ({ rows: Array.from({ length: 12 }, () => ({ type: "text", text: "x" })) })) }), /^Error: This page needs \d+ rows; a page has at most 80\. Take out a section or split it into two pages\.$/);
});

test("patterns: each renders, lints, fits and matches its snapshot; pattern, guide and check agree", () => {
  for (const name of PATTERNS) {
    const spec = pattern(name);
    const text = renderText(spec);
    assert.equal(text + "\n", readFileSync(new URL(`fixtures/patterns/${name}.txt`, import.meta.url), "utf8"), name);
    assertFits(body(spec));
    assert.deepEqual(clean(body(spec)), [], name);
    assert.deepEqual(checkPage(spec.data), [], name);
    assert.ok(spec.intent, `${name} has a one-line intent`);
    renderHtml(spec);
  }
  const listed = run(["pattern"]).stdout.trim().split("\n").map((l) => l.split(/\s+/)[0]);
  assert.deepEqual(listed, PATTERNS);
  const guide = readFileSync(new URL("../skills/glyph-kit/reference/areas/wireframes.md", import.meta.url), "utf8");
  for (const name of PATTERNS) assert.match(guide, new RegExp(`\\| \`${name}\` \\|`));
  assert.equal(JSON.parse(run(["pattern", "inbox"]).stdout).kind, "page");
  const r = run(["pattern", "login"]);
  assert.equal(r.status, 1);
  assert.equal(r.stderr.trim(), 'There is no pattern called "login". Patterns: pricing, settings, list-filters, inbox, dashboard, sign-in.');
  assert.match(run(["pattern", "dashbord"]).stderr, /Did you mean dashboard\?/);
});

test("grammar: each refusal names its fix, word for word", () => {
  const one = (data) => checkPage(data);
  const rows = (...r) => ({ sections: [{ rows: r }] });
  assert.equal(one(rows({ type: "datatable" }))[0], `There is no piece called "datatable". Did you mean dataTable? Pieces: heading, text, muted, input, search, buttons, checkbox, radio, toggle, select, tabs, list, table, image, skeleton, empty, bar, space, divider, nav, tabsBar, fieldGroup, dataTable, card, stats, emptyState.`);
  assert.deepEqual(one(rows({ type: "card", title: "A", subtitle: "B" })), ['A card takes title, meta, rows and footer; "subtitle" isn\'t one.']);
  assert.deepEqual(one({ ...rows(), layers: [{ type: "drawer", size: "xl" }] }), ["A drawer's size is s, m or l."]);
  assert.deepEqual(one({ sections: [{ split: "2:3", columns: [[], []] }] }), ["split is one of 1:1, 1:2, 1:3, 1:4, 2:1, 1:1:1, 1:2:1, 1:1:2, 1:1:1:1."]);
  assert.deepEqual(one(rows({ type: "drawer", title: "Filter" })), ['A drawer is a layer: put it in "layers", not in a section\'s rows.']);
  assert.deepEqual(one({ sections: [{ cards: [{ title: "A", rows: [{ type: "card", title: "B" }] }, { title: "C" }] }] }), ["A card can't hold a card. Put the cards side by side in a cards section."]);
  assert.deepEqual(one({ title: "Acme", sections: [{ rows: [nav] }], layers: [{ type: "popover", anchor: "Filter", rows: [] }] }), ["There is no Filter to anchor to. This page has: Projects, Reports, More, New."]);
  assert.deepEqual(one({ sections: [{ split: "1:2", columns: [[], [{ type: "stats", items: [{ label: "a" }, { label: "b" }, { label: "c" }] }]] }], width: 48 }), ["Three stats need 46 cells; this column has 28. Use split 1:1 or give the stats their own section."]);
  assert.deepEqual(one({ sections: [{ cards: [{}, {}, {}, {}] }] }), ["A cards section holds 2 or 3 cards; section 1 has 4. Use two cards sections."]);
  assert.deepEqual(one({ ...rows(), layers: [{ type: "toast", text: "a" }, { type: "toast", text: "b" }, { type: "toast", text: "c" }] }), ["A page has at most 2 layers; this one has 3."]);
  assert.deepEqual(one({ sections: [{ columns: [[], [], [], [], []] }] }), ["A section has at most 4 columns; section 1 has 5."]);
  assert.deepEqual(one({ width: 40, sections: [{ columns: [[], [], [], []] }] }), ["Four columns need 51 cells; this page has 38 inside its frame."]);
  assert.deepEqual(one({ width: 48, sections: [{ split: "1:4", columns: [[], []] }] }), ["With split 1:4, a column gets 9 cells; a column needs 12. Use a more even split or a wider page."]);
  assert.deepEqual(one({ width: 30, sections: [{ rows: [] }] }), ["A page is 40 to 80 cells wide."]);
  assert.deepEqual(one(rows({ type: "stats", items: [{}, {}, {}, {}, {}] })), ["A stats piece shows up to 4 items; this one has 5. Use two stats pieces."]);
  assert.deepEqual(one({ ...rows(), layers: [{ type: "drawer", rows: [{ type: "menu", items: [] }] }] }), ["A drawer can't hold a menu. Make the menu the page's next layer, anchored to a button in the drawer."]);
});

test("grammar: all problems at once, near misses within two edits, old primitives only warn", () => {
  const problems = checkPage({ wdth: 80, sections: [{ rows: [{ type: "Nav" }, { type: "dataTabel" }] }, { split: "1:5", columns: [[], []] }], layers: [{ type: "drawr" }] });
  assert.equal(problems.length, 5, problems.join("\n"));
  assert.match(problems.join(" "), /"wdth" isn't one.*Did you mean nav\?.*Did you mean dataTable\?.*split is one of.*Did you mean drawer\?/s);
  assert.equal(closest("datatable", ["dataTable"]), "dataTable");
  assert.equal(closest("dtTbl", ["dataTable"]), null);
  assert.equal(closest("emptyStat", ["emptyState"]), "emptyState");
  // An unknown option on an old primitive is drawn without it, with a warning.
  assert.deepEqual(checkPage({ sections: [{ rows: [{ type: "heading", text: "A", size: "xl" }] }] }), []);
  const r = run(["render", "-"], JSON.stringify({ kind: "page", data: { sections: [{ rows: [{ type: "heading", text: "A", size: "xl" }] }] } }));
  assert.equal(r.status, 0);
  assert.match(r.stderr, /A heading takes text; "size" isn't one, so it is left out\./);
  const c = run(["check", "-"], JSON.stringify({ kind: "page", data: { sections: [{ rows: [{ type: "Nav" }, { type: "card", subtitle: "x" }] }] } }));
  assert.equal(c.status, 1);
  assert.equal(c.stderr.trim().split("\n").length, 2);
  assert.equal(run(["check", "-"], JSON.stringify(pattern("inbox"))).stdout.trim(), "No problems.");
});

test("old kinds give the same bytes as 0.2.0, and guide prints a spec for each", () => {
  for (const { spec, text } of JSON.parse(readFileSync(new URL("fixtures/presets-0.2.0.json", import.meta.url), "utf8"))) assert.equal(body(spec), text, spec.kind);
  for (const kind of ["screen", "responsive", "appShell", "cardGrid", "listDetail", "modal", "page"]) {
    const out = run(["guide", kind]).stdout;
    assert.equal(JSON.parse(out.match(/```json\n([\s\S]*?)```/)[1]).kind, kind);
  }
});

test("layers: placed, clipped, shadowed and joined by code", () => {
  const draw = (layers, W) => body({ kind: "page", data: base(layers, W) });
  const right = draw([{ type: "drawer", title: "Filter", rows: [{ type: "checkbox", label: "Live", checked: true }], footer: [{ label: "Apply", primary: true }] }], 80).split("\n");
  assert.match(right[3], /═╦═+╣$/);
  assert.match(right.at(-1), /═╩═+╝$/);
  assert.ok(right.slice(4, -1).every((l) => /░[║╠]/.test(l)), "a ░ shadow faces the page");
  assert.match(right[5], /░╠═+╣$/);
  assert.match(right.at(-2), /\[\[ Apply \]\] ║$/);
  const left = draw([{ type: "drawer", side: "left", size: "s", title: "Nav", rows: [] }], 64).split("\n");
  assert.match(left[5], /^╠═+╣░/);
  for (const W of [40, 64, 80]) for (const size of ["s", "m", "l"]) {
    const t = draw([{ type: "drawer", size, title: "F", rows: [] }], W);
    assertFits(t);
    const edge = cells(t.split("\n")[4]).indexOf("░");
    assert.ok(edge - 1 >= 20, `${size} drawer at ${W} leaves 20 cells of page`);
  }
  // A popover moves left to fit; ▲ stays over its anchor's middle.
  const pop = draw([{ type: "popover", anchor: "New", rows: [{ type: "text", text: "Hi" }] }], 64).split("\n");
  const anchor = cells(pop[1]).join("").indexOf("[[ New ]]");
  assert.equal(cells(pop[2]).indexOf("▲"), anchor + 4);
  assert.ok(pop.every((l) => width(l) <= 64));
  // A menu takes its width from its longest item and anchors to an earlier layer's button.
  const both = draw([{ type: "drawer", title: "F", rows: [{ type: "buttons", items: [{ label: "Sort" }] }] }, { type: "menu", anchor: "Sort", items: ["Newest", "-", { text: "Oldest", meta: "O" }] }], 80);
  assert.match(both, /│ Oldest +O │░/);
  assert.match(both, /├─+┤/);
  // A dialog dims the page; the page's rules become plain sides.
  const dialog = body({ kind: "page", data: { width: 64, sections: [{ rows: [nav] }, { split: "1:3", columns: [[], [table]] }], layers: [{ type: "dialog", title: "Delete?", rows: [], footer: [{ label: "Delete", primary: true }] }] } }).split("\n");
  assert.ok(dialog.slice(1, -1).every((l) => l.startsWith("║") && l.endsWith("║")));
  assert.doesNotMatch(dialog.join("\n"), /[╠╣╦╩╬]/);
  for (const t of [both, dialog.join("\n"), draw([{ type: "sheet", title: "Share", rows: [] }]), draw([{ type: "toast", text: "Saved.", action: "Undo" }])]) {
    assertFits(t);
    assert.deepEqual(clean(t), []);
  }
});

test("layers: a covered word goes back to its last whole word, and the page grows to fit", () => {
  const t = body({ kind: "page", data: { width: 64, sections: [{ rows: [{ type: "text", text: "Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima" }] }, { rows: [{ type: "text", text: "Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima" }] }], layers: [{ type: "drawer", size: "s", rows: [] }] } });
  const row = t.split("\n").find((l) => l.includes("░║") && l.includes("Alpha"));
  const visible = row.slice(1, row.indexOf("░")).trim().split(/\s+/);
  for (const word of visible) assert.ok("Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima".split(" ").includes(word), `"${word}" is a whole word`);
  const short = layoutPage(base([])).rows;
  const tall = layoutPage(base([{ type: "drawer", title: "F", rows: Array.from({ length: 14 }, () => ({ type: "text", text: "x" })) }])).rows;
  assert.ok(tall > short, "the page grew for the drawer");
  const sheet = layoutPage(base([{ type: "sheet", title: "S", rows: Array.from({ length: 6 }, () => ({ type: "text", text: "x" })) }]));
  const shadow = sheet.lines.findIndex((l) => l.includes("░░░░"));
  assert.ok(shadow - 3 - 1 >= 4, "four rows of the page stay above a sheet");
});

test("mask: one letter per cell; page cells under a layer are muted, the text never changes", () => {
  const data = base([{ type: "drawer", title: "Filter", rows: [] }]);
  const lay = layoutPage(data);
  assert.deepEqual(lay.mask.map((m) => m.length), lay.lines.map((l) => cells(l).length));
  assert.ok(lay.mask.every((m) => /^[pls]+$/.test(m)));
  assert.equal(body({ kind: "page", data }), lay.lines.map((l) => l.trimEnd()).join("\n"));
  const r = 6;
  const roles = classify(lay.lines[r], { mask: lay.mask[r] });
  cells(lay.lines[r]).forEach((ch, c) => {
    if (lay.mask[r][c] === "p" && /[A-Za-z]/.test(ch)) assert.equal(roles[c], "u");
    if (lay.mask[r][c] === "l" && /[A-Za-z]/.test(ch)) assert.equal(roles[c], "");
    if (lay.mask[r][c] === "s") assert.equal(roles[c], "f");
  });
  assert.equal(paintLine("Checkout ok"), paintLine("Checkout ok", {}));
  assert.doesNotMatch(paintLine("Checkout ok"), /gk-u/);
  assert.equal(maskOf({ kind: "page", data: base([]) }), undefined);
  assert.equal(maskOf({ kind: "page", data: base([{ type: "dialog", title: "D", rows: [] }]) }), undefined);
  assert.equal(maskOf({ kind: "funnel", source: "x", data: [{ label: "a", value: 2 }, { label: "b", value: 1 }] }), undefined);
  const html = renderHtml({ kind: "page", data });
  assert.match(html.match(/<details>[\s\S]*<\/details>/)[0], /class="gk-u"/);
});

test("arrival: the page first, then each layer once, its frames clipped to the frame, within 600ms", () => {
  for (const layer of [{ type: "drawer", title: "F", rows: [] }, { type: "drawer", side: "left", title: "F", rows: [] }, { type: "sheet", title: "S", rows: [] }, { type: "popover", anchor: "More", rows: [{ type: "text", text: "Hi" }] }, { type: "menu", anchor: "New", items: ["A", "B"] }, { type: "toast", text: "Saved." }, { type: "dialog", title: "D", rows: [] }]) {
    const data = base([layer, ...(layer.type === "drawer" ? [{ type: "toast", text: "Saved." }] : [])]);
    const lay = layoutPage(data);
    const W = cells(lay.lines[0]).length;
    for (const p of lay.placed) {
      const frames = layerFrames(p);
      if (layer.type === "dialog") assert.deepEqual(frames, []);
      else {
        assert.deepEqual(frames.at(-1).grid.map((r) => r.join("")), p.redraw(0).grid.map((r) => r.join("")));
        if (p === lay.placed.at(-1)) assert.deepEqual(frames.at(-1).grid.map((r) => r.join("")), lay.lines, `${layer.type}: the last frame is the figure`);
        for (const f of frames) for (const row of f.grid) {
          assert.equal(row[0] === "║" || "╔╚╠".includes(row[0]), true, `${layer.type}: frame kept on the left`);
          assert.ok("║╗╝╣".includes(row[W - 1]), `${layer.type}: frame kept on the right`);
        }
      }
    }
    const lines = body({ kind: "page", data }).split("\n");
    const delay = pageArrival(lines, data);
    let latest = 0;
    lines.forEach((l, r) => cells(l).forEach((ch, c) => (latest = Math.max(latest, delay(r, c, ch)))));
    for (const f of delay.frames) for (const shots of Object.values(f.rows)) for (const s of shots) latest = Math.max(latest, s.at + s.len);
    assert.ok(latest <= 600, `${layer.type} settles by ${latest}ms`);
    const spec = { kind: "page", data };
    const arrived = arriveLines(spec, body(spec));
    const strip = (h) => h.replace(/<span class="gk-o"[^>]*>(?:<span[^>]*>[^<]*<\/span>|[^<])*<\/span>/g, "").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    assert.equal(strip(arrived.join("\n")), body(spec), `${layer.type}: arriving keeps the text`);
    if (layer.type !== "dialog") assert.match(arrived.join(""), /class="gk-o" aria-hidden="true"/);
    assert.match(renderDeck([{ ...spec, title: "Page" }]), /gk-fig--arrive/);
  }
  // Under reduced motion and in print the frames never show.
  assert.ok(/@media \(prefers-reduced-motion:reduce\)\{.*\.is-arriving \.gk-o\{visibility:hidden/.test(ARRIVE_CSS));
  assert.ok(/@media print\{.*\.is-arriving \.gk-o\{visibility:hidden/.test(ARRIVE_CSS));
});

test("prototype: real elements, tagged with the map's names, parts and props; layers placed and closable", () => {
  const map = JSON.parse(readFileSync(new URL("../skills/glyph-kit/templates/design-system.map.example.json", import.meta.url)));
  const lf = renderHtml(pattern("list-filters"), { map });
  assert.match(lf, /<nav class="gk-nav" data-component="TopNav">/);
  assert.match(lf, /data-part="TopNav.Item" aria-current="page">Projects</);
  assert.match(lf, /role="tablist"/);
  assert.match(lf, /<aside class="gk-drawer gk-drawer--right"[^>]*role="dialog" aria-modal="false"[^>]*data-component="Sheet" data-props="side=&quot;right&quot; size=&quot;md&quot;"/);
  assert.ok(lf.includes("gk-page gk-page--under"));
  assert.match(lf, /<table class="gk-table">/);
  assert.match(lf, /<nav class="gk-paging" aria-label="Pages" data-part="Pagination">/);
  const inbox = renderHtml(pattern("inbox"), { map });
  assert.match(inbox, /<span class="gk-anchor"><button aria-expanded="true" aria-controls="(gk-l\d+)" aria-haspopup="menu"[^>]*>More<\/button><div class="gk-menu[^"]*" id="\1" role="menu"/);
  assert.match(inbox, /role="menuitem" data-close data-part="DropdownMenu.Item"/);
  assert.match(inbox, /<hr role="separator" data-part="DropdownMenu.Separator">/);
  const pricing = renderHtml(pattern("pricing"));
  assert.match(pricing, /<article class="gk-card" data-component="card">/);
  assert.match(pricing, /class="gk-browser"/);
  assert.match(renderHtml(pattern("dashboard")), /<dl class="gk-stats"/);
  assert.match(renderHtml(pattern("settings"), { map }), /<fieldset class="gk-fieldset" data-component="Fieldset"><legend class="gk-h" data-part="Fieldset.Legend">Email<\/legend>/);
  const dialog = renderHtml({ kind: "page", data: base([{ type: "dialog", title: "Delete?", rows: [], footer: [{ label: "Delete", primary: true }] }]) });
  assert.match(dialog, /role="dialog" aria-modal="true"/);
  assert.ok(!dialog.includes("gk-page gk-page--under"));
  for (const h of [lf, inbox, pricing, dialog]) assert.doesNotMatch(h, /undefined|\[object/);
  // Without a map, names fall back to the kit's.
  assert.match(renderHtml(pattern("list-filters")), /data-component="drawer"/);
});

test("map check lists exactly the pieces with no entry", () => {
  const spec = JSON.stringify(pattern("dashboard"));
  const r = run(["map", "check", "-", "--map", new URL("../skills/glyph-kit/templates/design-system.map.example.json", import.meta.url).pathname], spec);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.stdout.trim(), "Every piece has a map entry.");
  const file = join(mkdtempSync(join(tmpdir(), "gk-map-")), "map.json");
  writeFileSync(file, JSON.stringify({ components: { nav: { name: "TopNav" }, list: { name: "List" } } }));
  const m = run(["map", "check", "-", "--map", file], spec);
  assert.equal(m.status, 1);
  assert.equal(m.stdout.trim(), "No map entry: stats, card, image, dataTable. Ask what the project uses for each before building it.");
});

test("every kind in the registry still has a label and a render", () => {
  assert.equal(KINDS.page.area, "wireframes");
  assert.ok(KINDS.page.mask && KINDS.page.arrive && KINDS.page.check);
});
