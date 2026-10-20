// Handoff and design QA: spacing redlines, checklists, before and after.
import { checks } from "../guard.mjs";
import { cells, center, compare, compareColumns, cut, join, len, padEnd } from "../core.mjs";
import { LAYOUT, capRows } from "../layout.mjs";
import { byColumns } from "../arrive.mjs";

/**
 * Spacing callouts across a row: │◄ 16 ►│◄─── content 320 ───►│◄ 16 ►│
 * segments: [{ label, size }] — each segment's width is proportional to size, never narrower than its label.
 */
export function redline(segments, { width = 48, maxWidth = LAYOUT.maxWidth } = {}) {
  if (segments.length * 6 + 1 > maxWidth) throw new Error(`A spacing redline fits at most ${Math.floor((maxWidth - 1) / 6)} segments at ${maxWidth} cells; this one has ${segments.length}.`);
  const total = segments.reduce((a, s) => a + s.size, 0) || 1;
  const room = Math.min(width, maxWidth - segments.length - 1);
  const parts = segments.map((s) => {
    const share = Math.max(5, Math.round((s.size / total) * room));
    const label = cut(s.label, LAYOUT.labelMax);
    const w = Math.max(len(label) + 4, share);
    return `◄${center(` ${label} `, w - 2, "─")}►`;
  });
  const result = `│${parts.join("│")}│`;
  if (len(result) > maxWidth) throw new Error(`These spacing labels need more than ${maxWidth} cells; use fewer segments or shorter labels.`);
  return result;
}

/** Natural width of one part box: its name with two cells of padding each side, or its marker. */
const partWidth = (label, marker) => Math.max(len(label) + 6, len(marker) + 5);
const ANATOMY_GAP = 2; // cells between parts side by side: they touch in the component, no arrow between

/** Part widths for the row form: each part at least its name, stretched toward its share of `size`. */
function anatomyRow(parts, { width = 44, maxWidth = LAYOUT.maxWidth } = {}) {
  const labels = parts.map((p) => cut(p.label, LAYOUT.labelMax));
  const natural = labels.map((l, i) => partWidth(l, String(i + 2)));
  const room = maxWidth - 6 - ANATOMY_GAP * (parts.length - 1);
  const sizes = parts.map((p) => (typeof p.size === "number" ? p.size : 0));
  const total = sizes.reduce((a, b) => a + b, 0);
  const target = Math.min(room, Math.max(width, natural.reduce((a, b) => a + b, 0)));
  const widths = natural.map((n, i) => (total ? Math.max(n, Math.round((sizes[i] / total) * target)) : n));
  // Rounding can overshoot the room: the widest stretched parts give back a cell at a time.
  while (widths.reduce((a, b) => a + b, 0) > room) {
    const i = widths.reduce((best, w, k) => (w > natural[k] && (best < 0 || w > widths[best]) ? k : best), -1);
    if (i < 0) break;
    widths[i]--;
  }
  return { labels, widths, need: natural.reduce((a, b) => a + b, 0) + 6 + ANATOMY_GAP * (parts.length - 1) };
}

/** One part's box, top to bottom: marker on the top edge, name inside, dashed when optional. */
function partBox(label, marker, w, { optional = false, extra = 0 } = {}) {
  const [h, v] = optional ? ["┄", "┆"] : ["─", "│"];
  return [
    `┌ ${marker} ${h.repeat(w - 4 - len(marker))}┐`,
    `${v}  ${padEnd(label, w - 6)}  ${v}`,
    ...Array.from({ length: extra }, () => `${v}${" ".repeat(w - 2)}${v}`),
    `└${h.repeat(w - 2)}┘`
  ];
}

/**
 * A component's anatomy: the container drawn with its parts inside, each part numbered on its edge,
 * then a legend of what each number is. Optional parts have dashed edges.
 * data: { direction?: "row"|"column", container: { label, spec? }, parts: [{ label, spec?, optional?, size? }] }
 * In a row, size is each part's share of the width; in a column, the lines of room inside it (1–4).
 */
export function anatomy(data, { width = 44, maxWidth = LAYOUT.maxWidth } = {}) {
  const { parts } = data;
  const container = { label: "Container", ...data.container };
  const column = data.direction === "column";
  const drawing = [];
  if (column) {
    const labels = parts.map((p) => cut(p.label, LAYOUT.labelMax));
    const w = Math.min(maxWidth - 6, Math.max(30, ...labels.map((l, i) => partWidth(l, String(i + 2)))));
    drawing.push(`┌ 1 ${"─".repeat(w + 4 - 3)}┐`);
    parts.forEach((p, i) => {
      const extra = Math.min(3, Math.max(0, Math.round(p.size ?? 1) - 1));
      for (const line of partBox(labels[i], String(i + 2), w, { optional: p.optional, extra })) drawing.push(`│  ${line}  │`);
    });
    drawing.push(`└${"─".repeat(w + 4)}┘`);
  } else {
    const { labels, widths } = anatomyRow(parts, { width, maxWidth });
    const boxes = parts.map((p, i) => partBox(labels[i], String(i + 2), widths[i], { optional: p.optional }));
    const inner = widths.reduce((a, b) => a + b, 0) + ANATOMY_GAP * (parts.length - 1) + 4;
    drawing.push(`┌ 1 ${"─".repeat(inner - 3)}┐`);
    for (let r = 0; r < 3; r++) drawing.push(`│  ${boxes.map((b) => b[r]).join(" ".repeat(ANATOMY_GAP))}  │`);
    drawing.push(`└${"─".repeat(inner)}┘`);
  }
  // The legend: number, name, spec, and the word optional where it applies.
  const rows = [container, ...parts];
  const names = rows.map((p) => cut(p.label, LAYOUT.labelMax));
  const nameW = Math.max(...names.map(len));
  const anyOptional = parts.some((p) => p.optional);
  const specRoom = maxWidth - 3 - nameW - 2 - (anyOptional ? 10 : 0);
  const specs = rows.map((p) => cut(p.spec ?? "", specRoom));
  const specW = Math.max(0, ...specs.map(len));
  const legend = rows.map((p, i) => `${i + 1}  ${padEnd(names[i], nameW)}  ${padEnd(specs[i], specW)}${p.optional ? "  optional" : ""}`);
  return join([...drawing, "", ...legend, ...(anyOptional ? ["", "┄ dashed edge: an optional part"] : [])]);
}

/** What can't be true of an anatomy, in plain words. */
function anatomyCheck(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["An anatomy needs data as { container, parts }."];
  const parts = Array.isArray(d.parts) ? d.parts : [];
  if (d.direction !== undefined && d.direction !== "row" && d.direction !== "column") return [`Direction is "${d.direction}"; use "row" or "column".`];
  if (parts.length < 2) return ["An anatomy names at least 2 parts inside the container; with one, write it in a sentence."];
  if (parts.length > 8) return [`This anatomy has ${parts.length} parts; at most 8 keep the markers to one digit and the legend readable. Group small parts, or draw a part's own anatomy separately.`];
  const nameless = parts.findIndex((p) => !String(p?.label ?? "").trim());
  if (nameless >= 0) return [`Part ${nameless + 2} has no name; every number needs one.`];
  const seen = new Set();
  const twice = parts.find((p) => (seen.has(p.label) ? true : (seen.add(p.label), false)));
  if (twice) return [`Two parts are called "${twice.label}"; give each number its own name.`];
  const bad = parts.find((p) => p.size !== undefined && !(typeof p.size === "number" && p.size > 0));
  if (bad) return [`${bad.label} has a size of ${bad.size}; a size is a number above zero.`];
  if (d.direction !== "column") {
    const { need } = anatomyRow(parts);
    if (need > LAYOUT.maxWidth) return [`These ${parts.length} parts need ${need} cells side by side; ${LAYOUT.maxWidth} fit. Shorten the part names, or set direction to "column".`];
  }
  return [];
}

const STATUS = { done: "█ done       ", progress: "▒ in progress", todo: "  to do      ", blocked: "x blocked    " };

/** A QA checklist on the status ladder, with a summary. items: [{ text, status, note? }] */
export function qaChecklist(items) {
  const capped = capRows(items, LAYOUT.rowsMax, "items");
  const done = items.filter((i) => i.status === "done").length;
  const rows = capped.rows.map((i) => cut(`${STATUS[i.status] ?? STATUS.todo}  ${i.text}${i.note ? ` (${i.note})` : ""}`, LAYOUT.maxWidth));
  return join([`${done} of ${items.length} done  [ ${cells(done / (items.length || 1), { width: Math.min(items.length, 32) })} ]`, "", ...rows, ...(capped.note ? [capped.note] : [])]);
}

export const kinds = {
  redline: { label: "Spacing redline", render: redline, summary: (s) => s.map((x) => x.label).join(", then ") },
  qaChecklist: {
    label: "QA checklist",
    render: qaChecklist,
    summary: (i) => `${i.filter((x) => x.status === "done").length} of ${i.length} done.`
  },
  anatomy: {
    label: "Component anatomy",
    check: anatomyCheck,
    render: anatomy,
    summary: (d) => `${d.container?.label ?? "Container"} holding ${d.parts.length} parts: ${d.parts.map((p) => `${p.label}${p.optional ? " (optional)" : ""}`).join(", ")}.`
  },
  compare: {
    label: "Before and after",
    check: (d) => [checks.within(d, "a", 0, 1, "before share"), checks.within(d, "b", 0, 1, "after share")],
    render: compare,
    arrive: (lines, data, options) => byColumns(compareColumns(data, options)),
    summary: (rows) => rows.map((r) => `${r.label}: ${r.aText} then ${r.bText}`).join(". ")
  }
};

