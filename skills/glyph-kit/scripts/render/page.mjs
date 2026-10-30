// A document layout as one page of HTML (and PDF through export.mjs). It draws the same blocks as
// the text form (areas/layouts.mjs compose()), in the same order and the same rows, in the kit's own
// type (Departure Mono) and palette (themes.mjs). Figures are drawn as inline SVG on the text's grid
// (render/svg.mjs), so bars stop short of the next row as they do in every other picture of a figure.
// Several layouts make one document, one layout to a page.
import { FONT_CSS } from "./font.mjs";
import { figureSvg } from "./svg.mjs";
import { SPACING, resolveTheme, themeCss } from "./themes.mjs";
import { paintOptions } from "./paint.mjs";
import { isSample } from "../guard.mjs";
import { resolve } from "../registry.mjs";
import { compose } from "../areas/layouts.mjs";
import { body as textBody, drawInside, label } from "./text.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const CELL = 9;
const ROW = 21;
const MARK = { number: (i) => String(i + 1), arrow: () => "→", dot: () => "·", cross: () => "x" };

const CSS = (t) => `
:root{${themeCss(t, "--")};--mono:"Departure Mono",Menlo,"DejaVu Sans Mono",Consolas,monospace}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 var(--mono);-webkit-font-smoothing:antialiased;font-variant-ligatures:none}
.p{max-width:${80 * CELL + 112}px;margin:0 auto;padding:72px 56px 88px;display:grid;gap:32px}
.p + .p{border-top:1px solid var(--frame)}
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
.p-row{display:flex;flex-wrap:wrap;align-items:flex-start;gap:20px ${4 * CELL}px;break-inside:avoid}
.p-fig{display:grid;gap:8px;margin:0;min-width:0}
.p-fig figcaption{color:var(--muted)}
.p-fig svg{display:block;max-width:100%;height:auto}
.p-more,.p-sources{margin:0;color:var(--muted)}
.p-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px;padding-top:20px;border-top:1px solid var(--frame);color:var(--muted);font-size:12px}
.p-foot summary{cursor:pointer}
.p-foot pre{margin:12px 0 0;padding:16px;overflow-x:auto;background:var(--panel);color:var(--ink);font:12px/${SPACING.figureLine} var(--mono)}
@page{size:A4;margin:16mm 14mm;background:${t.colors.bg}}
@media (max-width:700px){.p{padding:40px 16px 56px}}
@media print{body{font-size:9.5pt;background:var(--bg)}.p{max-width:none;padding:0;gap:22px}.p + .p{border:0;break-before:page}.p-foot details{display:none}}
`;

function figureHtml(it, ctx) {
  const fig = figureSvg(it.lines.join("\n"), { colors: ctx.colors, cell: CELL, row: ROW, rampCells: paintOptions(it.spec).ramp, ramp: ctx.ramp, focus: paintOptions(it.spec, it.lines.join("\n")) });
  const name = label({ ...it.spec, source: it.spec.source ?? ctx.source });
  return `<svg viewBox="0 0 ${fig.width} ${fig.height}" width="${fig.width}" height="${fig.height}" role="img" aria-label="${esc(name)}"><defs>${fig.defs}</defs><g font-family="'Departure Mono', Menlo, 'DejaVu Sans Mono', monospace" font-size="${ROW * 0.66}">${fig.svg}</g></svg>`;
}

function blockHtml(b, ctx) {
  if (b.type === "lead") return `<p class="p-lead">${esc(b.text)}</p>`;
  if (b.type === "line") return `<p class="p-line">${esc(b.text)}</p>`;
  if (b.type === "list")
    return `<ul class="p-list">${b.items.map((item, i) => `<li><span class="m m-${b.mark}" aria-hidden="true">${MARK[b.mark](i)}</span><span>${esc(item)}</span></li>`).join("")}</ul>${b.more ? `<p class="p-more">${esc(b.more)}</p>` : ""}`;
  if (b.type === "figures")
    return (
      b.rows
        .map((row) => `<div class="p-row">${row.map((it) => `<figure class="p-fig">${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ""}${figureHtml(it, ctx)}</figure>`).join("")}</div>`)
        .join("") + (b.more ? `<p class="p-more">${esc(b.more)}</p>` : "")
    );
  return "";
}

/** One layout as a section of the document. */
function layoutHtml(spec, t) {
  const def = resolve(spec);
  const lang = spec.lang ?? "en";
  const blocks = compose(spec.kind, def.data, { source: spec.source, lang: spec.lang, draw: drawInside });
  const ctx = { lang, source: spec.source, colors: t.colors, ramp: t.ramp };
  const sections = [];
  let open = null;
  for (const b of blocks) {
    if (b.type === "sources") continue;
    if (b.type === "heading") {
      open = { heading: b.text, parts: [] };
      sections.push(open);
    } else if (open) open.parts.push(b);
    else sections.push({ parts: [b] });
  }
  const sources = [spec.source, ...(blocks.find((b) => b.type === "sources")?.list ?? [])].filter(Boolean);
  const body = sections
    .map((s) => (s.heading ? `<section class="p-sec"><h2>${esc(s.heading)}</h2>${s.parts.map((b) => blockHtml(b, ctx)).join("")}</section>` : s.parts.map((b) => blockHtml(b, ctx)).join("")))
    .join("\n");
  return `<main class="p" lang="${esc(lang)}">
<header class="p-head"><p class="p-kicker">${esc(def.label)}</p><h1>${esc(spec.title ?? def.label)}</h1>${isSample(spec.source) ? `<span class="p-chip">Sample data</span>` : ""}${spec.intent ? `<p class="p-line">${esc(spec.intent)}</p>` : ""}</header>
${body}
<footer class="p-foot"><span>${sources.length ? `${sources.length > 1 ? "Sources" : "Source"}: ${sources.map(esc).join("; ")}` : "Made with Glyph kit"}</span><details><summary>As text</summary><pre lang="${esc(lang)}">${esc(textBody(spec))}</pre></details></footer>
</main>`;
}

/** Document layouts as one self-contained HTML document, one layout to a page when printed.
 *  theme: a palette name or theme object (themes.mjs); map: a design-system map with a roles block;
 *  title names the document (default: the first layout's). */
export function renderLayoutPages(specs, { theme, title, map } = {}) {
  const list = [specs].flat();
  const t = resolveTheme(theme ?? list[0]?.theme, { map });
  return `<!doctype html>
<html lang="${esc(list[0]?.lang ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title ?? list[0]?.title ?? "Glyph kit")}</title>
<style>${FONT_CSS()}${CSS(t)}</style>
</head>
<body>
${list.map((spec) => layoutHtml(spec, t)).join("\n")}
</body>
</html>
`;
}

/** One document layout spec as a self-contained page. */
export const renderLayoutPage = (spec, options = {}) => renderLayoutPages([spec], options);
