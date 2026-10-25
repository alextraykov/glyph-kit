// A moving diagram as one self-contained HTML file: the grid, the kinds and the player are inlined,
// so the file opens anywhere with nothing beside it. Reduced motion shows the still frame.
import { readFileSync } from "node:fs";
import { FONT_CSS } from "../render/font.mjs";
import { resolveTheme } from "../render/themes.mjs";
import { isSample } from "../guard.mjs";
import { live, stillGrid } from "./kinds.mjs";
import { KINDS } from "../registry.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Scope each module while concatenating it, preserving imported aliases and re-exports.
// The same browser bundle is used by standalone pages and moving deck slides. Given the kinds a page
// plays, it carries only their areas' modules; without, every area.
export function inlineMotion(only) {
  const areas = only ? new Set(only.map((kind) => KINDS[kind]?.area).filter(Boolean)) : null;
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
    // The registry imports every area; a page that plays a few kinds keeps only theirs.
    if (areas && url.pathname.endsWith("/scripts/registry.mjs"))
      source = source.replace(/^import \{ kinds as (\w+) \} from "\.\/areas\/\w+\.mjs";\n/gm, (line, area) => (areas.has(area) ? line : "")).replace(/^  (\w+): \{ label: .*\n/gm, (line, area) => (areas.has(area) ? line : ""));
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
  const table = Object.keys(KINDS).filter((kind) => KINDS[kind].motion && (!areas || areas.has(KINDS[kind].area))).map((kind) => `${JSON.stringify(kind)}: __glyph[${registry}].KINDS[${JSON.stringify(kind)}].motion`).join(", ");
  return `const __glyph = {};\n${chunks.join("\n")}\nconst { animate, stillGrid, stillText } = __glyph[${motion}];\nconst { autoplay, player } = __glyph[${play}];\nconst MOTION = { ${table} };`;
}

export function renderLiveHtml(spec, { theme = "paper", map } = {}) {
  const t = resolveTheme(theme, { map });
  const p = t.colors;
  const { make, still, summary } = live(spec);
  return `<!doctype html>
<html lang="${esc(spec.lang ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(spec.title)}</title>
<style>${FONT_CSS()}
:root{color-scheme:${t.dark ? "dark" : "light"}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:${p.bg};color:${p.ink};font:16px/1.6 system-ui,sans-serif}
figure{margin:0;padding:48px 40px;display:grid;gap:20px;max-width:100%}
h1{margin:0;font:400 22px/1.3 "Departure Mono",monospace}
p{margin:0;color:${p.muted};max-width:68ch}
pre{margin:0;padding:28px 32px;overflow-x:auto;background:${p.panel};font:400 11px/1.25 "Departure Mono",Menlo,"SF Mono",Consolas,"DejaVu Sans Mono",monospace;font-variant-ligatures:none;white-space:pre}
.stamp{color:${p.flag};font:400 11px/1.4 "Departure Mono",Menlo,monospace;letter-spacing:.06em;text-transform:uppercase}
button{justify-self:start;min-height:44px;padding:0 14px;border:1px solid currentColor;border-radius:0;background:transparent;color:inherit;font:400 11px "Departure Mono",monospace;cursor:pointer}button:focus-visible{outline:2px solid currentColor;outline-offset:3px}[hidden]{display:none!important}@media print{button{display:none}}
.gl-ok{color:${p.ok}}.gl-fail{color:${p.flag}}.gl-mute{color:${p.muted}}
</style>
</head>
<body>
<figure>
<h1>${esc(spec.title)}</h1>
${spec.intent ? `<p>${esc(spec.intent)}</p>` : ""}
<pre role="img" aria-label="${esc(summary)}">${esc(stillGrid(make, still).toText())}</pre>
<button type="button" hidden data-play aria-pressed="true">Still</button>
${isSample(spec.source) ? `<p class="stamp">Sample data: made up to show the idea, not real numbers</p>` : ""}
${spec.source ? `<p>Source: ${esc(spec.source)}</p>` : ""}
</figure>
<script type="module">
${inlineMotion([spec.kind])}
const spec = ${JSON.stringify(spec).replace(/</g, "\\u003c")};
const { make, still } = animate(spec);
const pre = document.querySelector("pre");
const button = document.querySelector("[data-play]");
let stop = autoplay(pre, make, still);
button.hidden = false;
button.addEventListener("click", () => {
  if (stop) { stop(); stop = null; } else stop = autoplay(pre, make, still);
  button.textContent = stop ? "Still" : "Play";
  button.setAttribute("aria-pressed", String(Boolean(stop)));
});
</script>
</body>
</html>
`;
}
