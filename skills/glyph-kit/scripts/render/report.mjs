// Report fidelity: several specs as a document that reads like a finished report.
//
// A report is {
//   title, subtitle?, author?, date?, theme?: "paper" | "ink" | "phosphor" | "gilt",
//   summary?: ["one finding per line", …],
//   sections: [{ title, takeaway?, text?: ["paragraph", …], figures?: [spec, …], note? }]
// }
// Figures are drawn as inline SVG (render/svg.mjs), so they are crisp at any size and in print, and
// need no special font. Each keeps its text form one click away, for copying into a doc or a PR.
// Printing (or export.mjs --to pdf) gives A4 pages with the cover on its own page.
import { resolve } from "../registry.mjs";
import { figureSvg } from "./svg.mjs";
import { SPACING, palette } from "./themes.mjs";
import { body, label } from "./text.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Inline emphasis in report prose: **bold** and `code`.
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");

function figure(spec, number, colors) {
  const def = resolve(spec);
  const text = body(spec);
  const fig = figureSvg(text, { colors, cell: 9, row: 21, x0: 0, y0: 0 });
  const svg = `<svg class="r-svg" viewBox="0 0 ${fig.width} ${fig.height}" width="${fig.width}" height="${fig.height}" role="img" aria-label="${esc(label(spec))}"><defs>${fig.defs}</defs><g font-family="Menlo, 'DejaVu Sans Mono', Consolas, monospace" font-size="13.9">${fig.svg}</g></svg>`;
  return `<figure class="r-fig">
<figcaption class="r-fig__head"><span class="r-fig__n">Figure ${number}</span><span class="r-fig__title">${esc(spec.title ?? def.label)}</span></figcaption>
${spec.intent ? `<p class="r-fig__intent">${inline(spec.intent)}</p>` : ""}
<div class="r-fig__panel">${svg}</div>
<div class="r-fig__foot">${spec.source ? `<span>Source: ${esc(spec.source)}</span>` : "<span></span>"}<details><summary>As text</summary><pre>${esc(text)}</pre></details></div>
</figure>`;
}

const CSS = (p) => `
:root{--bg:${p.bg};--panel:${p.panel};--ink:${p.ink};--muted:${p.muted};--data:${p.data};--frame:${p.frame};--flag:${p.flag};--ok:${p.ok};--measure:${SPACING.measure}ch;--gap:${SPACING.sectionGap}px}
*,*::before,*::after{box-sizing:border-box}
html{color-scheme:light dark;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.r{max-width:1040px;margin:0 auto;padding:96px 56px 120px}
.r-mono{font-family:Menlo,"DejaVu Sans Mono",Consolas,monospace}
.r-kicker{margin:0;color:var(--muted);font:500 12px/1.4 Menlo,"DejaVu Sans Mono",Consolas,monospace;letter-spacing:.08em;text-transform:uppercase}
.r-cover{display:grid;gap:28px;padding-bottom:72px;border-bottom:1px solid color-mix(in srgb,var(--ink) 16%,transparent)}
.r-ramp{margin:0;color:var(--data);font:56px/1 Menlo,"DejaVu Sans Mono",Consolas,monospace;letter-spacing:.16em}
.r-cover h1{margin:0;max-width:18ch;font-size:clamp(40px,6vw,68px);line-height:1.02;letter-spacing:-.03em;font-weight:650}
.r-cover .r-sub{margin:0;max-width:44ch;color:var(--muted);font-size:22px;line-height:1.45}
.r-meta{display:flex;flex-wrap:wrap;gap:8px 28px;margin:0}
.r-summary{display:grid;gap:14px;margin:12px 0 0;padding:32px 36px;background:var(--panel);border-radius:10px}
.r-summary ol{display:grid;gap:12px;margin:0;padding:0;list-style:none;counter-reset:s}
.r-summary li{display:grid;grid-template-columns:28px 1fr;gap:12px;counter-increment:s;font-size:18px;line-height:1.5}
.r-summary li::before{content:counter(s,decimal-leading-zero);color:var(--data);font:500 13px/1.9 Menlo,monospace}
.r-toc{display:grid;gap:10px;margin:64px 0 0;padding:0;list-style:none;counter-reset:t}
.r-toc li{display:grid;grid-template-columns:48px 1fr;counter-increment:t}
.r-toc li::before{content:counter(t,decimal-leading-zero);color:var(--muted);font:13px/1.9 Menlo,monospace}
.r-toc a{color:inherit;text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}
.r-sec{display:grid;gap:28px;padding-top:var(--gap);counter-increment:sec}
.r-sec h2{margin:0;font-size:34px;line-height:1.12;letter-spacing:-.02em;font-weight:650}
.r-sec h2::before{content:counter(sec,decimal-leading-zero);display:block;margin-bottom:14px;color:var(--data);font:500 13px/1 Menlo,monospace;letter-spacing:.08em}
.r-take{margin:0;max-width:var(--measure);font-size:22px;line-height:1.45;font-weight:500}
.r-text{display:grid;gap:18px;max-width:var(--measure)}
.r-text p{margin:0;color:color-mix(in srgb,var(--ink) 86%,var(--bg))}
.r-text code,.r-take code{padding:1px 5px;border-radius:4px;background:var(--panel);font:.88em Menlo,monospace}
.r-fig{display:grid;gap:14px;margin:20px 0 0;break-inside:avoid}
.r-fig__head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px}
.r-fig__n{color:var(--muted);font:500 12px Menlo,monospace;letter-spacing:.08em;text-transform:uppercase}
.r-fig__title{font-size:18px;font-weight:600}
.r-fig__intent{margin:-4px 0 0;max-width:var(--measure);color:var(--muted);font-size:16px}
.r-fig__panel{overflow-x:auto;padding:36px 40px;background:var(--panel);border-radius:10px}
.r-svg{display:block;max-width:100%;height:auto}
.r-fig__foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px;color:var(--muted);font-size:13px}
.r-fig__foot summary{cursor:pointer}
.r-fig__foot pre{margin:10px 0 0;padding:16px;overflow-x:auto;background:var(--panel);border-radius:8px;color:var(--ink);font:12.5px/1.35 Menlo,monospace}
.r-note{display:grid;grid-template-columns:4px 1fr;gap:18px;max-width:var(--measure);margin:0}
.r-note::before{content:"";background:var(--data);border-radius:2px}
.r-note p{margin:0;color:var(--muted)}
.r-end{margin-top:var(--gap);padding-top:28px;border-top:1px solid color-mix(in srgb,var(--ink) 16%,transparent);color:var(--muted);font-size:13px}
:focus-visible{outline:2px solid var(--data);outline-offset:3px}
@media (max-width:700px){.r{padding:56px 22px 80px}.r-fig__panel{padding:22px}.r-summary{padding:24px}.r-sec{padding-top:64px}}
@page{size:A4;margin:18mm 18mm 20mm;background:${p.bg};@bottom-right{content:counter(page);font:9px Menlo,monospace;color:${p.muted}}}
@media print{
  body{font-size:10.5pt;background:var(--bg)}
  .r{max-width:none;padding:0}
  .r-cover{padding:18mm 0 0;gap:22px;break-after:page;border:0}
  .r-toc{margin-top:28px}
  .r-sec{padding-top:14mm}
  .r-sec h2,.r-take{break-after:avoid}
  .r-fig{break-inside:avoid}
  .r-fig__foot details{display:none}
  .r-toc a{border:0}
  .r-end{margin-top:10mm;break-before:avoid}
}
`;

/** The report as one self-contained HTML document. */
export function renderReport(report, { theme } = {}) {
  const p = palette(theme ?? report.theme);
  let n = 0;
  const sections = report.sections
    .map((s, i) => {
      const figs = (s.figures ?? []).map((spec) => figure(spec, ++n, p)).join("\n");
      return `<section class="r-sec" id="s${i + 1}" aria-labelledby="s${i + 1}-t">
<h2 id="s${i + 1}-t">${esc(s.title)}</h2>
${s.takeaway ? `<p class="r-take">${inline(s.takeaway)}</p>` : ""}
${s.text?.length ? `<div class="r-text">${s.text.map((t) => `<p>${inline(t)}</p>`).join("")}</div>` : ""}
${figs}
${s.note ? `<aside class="r-note"><p>${inline(s.note)}</p></aside>` : ""}
</section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(report.title)}</title>
<style>${CSS(p)}</style>
</head>
<body>
<main class="r" style="counter-reset:sec">
<header class="r-cover">
<p class="r-ramp" aria-hidden="true">░▒▓█</p>
<h1>${esc(report.title)}</h1>
${report.subtitle ? `<p class="r-sub">${inline(report.subtitle)}</p>` : ""}
<p class="r-meta r-kicker">${[report.author, report.date].filter(Boolean).map(esc).join("<span aria-hidden=\"true\"> · </span>")}</p>
${report.summary?.length ? `<section class="r-summary" aria-label="Summary"><p class="r-kicker">In short</p><ol>${report.summary.map((s) => `<li><span>${inline(s)}</span></li>`).join("")}</ol></section>` : ""}
<ol class="r-toc" aria-label="Contents">${report.sections.map((s, i) => `<li><a href="#s${i + 1}">${esc(s.title)}</a></li>`).join("")}</ol>
</header>
${sections}
<footer class="r-end">${esc(report.title)}${report.date ? ` · ${esc(report.date)}` : ""} · Made with Glyph kit</footer>
</main>
</body>
</html>
`;
}

/** The report as Markdown: headings, takeaways, figures in text blocks with their descriptions. */
export function reportMarkdown(report) {
  const out = [`# ${report.title}`, ""];
  if (report.subtitle) out.push(report.subtitle, "");
  if (report.author || report.date) out.push(`*${[report.author, report.date].filter(Boolean).join(" · ")}*`, "");
  if (report.summary?.length) out.push("## In short", "", ...report.summary.map((s, i) => `${i + 1}. ${s}`), "");
  let n = 0;
  for (const s of report.sections) {
    out.push(`## ${s.title}`, "");
    if (s.takeaway) out.push(`**${s.takeaway}**`, "");
    for (const t of s.text ?? []) out.push(t, "");
    for (const spec of s.figures ?? []) {
      out.push(`**Figure ${++n}. ${spec.title ?? resolve(spec).label}**`, "");
      if (spec.intent) out.push(spec.intent, "");
      out.push("```text", body(spec), "```", "", `*${label(spec)}*`, "");
      if (spec.source) out.push(`Source: ${spec.source}`, "");
    }
    if (s.note) out.push(`> ${s.note}`, "");
  }
  return out.join("\n");
}
