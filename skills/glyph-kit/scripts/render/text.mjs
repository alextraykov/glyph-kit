// Text fidelity: the diagram itself, plus Markdown with its title, source and a sentence for screen readers.
import { isSample, stamp } from "../guard.mjs";
import { resolve } from "../registry.mjs";
import { compact as toAscii } from "../tokens.mjs";
import { stillGrid } from "../motion/shared.mjs";

/** The diagram as plain text. Made-up data carries a SAMPLE DATA stamp in the figure itself. */
export function body(spec, resolved) {
  const def = typeof resolved?.render === "function" ? resolved : resolve(spec);
  const options = { ...spec.options, ...(spec.lang ? { lang: spec.lang } : {}), ...(def.layout ? { source: spec.source, draw: drawInside } : {}) };
  const moving = spec.motion && def.motion ? def.motion(def.data, options) : null;
  const text = moving ? stillGrid(moving.make, moving.still).toText() : def.render(def.data, options);
  return isSample(spec.source) ? stamp(text) : text;
}

/** A figure inside a layout: it uses the layout's source unless it has its own, and is stamped
 *  only for its own made-up data (the layout stamps itself once). */
export const drawInside = (spec, source) => body(spec, resolve({ ...spec, source: spec.source ?? source }));

/** A sentence describing the figure: the spec's own label, or one built from its data. */
export function label(spec) {
  if (spec.label) return spec.label;
  const def = resolve(spec);
  const summary = def.summary ? def.summary(def.data, { ...spec.options, ...(spec.lang ? { lang: spec.lang } : {}) }) : "";
  return [spec.title ?? def.label, summary].filter(Boolean).join(". ").replace(/\.\./g, ".");
}

/** Text with an optional title line above and source line below. `compact` swaps shades and box
 *  characters for plain ASCII, for figures that go into a model's context. */
export function renderText(spec, { meta = true, compact = false } = {}) {
  const lines = [];
  if (meta && spec.title) lines.push(spec.title, "");
  lines.push(compact ? toAscii(body(spec)) : body(spec));
  if (meta && spec.source) lines.push("", `Source: ${spec.source}`);
  return lines.join("\n");
}

/** Markdown: heading, intent, the figure in a text block, the description and the source; `withSpec`
 *  adds the spec in a <details> block after it. */
export function renderMarkdown(spec, { level = 3, compact = false, withSpec = false } = {}) {
  const out = [];
  if (spec.title) out.push(`${"#".repeat(level)} ${spec.title}`, "");
  if (spec.intent) out.push(spec.intent, "");
  out.push("```text", compact ? toAscii(body(spec)) : body(spec), "```", "");
  out.push(`*${label(spec)}*`);
  if (spec.source) out.push("", `Source: ${spec.source}`);
  // The spec beside the figure, so `glyph-kit redraw` can draw it again in place.
  if (withSpec) out.push("", `<details><summary>Spec</summary>\n\n\`\`\`json\n${JSON.stringify(spec, null, 2)}\n\`\`\`\n\n</details>`);
  return out.join("\n");
}
