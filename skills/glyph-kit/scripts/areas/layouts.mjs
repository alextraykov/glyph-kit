// Document layouts: named pages that place existing figures and short text in fixed slots.
// The agent fills the slots; code places and sizes everything. Figures keep their spec order and
// sit side by side only when they fit in 80 cells with a 4-cell gap; everything else stacks, with a
// blank row between rows so marks never touch. compose() gives the blocks, which the text form
// below and the page renderer (render/page.mjs) both draw, so the two always agree.
// Figures are drawn through `draw(spec, source)`, passed in by render/text.mjs, so this module
// imports nothing that imports the registry.
import { LAYOUT, capRows } from "../layout.mjs";
import { readingOrder } from "../arrive.mjs";
import { cut, padEnd, upper, width, wrap } from "../text.mjs";

const W = LAYOUT.maxWidth;
const GAP = LAYOUT.gap;
const PER_ROW = 3;
export const PAGE_ROWS = 80;
const LINE_ROWS = 3;
const LIST_MAX = 5;

/**
 * Each layout's slots, in drawing order. Types:
 *   line     one sentence (up to three lines at 80 cells)
 *   list     short lines, up to `max`; marks: number, arrow, dot, cross
 *   figures  specs, packed into rows in order
 *   pair     two single specs (`names`), side by side when both fit
 * `heading: false` slots open the page and carry no heading rule.
 */
export const SLOTS = {
  readout: [
    { name: "headline", type: "line", required: true, heading: false },
    { name: "summary", type: "list", max: 3, mark: "number", heading: "Summary" },
    { name: "evidence", type: "figures", required: true, max: 4, heading: "Evidence" },
    { name: "next", type: "list", mark: "arrow", heading: "Next" }
  ],
  dashboard: [
    { name: "tiles", type: "figures", required: true, min: 2, max: 6, heading: false },
    { name: "note", type: "line", heading: false }
  ],
  prSummary: [
    { name: "change", type: "line", required: true, heading: false },
    { name: "before", type: "pair", names: ["before", "after"], captions: ["Before", "After"], heading: "Before and after" },
    { name: "checks", type: "figures", max: 2, heading: "Checks" },
    { name: "risks", type: "list", mark: "dot", heading: "Risks" }
  ],
  designReview: [
    { name: "question", type: "line", required: true, heading: false },
    { name: "options", type: "figures", required: true, min: 2, max: 3, heading: "Options" },
    { name: "recommendation", type: "line", heading: "Recommendation" },
    { name: "open", type: "list", mark: "dot", heading: "Open questions" }
  ],
  statusUpdate: [
    { name: "period", type: "line", required: true, heading: false },
    { name: "progress", type: "figures", max: 2, heading: "Progress" },
    { name: "done", type: "list", mark: "dot", heading: "Done" },
    { name: "next", type: "list", mark: "arrow", heading: "Next" },
    { name: "blocked", type: "list", mark: "cross", heading: "Blocked" }
  ]
};

const MARKS = { number: (i) => `${i + 1}  `, arrow: () => "→  ", dot: () => "·  ", cross: () => "x  " };
const fieldsOf = (slots) => slots.flatMap((s) => s.names ?? [s.name]);
const isSpec = (v) => v && typeof v === "object" && !Array.isArray(v) && typeof v.kind === "string";

/** Problems with a layout's data, as sentences. */
export function checkSlots(layout, data) {
  const slots = SLOTS[layout];
  if (!data || typeof data !== "object" || Array.isArray(data)) return [`A ${layout} takes an object with its slots: ${fieldsOf(slots).join(", ")}.`];
  const known = new Set([...fieldsOf(slots), "headings"]);
  const problems = [];
  const unknown = Object.keys(data).filter((k) => !known.has(k));
  if (unknown.length) problems.push(`A ${layout} has no slot called ${unknown.map((k) => `"${k}"`).join(", ")}. Its slots are ${fieldsOf(slots).join(", ")}.`);
  for (const slot of slots) {
    for (const name of slot.names ?? [slot.name]) {
      const v = data[name];
      if (v == null || v === "") {
        if (slot.required) problems.push(`A ${layout} needs "${name}".`);
        continue;
      }
      if (slot.type === "line" && typeof v !== "string") problems.push(`"${name}" is one sentence of text.`);
      if (slot.type === "list" && !(Array.isArray(v) && v.every((x) => typeof x === "string"))) problems.push(`"${name}" is a list of short lines of text.`);
      if (slot.type === "figures" && !(Array.isArray(v) && v.every(isSpec))) problems.push(`"${name}" is a list of figure specs, each with a kind and data.`);
      if (slot.type === "figures" && Array.isArray(v) && slot.required && !v.length) problems.push(`A ${layout} needs at least one figure in "${name}".`);
      if (slot.type === "figures" && Array.isArray(v) && slot.min && v.length < slot.min) problems.push(`A ${layout} needs at least ${slot.min} figures in "${name}"; it has ${v.length}.`);
      if (slot.type === "pair" && !isSpec(v)) problems.push(`"${name}" is one figure spec with a kind and data.`);
    }
  }
  return problems;
}

/** One figure at its natural width (80 at most). Figures are never squeezed to fit beside
 *  another: a narrower draw can lose its scale or labels, so a wide figure takes its own row. */
function drawFigure(spec, { source, lang, slot, draw }) {
  if (LAYOUT_KINDS.has(spec.kind)) throw new Error(`"${slot}" holds a ${spec.kind}; a layout can't go inside another layout. Put its figures in directly.`);
  try {
    return draw(lang && !spec.lang ? { ...spec, lang } : spec, source);
  } catch (error) {
    // A kind that fails on extreme sizes (a width of a trillion cells) still answers in words.
    if (!(error instanceof Error) || error.constructor !== Error) throw new Error(`In "${slot}": the ${spec.kind} can't be drawn with these numbers; check its data and options.`);
    throw new Error(`In "${slot}": ${error.message}`);
  }
}

/** Figures into rows, in spec order: the next one joins the row if it still fits in 80 cells. */
export function pack(items) {
  const rows = [];
  for (const item of items) {
    const row = rows.at(-1);
    const used = row ? row.reduce((sum, it) => sum + it.w, 0) + GAP * row.length : Infinity;
    if (row && row.length < PER_ROW && used + item.w <= W) row.push(item);
    else rows.push([item]);
  }
  return rows;
}

function figureItem(spec, text, caption) {
  const lines = text.split("\n");
  const w = Math.max(...lines.map(width));
  // A caption never widens its column past the figure, except for very narrow figures.
  const room = Math.min(W, Math.max(w, 16));
  return { spec, lines, caption: caption ? cut(caption, room) : "", w: Math.max(w, caption ? Math.min(width(caption), room) : 0) };
}

/** The layout as blocks: lead, heading, line, list, figures and sources. */
export function compose(layout, data, { source, lang, draw } = {}) {
  const slots = SLOTS[layout];
  const headings = data.headings ?? {};
  const blocks = [];
  const sources = [];
  const note = (spec) => {
    const s = String(spec.source ?? "").trim();
    if (s && s !== String(source ?? "").trim() && !sources.includes(s)) sources.push(s);
  };
  for (const slot of slots) {
    const value = data[slot.name];
    const heading = slot.heading === false ? null : headings[slot.name] ?? slot.heading;
    let block = null;
    if (slot.type === "line" && value) {
      const lines = wrap(value, W, lang);
      if (lines.length > LINE_ROWS) throw new Error(`"${slot.name}" runs to ${lines.length} lines at ${W} cells; keep it to one sentence of ${LINE_ROWS} lines or fewer.`);
      block = { type: slot === slots[0] ? "lead" : "line", slot: slot.name, text: value, lines };
    } else if (slot.type === "list" && value?.length) {
      const capped = capRows(value, slot.max ?? LIST_MAX, "items");
      block = { type: "list", slot: slot.name, mark: slot.mark, items: capped.rows, more: capped.note };
    } else if (slot.type === "figures" && value?.length) {
      const capped = capRows(value, slot.max, "figures");
      const items = capped.rows.map((spec) => (note(spec), figureItem(spec, drawFigure(spec, { source, lang, draw, slot: slot.name }), spec.title)));
      block = { type: "figures", slot: slot.name, rows: pack(items), more: capped.note };
    } else if (slot.type === "pair" && slot.names.some((n) => data[n])) {
      const items = slot.names
        .map((name, i) => [data[name], slot.captions[i]])
        .filter(([spec]) => spec)
        .map(([spec, fallback]) => (note(spec), figureItem(spec, drawFigure(spec, { source, lang, draw, slot: slot.names.join(" and ") }), spec.title ?? fallback)));
      block = { type: "figures", slot: slot.name, rows: pack(items), more: "" };
    }
    if (!block) continue;
    if (heading) blocks.push({ type: "heading", slot: slot.name, text: heading });
    blocks.push(block);
  }
  if (sources.length) blocks.push({ type: "sources", list: sources });
  return blocks;
}

const rule = (text, lang) => {
  const label = cut(upper(text, lang), W - 4);
  return `${label} ${"─".repeat(W - width(label) - 1)}`;
};

function listLines(block, lang) {
  return block.items.flatMap((item, i) => {
    const mark = MARKS[block.mark](i);
    const pad = " ".repeat(width(mark));
    return wrap(item, W - width(mark), lang).map((line, k) => (k ? pad : mark) + line);
  }).concat(block.more ? [block.more] : []);
}

function rowLines(row) {
  const out = [];
  const join = (cells) => cells.map((c, i) => (i < row.length - 1 ? padEnd(c, row[i].w) : c)).join(" ".repeat(GAP)).replace(/\s+$/, "");
  if (row.some((it) => it.caption)) out.push(join(row.map((it) => it.caption)), "");
  const h = Math.max(...row.map((it) => it.lines.length));
  for (let y = 0; y < h; y++) out.push(join(row.map((it) => it.lines[y] ?? "")));
  return out;
}

/** The blocks as text. */
export function blocksText(blocks, lang) {
  const parts = blocks.map((b) => {
    if (b.type === "heading") return [rule(b.text, lang)];
    if (b.type === "lead" || b.type === "line") return b.lines;
    if (b.type === "list") return listLines(b, lang);
    if (b.type === "figures") return b.rows.flatMap((row, i) => [...(i ? [""] : []), ...rowLines(row)]).concat(b.more ? ["", b.more] : []);
    if (b.type === "sources") return wrap(`Sources: ${b.list.join("; ")}`, W, lang);
    return [];
  });
  return parts.map((p) => p.join("\n")).join("\n\n");
}

const LABELS = { readout: "Readout", dashboard: "Dashboard", prSummary: "PR summary", designReview: "Design review", statusUpdate: "Status update" };
export const LAYOUT_KINDS = new Set(Object.keys(SLOTS));

const make = (layout) => ({
  label: LABELS[layout],
  layout: true,
  check: (data) => checkSlots(layout, data),
  // A page arrives in reading order, block by block, within the 600ms budget.
  arrive: readingOrder,
  render: (data, { source, lang, draw } = {}) => {
    const text = blocksText(compose(layout, data, { source, lang, draw }), lang);
    const rows = text.split("\n").length;
    if (rows > PAGE_ROWS) throw new Error(`This ${LABELS[layout].toLowerCase()} is ${rows} rows; ${PAGE_ROWS} fit on one page. Move a figure out, or use a report for longer documents.`);
    return text;
  },
  summary: (data) => {
    const lead = SLOTS[layout].filter((s) => s.type === "line").map((s) => data[s.name]).find((v) => typeof v === "string" && v);
    const figures = SLOTS[layout].filter((s) => s.type === "figures" || s.type === "pair").flatMap((s) => (s.names ?? [s.name]).flatMap((n) => [data[n]].flat().filter(isSpec)));
    return `${lead ?? ""} ${figures.length} figure${figures.length === 1 ? "" : "s"}${figures.length ? `: ${figures.map((f) => f.title ?? f.kind).join(", ")}` : ""}.`.trim();
  }
});

export const kinds = Object.fromEntries(Object.keys(SLOTS).map((layout) => [layout, make(layout)]));

/** True when a spec is a document layout. */
export const isLayout = (spec) => LAYOUT_KINDS.has(spec?.kind);
