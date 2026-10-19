// Text fidelity: the diagram itself, plus Markdown with its title, source and a sentence for screen readers.
import { isSample, stamp } from "../guard.mjs";
import { resolve } from "../registry.mjs";
import { compact as toAscii } from "../tokens.mjs";

/** The diagram as plain text. Made-up data carries a SAMPLE DATA stamp in the figure itself. */
export function body(spec) {
  const text = resolve(spec).render(spec.data, spec.options ?? {});
  return isSample(spec.source) ? stamp(text) : text;
}

/** A sentence describing the figure: the spec's own label, or one built from its data. */
export function label(spec) {
  if (spec.label) return spec.label;
  const def = resolve(spec);
  const summary = def.summary ? def.summary(spec.data) : "";
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

/** Markdown: heading, intent, the figure in a text block, the description and the source. */
export function renderMarkdown(spec, { level = 3, compact = false } = {}) {
  const out = [];
  if (spec.title) out.push(`${"#".repeat(level)} ${spec.title}`, "");
  if (spec.intent) out.push(spec.intent, "");
  out.push("```text", compact ? toAscii(body(spec)) : body(spec), "```", "");
  out.push(`*${label(spec)}*`);
  if (spec.source) out.push("", `Source: ${spec.source}`);
  return out.join("\n");
}
