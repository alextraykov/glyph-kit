// Handoff and design QA: spacing redlines, checklists, before and after.
import { checks } from "../guard.mjs";
import { cells, center, compare, cut, join, len, padEnd } from "../core.mjs";
import { LAYOUT, capRows } from "../layout.mjs";

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
  compare: {
    label: "Before and after",
    check: (d) => [checks.within(d, "a", 0, 1, "before share"), checks.within(d, "b", 0, 1, "after share")],
    render: compare,
    summary: (rows) => rows.map((r) => `${r.label}: ${r.aText} then ${r.bText}`).join(". ")
  }
};
