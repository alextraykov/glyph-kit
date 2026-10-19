// Handoff and design QA: spacing redlines, checklists, before and after.
import { checks } from "../guard.mjs";
import { cells, center, compare, join, len, padEnd } from "../core.mjs";

/**
 * Spacing callouts across a row: │◄ 16 ►│◄─── content 320 ───►│◄ 16 ►│
 * segments: [{ label, size }] — each segment's width is proportional to size, never narrower than its label.
 */
export function redline(segments, { width = 48 } = {}) {
  const total = segments.reduce((a, s) => a + s.size, 0) || 1;
  const parts = segments.map((s) => {
    const w = Math.max(len(s.label) + 4, Math.round((s.size / total) * width));
    return `◄${center(` ${s.label} `, w - 2, "─")}►`;
  });
  return `│${parts.join("│")}│`;
}

const STATUS = { done: "█ done       ", progress: "▒ in progress", todo: "  to do      ", blocked: "x blocked    " };

/** A QA checklist on the status ladder, with a summary. items: [{ text, status, note? }] */
export function qaChecklist(items) {
  const done = items.filter((i) => i.status === "done").length;
  const rows = items.map((i) => `${STATUS[i.status] ?? STATUS.todo}  ${i.text}${i.note ? ` (${i.note})` : ""}`);
  return join([`${done} of ${items.length} done  [ ${cells(done / (items.length || 1), { width: items.length })} ]`, "", ...rows]);
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
