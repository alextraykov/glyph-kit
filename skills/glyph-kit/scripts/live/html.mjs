// A moving diagram as one self-contained HTML file: the grid, the kinds and the player are inlined,
// so the file opens anywhere with nothing beside it. Reduced motion shows the still frame.
import { readFileSync } from "node:fs";
import { palette } from "../render/themes.mjs";
import { isSample } from "../guard.mjs";
import { live, stillGrid } from "./kinds.mjs";
import { KINDS } from "../registry.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Scope each module while concatenating it, preserving imported aliases and re-exports.
// The same browser bundle is used by standalone pages and moving deck slides.
export function inlineMotion() {
  const modules = new Map();
  const chunks = [];
  const fields = (text, separator) => text.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, alias] = part.split(/\s+as\s+/);
    return alias ? `${name}${separator}${alias}` : name;
  }).join(", ");
  const add = (url) => {
    if (modules.has(url.href)) return modules.get(url.href);
    const id = modules.size;
    modules.set(url.href, id);
    let source = readFileSync(url, "utf8");
    const exports = [];
    source = source.replace(/^import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];/gm, (_, names, path) => `const { ${fields(names, ": ")} } = __glyph[${add(new URL(path, url))}];`);
    source = source.replace(/^export\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];/gm, (_, names, path) => {
      const dep = add(new URL(path, url));
      for (const item of names.split(",")) {
        const [name, alias] = item.trim().split(/\s+as\s+/);
        exports.push(`${alias ?? name}: __glyph[${dep}].${name}`);
      }
      return "";
    });
    source = source.replace(/^export\s*\{([^}]+)\};/gm, (_, names) => {
      for (const item of names.split(",")) { const [name, alias] = item.trim().split(/\s+as\s+/); exports.push(`${alias ?? name}: ${name}`); }
      return "";
    });
    source = source.replace(/^export (const|function|class|async function)\s+(\w+)/gm, (_, type, name) => { exports.push(name); return `${type} ${name}`; });
    chunks.push(`__glyph[${id}] = (() => {\n${source}\nreturn { ${exports.join(", ")} };\n})();`);
    return id;
  };
  const motion = add(new URL("../motion.mjs", import.meta.url));
  const play = add(new URL("play.mjs", import.meta.url));
  const registry = add(new URL("../registry.mjs", import.meta.url));
  const table = Object.keys(KINDS).filter((kind) => KINDS[kind].motion).map((kind) => `${JSON.stringify(kind)}: __glyph[${registry}].KINDS[${JSON.stringify(kind)}].motion`).join(", ");
  return `const __glyph = {};\n${chunks.join("\n")}\nconst { animate, stillGrid, stillText } = __glyph[${motion}];\nconst { autoplay, player } = __glyph[${play}];\nconst MOTION = { ${table} };`;
}

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
${inlineMotion()}
const spec = ${JSON.stringify(spec).replace(/</g, "\\u003c")};
const { make, still } = animate(spec);
autoplay(document.querySelector("pre"), make, still);
</script>
</body>
</html>
`;
}
