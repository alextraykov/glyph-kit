// Research data: survey answers, themes across participants, quotes, task results, journeys.
import { checks } from "../guard.mjs";
import { BOX, clamp, join, len, padEnd, padStart, place, wrap } from "../core.mjs";

const pct = (n) => `${Math.round(n * 100)}%`;

/**
 * Likert answers as diverging bars around a centre line.
 * rows: [{ label, counts: [strongly disagree, disagree, neutral, agree, strongly agree] }]
 * █ strong, ▒ somewhat, ░ neutral (split across the centre).
 */
export function likert(rows, { half = 20, left = "disagree", right = "agree" } = {}) {
  const labelW = Math.max(...rows.map((r) => len(r.label)));
  const line = (r) => {
    const total = r.counts.reduce((a, b) => a + b, 0) || 1;
    const [sd, d, n, a, sa] = r.counts.map((c) => (c / total) * half * 2);
    const cells = (v) => Math.round(v);
    const neg = "█".repeat(cells(sd)) + "▒".repeat(cells(d)) + "░".repeat(cells(n / 2));
    const pos = "░".repeat(cells(n / 2)) + "▒".repeat(cells(a)) + "█".repeat(cells(sa));
    const agree = (r.counts[3] + r.counts[4]) / total;
    return `${padEnd(r.label, labelW)}  ${padStart([...neg].slice(-half).join(""), half)}│${padEnd([...pos].slice(0, half).join(""), half)}  ${pct(agree)} ${right}`;
  };
  const head = `${" ".repeat(labelW + 2)}${padStart(left, half)}│${right}`;
  return join([head, ...rows.map(line), "", "█ strongly   ▒ somewhat   ░ neutral"]);
}

/**
 * Which participant raised which theme. themes: [{ label, by: ["P1", "P3"] }]
 * Sorted by how many people raised it. ■ raised, · not raised.
 */
export function themeMatrix(themes, { participants } = {}) {
  const people = participants ?? [...new Set(themes.flatMap((t) => t.by))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const labelW = Math.max(...themes.map((t) => len(t.label)));
  const colW = Math.max(...people.map(len)) + 1;
  const sorted = [...themes].sort((a, b) => b.by.length - a.by.length);
  const head = " ".repeat(labelW + 2) + people.map((p) => padEnd(p, colW)).join("") + "  n";
  const rows = sorted.map(
    (t) => `${padEnd(t.label, labelW)}  ${people.map((p) => padEnd(t.by.includes(p) ? "■" : "·", colW)).join("")}  ${t.by.length}`
  );
  return join([head, ...rows]);
}

/** Notes or mentions per cluster, one ■ each out of a total. groups: [{ label, count }] */
export function affinity(groups, { total } = {}) {
  const top = total ?? Math.max(...groups.map((g) => g.count));
  const labelW = Math.max(...groups.map((g) => len(g.label)));
  return join(
    [...groups]
      .sort((a, b) => b.count - a.count)
      .map((g) => `${padEnd(g.label, labelW)}  ${"■".repeat(g.count)}${"·".repeat(Math.max(0, top - g.count))}  ${g.count} of ${top}`)
  );
}

/** A quote as evidence: the words, who said it, and where to find it. */
export function quoteCard({ quote, who, source, theme }, { width = 44 } = {}) {
  const b = BOX.light;
  const inner = width - 4;
  const body = wrap(`“${quote}”`, inner);
  const credit = wrap([who, source].filter(Boolean).join(" · "), inner);
  const title = theme ? ` ${theme} ` : "";
  const top = b.tl + b.h + title + b.h.repeat(Math.max(0, width - 3 - len(title))) + b.tr;
  const row = (t) => `${b.v} ${padEnd(t, inner)} ${b.v}`;
  return [top, ...body.map(row), row(""), ...credit.map(row), b.bl + b.h.repeat(width - 2) + b.br].join("\n");
}

/**
 * Task results: time as a text box plot, plus how many finished.
 * rows: [{ label, min, q1, median, q3, max, done, of }] in seconds.
 */
export function taskStats(rows, { scale, width = 30, unit = "s" } = {}) {
  const top = scale ?? Math.max(...rows.map((r) => r.max));
  const at = (v) => clamp(Math.round((v / top) * width), 0, width);
  const labelW = Math.max(...rows.map((r) => len(r.label)));
  const plot = (r) => {
    const cells = Array(width + 1).fill(" ");
    for (let i = at(r.min); i <= at(r.max); i++) cells[i] = "─";
    for (let i = at(r.q1); i <= at(r.q3); i++) cells[i] = "█";
    cells[at(r.min)] = "├";
    cells[at(r.max)] = "┤";
    cells[at(r.median)] = "│";
    return cells.join("");
  };
  const lines = rows.map(
    (r) => `${padEnd(r.label, labelW)}  ${plot(r)}  median ${r.median}${unit} · ${r.done}/${r.of} done`
  );
  const axis = place([
    [labelW + 2, `0${unit}`],
    [labelW + 2 + Math.round(width / 2) - 1, `${Math.round(top / 2)}${unit}`],
    [labelW + 2 + width - len(`${top}${unit}`) + 1, `${top}${unit}`]
  ]);
  return join([...lines, axis, "", "├─ fastest   █ middle half   │ median   ─┤ slowest"]);
}

/** How people felt across a journey, from -2 to +2. stages: [{ label, score }] */
export function emotionCurve(stages, { colWidth = 12 } = {}) {
  const levels = [2, 1, 0, -1, -2];
  const names = { 2: "+2", 1: "+1", 0: " 0", "-1": "-1", "-2": "-2" };
  const lines = levels.map((lv) => {
    const row = stages
      .map((s) => {
        const mark = Math.round(clamp(s.score, -2, 2)) === lv ? "█" : lv === 0 ? "·" : " ";
        const fill = lv === 0 ? "·" : " ";
        return fill.repeat(Math.floor(colWidth / 2)) + mark + fill.repeat(colWidth - Math.floor(colWidth / 2) - 1);
      })
      .join("");
    return `${names[lv]} ${row}`;
  });
  const labels = "   " + stages.map((s) => padEnd([...s.label].slice(0, colWidth - 1).join(""), colWidth)).join("");
  return join([...lines, labels]);
}

export const kinds = {
  likert: {
    label: "Likert answers",
    check: (d) => d.map((r) => (r.counts?.some((c) => c < 0) ? `${r.label} has a negative count.` : "")),
    render: likert,
    summary: (rows) => rows.map((r) => `${r.label}: ${r.counts.join(", ")} from strongly disagree to strongly agree`).join(". ")
  },
  themeMatrix: {
    label: "Themes by participant",
    render: themeMatrix,
    summary: (themes) => themes.map((t) => `${t.label}: ${t.by.length} participants`).join(". ")
  },
  affinity: { label: "Affinity counts",
    check: (d) => [checks.notNegative(d, "count")], render: affinity, summary: (g) => g.map((x) => `${x.label}: ${x.count}`).join(". ") },
  quoteCard: { label: "Quote card", render: quoteCard, summary: (q) => `${q.who} said: ${q.quote}` },
  taskStats: {
    label: "Task results",
    check: (d) => [checks.ordered(d, ["min", "q1", "median", "q3", "max"], "times should run from shortest to longest"), ...d.map((r) => (r.done > r.of ? `${r.label}: ${r.done} finished out of ${r.of}.` : ""))],
    render: taskStats,
    summary: (rows) => rows.map((r) => `${r.label}: median ${r.median} seconds, ${r.done} of ${r.of} finished`).join(". ")
  },
  emotionCurve: {
    label: "Journey feeling",
    check: (d) => [checks.within(d, "score", -2, 2, "score")],
    render: emotionCurve,
    summary: (s) => s.map((x) => `${x.label} ${x.score > 0 ? "+" : ""}${x.score}`).join(", ")
  }
};
