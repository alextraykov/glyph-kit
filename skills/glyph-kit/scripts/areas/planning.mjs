import { upper } from "../text.mjs";
// Planning: boards, impact and effort, ownership, timelines, decisions, status.
import { checks } from "../guard.mjs";
import { BOX, clamp, cut, gantt, join, len, padEnd, place, statusKey, table, wrap } from "../core.mjs";
import { LAYOUT, capRows } from "../layout.mjs";
import { readingOrder } from "../arrive.mjs";

/** Now / next / later (or any columns). columns: { now: [...], next: [...], later: [...] } */
export function board(columns, { colWidth: preferred = 22, maxWidth = LAYOUT.maxWidth, lang } = {}) {
  const b = BOX.light;
  const names = Object.keys(columns);
  const available = Math.floor((maxWidth - 1) / Math.max(1, names.length)) + 1;
  if (available < 10) throw new Error(`A board fits at most ${Math.floor((maxWidth - 1) / 9)} columns at ${maxWidth} cells; this one has ${names.length}.`);
  const colWidth = Math.min(preferred, available);
  const inner = colWidth - 4;
  const cols = names.map((n) => {
    const capped = capRows(columns[n], LAYOUT.rowsMax, "cards");
    const items = capped.rows.flatMap((item) => wrap(`· ${item}`, inner).flatMap((line, i) => i ? wrap(line, inner - 2).map((part) => `  ${part}`) : [line]));
    return capped.note ? [...items, cut(capped.note, inner)] : items;
  });
  const h = Math.max(...cols.map((c) => c.length));
  const top = b.tl + names.map((n) => {
    const label = ` ${cut(upper(n, lang), colWidth - 5)} `;
    return b.h + label + b.h.repeat(Math.max(0, colWidth - 3 - len(label)));
  }).join(b.tt) + b.tr;
  const body = Array.from({ length: h }, (_, i) => b.v + cols.map((c) => ` ${padEnd(c[i] ?? "", colWidth - 3)}`).join(b.v) + b.v);
  const bot = b.bl + names.map(() => b.h.repeat(colWidth - 2)).join(b.bt) + b.br;
  return [top, ...body, bot].join("\n");
}

/**
 * Impact against effort. items: [{ label, impact: 0..1, effort: 0..1 }]
 * Items are numbered on the grid and listed below, so labels never collide.
 */
export function impactEffort(items, { width = 40, height = 12 } = {}) {
  const capped = capRows(items, LAYOUT.rowsMax, "items");
  items = capped.rows.map((item) => ({ ...item, label: cut(item.label, LAYOUT.labelMax) }));
  const half = Math.floor(width / 2);
  const mid = Math.floor(height / 2);
  const grid = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width + 1 }, (_, c) => (c === half ? "│" : r === mid ? "─" : " "))
  );
  grid[mid][half] = "┼";
  const tag = (s, r, c) => [...s].forEach((ch, i) => (grid[r][c + i] = ch));
  tag("quick wins", 0, 1);
  tag("big bets", 0, half + 2);
  tag("fill-ins", height - 1, 1);
  tag("money pits", height - 1, half + 2);
  items.forEach((it, i) => {
    const r = clamp(Math.round((1 - it.impact) * (height - 1)), 1, height - 2);
    const c = clamp(Math.round(it.effort * width), 1, width - 4);
    tag(`[${i + 1}]`, r === mid ? r - 1 : r, c === half ? c + 1 : c);
  });
  const lines = grid.map((row, r) => (r === 0 ? "high │" : r === height - 1 ? " low │" : "     │") + row.join(""));
  return join([
    "impact",
    ...lines,
    "     └" + "─".repeat(width + 1),
    place([[6, "low"], [6 + width - 10, "high effort"]]),
    "",
    ...items.map((it, i) => `[${i + 1}] ${it.label}`),
    ...(capped.note ? [capped.note] : [])
  ]);
}

/**
 * Who does what, in order. lanes: ["Designer", "Engineer"]
 * rows: [[{ lane, text }, …]] items in one row are joined with ──►;
 * or { back: { from, to, text } } for a return to an earlier lane.
 */
export function swimlane(lanes, rows, { colWidth: preferred = 18, maxWidth = LAYOUT.maxWidth, lang } = {}) {
  const available = Math.floor(maxWidth / Math.max(1, lanes.length));
  if (available < 10) throw new Error(`A swimlane fits at most ${Math.floor(maxWidth / 10)} lanes at ${maxWidth} cells; this one has ${lanes.length}.`);
  const colWidth = Math.min(preferred, available);
  const col = (lane) => lane * colWidth;
  const laneLabels = lanes.map((lane) => cut(lane, colWidth - 2));
  const out = [
    place(laneLabels.map((l, i) => [col(i), upper(l, lang)])),
    place(laneLabels.map((l, i) => [col(i), "─".repeat(Math.min(colWidth - 2, Math.max(len(l), 8)))]))
  ];
  const capped = capRows(rows);
  for (const row of capped.rows) {
    if (row.back) {
      const { from, to, text } = row.back;
      const label = cut(text, colWidth - 3);
      const start = col(to) + len(label) + 1;
      out.push(place([[col(to), `${label} ◄${"─".repeat(Math.max(1, col(from) - start - 1))}┘`]]));
      continue;
    }
    const items = [...row].sort((a, b) => a.lane - b.lane);
    const pieces = [];
    items.forEach((it, i) => {
      const label = cut(it.text, Math.min(LAYOUT.labelMax, i === items.length - 1 ? maxWidth - col(it.lane) : colWidth - 3));
      pieces.push([col(it.lane), label]);
      const next = items[i + 1];
      if (next) {
        const s = col(it.lane) + len(label) + 1;
        pieces.push([s, "─".repeat(Math.max(1, col(next.lane) - s - 2)) + "►"]);
      }
    });
    out.push(place(pieces));
  }
  if (capped.note) out.push(capped.note);
  return join(out);
}

/** A decision log as a table. rows: [{ date, decision, why, owner }] */
export function decisionLog(rows) {
  return table([["Date", "Decision", "Why", "Owner"], ...rows.map((r) => [r.date, r.decision, r.why, r.owner])]);
}

export const kinds = {
  board: {
    label: "Now, next, later",
    render: board,
    summary: (c) => Object.entries(c).map(([k, v]) => `${k}: ${v.join(", ")}`).join(". ")
  },
  impactEffort: {
    label: "Impact and effort",
    check: (d) => [checks.within(d, "impact", 0, 1), checks.within(d, "effort", 0, 1)],
    render: impactEffort,
    summary: (items) => items.map((i) => `${i.label}: impact ${i.impact}, effort ${i.effort}`).join(". ")
  },
  swimlane: {
    label: "Swimlane",
    render: (d, o) => swimlane(d.lanes, d.rows, o),
    summary: (d) => `Lanes: ${d.lanes.join(", ")}.`
  },
  gantt: { label: "Timeline",
    check: (d) => [checks.notNegative(d, "start"), checks.ordered(d, ["start", "end"], "it should end after it starts")], render: gantt, summary: (t) => t.map((x) => `${x.label} ${x.start} to ${x.end}`).join(". ") },
  statusKey: { label: "Status key",
    check: (d) => [checks.within(d, "level", 0, 4, "level")], render: statusKey, summary: (i) => i.map((x) => x.label).join(", ") },
  decisionLog: { label: "Decision log",
    check: (d) => [checks.inTimeOrder(d, "date")], render: decisionLog, arrive: readingOrder, summary: (r) => r.map((x) => `${x.date}: ${x.decision}`).join(". ") }
};

