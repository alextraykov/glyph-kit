// MDX fidelity. Two modes:
//   "static"    plain MDX: headings, prose and each figure as a text block. Works in any MDX setup.
//   "component" each figure as <Glyph spec={…} /> rendered at build time by the component in
//               templates/mdx (Glyph.astro for Astro, Glyph.jsx for React/Next.js), so pages get the
//               crisp SVG and the colours while the spec stays in the document.
import { resolve } from "../registry.mjs";
import { body, label } from "./text.mjs";

// Prose in MDX is JSX-aware: braces and angle brackets must be escaped.
const prose = (s) => String(s ?? "").replace(/[{}<>]/g, (c) => `\\${c}`);

function figureMdx(spec, mode, theme, n) {
  const title = spec.title ?? resolve(spec).label;
  if (mode === "component") {
    const { title: _t, intent, source, ...rest } = spec;
    const props = JSON.stringify({ ...rest, title, ...(intent ? { intent } : {}), ...(source ? { source } : {}) }, null, 2);
    return `<Glyph theme="${theme}" spec={${props}} />\n`;
  }
  return [
    `**${n ? `Figure ${n}. ` : ""}${prose(title)}**`,
    "",
    spec.intent ? `${prose(spec.intent)}\n` : "",
    "```text",
    body(spec),
    "```",
    "",
    `*${prose(label(spec))}*`,
    spec.source ? `\nSource: ${prose(spec.source)}` : "",
    ""
  ].join("\n");
}

const frontmatter = (fields) =>
  `---\n${Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n")}\n---\n`;

/** A spec, a list of specs, or a report as MDX. */
export function renderMdx(doc, { mode = "static", theme = "paper", importPath = "./Glyph.astro" } = {}) {
  const head = mode === "component" ? `\nimport Glyph from "${importPath}";\n` : "";
  if (doc.sections) {
    const out = [frontmatter({ title: doc.title, description: doc.subtitle, author: doc.author, date: doc.date }), head];
    if (doc.summary?.length) out.push("## In short\n", ...doc.summary.map((s, i) => `${i + 1}. ${prose(s)}`), "");
    let n = 0;
    for (const s of doc.sections) {
      out.push(`## ${prose(s.title)}\n`);
      if (s.takeaway) out.push(`**${prose(s.takeaway)}**\n`);
      for (const t of s.text ?? []) out.push(`${prose(t)}\n`);
      for (const spec of s.figures ?? []) out.push(figureMdx(spec, mode, doc.theme ?? theme, ++n));
      if (s.note) out.push(`> ${prose(s.note)}\n`);
    }
    return out.join("\n");
  }
  const specs = Array.isArray(doc) ? doc : [doc];
  return [frontmatter({ title: specs.length === 1 ? specs[0].title : undefined }), head, ...specs.map((s) => figureMdx(s, mode, theme, specs.length > 1 ? 0 : 0))].join("\n");
}
