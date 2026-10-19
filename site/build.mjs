#!/usr/bin/env node
// Builds traykov.cc/glyph-kit into site/dist with the kit's own renderers. No dependencies:
// every figure on the site is drawn by the same code the skill runs.
// Usage: node site/build.mjs
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
const { body, label } = await imp("scripts/render/text.mjs");
const { paint } = await imp("scripts/render/paint.mjs");
const { LIVE, live, stillGrid } = await imp("scripts/live/kinds.mjs");
const { resolve } = await imp("scripts/registry.mjs");
const { classify } = await imp("scripts/render/paint.mjs");
const core = await import(new URL(`file://${join(root, "site/src/showcase-core.mjs")}`).href);

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
  { short: "Signup funnel", kind: "Moving funnel", key: "live:funnel", from: { live: "signup-funnel" },
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
  return { id, spec, summary, html: grid.toHtml(), cols: Math.max(...lines.map((l) => [...l].length)), rows: lines.length };
});
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
const kindCount = Object.keys(KINDS).length;
// Size of the release zip, when it has been packed (node scripts/pack.mjs); otherwise left out.
let zipSize = "about 0.5 MB";
try {
  zipSize = `${Math.round(statSync(join(root, "dist/glyph-kit.zip")).size / 1024)} KB`;
} catch {}
const figure = (spec) => `<pre class="grid-figure" role="img" aria-label="${esc(label(spec))}">${paint(body(spec))}</pre>`;
const stage = (cols, rows, pre) => `<div class="stage" style="--cols:${cols};--rows:${rows}">${pre}</div>`;
const liveFigure = (mv, depth) => `<figure class="demo"${depth ? ` data-depth="${depth}"` : ""}>
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
<meta name="viewport" content="width=device-width, initial-scale=1">
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
  // The hero's first view builds in. Hide it until the script takes over; never for reduced motion,
  // and never for long: if the script fails, the finished view shows after two seconds.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.dataset.showcaseState = "pending";
    setTimeout(() => { if (document.documentElement.dataset.showcaseState === "pending") document.documentElement.dataset.showcaseState = "ready"; }, 2000);
  }
</script>
<link rel="stylesheet" href="/style.css">
${current === "home" ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ""}
</head>
<body>
<header class="top"><div class="shell">
  <a class="brand" href="/"><img src="/icon.svg" alt="" width="22" height="22">Glyph kit</a>
  <nav class="nav" aria-label="Site"><a href="/kinds/"${current === "kinds" ? ' aria-current="page"' : ""}>Kinds</a><a href="${REPO}" target="_blank" rel="noopener" aria-label="Star Glyph kit on GitHub (opens in a new tab)">${starLabel}</a><a href="${REPO}/blob/main/CHANGELOG.md" target="_blank" rel="noopener">Changes</a><a href="https://traykov.cc">traykov.cc</a><button class="theme" type="button" data-theme-toggle aria-label="Switch to dark theme">Dark</button></nav>
</div></header>
<main class="shell">
${content}
</main>
<footer><div class="shell"><span>Glyph kit ${plugin.version} · MIT · made by <a href="https://traykov.cc">Alexander Traykov</a></span><span><a href="https://traykov.cc/notes/four-characters/">Four characters</a>, the story behind it</span></div></footer>
<script type="application/json" id="live-specs">${JSON.stringify(liveSpecs).replace(/</g, "\\u003c")}</script>
<script type="application/json" id="try-example">${JSON.stringify({ spec: exampleSpec, mode: "moving" }).replace(/</g, "\\u003c")}</script>
<script type="application/json" id="showcase">${JSON.stringify(showcaseData).replace(/</g, "\\u003c")}</script>
<script type="module" src="/app.js"></script>
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
  <p class="label">Claude Code plugin</p>
  ${cmd("/plugin marketplace add alextraykov/glyph-kit")}
  ${cmd("/plugin install glyph-kit@traykov")}
  <p class="install__hand"><a class="text-link" href="${REPO}/releases/latest/download/glyph-kit.zip">Download the kit · ${zipSize}</a> <span>Unzip into ~/.claude/skills or ~/.agents/skills.</span></p>
  <p class="install__hand">Best in <a class="text-link" href="https://departuremono.com">Departure Mono</a>, a free font. Any monospace font with block characters works.</p>
</div>`;

const exampleSpec = liveSpecs["signup-funnel"];
const exampleStill = (() => {
  const { make, still } = live(exampleSpec);
  const g = stillGrid(make, still);
  const lines = g.toText().split("\n");
  return { html: g.toHtml(), cols: Math.max(...lines.map((l) => [...l].length)), rows: lines.length, summary: live(exampleSpec).summary };
})();
const builder = `<section class="builder" id="try" aria-label="Builder">
  <figure class="builder__preview" data-try-out>
    <div class="builder__bar">
      <div class="tabs" role="tablist" aria-label="Preview or data"><button type="button" role="tab" aria-selected="true" data-tab="preview">Preview</button><button type="button" role="tab" aria-selected="false" data-tab="data">Data</button></div>
      <span class="label builder__title" data-try-title>Example · ${esc(exampleSpec.title)}</span>
      <span class="builder__hint" data-try-hint hidden>Scroll sideways to see all of it.</span>
      <span class="label" data-try-stamp>Sample data</span>
    </div>
    <div class="builder__canvas">
      <div class="stage" data-try-stage style="--cols:${exampleStill.cols};--rows:${exampleStill.rows}"><pre class="grid-figure live" role="img" aria-label="${esc(exampleStill.summary)}">${exampleStill.html}</pre></div>
      <div class="builder__data" tabindex="0" data-try-spec hidden><p class="data__empty">Build a figure to see its data.</p></div>
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
  <div class="cf-turnstile" data-sitekey="${TURNSTILE_SITE_KEY}" data-action="glyph-kit" data-appearance="interaction-only" data-theme="auto"></div>
</section>`;

// ── Home ───────────────────────────────────────────────────────────────────────────────────────
const home = page({
  path: "/",
  current: "home",
  title: "Glyph kit: docs and diagrams as text",
  description: "A skill for Claude Code and Codex. Lightweight docs and diagrams that people and AI can both read.",
  content: `
<section class="hero" aria-labelledby="title">
  <div class="hero__inner" data-depth="0.5" data-lag>
    <p class="kicker">Free · MIT · ${kindCount + Object.keys(LIVE).length} kinds · v${plugin.version}</p>
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
  <header class="heading"><p class="kicker">01 Builder</p></header>
  ${builder}
</section>

<section class="section" aria-labelledby="cheap">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">02 Cost</p><h2 id="cheap">Less to make. Less to send.</h2></header>
  <div class="stats">
    <article class="stat"><p class="label">To draw a figure</p><strong>${stats.us} μs</strong><p>Median, no browser.</p></article>
    <article class="stat"><p class="label">As text</p><strong>${stats.text} bytes</strong><p>${stats.ratio}× smaller than an image.</p></article>
    <article class="stat"><p class="label">As an image, for a model</p><strong>${stats.tokens} tokens</strong><p>Median.</p></article>
  </div>
</section>

<section class="section" aria-labelledby="moving">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">03 Motion</p><h2 id="moving">Six kinds that move.</h2></header>
  <div class="gallery">${moving.map((mv) => liveFigure(mv)).join("\n")}</div>
</section>

<section class="section" aria-labelledby="areas">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">04 Coverage</p><h2 id="areas">${kindCount} kinds. Eight areas.</h2><a class="text-link" href="/kinds/">Every kind</a></header>
  <div class="areas">${Object.entries(AREAS).map(([id, area], i) => `<article class="area"><h3>${esc(area.label)}</h3>${figure(examples[id][0])}<p>${Object.values(area.kinds).map((k) => esc(k.label)).join(" · ")}</p></article>`).join("\n")}</div>
</section>

<section class="section" aria-labelledby="guard">
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">05 Trust</p><h2 id="guard">Sample data is stamped.</h2></header>
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
  <header class="heading" data-depth="0.22" data-settle><p class="kicker">06 Output</p><h2 id="formats">One file, every format.</h2><p>A motion audit of Pave's front end.</p></header>
  <div class="pages">${[1, 2, 3, 4].map((n) => `<img src="/images/report-page-${n}.webp" alt="${n === 1 ? "Report cover: the title, a summary of four findings and the contents." : `Report page ${n}: numbered sections with takeaways and figures.`}" width="909" height="1286" loading="lazy" decoding="async">`).join("")}</div>
  <div class="links">
    <a class="text-link" href="/examples/motion-audit/motion-audit.pdf">The report as a PDF</a>
    <a class="text-link" href="/examples/decks/motion-audit">The same audit as a deck</a>
    <a class="text-link" href="/examples/product/settings">A prototype from a text wireframe</a>
    <a class="text-link" href="/examples/live/review-queue">A moving diagram on its own</a>
  </div>
</section>

<section class="section support" aria-labelledby="support">
  <header class="heading"><p class="kicker">07 Support</p><h2 id="support">Free. MIT.</h2></header>
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
  path: "/kinds/",
  current: "kinds",
  title: "Every kind · Glyph kit",
  description: `All ${kindCount} kinds of figure and ${Object.keys(LIVE).length} moving diagrams in Glyph kit, with what each is for.`,
  content: `
<header class="heading"><p class="kicker">Every kind</p><h2>${kindCount} figures, ${Object.keys(LIVE).length} that move.</h2><p>Each is drawn here by the kit itself, from its example data. All of it is sample data, and it says so on the figure.</p></header>
<nav class="jump" aria-label="Areas">${Object.entries(AREAS).map(([id, a]) => `<a href="#${id}">${esc(a.label)}</a>`).join("")}<a href="#moving">Moving diagrams</a></nav>
${Object.entries(AREAS).map(([id, area]) => {
  const seen = new Set();
  const specs = examples[id].filter((s) => (seen.has(s.kind) ? false : seen.add(s.kind)));
  return `<section class="section" id="${id}" aria-labelledby="${id}-title">
  <header class="heading"><h2 id="${id}-title">${esc(area.label)}</h2><p>${esc(AREA_DOCS[id])}</p></header>
  <div class="areas">${specs.map((s) => `<article class="kind"><h3>${esc(KINDS[s.kind].label)}</h3><p class="kind__when">${esc(KIND_DOCS[s.kind]?.when ?? "")}</p>${figure(s)}${KIND_DOCS[s.kind]?.traps ? `<p class="kind__watch">Watch for: ${esc(KIND_DOCS[s.kind].traps)}</p>` : ""}</article>`).join("\n")}</div>
</section>`;
}).join("\n")}
<section class="section" id="moving" aria-labelledby="moving-title">
  <header class="heading"><h2 id="moving-title">Moving diagrams</h2><p>A process over time. Each plays on screen and keeps a still that makes the same point, for reduced motion, print and docs.</p></header>
  <div class="gallery">${moving.map((mv) => liveFigure(mv)).join("\n")}</div>
</section>`
});

/** Root-relative links in a page, moved under BASE. External links are left alone. */
const based = (html) => html.replace(/(href|src)="\/(?!\/|_vercel\/)/g, `$1="${BASE}/`); // Vercel's own paths stay at the root

// ── Write ──────────────────────────────────────────────────────────────────────────────────────
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(out, "kinds"), { recursive: true });
writeFileSync(join(out, "index.html"), based(home));
writeFileSync(join(out, "kinds/index.html"), based(kinds));
cpSync(join(root, "site/src/style.css"), join(out, "style.css"));
for (const f of ["app.js", "showcase.js", "showcase-core.mjs", "try.js", "parallax.js"]) cpSync(join(root, "site/src", f), join(out, f));
cpSync(join(root, "site/src/fonts"), join(out, "fonts"), { recursive: true });
cpSync(join(root, "site/public"), out, { recursive: true });
cpSync(join(kit, "assets/icon.svg"), join(out, "icon.svg"));
// The browser modules the moving diagrams need, at the same relative paths as in the kit.
const COMPUTER_ONLY = ["build-reference.mjs", "data.mjs", "glyph-kit.mjs", "lint.mjs", "measure.mjs", "live/html.mjs", "render/export.mjs"];
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
  skeletons[`live:${spec.kind}`] = stillGrid(make, still).toText();
}
writeFileSync(join(out, "skeletons.json"), JSON.stringify(skeletons));
console.log(`site/dist: ${readdirSync(out).length} entries, ${moving.length} moving diagrams, ${kindCount} kinds`);
