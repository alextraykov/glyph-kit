// Every problem with a spec at once: its data, its drawing and the figure's text. Drawing a spec
// stops at the first problem; check keeps going, so a spec can be fixed in one pass, not one per draw.
import { KINDS } from "./registry.mjs";
import { hasNumbers, ownColour } from "./guard.mjs";
import { body } from "./render/text.mjs";
import { lintBlock } from "./lint.mjs";
import { cutLog } from "./text.mjs";
import { figures, specOf } from "./markdown.mjs";
import { compact as toAscii } from "./tokens.mjs";
import { ROLES, resolveTheme } from "./render/themes.mjs";

/** Problems with a theme: a contrast refusal is a problem; a rule of how its colours relate is a note. */
export function checkTheme(theme) {
  try {
    return resolveTheme(theme).warnings.map((message) => ({ level: "warn", message }));
  } catch (e) {
    return [{ level: "error", message: e.message }];
  }
}

const THEME_KEYS = new Set([...ROLES, "base", "mixed", "ramp"]);
/** A file that holds only a theme: { base?, mixed?, <role>?, ramp? }. */
const isTheme = (doc) => doc && typeof doc === "object" && !Array.isArray(doc) && !doc.kind && Object.keys(doc).length > 0 && Object.keys(doc).every((k) => THEME_KEYS.has(k));

/** Problems with one spec: [{ level: "error" | "warn", message }]. `lint: false` skips the figure's text. */
export function checkSpec(spec, { lint = true } = {}) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return [{ level: "error", message: "A spec must be an object with a kind and data." }];
  const def = KINDS[spec.kind];
  if (!def) return [{ level: "error", message: `Unknown type "${spec.kind}". Run "glyph-kit types" to see them all.` }];
  if (spec.data === undefined) return [{ level: "error", message: `The ${spec.kind} spec has no data.` }];
  const problems = [];
  const error = (message) => problems.push({ level: "error", message });
  if (typeof spec.data === "string") return [{ level: "error", message: `Its data comes from ${spec.data.slice(1)}, which hasn't been loaded. Check it with the command line, which reads the file.` }];
  const data = def.normalize ? def.normalize(spec.data) : spec.data;
  if (!def.layout && !def.wireframe && hasNumbers(data) && !String(spec.source ?? "").trim())
    error('It has numbers but no source. Say where they came from in "source", or start it with "Illustrative" if they\'re made up.');
  const coloured = ownColour(data);
  if (coloured) error(`It sets its own colour at ${coloured}. Colour follows meaning: use the theme's roles and take the colour out.`);
  let checked = [];
  try {
    checked = def.check ? def.check(data).filter(Boolean) : [];
  } catch (e) {
    checked = [e.message];
  }
  checked.forEach(error);
  if (spec.theme != null) problems.push(...checkTheme(spec.theme).map((p) => ({ ...p, message: `Its theme: ${p.message}` })));
  if (checked.length) return problems;
  cutLog.clear();
  let text;
  try {
    text = body({ ...spec, data: spec.data, source: spec.source || "Illustrative" });
  } catch (e) {
    error(e.message.replace(/^(".*?"|This [^:]+): /, ""));
    return problems;
  }
  for (const [label, cells] of cutLog) problems.push({ level: "warn", message: `"${label}" is cut to ${cells} cells. Shorten it, or the figure shows it with "…".` });
  if (lint) for (const p of lintBlock(text)) problems.push({ level: p.level === "warn" ? "warn" : "error", message: `Line ${p.line} of the figure: ${p.message}.` });
  return problems;
}

/** Problems with a spec or a list of specs, each named by its title or its place in the list; with a
 *  deck's or report's figures and theme; or with a theme file on its own. `theme` checks one more. */
export function checkDoc(doc, { theme } = {}) {
  const extra = theme != null ? checkTheme(theme).map((p) => ({ ...p, where: "The theme" })) : [];
  if (isTheme(doc)) return [...checkTheme(doc).map((p) => ({ ...p, where: "The theme" })), ...extra];
  if (doc?.slides || doc?.sections) {
    const figures = doc.slides ? doc.slides.filter((s) => s?.kind) : doc.sections.flatMap((s) => s.figures ?? []);
    const own = doc.theme != null ? checkTheme(doc.theme).map((p) => ({ ...p, where: `The ${doc.slides ? "deck" : "report"}'s theme` })) : [];
    return [...own, ...extra, ...(figures.length ? checkDoc(figures) : [])];
  }
  const specs = [doc].flat();
  return specs.flatMap((spec, i) => {
    const where = spec?.title ? `"${spec.title}"` : specs.length > 1 ? `Spec ${i + 1}` : "The spec";
    return checkSpec(spec).map((p) => ({ ...p, where }));
  }).concat(extra);
}

/** Problems with every figure in a Markdown file that keeps its spec, and with every text block. */
export function checkMarkdown(source, file = "") {
  const out = [];
  for (const figure of figures(source, file)) {
    const where = `Line ${figure.start + 1}`;
    let spec;
    try {
      spec = specOf(figure, file);
    } catch (e) {
      out.push({ level: "error", where, message: e.message });
      continue;
    }
    const problems = checkSpec(spec, { lint: false });
    out.push(...problems.map((p) => ({ ...p, where })));
    if (!problems.some((p) => p.level === "error")) {
      const drawn = /^[\x00-\x7f]*$/.test(figure.text) ? toAscii(body(spec)) : body(spec);
      if (drawn !== figure.text) out.push({ level: "error", where, message: "The figure doesn't match its spec. Run redraw if the spec changed, or read if the drawing was edited." });
    }
  }
  const re = /```text\n([\s\S]*?)```/g;
  for (let m; (m = re.exec(source)); ) {
    const offset = source.slice(0, m.index).split("\n").length;
    for (const p of lintBlock(m[1].replace(/\n$/, ""), offset)) out.push({ level: p.level === "warn" ? "warn" : "error", where: `Line ${p.line}`, message: `${p.message}.` });
  }
  return out;
}

/** Problems as lines for the terminal, errors first. */
export const report = (problems) =>
  [...problems.filter((p) => p.level === "error"), ...problems.filter((p) => p.level !== "error")]
    .map((p) => `${p.level === "error" ? "problem" : "note   "}  ${p.where}: ${p.message}`)
    .join("\n");
