// A moving diagram as one self-contained HTML file: the grid, the kinds and the player are inlined,
// so the file opens anywhere with nothing beside it. Reduced motion shows the still frame.
import { readFileSync } from "node:fs";
import { palette } from "../render/themes.mjs";
import { isSample } from "../guard.mjs";
import { live, stillGrid } from "./kinds.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Module sources without their import and export keywords, joined into one script.
const inline = () =>
  ["../layout.mjs", "../guard.mjs", "grid.mjs", "kinds.mjs", "play.mjs"]
    .map((f) => readFileSync(new URL(f, import.meta.url), "utf8"))
    .join("\n")
    .replace(/^import [^;]+;\n/gm, "")
    .replace(/^export \{[^}]*\};\n/gm, "")
    .replace(/^export (?=(const|function|class|async))/gm, "");

export function renderLiveHtml(spec, { theme = "paper" } = {}) {
  const p = palette(theme);
  const { make, still, summary } = live(spec);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(spec.title)}</title>
<style>
:root{color-scheme:${theme === "paper" ? "light" : "dark"}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:${p.bg};color:${p.ink};font:15px/1.5 system-ui,sans-serif}
figure{margin:0;padding:48px 40px;display:grid;gap:20px;max-width:100%}
h1{margin:0;font-size:20px;font-weight:600}
p{margin:0;color:${p.muted};max-width:68ch}
pre{margin:0;padding:28px 32px;overflow-x:auto;background:${p.panel};font:13px/1.25 Menlo,"SF Mono",Consolas,"DejaVu Sans Mono",monospace;font-variant-ligatures:none;white-space:pre}
.stamp{color:${p.flag};font:600 12px/1.4 Menlo,monospace;letter-spacing:.06em;text-transform:uppercase}
.gl-ok{color:${p.ok}}.gl-fail{color:${p.flag}}.gl-mute{color:${p.muted}}
</style>
</head>
<body>
<figure>
<h1>${esc(spec.title)}</h1>
${spec.intent ? `<p>${esc(spec.intent)}</p>` : ""}
<pre role="img" aria-label="${esc(summary)}">${esc(stillGrid(make, still).toText())}</pre>
${isSample(spec.source) ? `<p class="stamp">Sample data: made up to show the idea, not real numbers</p>` : ""}
${spec.source ? `<p>Source: ${esc(spec.source)}</p>` : ""}
</figure>
<script type="module">
${inline()}
const spec = ${JSON.stringify(spec)};
const { make, still } = live(spec);
autoplay(document.querySelector("pre"), make, still);
</script>
</body>
</html>
`;
}
