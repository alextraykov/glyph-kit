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
const { AREA_DOCS, KIND_DOCS } = await imp("scripts/docs.mjs");
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
const SITE = `https://traykov.cc${BASE}`;

// ── Data ───────────────────────────────────────────────────────────────────────────────────────
const examples = Object.fromEntries(Object.keys(AREAS).map((a) => [a, json(`examples/${a}.json`)]));
const liveSpecs = Object.fromEntries(
  readdirSync(join(kit, "examples/live")).filter((f) => f.endsWith(".json")).map((f) => {
    const spec = json(`examples/live/${f}`);
    return [f.replace(".json", ""), spec];
  })
);
const moving = Object.entries(liveSpecs).map(([id, spec]) => {
  const { make, still, summary } = live(spec);
  return { id, spec, summary, html: stillGrid(make, still).toHtml() };
});
const m = json("reference/measurements.json").rows;
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
const liveFigure = (mv) => `<figure class="demo">
  <div class="demo__bar"><span class="label">${esc(mv.spec.title)}</span><span class="label">Sample data</span></div>
  <pre class="grid-figure live" role="img" aria-label="${esc(mv.summary)}" data-live="${mv.id}">${mv.html}</pre>
  <figcaption>${esc(mv.spec.intent)}</figcaption>
</figure>`;

// ── The hero showcase: views of the kit in one box, swapped with the dither press ───────────────
const ex = (area, kind) => examples[area].find((sp) => sp.kind === kind);
const showcaseViews = [
  { live: "rework-loop", title: "Rework loop · moving", caption: "Where the week goes: about one in three pieces of work comes back from QA." },
  { spec: ex("wireframes", "screen"), title: "Screen wireframe", caption: "A settings screen. Its notes become behaviour in the prototype." },
  { spec: ex("metrics", "funnel"), title: "Funnel", caption: "Signup to paid, with what each step keeps." },
  { live: "save-states", title: "State machine · moving", caption: "Every state of saving a draft, including the failure and the retry." },
  { spec: ex("motion", "intentCard"), title: "Motion intent", caption: "Why a toast moves, how long, which curve, and what reduced motion shows." },
  { live: "review-queue", title: "Work queue · moving", caption: "Review takes two at a time, so everything before it waits." },
  { spec: ex("research", "likert"), title: "Survey answers", caption: "How people rated the export flow, agree against disagree." }
].map((v) => {
  if (v.live) {
    const { make, still, summary } = live(liveSpecs[v.live]);
    const g = stillGrid(make, still);
    g.toText();
    return { ...v, label: summary, cells: core.cellsFromGrid(g) };
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
  <div class="demo__bar"><span class="label" data-showcase-title>${esc(showcaseViews[0].title)}</span><span class="label"><span data-showcase-count>1 / ${showcaseViews.length}</span> · Sample data</span></div>
  <pre class="grid-figure live" role="img" aria-label="${esc(showcaseViews[0].label)}" data-showcase-grid>${core.toHtml(core.centre(showcaseViews[0].cells, box.H, box.W))}</pre>
  <figcaption data-showcase-caption>${esc(showcaseViews[0].caption)}</figcaption>
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
<meta property="og:image" content="${SITE}/images/report-page-1.webp">
<link rel="preload" href="/fonts/DepartureMono-Regular.woff2" as="font" type="font/woff2" crossorigin>
<script>
  // The hero's first view builds in. Hide it until the script takes over; never for reduced motion,
  // and never for long: if the script fails, the finished view shows after two seconds.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.dataset.showcaseState = "pending";
    setTimeout(() => { if (document.documentElement.dataset.showcaseState === "pending") document.documentElement.dataset.showcaseState = "ready"; }, 2000);
  }
</script>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="top"><div class="shell">
  <a class="brand" href="/"><img src="/icon.svg" alt="" width="22" height="22">Glyph kit</a>
  <nav class="nav" aria-label="Site"><a href="/kinds/"${current === "kinds" ? ' aria-current="page"' : ""}>Kinds</a><a href="${REPO}">GitHub</a><a href="${REPO}/blob/main/CHANGELOG.md">Changes</a></nav>
</div></header>
<main class="shell">
${content}
</main>
<footer><div class="shell"><span>Glyph kit ${plugin.version} · MIT · made by <a href="https://traykov.cc">Alexander Traykov</a></span><span><a href="https://traykov.cc/notes/four-characters/">Four characters</a>, the story behind it</span></div></footer>
<script type="application/json" id="live-specs">${JSON.stringify(liveSpecs).replace(/</g, "\\u003c")}</script>
<script type="application/json" id="showcase">${JSON.stringify(showcaseData).replace(/</g, "\\u003c")}</script>
<script type="module" src="/app.js"></script>
</body>
</html>
`;

const install = `<div class="install">
  <p class="cmd__for">Any agent: Claude Code, Codex, Cursor and others</p>
  <div class="cmd"><code>npx skills add alextraykov/glyph-kit</code><button type="button" data-copy="npx skills add alextraykov/glyph-kit" hidden>Copy</button></div>
  <p class="cmd__for">Claude Code, as a plugin that updates</p>
  <div class="cmd"><code>/plugin marketplace add alextraykov/glyph-kit</code><button type="button" data-copy="/plugin marketplace add alextraykov/glyph-kit" hidden>Copy</button></div>
  <div class="cmd"><code>/plugin install glyph-kit@traykov</code><button type="button" data-copy="/plugin install glyph-kit@traykov" hidden>Copy</button></div>
  <p class="cmd__for">Or by hand: unzip it into ~/.claude/skills/ (Claude Code) or ~/.agents/skills/ (Codex)</p>
  <div class="actions"><a class="button" href="${REPO}/releases/latest/download/glyph-kit.zip">Download the kit <span aria-hidden="true">↓</span></a><span class="cmd__for">v${plugin.version} · zip · ${zipSize}</span></div>
</div>`;

// ── Home ───────────────────────────────────────────────────────────────────────────────────────
const hero = moving.find((mv) => mv.id === "rework-loop") ?? moving[0];
const home = page({
  path: "/",
  title: "Glyph kit: product-design figures as text",
  description: "A skill for Claude Code and Codex that draws research, flows, wireframes, plans and motion in four shades and a few lines. Clear, cheap to make, and in an aesthetic that doesn't date.",
  content: `
<section class="hero" aria-labelledby="title">
  <div class="hero__copy">
    <p class="kicker">Free · MIT · ${kindCount + Object.keys(LIVE).length} kinds · v${plugin.version}</p>
    <h1 id="title">Glyph<br>kit.</h1>
    <p class="lead">Get the point across clearly, cheaply, in an aesthetic that doesn't date.</p>
    <p>A skill for Claude Code and Codex. Research, flows, wireframes, plans and motion, drawn in four shades and a few lines. Code draws them from the numbers, so they're exact, and the same file becomes a deck, a report or a prototype when the work needs one.</p>
    ${install}
  </div>
  ${showcase}
</section>

<section class="section" aria-labelledby="cheap">
  <header class="heading"><p class="kicker">01 / Cheap</p><h2 id="cheap">Less to make,<br>less to send.</h2><p>Every figure and slide burns tokens and time. Measured on ${stats.count} examples from the kit:</p></header>
  <div class="stats">
    <article class="stat"><p class="label">To draw a figure</p><strong>${stats.us} μs</strong><p>Median, in Node, with no browser and no pixels.</p></article>
    <article class="stat"><p class="label">Size as text</p><strong>${stats.text} bytes</strong><p>${stats.ratio}× smaller than the same figure as an image (${stats.png} KB).</p></article>
    <article class="stat"><p class="label">Image tokens for that picture</p><strong>${stats.tokens}</strong><p>Median, from ${stats.tokensLow} to ${stats.tokensHigh}, for a model to look at it.</p></article>
    <article class="stat stat--open"><p class="label">Tokens for the text</p><strong>Not yet</strong><p>Block characters are rare and three bytes each, so a dense figure can cost more as text. It gets measured before it gets claimed.</p></article>
  </div>
</section>

<section class="section" aria-labelledby="moving">
  <header class="heading"><p class="kicker">02 / Moving</p><h2 id="moving">Diagrams<br>that move.</h2><p>Work flowing, people leaving, a queue backing up. A few lines of data become one page that plays, and a still for the doc.</p></header>
  <div class="gallery">${moving.filter((mv) => mv !== hero).map(liveFigure).join("\n")}
    <div class="gallery__note"><p class="label">Your own</p><h3>Ask for one.</h3><p>"A moving diagram of our review queue, with a limit of two." The agent writes a few lines of data, the kit draws it, and it checks the data first: a funnel can't grow, a state machine can't skip a transition.</p><a class="text-link" href="/kinds/#moving">The six moving kinds →</a></div>
  </div>
</section>

<section class="section" aria-labelledby="areas">
  <header class="heading"><p class="kicker">03 / Areas</p><h2 id="areas">Eight parts<br>of the job.</h2><p>${kindCount} kinds of figure. Each area has its own guide, so the agent reads only the one the task needs.</p><a class="text-link" href="/kinds/">See every kind →</a></header>
  <div class="areas">${Object.entries(AREAS).map(([id, area]) => `<article class="area"><h3>${esc(area.label)}</h3>${figure(examples[id][0])}<p>${Object.values(area.kinds).map((k) => esc(k.label)).join(" · ")}</p></article>`).join("\n")}</div>
</section>

<section class="section" aria-labelledby="guard">
  <header class="heading"><p class="kicker">04 / Guardrails</p><h2 id="guard">Made-up numbers<br>can't pass as real.</h2><p>A kit that draws exactly will draw an invention exactly. So it checks.</p></header>
  <ul class="rules">
    <li><strong>No source, no numbers.</strong> A figure with numbers is refused until it says where they came from.</li>
    <li><strong>Sample data is stamped.</strong> An illustrative source puts SAMPLE DATA on the figure in every format.</li>
    <li><strong>Data from your files.</strong> Point a spec at a CSV or JSON file and the numbers come from it, not from a model's memory.</li>
    <li><strong>Data that can't be true is refused.</strong> A funnel that grows, a value outside its range, dates out of order, each with a sentence saying what's wrong.</li>
    <li><strong>Ask, don't invent.</strong> The skill tells the agent to ask for missing data.</li>
    <li><strong>Specs between agents, drawings for people.</strong> A compact plain-ASCII form for the times a drawing has to go into a model's context.</li>
  </ul>
</section>

<section class="section" aria-labelledby="formats">
  <header class="heading"><p class="kicker">05 / Formats</p><h2 id="formats">One file,<br>every fidelity.</h2><p>Markdown and MDX for docs, an SVG or PNG for a slide, a deck you present, a report someone prints, a prototype someone clicks, or a screen built with your design system's real components. Here, a real motion audit of Pave's front end.</p></header>
  <div class="pages">${[1, 2, 3, 4].map((n) => `<img src="/images/report-page-${n}.webp" alt="${n === 1 ? "Report cover: the title, a summary of four findings and the contents." : `Report page ${n}: numbered sections with takeaways and figures.`}" width="909" height="1286" loading="lazy" decoding="async">`).join("")}</div>
  <div class="links">
    <a class="text-link" href="/examples/motion-audit/motion-audit.pdf">The report as a PDF</a>
    <a class="text-link" href="/examples/decks/motion-audit">The same audit as a deck</a>
    <a class="text-link" href="/examples/product/settings">A prototype from a text wireframe</a>
    <a class="text-link" href="/examples/live/review-queue">A moving diagram on its own</a>
  </div>
</section>

<aside class="note" aria-labelledby="note">
  <img src="/images/synapse-operation-loaders.webp" alt="Synapse's loaders: blocks stepping through a ramp while an operation runs." width="1280" height="720" loading="lazy" decoding="async">
  <div class="note__copy">
    <p class="label">The note behind it</p>
    <h2 id="note">Four characters</h2>
    <p>Where ░▒▓█ ended up in my work since January 2025: Synapse, decks at work, a motion audit, a handoff, sketches. What broke, what they cost, and the 1981 character set they come from.</p>
    <div class="actions"><a class="button" href="https://traykov.cc/notes/four-characters/">Read the note →</a><a class="text-link" href="${REPO}">The code on GitHub</a></div>
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
<header class="heading"><p class="kicker">Every kind</p><h2>${kindCount} figures,<br>${Object.keys(LIVE).length} that move.</h2><p>Each is drawn here by the kit itself, from its example data. All of it is sample data, and it says so on the figure.</p></header>
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
  <div class="gallery">${moving.map(liveFigure).join("\n")}</div>
</section>`
});

/** Root-relative links in a page, moved under BASE. External links are left alone. */
const based = (html) => html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`);

// ── Write ──────────────────────────────────────────────────────────────────────────────────────
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(out, "kinds"), { recursive: true });
writeFileSync(join(out, "index.html"), based(home));
writeFileSync(join(out, "kinds/index.html"), based(kinds));
cpSync(join(root, "site/src/style.css"), join(out, "style.css"));
for (const f of ["app.js", "showcase.js", "showcase-core.mjs"]) cpSync(join(root, "site/src", f), join(out, f));
cpSync(join(root, "site/src/fonts"), join(out, "fonts"), { recursive: true });
cpSync(join(root, "site/public"), out, { recursive: true });
cpSync(join(kit, "assets/icon.svg"), join(out, "icon.svg"));
// The browser modules the moving diagrams need, at the same relative paths as in the kit.
for (const f of ["layout.mjs", "guard.mjs", "live/grid.mjs", "live/kinds.mjs", "live/play.mjs", "render/paint.mjs"]) {
  mkdirSync(dirname(join(out, "kit", f)), { recursive: true });
  cpSync(join(kit, "scripts", f), join(out, "kit", f));
}
// Example outputs people can open: decks, the prototype, the moving diagrams.
for (const [from, to] of [["examples/decks", "examples/decks"], ["examples/live", "examples/live"], ["examples/product", "examples/product"]])
  cpSync(join(kit, from), join(out, to), { recursive: true, filter: (p) => !p.endsWith(".json") && !p.endsWith(".astro") && !p.endsWith(".txt") });
console.log(`site/dist: ${readdirSync(out).length} entries, ${moving.length} moving diagrams, ${kindCount} kinds`);
