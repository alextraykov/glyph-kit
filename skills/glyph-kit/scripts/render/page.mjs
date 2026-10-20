// A document layout as one page of HTML (and PDF through export.mjs). It draws the same blocks as
// the text form (areas/layouts.mjs compose()), in the same order and the same rows, in the kit's own
// type (Departure Mono) and palette (themes.mjs). Figures stay text, coloured by role.
import { FONT_CSS } from "./font.mjs";
import { PAINT_CSS, paint } from "./paint.mjs";
import { SPACING, palette } from "./themes.mjs";
import { isSample } from "../guard.mjs";
import { resolve } from "../registry.mjs";
import { compose } from "../areas/layouts.mjs";
import { body as textBody, drawInside, label } from "./text.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const MARK = { number: (i) => String(i + 1), arrow: () => "→", dot: () => "·", cross: () => "x" };

const CSS = (p) => `
:root{--bg:${p.bg};--panel:${p.panel};--ink:${p.ink};--muted:${p.muted};--data:${p.data};--frame:${p.frame};--flag:${p.flag};--ok:${p.ok};--mono:"Departure Mono",Menlo,"DejaVu Sans Mono",Consolas,monospace}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 var(--mono);-webkit-font-smoothing:antialiased;font-variant-ligatures:none}
.p{max-width:calc(80ch + 112px);margin:0 auto;padding:72px 56px 88px;display:grid;gap:32px}
.p-kicker{margin:0;color:var(--muted);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.p-head{display:grid;gap:12px}
.p-head h1{margin:0;font-size:28px;line-height:1.2;font-weight:400}
.p-chip{justify-self:start;padding:1px 8px;border:1px solid currentColor;border-radius:999px;color:var(--flag);font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.p-lead{margin:0;font-size:18px;line-height:1.5;max-width:${SPACING.measure}ch}
.p-sec{display:grid;gap:16px;break-inside:avoid}
.p-sec h2{display:flex;align-items:center;gap:12px;margin:0;color:var(--muted);font-size:12px;font-weight:400;letter-spacing:.08em;text-transform:uppercase}
.p-sec h2::after{content:"";flex:1;border-top:1px solid var(--frame)}
.p-line{margin:0;max-width:${SPACING.measure}ch}
.p-list{display:grid;gap:6px;margin:0;padding:0;list-style:none}
.p-list li{display:grid;grid-template-columns:3ch 1fr;max-width:${SPACING.measure}ch}
.p-list .m{color:var(--frame)}.p-list .m-cross{color:var(--flag)}
.p-row{display:flex;flex-wrap:wrap;align-items:flex-start;gap:20px 4ch;break-inside:avoid}
.p-fig{display:grid;gap:8px;margin:0;min-width:0}
.p-fig figcaption{color:var(--muted)}
.p-fig pre{margin:0;font:13px/${SPACING.figureLine} var(--mono);white-space:pre;overflow-x:auto}
.p-more,.p-sources{margin:0;color:var(--muted)}
.p-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px;padding-top:20px;border-top:1px solid var(--frame);color:var(--muted);font-size:12px}
.p-foot summary{cursor:pointer}
.p-foot pre{margin:12px 0 0;padding:16px;overflow-x:auto;background:var(--panel);color:var(--ink);font:12px/${SPACING.figureLine} var(--mono)}
${PAINT_CSS("--")}
@page{size:A4;margin:16mm 14mm;background:${p.bg}}
@media (max-width:700px){.p{padding:40px 16px 56px}}
@media print{body{font-size:9.5pt;background:var(--bg)}.p{max-width:none;padding:0;gap:22px}.p-fig pre{font-size:8.6pt;overflow:visible}.p-foot details{display:none}}
`;

function blockHtml(b, ctx) {
  if (b.type === "lead") return `<p class="p-lead">${esc(b.text)}</p>`;
  if (b.type === "line") return `<p class="p-line">${esc(b.text)}</p>`;
  if (b.type === "list")
    return `<ul class="p-list">${b.items.map((item, i) => `<li><span class="m m-${b.mark}" aria-hidden="true">${MARK[b.mark](i)}</span><span>${esc(item)}</span></li>`).join("")}</ul>${b.more ? `<p class="p-more">${esc(b.more)}</p>` : ""}`;
  if (b.type === "figures")
    return (
      b.rows
        .map((row) => `<div class="p-row">${row.map((it) => `<figure class="p-fig">${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ""}<pre lang="${esc(it.spec.lang ?? ctx.lang)}" role="img" aria-label="${esc(label({ ...it.spec, source: it.spec.source ?? ctx.source }))}">${paint(it.lines.join("\n"))}</pre></figure>`).join("")}</div>`)
        .join("") + (b.more ? `<p class="p-more">${esc(b.more)}</p>` : "")
    );
  return "";
}

/** One document layout spec as a self-contained page. theme: paper | ink | phosphor | gilt. */
export function renderLayoutPage(spec, { theme } = {}) {
  const def = resolve(spec);
  const lang = spec.lang ?? "en";
  const blocks = compose(spec.kind, def.data, { source: spec.source, lang: spec.lang, draw: drawInside });
  const ctx = { lang, source: spec.source };
  const sections = [];
  let open = null;
  for (const b of blocks) {
    if (b.type === "sources") continue;
    if (b.type === "heading") {
      open = { heading: b.text, parts: [] };
      sections.push(open);
    } else if (b.type === "lead" && !open) sections.push({ parts: [b] });
    else if (open) open.parts.push(b);
    else sections.push({ parts: [b] });
  }
  const sources = [spec.source, ...(blocks.find((b) => b.type === "sources")?.list ?? [])].filter(Boolean);
  const body = sections
    .map((s) => (s.heading ? `<section class="p-sec"><h2>${esc(s.heading)}</h2>${s.parts.map((b) => blockHtml(b, ctx)).join("")}</section>` : s.parts.map((b) => blockHtml(b, ctx)).join("")))
    .join("\n");
  const title = spec.title ?? def.label;
  const text = textBody(spec);
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${FONT_CSS}${CSS(palette(theme ?? spec.theme))}</style>
</head>
<body>
<main class="p">
<header class="p-head"><p class="p-kicker">${esc(def.label)}</p><h1>${esc(title)}</h1>${isSample(spec.source) ? `<span class="p-chip">Sample data</span>` : ""}${spec.intent ? `<p class="p-line">${esc(spec.intent)}</p>` : ""}</header>
${body}
<footer class="p-foot"><span>${sources.length ? `${sources.length > 1 ? "Sources" : "Source"}: ${sources.map(esc).join("; ")}` : "Made with Glyph kit"}</span><details><summary>As text</summary><pre lang="${esc(lang)}">${esc(text)}</pre></details></footer>
</main>
</body>
</html>
`;
}

