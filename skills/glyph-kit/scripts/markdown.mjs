// Figures in a Markdown file that keep their spec, so they can be drawn again in place.
// A figure is a ```text fence with its spec either right after it, in
//   <details><summary>Spec</summary> ```json … ``` </details>
// (after the description and source lines renderMarkdown writes), or in a file named on the line
// above the fence: <!-- glyph-kit: specs/funnel.json -->. Everything else in the file is left as it is.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadData } from "./data.mjs";
import { body, label } from "./render/text.mjs";
import { compact as toAscii } from "./tokens.mjs";
import { readBack } from "./read.mjs";

const SPEC_OPEN = "<details><summary>Spec</summary>";
const REF = /^<!--\s*glyph-kit:\s*(\S+)\s*-->$/;

/**
 * Every figure in the file that has a spec: where its fence and spec are, its text and its spec.
 * Lines are 0-based. `file` resolves spec paths and @data files.
 */
export function figures(source, file = "") {
  const lines = source.split("\n");
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    // A longer fence (```` or more) shows Markdown as an example; nothing inside it is a figure.
    const outer = lines[i].match(/^(`{4,}|~{3,})/);
    if (outer) {
      const close = lines.findIndex((l, k) => k > i && l.startsWith(outer[1]) && !l.slice(outer[1].length).trim());
      i = close < 0 ? lines.length : close;
      continue;
    }
    if (lines[i] !== "```text") continue;
    const end = lines.indexOf("```", i + 1);
    if (end < 0) break;
    const figure = { start: i, end, text: lines.slice(i + 1, end).join("\n") };
    const ref = lines[i - 1]?.match(REF);
    if (ref) figure.path = join(dirname(file), ref[1]);
    // After the fence: blank lines, the description in *…*, a Source line, then the spec block.
    let j = end + 1;
    while (j < lines.length && (lines[j] === "" || /^\*.*\*$/.test(lines[j]) || lines[j].startsWith("Source: "))) {
      if (/^\*.*\*$/.test(lines[j]) && figure.labelLine === undefined) figure.labelLine = j;
      j++;
    }
    if (!figure.path && lines[j] === SPEC_OPEN) {
      const open = lines.indexOf("```json", j);
      const close = lines.indexOf("```", open + 1);
      if (open > j && close > open) {
        figure.spec = { start: open + 1, end: close };
        figure.json = lines.slice(open + 1, close).join("\n");
      }
    }
    if (figure.path || figure.spec) found.push(figure);
    i = end;
  }
  return found;
}

/** A figure's spec, read from its block or its file, with @data loaded. Throws in plain words. */
export function specOf(figure, file = "") {
  const where = figure.path ?? file;
  const raw = figure.path ? readFileSync(figure.path, "utf8") : figure.json;
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (e) {
    throw new Error(`The spec at line ${(figure.spec?.start ?? figure.start) + 1} isn't valid JSON: ${e.message}`);
  }
  return loadData(spec, dirname(where));
}

// A figure drawn with --compact stays compact: plain ASCII in, plain ASCII out.
const draw = (spec, previous) => (/^[\x00-\x7f]*$/.test(previous) ? toAscii(body(spec)) : body(spec));

/**
 * Draw every figure again from its spec. Returns { source, changed: [line], problems: [{ line, message }] }.
 * Only a figure's text fence and its description line change.
 */
export function redraw(source, file = "") {
  const lines = source.split("\n");
  const changed = [];
  const problems = [];
  // From the end, so earlier line numbers stay put while later fences change length.
  for (const figure of figures(source, file).reverse()) {
    try {
      const spec = specOf(figure, file);
      const text = draw(spec, figure.text);
      if (figure.labelLine !== undefined) lines[figure.labelLine] = `*${label(spec)}*`;
      if (text !== figure.text) {
        lines.splice(figure.start + 1, figure.end - figure.start - 1, ...text.split("\n"));
        changed.unshift(figure.start + 1);
      }
    } catch (e) {
      problems.unshift({ line: figure.start + 1, message: e.message });
    }
  }
  return { source: lines.join("\n"), changed, problems };
}

/**
 * Read edited drawings back into their specs. A figure whose text no longer matches its spec is read
 * back; its inline spec or spec file is rewritten. Returns { source, read: [line], problems, files: [path] }.
 */
export function readEdits(source, file = "") {
  const lines = source.split("\n");
  const read = [];
  const problems = [];
  const files = [];
  for (const figure of figures(source, file).reverse()) {
    try {
      const spec = specOf(figure, file);
      if (draw(spec, figure.text) === figure.text) continue;
      const raw = figure.path ? JSON.parse(readFileSync(figure.path, "utf8")) : JSON.parse(figure.json);
      if (typeof raw.data === "string") throw new Error(`Its data comes from ${raw.data.slice(1)}; edit that file instead.`);
      if (/^[\x00-\x7f]*$/.test(figure.text)) throw new Error("A compact figure can't be read back. Change its spec, then redraw it.");
      const next = readBack(spec, figure.text);
      const updated = { ...raw, data: next.data };
      if (figure.path) {
        writeFileSync(figure.path, JSON.stringify(updated, null, 2) + "\n");
        files.push(figure.path);
      } else lines.splice(figure.spec.start, figure.spec.end - figure.spec.start, ...JSON.stringify(updated, null, 2).split("\n"));
      if (figure.labelLine !== undefined) lines[figure.labelLine] = `*${label(next)}*`;
      // The drawing is tidied to how the kit draws the new spec.
      lines.splice(figure.start + 1, figure.end - figure.start - 1, ...body(next).split("\n"));
      read.unshift(figure.start + 1);
    } catch (e) {
      problems.unshift({ line: figure.start + 1, message: e.message });
    }
  }
  return { source: lines.join("\n"), read, problems, files };
}
