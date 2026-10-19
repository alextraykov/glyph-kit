// Planning: boards, impact and effort, ownership, timelines, decisions, status.
import { checks } from "../guard.mjs";
import { BOX, clamp, gantt, join, len, padEnd, place, statusKey, table, wrap } from "../core.mjs";

/** Now / next / later (or any columns). columns: { now: [...], next: [...], later: [...] } */
export function board(columns, { colWidth = 22 } = {}) {
  const b = BOX.light;
  const names = Object.keys(columns);
  const inner = colWidth - 4;
  const cols = names.map((n) => columns[n].flatMap((item) => wrap(`· ${item}`, inner).map((l, i) => (i ? `  ${l}` : l))));
  const h = Math.max(...cols.map((c) => c.length));
  const top = b.tl + names.map((n) => (b.h + ` ${n.toUpperCase()} `).padEnd(colWidth - 2, b.h)).join(b.tt) + b.tr;
  const body = Array.from({ length: h }, (_, i) => b.v + cols.map((c) => ` ${padEnd(c[i] ?? "", colWidth - 3)}`).join(b.v) + b.v);
  const bot = b.bl + names.map(() => b.h.repeat(colWidth - 2)).join(b.bt) + b.br;
  return [top, ...body, bot].join("\n");
}

/**
 * Impact against effort. items: [{ label, impact: 0..1, effort: 0..1 }]
 * Items are numbered on the grid and listed below, so labels never collide.
 */
export function impactEffort(items, { width = 40, height = 12 } = {}) {
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
    ...items.map((it, i) => `[${i + 1}] ${it.label}`)
  ]);
}

/**
 * Who does what, in order. lanes: ["Designer", "Engineer"]
 * rows: [[{ lane, text }, …]] items in one row are joined with ──►;
 * or { back: { from, to, text } } for a return to an earlier lane.
 */
export function swimlane(lanes, rows, { colWidth = 18 } = {}) {
  const col = (lane) => lane * colWidth;
  const out = [
    place(lanes.map((l, i) => [col(i), l.toUpperCase()])),
    place(lanes.map((l, i) => [col(i), "─".repeat(Math.min(colWidth - 2, Math.max(len(l), 8)))]))
  ];
  for (const row of rows) {
    if (row.back) {
      const { from, to, text } = row.back;
      const start = col(to) + len(text) + 1;
      out.push(place([[col(to), `${text} ◄${"─".repeat(Math.max(1, col(from) - start - 1))}┘`]]));
      continue;
    }
    const items = [...row].sort((a, b) => a.lane - b.lane);
    const pieces = [];
    items.forEach((it, i) => {
      pieces.push([col(it.lane), it.text]);
      const next = items[i + 1];
      if (next) {
        const s = col(it.lane) + len(it.text) + 1;
        pieces.push([s, "─".repeat(Math.max(1, col(next.lane) - s - 2)) + "►"]);
      }
    });
    out.push(place(pieces));
  }
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
    check: (d) => [checks.inTimeOrder(d, "date")], render: decisionLog, summary: (r) => r.map((x) => `${x.date}: ${x.decision}`).join(". ") }
};
