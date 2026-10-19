// Experiments and metrics: funnels, cohorts, test results, metric panels, plus the core charts.
import { checks } from "../guard.mjs";
import {
  bar,
  barChart,
  calendarStrip,
  clamp,
  compare,
  forecast,
  heatmap,
  join,
  len,
  meter,
  padEnd,
  padStart,
  place,
  sparkline
} from "../core.mjs";

const fmt = (n) => (Number.isInteger(n) ? n.toLocaleString("en") : String(n));
const pct = (n) => `${Math.round(n * 100)}%`;

/** Steps of a funnel. Shows the share of the start and the step-to-step drop. steps: [{ label, value }] */
export function funnel(steps, { width = 30 } = {}) {
  const start = steps[0]?.value || 1;
  const labelW = Math.max(...steps.map((s) => len(s.label)));
  const valueW = Math.max(...steps.map((s) => len(fmt(s.value))));
  return join(
    steps.map((s, i) => {
      const kept = i ? `  ▼ ${pct(s.value / (steps[i - 1].value || 1))} kept` : "";
      return `${padEnd(s.label, labelW)}  ${bar(s.value, start, { width })}  ${padStart(fmt(s.value), valueW)}  ${padStart(pct(s.value / start), 4)}${kept}`;
    })
  );
}

/**
 * Retention by cohort. rows: [{ label, size, values: [1, 0.62, 0.41, …] }] where values are shares of the cohort.
 * Shades step at 20/40/60/80%.
 */
export function cohort(rows, { periods, prefix = "M" } = {}) {
  const n = Math.max(...rows.map((r) => r.values.length));
  const heads = periods ?? Array.from({ length: n }, (_, i) => `${prefix}${i}`);
  const labelW = Math.max(...rows.map((r) => len(`${r.label} ${r.size ?? ""}`.trim())));
  const shade = (v) => (v == null ? "  " : (v >= 0.8 ? "█" : v >= 0.6 ? "▓" : v >= 0.4 ? "▒" : v > 0 ? "░" : " ").repeat(2));
  const head = " ".repeat(labelW + 2) + heads.map((h) => padEnd(h, 4)).join("");
  const body = rows.map(
    (r) => `${padEnd(`${r.label} ${r.size ?? ""}`.trim(), labelW)}  ${Array.from({ length: n }, (_, i) => padEnd(shade(r.values[i]), 4)).join("")}`
  );
  return join([head, ...body, "", "█ 80%+   ▓ 60%+   ▒ 40%+   ░ under 40%"]);
}

/**
 * Test result with confidence intervals on one scale. variants: [{ label, value, low, high }]
 * █ is the measured value, ├ ┤ the interval.
 */
export function abResult(variants, { min, max, width = 36, unit = "%", decimals = 1 } = {}) {
  const lo = min ?? Math.min(...variants.map((v) => v.low));
  const hi = max ?? Math.max(...variants.map((v) => v.high));
  const at = (x) => clamp(Math.round(((x - lo) / (hi - lo || 1)) * width), 0, width);
  const labelW = Math.max(...variants.map((v) => len(v.label)));
  const f = (x) => `${x.toFixed(decimals)}${unit}`;
  const lines = variants.map((v) => {
    const cells = Array(width + 1).fill(" ");
    for (let i = at(v.low); i <= at(v.high); i++) cells[i] = "─";
    cells[at(v.low)] = "├";
    cells[at(v.high)] = "┤";
    cells[at(v.value)] = "█";
    return `${padEnd(v.label, labelW)}  ${cells.join("")}  ${f(v.value)} (${f(v.low)}–${f(v.high)})`;
  });
  const axis = place([
    [labelW + 2, f(lo)],
    [labelW + 2 + Math.round(width / 2) - 1, f((lo + hi) / 2)],
    [labelW + 2 + width - len(f(hi)) + 1, f(hi)]
  ]);
  const overlap = variants.length === 2 && variants[0].high >= variants[1].low && variants[1].high >= variants[0].low;
  return join([...lines, axis, "", overlap ? "The intervals overlap: no clear difference yet." : "The intervals don't overlap."]);
}

/** A row per metric: trend, latest value, change since the first point. items: [{ label, values, unit? }] */
export function metricPanel(items, { decimals = 0 } = {}) {
  const labelW = Math.max(...items.map((m) => len(m.label)));
  const rows = items.map((m) => {
    const first = m.values[0];
    const last = m.values.at(-1);
    const delta = first ? (last - first) / Math.abs(first) : 0;
    const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "·";
    const value = `${Number(last).toFixed(decimals)}${m.unit ?? ""}`;
    return [padEnd(m.label, labelW), sparkline(m.values), value, `${arrow} ${Math.abs(Math.round(delta * 100))}%`];
  });
  const sparkW = Math.max(...rows.map((r) => len(r[1])));
  const valueW = Math.max(...rows.map((r) => len(r[2])));
  return join(rows.map(([l, s, v, d]) => `${l}  ${padEnd(s, sparkW)}  ${padStart(v, valueW)}  ${d}`));
}

export const kinds = {
  barChart: { label: "Bar chart",
    check: (d) => [checks.notNegative(d, "value")], render: barChart, summary: (rows) => rows.map((r) => `${r.label}: ${r.text ?? r.value}`).join(". ") },
  compare: {
    label: "Comparison",
    check: (d) => [checks.within(d, "a", 0, 1, "before share"), checks.within(d, "b", 0, 1, "after share")],
    render: compare,
    summary: (rows) => rows.map((r) => `${r.label}: ${r.aText} against ${r.bText}`).join(". ")
  },
  forecast: {
    label: "Forecast",
    render: forecast,
    summary: (rows) => rows.map((r) => `${r.label}: ${r.text ?? r.measured}${r.projected ? " (part projected)" : ""}`).join(". ")
  },
  meter: { label: "Meter",
    check: (d) => [d.value < 0 || d.value > d.cap ? `The value ${d.value} is outside 0 to ${d.cap}.` : ""], render: (d, o) => meter(d.value, d.cap, o), summary: (d) => `${d.value} of ${d.cap}` },
  sparkline: {
    label: "Sparkline",
    render: (d) => `${d.label}  ${sparkline(d.values)}  ${d.values[0]} → ${d.values.at(-1)}`,
    summary: (d) => `${d.label} from ${d.values[0]} to ${d.values.at(-1)}`
  },
  heatmap: { label: "Heatmap",
    check: (d) => [d.flat().some((v) => v < 0 || v > 1) ? "Heatmap cells run from 0 (none) to 1 (most), and one is outside that." : ""], render: heatmap, summary: () => "Density grid from blank (none) to full block (most)." },
  calendarStrip: {
    label: "Calendar strip",
    render: (d, o) => calendarStrip(d, o),
    summary: (d) => `${d.filter(Boolean).length} of ${d.length} days hit`
  },
  funnel: { label: "Funnel",
    check: (d) => [checks.notNegative(d, "value", "count"), checks.neverGrows(d, "value")], render: funnel, summary: (s) => s.map((x) => `${x.label}: ${fmt(x.value)}`).join(", ") },
  cohort: {
    label: "Retention cohorts",
    check: (d) => d.map((r) => ((r.values ?? []).some((v) => v < 0 || v > 1) ? `${r.label} has retention outside 0 to 1 (write 48% as 0.48).` : "")),
    render: cohort,
    summary: (rows) => rows.map((r) => `${r.label}: ${r.values.map(pct).join(", ")}`).join(". ")
  },
  abResult: {
    label: "Test result",
    check: (d) => [checks.ordered(d, ["low", "value", "high"], "the value should sit inside its range")],
    render: abResult,
    summary: (v) => v.map((x) => `${x.label}: ${x.value} (${x.low} to ${x.high})`).join(". ")
  },
  metricPanel: {
    label: "Metric panel",
    render: metricPanel,
    summary: (items) => items.map((m) => `${m.label}: ${m.values.at(-1)}${m.unit ?? ""}`).join(". ")
  }
};
