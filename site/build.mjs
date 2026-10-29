#!/usr/bin/env node
// Builds traykov.cc/glyph-kit into site/dist with the kit's own renderers. No dependencies:
// every figure on the site is drawn by the same code the skill runs.
// Usage: node site/build.mjs
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kit = join(root, "skills/glyph-kit");
// The site lives at traykov.cc/glyph-kit: the portfolio's Vercel project passes that path through
// to this project, so every page and file is built under BASE.
const BASE = "/glyph-kit";
const dist = join(root, "site/dist");
const out = join(dist, BASE.slice(1));
const imp = (p) => import(new URL(`file://${join(kit, p)}`).href);

const { AREAS, KINDS } = await imp("scripts/registry.mjs");
const { AREA_DOCS, KIND_DOCS } = await import(new URL(`file://${join(root, "tools/docs.mjs")}`).href);
const { width: textWidth } = await imp("scripts/text.mjs");
const { body, label, renderText, renderMarkdown } = await imp("scripts/render/text.mjs");
const { renderMdx } = await imp("scripts/render/mdx.mjs");
const { renderSvg } = await imp("scripts/render/svg.mjs");
const { paint } = await imp("scripts/render/paint.mjs");
const { LIVE, live, stillGrid } = await imp("scripts/live/kinds.mjs");
const { resolve } = await imp("scripts/registry.mjs");
const { classify } = await imp("scripts/render/paint.mjs");
const { ARRIVE_CSS, ARRIVE_JS, arriveLines } = await imp("scripts/render/arrive.mjs");
const { PALETTES } = await imp("scripts/render/themes.mjs");
const { readBack } = await imp("scripts/read.mjs");
const core = await import(new URL(`file://${join(root, "site/src/showcase-core.mjs")}`).href);
const { parseChangelog, markdownToHtml, longDate } = await import(new URL(`file://${join(root, "site/src/changelog.mjs")}`).href);

const read = (p) => readFileSync(join(kit, p), "utf8");
const json = (p) => JSON.parse(read(p));
const plugin = JSON.parse(readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8"));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const REPO = "https://github.com/alextraykov/glyph-kit";
// Support: the Ko-fi page name (ko-fi.com/<name>), the same one .github/FUNDING.yml lists.
// Empty hides the button until there is one.
const KOFI = "";
const SUPPORT_URL = process.env.GLYPH_KIT_SUPPORT_URL ?? (KOFI ? `https://ko-fi.com/${KOFI}` : "");
// Stars, read once at build time so visitors' browsers never call GitHub. Shown from ten up.
const stars = await fetch("https://api.github.com/repos/alextraykov/glyph-kit", { signal: AbortSignal.timeout(4000), headers: { Accept: "application/vnd.github+json" } })
  .then((r) => (r.ok ? r.json() : null))
  .then((d) => (Number.isFinite(d?.stargazers_count) ? d.stargazers_count : null))
  .catch(() => null);
const starLabel = stars !== null && stars >= 10 ? `★ Star · ${stars.toLocaleString("en")}` : "★ Star";
// Ask for one: the drawing function runs on traykov.cc; the Turnstile site key is public.
const DRAW_URL = process.env.GLYPH_KIT_DRAW_URL ?? "https://traykov.cc/api/glyph-kit-draw";
const TURNSTILE_SITE_KEY = process.env.GLYPH_KIT_TURNSTILE_SITE_KEY ?? "0x4AAAAAAFbX6pR3QiTNlZ6I";
// Suggestions: three asks, each checked to build the figure its thumbnail shows (traykov.cc/labs/glyph-kit).
const SUGGESTIONS = [
  { short: "Signup funnel", kind: "Moving funnel", key: "moving:funnel", from: { live: "signup-funnel" },
    ask: "Show signup to paid for the last 30 days as people, not percentages, moving: 12,400 visited, 6,100 signed up, 2,300 activated, 610 paid. These are sample numbers." },
  { short: "Export flow", kind: "Flow with failures", key: "branchFlow", from: { area: "flows" },
    ask: "Map the export flow with its failure paths: open export, check there's data (if not, an empty state that sends you to import data), choose a format, check the file is ready (if not, show an error and go back to choosing a format), then download." },
  { short: "Settings screen", kind: "Wireframe", key: "screen", from: { area: "wireframes" },
    ask: "Wireframe the notification settings screen: tabs for profile, notifications and billing with notifications selected; a toggle \"Email me when a report is ready\" that's on, noted as off by default for new teams; a weekly summary toggle that's off; a digest day select set to Monday; a send-to field with team@example.com; then cancel and save, right aligned, noted that save is disabled until something changes." },
  { short: "Roadmap", kind: "Now, next, later", key: "board", from: { area: "planning" },
    ask: "Make a now, next, later roadmap. Now: export to CSV, fix date parsing on import. Next: saved views, keyboard shortcuts for tables. Later: scheduled reports." },
  { short: "Survey ratings", kind: "Opinion split", key: "likert", from: { area: "research" },
    ask: "Chart how 20 people rated the export flow, strongly disagree to strongly agree. Easy to find export: 2, 3, 2, 8, 5. Trust the numbers: 6, 5, 4, 3, 2. Would use it weekly: 1, 2, 5, 7, 5. It's sample data. I want to see where opinion splits before we pick what to fix." },
  { short: "Toast motion", kind: "Motion intent", key: "intentCard", from: { area: "motion" },
    ask: "Write the motion for a toast that confirms a save without taking focus: it comes up from below the edge and fades in, 200 ms, with a reveal ease (0.33, 1, 0.68, 1). With reduced motion it appears in place and stays for the same time." },
  { short: "Spacing tokens", kind: "Design system", key: "spacingScale", from: { area: "systems" },
    ask: "Show our spacing tokens as a scale: space-1 is 4, space-2 is 8, space-3 is 16, space-4 is 24, space-5 is 40." },
  { short: "Content width", kind: "Redline", key: "redline", from: { area: "handoff" },
    ask: "Redline the content width on mobile: 16 padding, 320 content, 16 padding." }
];
const SITE = `https://traykov.cc${BASE}`;

// ── Data ───────────────────────────────────────────────────────────────────────────────────────
const examples = Object.fromEntries(Object.keys(AREAS).map((a) => [a, JSON.parse(readFileSync(join(root, "tools/examples", `${a}.json`), "utf8"))]));
const liveSpecs = Object.fromEntries(
  readdirSync(join(kit, "examples/live")).filter((f) => f.endsWith(".json")).map((f) => {
    const spec = json(`examples/live/${f}`);
    return [f.replace(".json", ""), spec];
  })
);
const moving = Object.entries(liveSpecs).map(([id, spec]) => {
  const { make, still, summary } = live(spec);
  const grid = stillGrid(make, still);
  const lines = grid.toText().split("\n");
  return { id, spec, summary, html: grid.toHtml(), cols: Math.max(...lines.map(textWidth)), rows: lines.length };
});
// The looping types also play on the every-kind page, from their own examples. They join the specs the
// page's player reads, but not the gallery of moving diagrams.
const loopIds = {};
const loopSpecs = {};
for (const [area, list] of Object.entries(examples)) for (const s of list) {
  if (!KINDS[s.kind].motion || loopIds[s.kind]) continue;
  try { live({ ...s, motion: true }); } catch { continue; } // a test result without readings arrives instead
  loopIds[s.kind] = `kind-${s.kind}`;
  loopSpecs[`kind-${s.kind}`] = { ...s, motion: true };
}
const m = JSON.parse(readFileSync(join(root, "docs/measurements.json"), "utf8")).rows;
const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const stats = {
  count: m.length,
  us: med(m.map((r) => r.us)).toFixed(1),
  text: med(m.map((r) => r.textBytes)),
  png: (med(m.map((r) => r.pngBytes)) / 1024).toFixed(1),
  ratio: med(m.map((r) => r.pngBytes / r.textBytes)).toFixed(0),
  tokens: med(m.map((r) => r.imageTokens)),
  tokensLow: Math.min(...m.map((r) => r.imageTokens)),
  tokensHigh: Math.max(...m.map((r) => r.imageTokens))
};
// The cost study: the kit against text drawn by hand and HTML/JS, in Claude Code and through the API.
const study = JSON.parse(readFileSync(join(root, "docs/cost-study.json"), "utf8"));
const usd = (n) => `$${n.toFixed(2)}`;
const mv = study.claudeCode.medians.moving;
const times = (r) => `${r >= 10 ? Math.round(r) : r.toFixed(1)}×`;
const secs = (n) => (n >= 90 ? `${(n / 60).toFixed(0)} min` : `${Math.round(n)} s`);
const thousands = (n) => (n < 1000 ? String(Math.round(n)) : `${(n / 1000).toFixed(1)}k`);
// Output: one figure from the motion audit. Its text form comes first, because that is the deliverable
// most people paste; the other forms of the same spec swap in place.
const AUDIT_SPEC = json("examples/reports/motion-audit.json").sections.flatMap((x) => x.figures ?? []).find((f) => f.kind === "gantt");
const FORMATS = [
  { id: "text", name: "Text", copy: renderText(AUDIT_SPEC), view: (t) => `<pre class="grid-figure">${paint(t)}</pre>` },
  { id: "md", name: "Markdown", copy: renderMarkdown(AUDIT_SPEC), view: (t) => `<pre class="outputs__text">${esc(t)}</pre>` },
  { id: "mdx", name: "MDX", copy: renderMdx([AUDIT_SPEC]), view: (t) => `<pre class="outputs__text">${esc(t)}</pre>` },
  { id: "svg", name: "SVG", copy: renderSvg(AUDIT_SPEC, { theme: "paper" }), view: (t) => `<div class="outputs__svg">${t}</div>` }
];
// Areas new in this release, or with a new type, for the home page's New labels.
const NEW_AREAS = { systems: `New: ${KINDS.palette.label.toLowerCase()}, ${KINDS.colourRoles.label.toLowerCase()}` };
// The study's medians as one table: for each figure and each measure, the kit's value and HTML/JS's,
// each with a bar on the pair's own scale, and how many times better the kit did. Wins are green.
// Rows arrive in reading order; in each pair both bars grow at the same speed, so the kit's lands
// first, and the result lands when the longer bar finishes.
const STUDY_TABLE = (() => {
  const B = 8, STEP = 25, ROW = 160;
  const rows = Object.entries(study.claudeCode.medians).filter(([k]) => k !== "note").map(([, r]) => r);
  const metrics = [
    { title: "Time", key: "s", fmt: (n) => `${Math.round(n)} s` },
    { title: "Cost", key: "usd", fmt: usd },
    { title: "Tokens written", key: "out", fmt: thousands }
  ];
  const FW = Math.max(6, ...rows.map((r) => r.label.length));
  const GW = 1 + B + 1 + B + 1 + 5 + 1; // " kit····· html···· ×···· "
  const seg = (text, cls = "", d = null) => ({ text, cls, d });
  const pad = (segs, w) => { const n = segs.reduce((a, s) => a + [...s.text].length, 0); return [...segs, seg(" ".repeat(Math.max(0, w - n)))]; };
  const line = (first, groups) => [seg("│ "), ...pad(first, FW), seg(" │"), ...groups.flatMap((g) => [...pad(g, GW), seg("│")])];
  const rule = (l, m, r) => [seg(l + "─".repeat(FW + 2) + m + Array(metrics.length).fill("─".repeat(GW)).join(m) + r, "gk-f")];
  const out = [
    rule("┌", "┬", "┐"),
    line([], metrics.map((m) => [seg(" " + m.title)])),
    [seg("│ " + " ".repeat(FW) + " ├" + Array(metrics.length).fill("─".repeat(GW)).join("┼") + "┤", "gk-f")],
    line([seg("Type")], metrics.map(() => [seg(" "), seg("kit".padEnd(B + 1), "win"), seg("HTML/JS".padEnd(B + 1), "lose"), seg("wins")])),
    rule("├", "┼", "┤")
  ];
  rows.forEach((r, i) => {
    const t0 = i * ROW;
    const pairs = metrics.map((m) => {
      const k = r.kit[m.key], h = r.html[m.key], top = Math.max(k, h);
      const kn = Math.max(1, Math.round((k / top) * B)), hn = Math.max(1, Math.round((h / top) * B));
      return { k, h, kn, hn, m, won: k < h, done: t0 + Math.max(kn, hn) * STEP };
    });
    out.push(line([seg(r.label, "", t0)], pairs.map((p) => [
      seg(" "), seg(p.m.fmt(p.k).padEnd(B + 1), "", t0), seg(p.m.fmt(p.h).padEnd(B + 1), "", t0),
      p.won ? seg(times(p.h / p.k), "win", p.done + 40) : seg("–", "lose", p.done + 40)
    ])));
    const bar = (n, cls) => [...Array.from({ length: n }, (_, c) => seg("█", `gk-d ${cls}`, t0 + (c + 1) * STEP)), seg(" ".repeat(B - n + 1))];
    out.push(line([], pairs.map((p) => [seg(" "), ...bar(p.kn, "win"), ...bar(p.hn, "lose")])));
    if (i < rows.length - 1) out.push(line([], metrics.map(() => [])));
  });
  out.push(rule("└", "┴", "┘"));
  const html = out.map((l) => l.map((s) => {
    const body = s.cls ? `<span class="${s.cls}">${esc(s.text)}</span>` : esc(s.text);
    return s.d == null ? body : `<span class="gk-a" style="--d:${s.d}ms">${body}</span>`;
  }).join("")).join("\n");
  const label = `The kit against HTML/JS in Claude Code, medians: ${rows.map((r) => `${r.label}: ${metrics.map((m) => `${m.title.toLowerCase()} ${m.fmt(r.kit[m.key])} against ${m.fmt(r.html[m.key])}`).join(", ")}`).join("; ")}.`;
  return `<pre class="grid-figure" data-arrive role="img" aria-label="${esc(label)}">${html}</pre>`;
})();
const kindCount = Object.keys(KINDS).length;
const areaCount = Object.keys(AREAS).length;
// Size of the release zip, when it has been packed (node scripts/pack.mjs); otherwise left out.
let zipSize = "about 0.5 MB";
try {
  zipSize = `${Math.round(statSync(join(root, "dist/glyph-kit.zip")).size / 1024)} KB`;
} catch {}
// Figures arrive the way the kit's HTML does: once, in the order that carries their point. Figures the
// guide animates itself stay plain.
// `text` draws a figure as someone left it (an edited drawing) with its spec's arrival.
const figure = (spec, { arrive = true, text = body(spec), aria = label(spec) } = {}) => {
  const arrived = arrive ? arriveLines(spec, text) : null;
  return `<pre class="grid-figure"${arrived ? " data-arrive" : ""} role="img" aria-label="${esc(aria)}">${arrived ? arrived.join("\n") : paint(text)}</pre>`;
};
const stage = (cols, rows, pre) => `<div class="stage" style="--cols:${cols};--rows:${rows}">${pre}</div>`;
const liveFigure = (mv) => `<figure class="demo">
  <div class="demo__bar"><span class="label">${esc(mv.spec.title)}</span><span class="label">Sample data</span></div>
  ${stage(mv.cols, mv.rows, `<pre class="grid-figure live" role="img" aria-label="${esc(mv.summary)}" data-live="${mv.id}">${mv.html}</pre>`)}
  <figcaption>${esc(mv.spec.intent)}</figcaption>
</figure>`;

// ── The hero showcase: views of the kit in one box, swapped with the dither press ───────────────
const ex = (area, kind) => examples[area].find((sp) => sp.kind === kind);
// Every view moves: the six moving kinds, one after another.
const showcaseViews = [
  { live: "rework-loop", title: "Rework loop", caption: "Where the week goes: about one in three pieces of work comes back from QA." },
  { live: "report-loading", title: "Loading a screen", caption: "What someone sees in the first two seconds: a skeleton, then the text, then the image." },
  { live: "signup-funnel", title: "Funnel as people", caption: "Signup to paid: each person falls to the next step or drifts out." },
  { live: "save-states", title: "State machine", caption: "Every state of saving a draft, including the failure and the retry." },
  { live: "review-queue", title: "Work queue", caption: "Review takes two at a time, so everything before it waits." },
  { live: "staged-rollout", title: "Staged rollout", caption: "The stages, the guard, and what happens when it trips." }
].map((v) => {
  if (v.live) {
    const { make, still, summary } = live(liveSpecs[v.live]);
    // The columns this view's ink ever uses, sampled across its motion, so it centres on the drawing.
    const frame = make();
    const samples = [];
    for (let step = 0; step < 900; step++) {
      const g = frame(step, 0);
      if (step % 3 === 0) (g.toText(), samples.push(core.cellsFromGrid(g)));
    }
    const bounds = core.inkBounds(samples);
    const g = stillGrid(make, still);
    g.toText();
    return { ...v, label: summary, crop: bounds, cells: core.crop(core.cellsFromGrid(g), bounds) };
  }
  const text = resolve(v.spec).render(v.spec.data, v.spec.options ?? {});
  return { ...v, text, label: label(v.spec), cells: core.cellsFromText(text, classify) };
});
const box = {
  H: Math.max(...showcaseViews.map((v) => core.size(v.cells).rows)),
  W: Math.max(...showcaseViews.map((v) => core.size(v.cells).cols))
};
const showcaseData = { ...box, views: showcaseViews.map(({ cells, spec, ...v }) => v) };
const showcase = `<figure class="demo showcase" data-showcase>
  ${stage(box.W, box.H, `<pre class="grid-figure live" role="img" aria-label="${esc(showcaseViews[0].label)}" data-showcase-grid>${core.toHtml(core.centre(showcaseViews[0].cells, box.H, box.W))}</pre>`)}
  <figcaption><span data-showcase-caption>${esc(showcaseViews[0].caption)}</span><span class="label">Sample data</span></figcaption>
</figure>`;

// ── Page shell ─────────────────────────────────────────────────────────────────────────────────
const page = ({ path, title, description, content, current }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#fbfbf8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Glyph kit">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="The four shades ░▒▓█ above the words Glyph kit, in Departure Mono.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/og.png">
<link rel="preload" href="/fonts/DepartureMono-Regular.woff2" as="font" type="font/woff2" crossorigin>
<script>
  // Light unless the visitor chose dark here; set before paint so the page never flashes.
  try { document.documentElement.dataset.theme = localStorage.getItem("glyph-kit-theme") === "dark" ? "dark" : "light"; }
  catch { document.documentElement.dataset.theme = "light"; }
  // The phone's status bar takes the page's paper colour, in either theme.
  document.querySelector('meta[name="theme-color"]').content = document.documentElement.dataset.theme === "dark" ? "#0c0c0b" : "#fbfbf8";
  // The hero's first view builds in. Hide it until the script takes over; never for reduced motion,
  // and never for long: if the script fails, the finished view shows after two seconds.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.dataset.showcaseState = "pending";
    setTimeout(() => { if (document.documentElement.dataset.showcaseState === "pending") document.documentElement.dataset.showcaseState = "ready"; }, 2000);
  }
</script>
<link rel="stylesheet" href="/style.css">
<style>${ARRIVE_CSS}.grid-figure{--gk-arrive-ink:var(--ink);--gk-arrive-paper:var(--paper)}</style>
${current === "home" && TURNSTILE_SITE_KEY ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ""}
</head>
<body>
<header class="top"><div class="shell">
  <a class="brand" href="/"><img src="/icon.svg" alt="" width="22" height="22">Glyph kit</a>
  <nav class="nav" aria-label="Site"><a href="/how-to-use/"${current === "guide" ? ' aria-current="page"' : ""}>How to use</a><a href="/types/"${current === "types" ? ' aria-current="page"' : ""}>Types</a><a href="${REPO}" target="_blank" rel="noopener" aria-label="Star Glyph kit on GitHub (opens in a new tab)">${starLabel}</a><a href="/changelog/"${current === "changelog" ? ' aria-current="page"' : ""}>Changelog</a><a href="https://traykov.cc">traykov.cc</a><button class="theme" type="button" data-theme-toggle aria-label="Switch to dark theme">Dark</button></nav>
</div></header>
<main class="shell">
${content}
</main>
<footer><div class="shell"><span>Glyph kit ${plugin.version} · <a href="/changelog/">Changelog</a> · MIT · made by <a href="https://traykov.cc">Alexander Traykov</a></span><span><a href="https://traykov.cc/notes/four-characters/">Four characters</a>, the story behind it</span></div></footer>
<script type="application/json" id="live-specs">${JSON.stringify({ ...liveSpecs, ...loopSpecs }).replace(/</g, "\\u003c")}</script>
<script type="application/json" id="try-example">${JSON.stringify({ spec: exampleSpec, mode: "moving" }).replace(/</g, "\\u003c")}</script>
<script type="application/json" id="showcase">${JSON.stringify(showcaseData).replace(/</g, "\\u003c")}</script>
<script>${ARRIVE_JS}</script>
<script type="module" src="/app.js"></script>
${current === "guide" ? '<script type="module" src="/guide-motion.js"></script>' : ""}
<!-- Visits, through Vercel Web Analytics (switch it on for this project in Vercel). No cookies. -->
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;

const COPY_ICON = `<svg class="icon icon--copy" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 5.5h7v7h-7z M3.5 10.5v-7h7" fill="none" stroke="currentColor" stroke-width="1.2"/></svg><svg class="icon icon--done" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`;
const cmd = (text) => `<div class="cmd"><code>${esc(text)}</code><button type="button" data-copy="${esc(text)}" aria-label="Copy: ${esc(text)}" title="Copy" hidden>${COPY_ICON}</button></div>`;
const install = `<div class="install" id="get" aria-label="Get the kit">
  <p class="label">Any agent</p>
  ${cmd("npx skills add alextraykov/glyph-kit")}
  <p class="install__hand"><a class="text-link" href="https://www.skills.sh/?q=glyph-kit" target="_blank" rel="noopener">On skills.sh</a> <span>The open directory of agent skills.</span></p>
  <p class="label">Claude Code plugin</p>
  ${cmd("/plugin marketplace add alextraykov/glyph-kit")}
  ${cmd("/plugin install glyph-kit@traykov")}
  <p class="install__hand"><a class="text-link" href="${REPO}/releases/latest/download/glyph-kit.zip">Download the kit · ${zipSize}</a> <span>Unzip into ~/.claude/skills or ~/.agents/skills.</span></p>
  <p class="install__hand">Best in <a class="text-link" href="https://departuremono.com">Departure Mono</a>. Shoutout to <a class="text-link" href="https://helenazhang.com">Helena Zhang</a>, who made it.</p>
</div>`;

const exampleSpec = liveSpecs["signup-funnel"];
const exampleStill = (() => {
  const { make, still } = live(exampleSpec);
  const g = stillGrid(make, still);
  const lines = g.toText().split("\n");
  return { html: g.toHtml(), cols: Math.max(...lines.map((l) => [...l].length)), rows: lines.length, summary: live(exampleSpec).summary };
})();
const builder = `<section class="builder" id="try" aria-label="Builder" data-layout="intro">
  <figure class="builder__preview" data-try-out>
    <aside class="builder__thread" data-try-thread aria-label="This figure's conversation" hidden>
      <div class="thread__head"><span class="label">This figure</span><button type="button" class="thread__new" data-try-new>New figure</button></div>
      <ol class="thread" data-try-thread-list></ol>
    </aside>
    <pre class="builder__divider" aria-hidden="true" data-try-divider hidden></pre>
    <div class="builder__bar">
      <div class="tabs" role="tablist" aria-label="Preview, data or history"><button type="button" role="tab" aria-selected="true" data-tab="preview">Preview</button><button type="button" role="tab" aria-selected="false" data-tab="data">Data</button><button type="button" role="tab" aria-selected="false" data-tab="history">History</button></div>
      <span class="label builder__title" data-try-title>Example · ${esc(exampleSpec.title)}</span>
      <span class="builder__hint" data-try-hint hidden>Scroll sideways to see all of it.</span>
      <details class="export palette" data-try-palette><summary>Colours</summary><div class="export__menu" role="group" aria-label="Colours" data-try-palette-menu></div></details>
      <details class="export" data-try-export><summary>Export</summary><div class="export__menu" data-try-export-menu></div></details>
      <span class="label" data-try-stamp>Sample data</span>
    </div>
    <div class="builder__canvas">
      <div class="stage" data-try-stage style="--cols:${exampleStill.cols};--rows:${exampleStill.rows}"><pre class="grid-figure live" role="img" aria-label="${esc(exampleStill.summary)}">${exampleStill.html}</pre></div>
      <div class="builder__data" tabindex="0" data-try-spec hidden><p class="data__empty">Build a figure to see its data.</p></div>
      <div class="builder__data builder__history" data-try-history hidden></div>
    </div>
    <div class="builder__dock">
      <div class="chips" role="group" aria-label="Start from">${SUGGESTIONS.map((t) => `<button type="button" class="chip" data-preset="${esc(t.ask)}" data-skeleton="${t.key}" data-short="${esc(t.short)}">${esc(t.short)}</button>`).join("")}</div>
      <form class="prompt" data-try action="${DRAW_URL}" method="post">
        <label class="visually-hidden" for="ask">Describe a figure</label>
        <textarea id="ask" name="ask" minlength="8" maxlength="600" rows="2" required placeholder="Describe a figure: a funnel, a flow, a screen…"></textarea>
        <div class="prompt__bar"><output class="prompt__status" data-try-status aria-live="polite">Needs scripts on.</output><button class="prompt__send" type="submit" data-try-submit>Build <span aria-hidden="true">↑</span></button></div>
      </form>
    </div>
  </figure>
  ${TURNSTILE_SITE_KEY ? `<div class="cf-turnstile" data-sitekey="${TURNSTILE_SITE_KEY}" data-action="glyph-kit" data-appearance="interaction-only" data-theme="auto"></div>` : ""}
</section>`;

// ── How to use ─────────────────────────────────────────────────────────────────────────────────
const USE_ASKS = [
  "Chart these usability results for the PR. The data is in results.csv.",
  "A wireframe for the notification settings, then a clickable prototype.",
  "Turn the research readout into a ten-slide deck, one point per slide."
];
const USE_FORMATS = [["Markdown", "markdown"], ["MDX", "mdx"], ["HTML", "html"], ["Animation", "animation"], ["Deck", "deck"], ["PDF", "pdf"], ["SVG and PNG", "svg"]];
// Every section's figure is drawn by the kit itself, from a spec, the way a user's would be.
const SAMPLE = "Illustrative: sample numbers for this guide";
const GUIDE_FIGS = {
  start: { kind: "flow", data: ["ask in words", "agent writes spec", "code draws", "any format"] },
  glyphs: { kind: "table", data: [["Glyph", "Means, in every figure"], ["███", "measured or done"], ["", ""], ["▓▓▓", "current"], ["", ""], ["░░░", "projected, or the empty part of a scale"], ["", ""], ["···", "an empty cell"]] },
  markdown: { kind: "barChart", source: SAMPLE, data: [{ label: "task 1", value: 92, text: "92%" }, { label: "task 2", value: 71, text: "71%" }, { label: "task 3", value: 38, text: "38%" }], options: { width: 24 } },
  mdx: { kind: "flow", data: ["funnel.json", "<Glyph spec={funnel} />", "SVG at build time"] },
  html: examples.wireframes.find((sp) => sp.kind === "screen"),
  deck: { kind: "flow", data: ["title", "section", "figure, in steps", "statement", "PDF, 16:9"] },
  pdf: { kind: "flow", data: ["cover", "summary", "sections", "figures", "A4 PDF"] },
  layouts: { kind: "flow", data: ["readout.json", "slots", "one page", "HTML, PDF"] },
  svg: { kind: "flow", data: ["████ 12.4k", "rectangles, lines, dither", "funnel.svg"] },
  handover: { kind: "qaChecklist", data: [
    { text: "The lint passes", status: "todo" },
    { text: "Numbers have a real source, or the stamp", status: "todo" },
    { text: "Every figure has a description", status: "todo" },
    { text: "Values appear as text, not only lengths", status: "todo" },
    { text: "About 80 columns at most", status: "todo" },
    { text: "Motion says what reduced motion shows", status: "todo" }
  ] },
  wrong: { kind: "branchFlow", data: [
    { label: "figure drawn" },
    { label: "boxes line up", type: "decision", no: { label: "change the font", to: "or export SVG" } },
    { label: "fits 80 columns", type: "decision", no: { label: "split it in two", to: "draw again" } },
    { label: "ready to send" }
  ] }
};
// A kit figure that acts out its section (site/src/guide-motion.js); without scripts it stays as drawn.
const moved = (key) => `<div class="guide-figure">${figure(GUIDE_FIGS[key], { arrive: false }).replace('<pre class="grid-figure"', `<pre class="grid-figure" data-guide-motion="${key}"`)}</div>`;
// Animations: the same diagram twice, its still beside it moving, to show the still makes the same point.
const stillAndMoving = (mv) => `<div class="pair">
  <figure class="pair__item"><figcaption class="label">Still · reduced motion, print, docs</figcaption><pre class="grid-figure" role="img" aria-label="${esc(mv.summary)}">${mv.html}</pre></figure>
  <figure class="pair__item"><figcaption class="label">Moving · on screen</figcaption><pre class="grid-figure live" role="img" aria-label="${esc(mv.summary)}" data-live="${mv.id}">${mv.html}</pre></figure>
</div>`;
const guideFigure = (key) => key === "animation" ? stillAndMoving(moving.find((mv) => mv.id === "rework-loop")) : moved(key);

// One entry per deliverable: when to use it, what to ask, what the agent runs, what to check.
const GUIDE = [
  {
    id: "markdown", title: "ASCII and Markdown",
    when: "Docs, pull requests, tickets, READMEs, Slack, and a model's own context. The figure is text, so it diffs, copies and pastes anywhere.",
    ask: "Chart these usability results for the PR. The data is in results.csv.",
    run: ["node scripts/glyph-kit.mjs render results.json --to markdown", "node scripts/lint.mjs README.md", "node scripts/glyph-kit.mjs render results.json --compact"],
    check: ["The lint passes: frames close, every glyph is one cell, no text touches its box.", "Every figure with numbers names its source.", "The sentence next to the figure states the point; the figure supports it.", "About 80 columns at most, so it doesn't wrap.", "--compact (plain ASCII, same layout) only when the figure goes into a model's context."]
  },
  {
    id: "mdx", title: "MDX",
    when: "Docs sites and blogs built with Astro, Next.js or Docusaurus.",
    ask: "Add the signup funnel to our docs page as MDX.",
    run: ["node scripts/glyph-kit.mjs export funnel.json --to mdx", "node scripts/glyph-kit.mjs export funnel.json --to mdx --mdx component"],
    check: ["Static MDX works in any setup: each figure is a text block with its description.", "Component mode writes <Glyph spec={…} />: copy templates/mdx/Glyph.astro or Glyph.jsx next to your MDX and point it at scripts/render/svg.mjs.", "Components render to SVG at build time, so readers need no special font."]
  },
  {
    id: "html", title: "HTML pages and prototypes",
    when: "A figure on its own page, or a wireframe that should click like the product.",
    ask: "Turn the settings wireframe into a clickable prototype with our design system.",
    run: ["node scripts/glyph-kit.mjs render settings.json --to html --map design-system.map.json", "node scripts/glyph-kit.mjs export settings.json --to html"],
    check: ["The map names only components and tokens you really have; start from templates/design-system.map.example.json.", "Notes on the wireframe become behaviour in the prototype.", "Where the map has no entry, the agent asks instead of inventing one.", "For production code, the agent reads reference/fidelity.md first."]
  },
  {
    id: "animation", title: "Animations",
    when: "A process over time: work coming back, people leaving a funnel, a queue backing up, a rollout and its guard, a state machine, a loading sequence.",
    ask: "Show how work comes back from QA as a moving diagram.",
    run: ["node scripts/glyph-kit.mjs live loop.json --to html", "node scripts/glyph-kit.mjs live loop.json --to markdown"],
    check: ["Every type moves on a page or in a deck. Six keep moving: loop, funnel, states, queue, rollout, loading.", "Every other type arrives once, in the order that carries its point, then stays still. The ↺ in its corner plays it again.", "The still frame makes the same point; it's what reduced motion, print and docs show.", "One sentence next to it says what the motion shows.", "Motion specs say what reduced motion shows."]
  },
  {
    id: "deck", title: "Presentations and pitch decks",
    when: "A review, a research readout, a pitch: anything you present.",
    ask: "Make a ten-slide deck from the research readout, one point per slide, and a PDF to send.",
    run: ["node scripts/glyph-kit.mjs deck deck.json > deck.html", "node scripts/glyph-kit.mjs export deck.json --to pdf", "node scripts/glyph-kit.mjs export deck.json --to html --theme ink"],
    check: ["One point per slide, with the conclusion in the title.", "Steps zoom to lines of a figure and show the line you'll say; find line numbers with --to text, counting from 0.", "Flag problem rows so they flash; keep presenter notes in notes (press N).", "For a pitch, every number has a real source: made-up numbers are stamped SAMPLE DATA on the slide.", "Themes: paper, ink, phosphor, gilt. The PDF is one 16:9 page per slide."]
  },
  {
    id: "pdf", title: "Reports and PDFs",
    when: "When it has to read like a finished document: a research readout, an audit, a design review.",
    ask: "Write the motion audit up as a report and export a PDF.",
    run: ["node scripts/glyph-kit.mjs export report.json --to pdf", "node scripts/glyph-kit.mjs export report.json --to html", "node scripts/glyph-kit.mjs export report.json --to md"],
    check: ["A cover, a summary, numbered sections, numbered figures.", "Each takeaway is the conclusion, not the topic.", "PDF uses Chrome, Chromium or Edge already on the machine (or CHROME_PATH). With none, export HTML and print it."]
  },
  {
    id: "layouts", title: "One-page layouts",
    when: "A whole deliverable on one page: a research readout, a dashboard, a PR summary, a design review, a status update.",
    ask: "Put this week's research findings on one page with the funnel and the top quotes.",
    run: ["node scripts/glyph-kit.mjs render readout.json --to markdown", "node scripts/glyph-kit.mjs export readout.json --to pdf", "node scripts/glyph-kit.mjs export week.json --to pdf"],
    check: ["Each layout has fixed slots: one sentence, short lists and ordinary figure specs.", "Code places everything within 80 cells; figures share a row only when they fit.", "Figures without a source use the layout's.", "A list of layouts exports as one document, a layout to a page."]
  },
  {
    id: "svg", title: "SVG and PNG",
    when: "A figure for Keynote, Figma, Google Slides or a post.",
    ask: "Export the funnel as an SVG for the board deck.",
    run: ["node scripts/glyph-kit.mjs export funnel.json --to svg --theme paper", "node scripts/glyph-kit.mjs export funnel.json --to png"],
    check: ["SVG needs no font: blocks become rectangles, shades become dither patterns, lines become vectors.", "PNG is the same SVG at 2×, through a browser already on the machine.", "Pick the theme that matches the slide: paper, ink, phosphor or gilt."]
  }
];
const guideItem = (g) => `<article class="guide-item" id="${g.id}" aria-labelledby="${g.id}-title">
  <div class="guide-item__head"><h3 id="${g.id}-title">${esc(g.title)}</h3><p>${esc(g.when)}</p></div>
  <div class="guide-item__body">
    <p class="label">What you get</p>${guideFigure(g.id)}
    <p class="label">Ask</p><blockquote class="ask-line">“${esc(g.ask)}”</blockquote>
    <p class="label">The agent runs</p><div class="cmds">${g.run.map(cmd).join("")}</div>
    <p class="label">Before you send it</p><ul class="checks">${g.check.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
  </div>
</article>`;
const guide = page({
  path: "/how-to-use/",
  current: "guide",
  title: "How to use · Glyph kit",
  description: "How to get the best Markdown, MDX, HTML, animations, decks, reports and images out of Glyph kit.",
  content: `
<header class="heading"><p class="kicker">How to use</p><h2>Ask in words. Pick a format.</h2><p>How to get the best Markdown, MDX, HTML, animations, decks, reports and images out of Glyph kit. Your agent runs the commands; they're here so you know what it does, and so you can run them yourself with Node 18 or later.</p></header>
<nav class="jump" aria-label="Formats"><a href="#start">Start</a><a href="#rules">Quality</a>${GUIDE.map((g) => `<a href="#${g.id}">${esc(g.title)}</a>`).join("")}<a href="#handover">Before you hand over</a><a href="#wrong">When it looks wrong</a></nav>

<section class="section" id="start" aria-labelledby="start-title">
  <header class="heading"><h2 id="start-title">Start</h2><p>Install once, then ask the way you'd ask a colleague. The agent picks the type of figure, writes the data as a small spec, and code draws it.</p></header>
  ${moved("start")}
  ${install}
  <ul class="asks">${USE_ASKS.map((a) => `<li>“${esc(a)}”</li>`).join("")}</ul>
</section>

<section class="section" id="rules" aria-labelledby="rules-title">
  <header class="heading"><h2 id="rules-title">Quality, in every format</h2></header>
  ${moved("glyphs")}
  <ul class="rules">
    <li><strong>Real data, with its source.</strong> Point the agent at your file. Made-up numbers are stamped SAMPLE DATA everywhere they appear.</li>
    <li><strong>Say the point in words.</strong> One sentence next to the figure states the conclusion; the figure backs it up.</li>
    <li><strong>One meaning per glyph.</strong> █ measured or done, ░ projected or empty, the same across the whole document.</li>
    <li><strong>About 80 columns.</strong> Wider figures wrap on small screens; split them instead.</li>
    <li><strong>Departure Mono for text.</strong> Any monospace font with block characters works; Departure Mono lines up exactly. SVG needs no font.</li>
    <li><strong>Pass specs, not drawings.</strong> Between agents and steps, the spec is a few hundred bytes. Draw only when a person will look.</li>
  </ul>
</section>

<section class="section" aria-labelledby="formats-title">
  <header class="heading"><h2 id="formats-title">Format by format</h2></header>
  <div class="guide">${GUIDE.map(guideItem).join("\n")}</div>
</section>

<section class="section" id="handover" aria-labelledby="handover-title">
  <header class="heading"><h2 id="handover-title">Before you hand over</h2></header>
  ${moved("handover")}
  <p class="guide-note">Tick each before a file leaves your hands. Markdown and HTML add the descriptions for you; plain text needs a sentence next to each figure.</p>
</section>

<section class="section" id="wrong" aria-labelledby="wrong-title">
  <header class="heading"><h2 id="wrong-title">When it looks wrong</h2></header>
  ${moved("wrong")}
  <ul class="rules">
    <li><strong>Boxes don't line up.</strong> The font draws some glyphs wider than one cell. Use Departure Mono, or export SVG.</li>
    <li><strong>It wraps.</strong> The figure is over about 80 columns. Ask for it split in two, or narrower.</li>
    <li><strong>A SAMPLE DATA stamp.</strong> The source says the numbers are made up. Give the real source and it goes.</li>
    <li><strong>It won't draw.</strong> Read the sentence it gives back: numbers without a source, or data that can't be true, like a funnel that grows.</li>
  </ul>
</section>`
});

// ── Release 0.3.0 on the home page ─────────────────────────────────────────────────────────────
// Four kit figures: a focus, a colour type, one figure in each palette, and an edit read back.
// A figure fits its box: --cols lets it step down from 11px on a phone instead of scrolling.
// With `palette`, the figure takes that palette's colours: the custom properties the builder's Colours
// menu sets (site/src/try.js), from the kit's own palettes.
const widest = (text) => Math.max(...text.split("\n").map(textWidth));
const paletteVars = (c) => `;--paper:${c.bg};--panel:${c.panel};--ink:${c.ink};--text-caption:${c.frame};--signal-fail:${c.flag};--signal-ok:${c.ok};--palette-data:${c.data}`;
const fit = (spec, { palette, ...opts } = {}) =>
  `<div class="fit"${palette ? " data-palette" : ""} style="--cols:${widest(opts.text ?? body(spec))}${palette ? paletteVars(palette) : ""}">${figure(spec, opts)}</div>`;
const MADE_UP = "Sample data, made up for this example";
const RELEASE = (() => {
  const cohort = {
    kind: "cohort", title: "Monthly retention", source: MADE_UP,
    data: [
      { label: "Jan", size: 1200, values: [1, 0.84, 0.41, 0.38, 0.36] },
      { label: "Feb", size: 1350, values: [1, 0.81, 0.4, 0.37] },
      { label: "Mar", size: 1100, values: [1, 0.86, 0.44] },
      { label: "Apr", size: 1420, values: [1, 0.83] }
    ],
    focus: { on: ["M2"], tone: "problem", say: "Every cohort halves between M1 and M2." }
  };
  const roles = {
    kind: "colourRoles", title: "Colour tokens", source: MADE_UP,
    data: { page: { light: "#f7f6f1" }, roles: [
      { role: "words", token: "--color-ink", light: "#151513", use: "words" },
      { role: "secondary", token: "--color-muted", light: "#6b6a64", use: "words" },
      { role: "accent", token: "--color-accent", light: "#1f4fd6", use: "words" },
      { role: "problems", token: "--color-danger", light: "#f08080", use: "words" },
      { role: "passes", token: "--color-success", light: "#0a7a50", use: "words" },
      { role: "lines", token: "--color-line", light: "#a3a199", use: "lines" }
    ] }
  };
  const bars = { kind: "barChart", title: "Task success", source: "Sample data", data: [{ label: "task 1", value: 92, text: "92%" }, { label: "task 2", value: 71, text: "71%" }, { label: "task 3", value: 38, text: "38%" }], options: { width: 7 } };
  // An edit by hand: one row's status changed, its columns left uneven. `read` turns it back into the
  // spec and draws it again, count and all.
  const qa = { kind: "qaChecklist", title: "Before you hand over", data: [
    { text: "The lint passes", status: "done" },
    { text: "Sources named", status: "progress" },
    { text: "About 80 columns", status: "todo" }
  ] };
  const edited = body(qa).replace("▒ in progress  Sources named", "█ done Sources named");
  const after = readBack(qa, edited);
  const items = [
    { name: "Focus", figure: fit(cohort), line: "The text gets a ► line, so it reads without colour. On screen the focus takes its tone, the rest recedes, and it arrives last." },
    // On the page colour its contrast is measured against, in either site theme.
    { name: "Colour types", figure: fit(roles, { palette: { ...PALETTES.paper, panel: PALETTES.paper.bg } }), line: "Two new types: palette and colour roles. A swatch is drawn in its own colour; the text keeps the value, so it still reads." },
    { name: "Your colours", figure: `<div class="palettes">${Object.keys(PALETTES).map((name) => `<figure><figcaption class="label">${esc(name[0].toUpperCase() + name.slice(1))}</figcaption>${fit(bars, { palette: PALETTES[name] })}</figure>`).join("")}</div>`, line: "Four palettes, your own colours or your design system's tokens. Every colour you supply is checked for contrast. The builder's Colours menu has all four." },
    { name: "Editing", figure: `<div class="edit"><figure><figcaption class="label">Edited by hand</figcaption>${fit(qa, { text: edited, aria: "The checklist with one row changed by hand to done; the count still says 1 of 3." })}</figure>${cmd("glyph-kit read notes.md")}<figure><figcaption class="label">Read back</figcaption>${fit(after)}</figure></div>
    <dl class="edits"><dt>check</dt><dd>Every problem at once.</dd><dt>redraw</dt><dd>Draws figures again in place.</dd><dt>read</dt><dd>Turns an edited drawing back into its spec.</dd><dt>--with-spec</dt><dd>Keeps the spec beside the figure.</dd></dl>`, line: "Change the drawing and read it back, or change the spec and redraw. Only the figure changes; the rest of the file stays as it was." }
  ];
  return `<div class="release">${items.map((it) => `<article class="release__item"><p class="label">${esc(it.name)}</p>${it.figure}<p>${esc(it.line)}</p></article>`).join("\n")}</div>`;
})();

// ── Home ───────────────────────────────────────────────────────────────────────────────────────
const home = page({
  path: "/",
  current: "home",
  title: "Glyph kit: docs and diagrams as text",
  description: "A skill for Claude Code and Codex. Lightweight docs and diagrams that people and AI can both read.",
  content: `
<section class="hero" aria-labelledby="title">
  <div class="hero__inner">
    <p class="kicker">Free · MIT · ${kindCount} types · v${plugin.version}</p>
    <h1 id="title">Glyph kit.</h1>
    <div class="hero__body">
      <div class="hero__copy">
        <p class="lead">A skill for Claude Code and Codex. Lightweight docs and diagrams that people and AI can both read.</p>
        ${install}
      </div>
      ${showcase}
    </div>
  </div>
</section>

<section class="section builder-section" aria-label="Builder">
  <header class="heading"><p class="kicker">01 Builder <span class="new">New: Colours</span></p></header>
  ${builder}
</section>

<section class="section" aria-labelledby="release">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">02 Release 0.3.0</p><h2 id="release">Colour by role. Focus on any type.</h2><a class="text-link" href="/changelog/#v0-3-0">Everything in 0.3.0</a></header>
  ${RELEASE}
  <p class="outputs__also">Also new: <a class="text-link" href="${REPO}/blob/main/CONTRIBUTING.md">How to contribute</a> · <a class="text-link" href="${REPO}/blob/main/docs/adding-a-type.md">Adding a type</a></p>
</section>

<section class="section" aria-labelledby="cheap">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">03 Against HTML/JS</p><h2 id="cheap">Faster to make. Cheaper to run.</h2><p>Claude Code got the same brief twice for each of five deliverables: once with the kit, once as hand-written HTML/JS. Like for like: a still flow against a still SVG flow, a working prototype against a working prototype, a moving diagram against an animated one.</p></header>
  <div class="stats">
    <article class="stat"><p class="label">Faster</p><strong>${times(mv.html.s / mv.kit.s)}</strong><p>A moving diagram took ${secs(mv.kit.s)} against ${secs(mv.html.s)}. Faster on every run, for all five.</p></article>
    <article class="stat"><p class="label">Cheaper</p><strong>${times(mv.html.usd / mv.kit.usd)}</strong><p>${usd(mv.kit.usd)} against ${usd(mv.html.usd)} for a moving diagram. Cheaper on every run, for all five.</p></article>
    <article class="stat"><p class="label">Right first time</p><strong>${study.correct.kit} of ${study.correct.runs}</strong><p>Every kit run. HTML/JS: ${study.correct.html} of ${study.correct.runs}. Drawn by hand: ${study.correct.byHand}.</p></article>
    <article class="stat"><p class="label">Fewer tokens written</p><strong>${times(study.outputVsHtml.moving)}</strong><p>For a moving diagram; ${Math.round(study.outputVsHtml.funnel)}× for a funnel. Fewer on every run. A figure draws in ${stats.us} μs.</p></article>
  </div>
  <div class="study">${STUDY_TABLE}</div>
  <p class="stats-note">${study.model} in Claude Code · ${study.runsEach} runs per figure and approach · medians · ${new Date(study.measured).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · published prices · more testing is planned, with other models and more figures</p>
</section>

<section class="section" aria-labelledby="use">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">04 How to use</p><h2 id="use">Ask in words. Pick a format.</h2><a class="text-link" href="/how-to-use/">Read the guide</a></header>
  <ol class="steps">
    <li><p class="label">1 · Install</p>${cmd("npx skills add alextraykov/glyph-kit")}<p>Or as a Claude Code plugin, or from the zip.</p></li>
    <li><p class="label">2 · Ask in words</p><ul class="asks">${USE_ASKS.map((a) => `<li>“${esc(a)}”</li>`).join("")}</ul></li>
    <li><p class="label">3 · Pick a format</p><p class="formats">${USE_FORMATS.map(([name, id]) => `<a href="/how-to-use/#${id}">${esc(name)}</a>`).join(" · ")}</p><p>The agent writes the data; code draws the figure, in any of them.</p></li>
  </ol>
</section>

<section class="section" aria-labelledby="moving">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">05 Motion</p><h2 id="moving">Six keep moving. Every type arrives.</h2></header>
  <div class="switch" data-switch style="--rows:${Math.max(...moving.slice(0, 6).map((mv) => mv.rows))}">
    <div class="switch__chips" role="tablist" aria-label="Moving diagrams">${moving.slice(0, 6).map((mv, i) => `<button type="button" role="tab" id="mv-${mv.id}" aria-controls="mv-${mv.id}-panel" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""}>${esc(mv.spec.title)}</button>`).join("")}</div>
    ${moving.slice(0, 6).map((mv, i) => `<div role="tabpanel" id="mv-${mv.id}-panel" aria-labelledby="mv-${mv.id}"${i ? " hidden" : ""}>${liveFigure(mv)}</div>`).join("\n    ")}
  </div>
</section>

<section class="section" aria-labelledby="areas">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">06 Coverage</p><h2 id="areas">${kindCount} types. ${areaCount} areas.</h2><a class="text-link" href="/types/">Every type</a></header>
  <div class="bento">${Object.entries(AREAS).map(([id, area]) => {
    const n = Object.keys(area.kinds).length;
    return `<article class="bento__cell"><header class="bento__head"><h3><a href="/types/#${id}">${esc(area.label)}</a></h3><span class="label">${n} ${n === 1 ? "type" : "types"}</span></header>${NEW_AREAS[id] ? `<span class="new">${esc(NEW_AREAS[id])}</span>` : ""}<div class="bento__peek" aria-hidden="true">${paint(body(examples[id][0]))}</div></article>`;
  }).join("\n")}</div>
</section>

<section class="section" aria-labelledby="guard">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">07 Trust</p><h2 id="guard">Sample data is stamped.</h2></header>
  <ul class="rules">
    <li><strong>No source, no numbers.</strong> A figure with numbers waits until it says where they came from.</li>
    <li><strong>Sample data is stamped.</strong> Made-up numbers carry SAMPLE DATA in every format.</li>
    <li><strong>Numbers from your files.</strong> Point a figure at a CSV or JSON file.</li>
    <li><strong>Impossible data is refused.</strong> A funnel that grows, dates out of order.</li>
    <li><strong>Ask, don't invent.</strong> The agent asks for missing numbers.</li>
    <li><strong>Data between agents.</strong> Drawings for people.</li>
  </ul>
</section>

<section class="section" aria-labelledby="formats">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">08 Output</p><h2 id="formats">Copy it as text. Export the rest.</h2><p>Every figure is plain text first, ready to paste into a PR, a ticket, Slack, an email or a model's context as it is. The same spec exports to Markdown, MDX, SVG, HTML, decks and PDF.</p></header>
  <div class="outputs" data-outputs>
    <div class="outputs__bar">
      <div class="switch__chips" role="tablist" aria-label="Formats">${FORMATS.map((f, i) => `<button type="button" role="tab" id="out-${f.id}" aria-controls="out-${f.id}-panel" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""}>${esc(f.name)}</button>`).join("")}</div>
      <span class="label">${esc(AUDIT_SPEC.title)} · from the Pave motion audit</span>
    </div>
    ${FORMATS.map((f, i) => `<div class="outputs__panel" role="tabpanel" id="out-${f.id}-panel" aria-labelledby="out-${f.id}"${i ? " hidden" : ""}>
      <div class="outputs__view">${f.view(f.copy)}</div>
      <button type="button" class="button outputs__copy" data-copy="${esc(f.copy)}" aria-label="Copy the ${esc(f.name)}" hidden>Copy ${f.id === "text" ? "as text" : esc(f.name)}</button>
    </div>`).join("\n    ")}
  </div>
  <p class="outputs__also">Whole documents too: <a class="text-link" href="/examples/motion-audit/motion-audit.html">the report</a> · <a class="text-link" href="/examples/motion-audit/motion-audit.pdf">as a PDF</a> · <a class="text-link" href="/examples/decks/motion-audit">as a deck</a> · <a class="text-link" href="/examples/product/settings">a prototype from a text wireframe</a> · <a class="text-link" href="/examples/live/review-queue">a moving diagram on its own</a></p>
</section>

<section class="section support" aria-labelledby="support">
  <header class="heading"><p class="kicker">09 Support</p><h2 id="support">Free. MIT.</h2></header>
  <div class="actions"><a class="button" href="${REPO}" target="_blank" rel="noopener">★ Star on GitHub</a>${SUPPORT_URL ? `<a class="button button--quiet" href="${esc(SUPPORT_URL)}">Buy me a coffee</a>` : ""}</div>
</section>

<aside class="note" aria-labelledby="note">
  <img src="/images/synapse-operation-loaders.webp" alt="Synapse's loaders: blocks stepping through a ramp while an operation runs." width="1280" height="720" loading="lazy" decoding="async">
  <div class="note__copy">
    <p class="label">The note behind it</p>
    <h2 id="note">Four characters</h2>
    <p>Where ░▒▓█ ended up in my work since January 2025: what broke, what they cost, and the 1981 character set they come from.</p>
    <div class="actions"><a class="button" href="https://traykov.cc/notes/four-characters/">Read the note</a><a class="text-link" href="${REPO}">The code on GitHub</a></div>
  </div>
</aside>`
});

// ── Every kind ─────────────────────────────────────────────────────────────────────────────────
const kinds = page({
  path: "/types/",
  current: "types",
  title: "Every type · Glyph kit",
  description: `All ${kindCount} types of figure in Glyph kit, each with its motion and what it is for.`,
  content: `
<header class="heading"><p class="kicker">Every type</p><h2>${kindCount} figures. Every one moves.</h2><p>Each is drawn here by the kit itself, from its example data. All of it is sample data, and it says so on the figure.</p></header>
<nav class="jump" aria-label="Show an area" data-filter><a href="#all">All ${kindCount}</a>${Object.entries(AREAS).map(([id, a]) => `<a href="#${id}">${esc(a.label)} <span class="jump__n">${Object.keys(a.kinds).length}</span></a>`).join("")}<a href="#moving">Moving diagrams</a></nav>
${Object.entries(AREAS).map(([id, area]) => {
  const seen = new Set();
  const specs = examples[id].filter((s) => (seen.has(s.kind) ? false : seen.add(s.kind)));
  return `<section class="section" id="${id}" data-area aria-labelledby="${id}-title">
  <header class="heading"><h2 id="${id}-title">${esc(area.label)}</h2><p>${esc(AREA_DOCS[id])}</p></header>
  <div class="areas">${specs.map((s) => `<article class="kind"><h3>${esc(KINDS[s.kind].label)}</h3>${loopIds[s.kind] ? '<span class="label">Loops</span>' : ""}<p class="kind__when">${esc(KIND_DOCS[s.kind]?.when ?? "")}</p>${loopIds[s.kind] ? figure(s, { arrive: false }).replace('<pre class="grid-figure"', `<pre class="grid-figure" data-live="${loopIds[s.kind]}"`) : figure(s)}${KIND_DOCS[s.kind]?.traps ? `<p class="kind__watch">Watch for: ${esc(KIND_DOCS[s.kind].traps)}</p>` : ""}</article>`).join("\n")}</div>
</section>`;
}).join("\n")}
<section class="section" id="moving" data-area aria-labelledby="moving-title">
  <header class="heading"><h2 id="moving-title">Moving diagrams</h2><p>A process over time. Each plays on screen and keeps a still that makes the same point, for reduced motion, print and docs.</p></header>
  <div class="gallery">${moving.map((mv) => liveFigure(mv)).join("\n")}</div>
</section>`
});

// ── Changelog ──────────────────────────────────────────────────────────────────────────────────
// CHANGELOG.md is read from this checkout, not fetched from GitHub: the build already has the file,
// it matches the version the site is built from, and a GitHub outage can't leave the page empty.
const changelog = parseChangelog(readFileSync(join(root, "CHANGELOG.md"), "utf8"));
const [latest] = changelog.releases;
const release = (r) => `<section class="section release" id="${r.id}" aria-labelledby="${r.id}-title">
  <header class="release__head"><h2 id="${r.id}-title"><a href="#${r.id}">${esc(r.version)}</a></h2>${r.date ? `<time class="label" datetime="${r.date}">${esc(longDate(r.date))}</time>` : ""}<a class="text-link" href="${REPO}/releases/tag/v${esc(r.version)}" target="_blank" rel="noopener">Release on GitHub</a></header>
  <div class="prose">${markdownToHtml(r.body)}</div>
</section>`;
const changes = page({
  path: "/changelog/",
  current: "changelog",
  title: "Changelog · Glyph kit",
  description: `What changed in each release of Glyph kit, newest first. Latest: ${latest.version}${latest.date ? `, ${longDate(latest.date)}` : ""}.`,
  content: `
<header class="heading"><h2>Changelog</h2><div class="prose">${markdownToHtml(changelog.intro)}</div><p><a class="text-link" href="${REPO}/blob/main/CHANGELOG.md" target="_blank" rel="noopener">CHANGELOG.md on GitHub</a></p></header>
<nav class="jump" aria-label="Releases">${changelog.releases.map((r) => `<a href="#${r.id}">${esc(r.version)}${r.date ? ` <span class="jump__n">${esc(r.date)}</span>` : ""}</a>`).join("")}</nav>
${changelog.releases.map(release).join("\n")}`
});

/** Root-relative links in a page, moved under BASE. External links are left alone. */
const based = (html) => html.replace(/(href|src)="\/(?!\/|_vercel\/)/g, `$1="${BASE}/`); // Vercel's own paths stay at the root

// Refresh standalone examples through the CLI, from the same specs as the gallery.
for (const id of Object.keys(liveSpecs)) {
  const html = execFileSync(process.execPath, [join(kit, "scripts/glyph-kit.mjs"), "live", join(kit, "examples/live", id + ".json"), "--to", "html"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  writeFileSync(join(root, "site/public/examples/live", id + ".html"), html);
}

// ── Write ──────────────────────────────────────────────────────────────────────────────────────
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(out, "types"), { recursive: true });
writeFileSync(join(out, "index.html"), based(home));
writeFileSync(join(out, "types/index.html"), based(kinds));
mkdirSync(join(out, "how-to-use"), { recursive: true });
writeFileSync(join(out, "how-to-use/index.html"), based(guide));
mkdirSync(join(out, "changelog"), { recursive: true });
writeFileSync(join(out, "changelog/index.html"), based(changes));
cpSync(join(root, "site/src/style.css"), join(out, "style.css"));
for (const f of ["app.js", "showcase.js", "showcase-core.mjs", "try.js", "parallax.js", "guide-motion.js"]) cpSync(join(root, "site/src", f), join(out, f));
writeFileSync(join(out, "showcase-core.mjs"), readFileSync(join(root, "site/src/showcase-core.mjs"), "utf8").replaceAll("../../skills/glyph-kit/scripts/", "./kit/"));
cpSync(join(root, "site/src/fonts"), join(out, "fonts"), { recursive: true });
cpSync(join(root, "site/public"), out, { recursive: true });
cpSync(join(kit, "assets/icon.svg"), join(out, "icon.svg"));
// The browser modules the moving diagrams need, at the same relative paths as in the kit.
const COMPUTER_ONLY = ["build-reference.mjs", "data.mjs", "glyph-kit.mjs", "lint.mjs", "measure.mjs", "live/html.mjs", "render/export.mjs", "render/font.mjs"];
cpSync(join(kit, "scripts"), join(out, "kit"), {
  recursive: true,
  filter: (p) => {
    const rel = p.slice(join(kit, "scripts").length + 1);
    return !rel.endsWith(".test.mjs") && !COMPUTER_ONLY.includes(rel);
  }
});
// Example outputs people can open: decks, the prototype, the moving diagrams.
// The example pages (decks, moving diagrams, the prototype) live in site/public/examples, copied above:
// they're outputs, so they stay out of the shipped skill.
const skeletons = {};
for (const area of Object.keys(AREAS)) for (const spec of examples[area]) {
  if (skeletons[spec.kind]) continue;
  try { skeletons[spec.kind] = body(spec); } catch {}
}
for (const spec of Object.values(liveSpecs)) {
  const { make, still } = live(spec);
  skeletons[`moving:${spec.kind}`] = stillGrid(make, still).toText();
}
writeFileSync(join(out, "skeletons.json"), JSON.stringify(skeletons));
console.log(`site/dist: ${readdirSync(out).length} entries, ${moving.length} moving diagrams, ${kindCount} types, ${changelog.releases.length} releases`);
