// Research data: survey answers, themes across participants, quotes, task results, journeys.
import { checks } from "../guard.mjs";
import { BOX, clamp, cut, join, len, padEnd, padStart, place, wrap } from "../core.mjs";
import { LAYOUT, capRows, fitLabels } from "../layout.mjs";
import { byColumns, readingOrder } from "../arrive.mjs";

const pct = (n) => `${Math.round(n * 100)}%`;

/**
 * Likert answers as diverging bars around a centre line.
 * rows: [{ label, counts: [strongly disagree, disagree, neutral, agree, strongly agree] }]
 * █ strong, ▒ somewhat, ░ neutral (split across the centre).
 */
export function likert(rows, { half: preferred = 20, left = "disagree", right = "agree", maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(rows);
  const labels = fitLabels(capped.rows.map((r) => r.label));
  const labelW = Math.max(0, ...labels.map(len));
  const half = Math.max(4, Math.min(preferred, Math.floor((maxWidth - labelW - len(right) - 8) / 2)));
  const line = (r, i) => {
    const total = r.counts.reduce((a, b) => a + b, 0) || 1;
    const [sd, d, n, a, sa] = r.counts.map((c) => (c / total) * half * 2);
    const cells = (v) => Math.round(v);
    const neg = "█".repeat(cells(sd)) + "▒".repeat(cells(d)) + "░".repeat(cells(n / 2));
    const pos = "░".repeat(cells(n / 2)) + "▒".repeat(cells(a)) + "█".repeat(cells(sa));
    const agree = (r.counts[3] + r.counts[4]) / total;
    return `${padEnd(labels[i], labelW)}  ${padStart([...neg].slice(-half).join(""), half)}│${padEnd([...pos].slice(0, half).join(""), half)}  ${pct(agree)} ${right}`;
  };
  const head = `${" ".repeat(labelW + 2)}${padStart(left, half)}│${right}`;
  return join([head, ...capped.rows.map(line), ...(capped.note ? [capped.note] : []), "", "█ strongly   ▒ somewhat   ░ neutral"]);
}

/**
 * Which participant raised which theme. themes: [{ label, by: ["P1", "P3"] }]
 * Sorted by how many people raised it. ■ raised, · not raised.
 */
export function themeMatrix(themes, { participants, maxWidth = LAYOUT.maxWidth } = {}) {
  const allPeople = participants ?? [...new Set(themes.flatMap((t) => t.by))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const capped = capRows([...themes].sort((a, b) => b.by.length - a.by.length));
  const labels = fitLabels(capped.rows.map((t) => t.label));
  const labelW = Math.max(0, ...labels.map(len));
  const peopleMax = Math.max(1, Math.floor((maxWidth - labelW - 5) / 3));
  const people = allPeople.slice(0, peopleMax).map((person) => cut(person, 8));
  const originalPeople = allPeople.slice(0, peopleMax);
  const colW = Math.max(2, ...people.map(len)) + 1;
  while (people.length > 1 && labelW + 4 + people.length * colW > maxWidth) {
    people.pop();
    originalPeople.pop();
  }
  const sorted = capped.rows;
  const head = " ".repeat(labelW + 2) + people.map((p) => padEnd(p, colW)).join("") + "  n";
  const rows = sorted.map(
    (t, i) => `${padEnd(labels[i], labelW)}  ${originalPeople.map((p) => padEnd(t.by.includes(p) ? "■" : "·", colW)).join("")}  ${t.by.length}`
  );
  const notes = [allPeople.length > originalPeople.length ? `… and ${allPeople.length - originalPeople.length} more participants` : "", capped.note].filter(Boolean);
  return join([head, ...rows, ...notes]);
}

/** Notes or mentions per cluster, one ■ each out of a total. groups: [{ label, count }] */
export function affinity(groups, { total, maxWidth = LAYOUT.maxWidth } = {}) {
  const top = total ?? Math.max(...groups.map((g) => g.count));
  if (groups.some((g) => g.count > top)) throw new Error("A group count cannot exceed the total.");
  const capped = capRows([...groups].sort((a, b) => b.count - a.count));
  const labels = fitLabels(capped.rows.map((g) => g.label));
  const labelW = Math.max(0, ...labels.map(len));
  const suffixW = len(`${top} of ${top}`);
  const barW = Math.max(1, Math.min(top, maxWidth - labelW - suffixW - 4));
  const lines = capped.rows.map((g, i) => {
    const filled = top > 0 ? Math.round((g.count / top) * barW) : 0;
    return `${padEnd(labels[i], labelW)}  ${"■".repeat(filled)}${"·".repeat(Math.max(0, barW - filled))}  ${g.count} of ${top}`;
  });
  return join(capped.note ? [...lines, capped.note] : lines);
}

/** A quote as evidence: the words, who said it, and where to find it. */
export function quoteCard({ quote, who, source, theme }, { width = 44 } = {}) {
  const b = BOX.light;
  const inner = width - 4;
  const body = wrap(`“${quote}”`, inner);
  const credit = wrap([who, source].filter(Boolean).join(" · "), inner);
  const title = theme ? ` ${cut(theme, width - 5)} ` : "";
  const top = b.tl + b.h + title + b.h.repeat(Math.max(0, width - 3 - len(title))) + b.tr;
  const row = (t) => `${b.v} ${padEnd(t, inner)} ${b.v}`;
  return [top, ...body.map(row), row(""), ...credit.map(row), b.bl + b.h.repeat(width - 2) + b.br].join("\n");
}

/**
 * Task results: time as a text box plot, plus how many finished.
 * rows: [{ label, min, q1, median, q3, max, done, of }] in seconds.
 */
export function taskStats(rows, { scale, width: preferred = 30, unit = "s", maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(rows);
  rows = capped.rows;
  const top = scale ?? Math.max(...rows.map((r) => r.max));
  const labels = fitLabels(rows.map((r) => r.label));
  const labelW = Math.max(0, ...labels.map(len));
  const suffixW = Math.max(0, ...rows.map((r) => len(`median ${r.median}${unit} · ${r.done}/${r.of} done`)));
  const width = Math.max(4, Math.min(preferred, maxWidth - labelW - suffixW - 5));
  const at = (v) => clamp(Math.round((v / top) * width), 0, width);
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
    (r, i) => `${padEnd(labels[i], labelW)}  ${plot(r)}  median ${r.median}${unit} · ${r.done}/${r.of} done`
  );
  const axis = place([
    [labelW + 2, `0${unit}`],
    [labelW + 2 + Math.round(width / 2) - 1, `${Math.round(top / 2)}${unit}`],
    [labelW + 2 + width - len(`${top}${unit}`) + 1, `${top}${unit}`]
  ]);
  return join([...lines, ...(capped.note ? [capped.note] : []), axis, "", "├─ fastest   █ middle half   │ median   ─┤ slowest"]);
}

/** How people felt across a journey, from -2 to +2. stages: [{ label, score }] */
function emotionWidth(stages, { colWidth: preferred = 12, maxWidth = LAYOUT.maxWidth } = {}) {
  const available = Math.floor((maxWidth - 3) / Math.max(1, stages.length));
  if (available < 4) throw new Error(`A journey feeling chart fits at most ${Math.floor((maxWidth - 3) / 4)} stages at ${maxWidth} cells; this one has ${stages.length}.`);
  return Math.min(preferred, available);
}

/** Where each stage's column starts, in cells. A deck prints the stages in order, 240ms apart. */
export const emotionColumns = (stages, options) => {
  const colWidth = emotionWidth(stages, options);
  return { cuts: stages.map((_, i) => 3 + i * colWidth), step: 240 };
};

export function emotionCurve(stages, options) {
  const colWidth = emotionWidth(stages, options);
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
  const labels = "   " + stages.map((s) => padEnd(cut(s.label, colWidth - 1), colWidth)).join("");
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
  quoteCard: { label: "Quote card", render: quoteCard, arrive: readingOrder, summary: (q) => `${q.who} said: ${q.quote}` },
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
    arrive: (lines, data, options) => byColumns(emotionColumns(data, options)),
    summary: (s) => s.map((x) => `${x.label} ${x.score > 0 ? "+" : ""}${x.score}`).join(", ")
  }
};

