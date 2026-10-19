import { motionBarChart, motionCohort, motionSparkline, motionMetricPanel, motionMeter, motionForecast, motionCalendarStrip, motionHeatmap } from "../motion/metrics.mjs";
// Experiments and metrics: funnels, cohorts, test results, metric panels, plus the core charts.
import { checks } from "../guard.mjs";
import {
  bar,
  barChart,
  calendarStrip,
  clamp,
  compare,
  cut,
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
import { LAYOUT, capRows, fitLabels } from "../layout.mjs";
import { motionFunnel } from "../motion/process.mjs";

const fmt = (n, lang) => lang ? new Intl.NumberFormat(lang).format(n) : (Number.isInteger(n) ? n.toLocaleString("en") : String(n));
const pct = (n) => `${Math.round(n * 100)}%`;

/** Steps of a funnel. Shows the share of the start and the step-to-step drop. steps: [{ label, value }] */
export function funnel(steps, { width: preferred = 30, lang, maxWidth = LAYOUT.maxWidth } = {}) {
  const start = steps[0]?.value || 1;
  const capped = capRows(steps, LAYOUT.rowsMax, "steps");
  const labels = fitLabels(capped.rows.map((s) => s.label));
  const values = capped.rows.map((s) => cut(fmt(s.value, lang), 16));
  const labelW = Math.max(0, ...labels.map(len));
  const valueW = Math.max(0, ...values.map(len));
  const width = Math.max(4, Math.min(preferred, maxWidth - labelW - valueW - 23));
  const lines = capped.rows.map((s, i) => {
      const kept = i ? `  ▼ ${pct(s.value / (steps[i - 1].value || 1))} kept` : "";
      return `${padEnd(labels[i], labelW)}  ${bar(s.value, start, { width })}  ${padStart(values[i], valueW)}  ${padStart(pct(s.value / start), 4)}${kept}`;
    });
  return join(capped.note ? [...lines, capped.note] : lines);
}

/**
 * Retention by cohort. rows: [{ label, size, values: [1, 0.62, 0.41, …] }] where values are shares of the cohort.
 * Shades step at 20/40/60/80%.
 */
export function cohort(rows, { periods, prefix = "M", maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(rows);
  const labels = fitLabels(capped.rows.map((r) => `${r.label} ${r.size ?? ""}`.trim()));
  const labelW = Math.max(0, ...labels.map(len));
  const totalPeriods = Math.max(...rows.map((r) => r.values.length));
  const n = Math.min(totalPeriods, Math.max(1, Math.floor((maxWidth - labelW - 2) / 4)));
  const heads = (periods ?? Array.from({ length: n }, (_, i) => `${prefix}${i}`)).slice(0, n);
  const shade = (v) => (v == null ? "  " : (v >= 0.8 ? "█" : v >= 0.6 ? "▓" : v >= 0.4 ? "▒" : v > 0 ? "░" : " ").repeat(2));
  const head = " ".repeat(labelW + 2) + heads.map((h) => padEnd(h, 4)).join("");
  const body = capped.rows.map(
    (r, j) => `${padEnd(labels[j], labelW)}  ${Array.from({ length: n }, (_, i) => padEnd(shade(r.values[i]), 4)).join("")}`
  );
  const notes = [totalPeriods > n ? `… and ${totalPeriods - n} more periods` : "", capped.note].filter(Boolean);
  return join([head, ...body, ...notes, "", "█ 80%+   ▓ 60%+   ▒ 40%+   ░ under 40%"]);
}

/**
 * Test result with confidence intervals on one scale. variants: [{ label, value, low, high }]
 * █ is the measured value, ├ ┤ the interval.
 */
export function abResult(variants, { min, max, width: preferred = 36, unit = "%", decimals = 1, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(variants);
  variants = capped.rows;
  const lo = min ?? Math.min(...variants.map((v) => v.low));
  const hi = max ?? Math.max(...variants.map((v) => v.high));
  const labels = fitLabels(variants.map((v) => v.label));
  const labelW = Math.max(0, ...labels.map(len));
  const f = (x) => `${x.toFixed(decimals)}${unit}`;
  const suffixW = Math.max(0, ...variants.map((v) => len(`${f(v.value)} (${f(v.low)}–${f(v.high)})`)));
  const width = Math.max(4, Math.min(preferred, maxWidth - labelW - suffixW - 5));
  const at = (x) => clamp(Math.round(((x - lo) / (hi - lo || 1)) * width), 0, width);
  const lines = variants.map((v, n) => {
    const cells = Array(width + 1).fill(" ");
    for (let i = at(v.low); i <= at(v.high); i++) cells[i] = "─";
    cells[at(v.low)] = "├";
    cells[at(v.high)] = "┤";
    cells[at(v.value)] = "█";
    return `${padEnd(labels[n], labelW)}  ${cells.join("")}  ${f(v.value)} (${f(v.low)}–${f(v.high)})`;
  });
  const axis = place([
    [labelW + 2, f(lo)],
    [labelW + 2 + Math.round(width / 2) - 1, f((lo + hi) / 2)],
    [labelW + 2 + width - len(f(hi)) + 1, f(hi)]
  ]);
  const overlap = variants.length === 2 && variants[0].high >= variants[1].low && variants[1].high >= variants[0].low;
  return join([...lines, ...(capped.note ? [capped.note] : []), axis, "", overlap ? "The intervals overlap: no clear difference yet." : "The intervals don't overlap."]);
}

/** A row per metric: trend, latest value, change since the first point. items: [{ label, values, unit? }] */
export function metricPanel(items, { decimals = 0, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(items);
  const labels = fitLabels(capped.rows.map((m) => m.label));
  const labelW = Math.max(0, ...labels.map(len));
  const rows = capped.rows.map((m, i) => {
    const first = m.values[0];
    const last = m.values.at(-1);
    const delta = first ? (last - first) / Math.abs(first) : 0;
    const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "·";
    const value = `${Number(last).toFixed(decimals)}${m.unit ?? ""}`;
    return [padEnd(labels[i], labelW), sparkline(m.values), value, `${arrow} ${Math.abs(Math.round(delta * 100))}%`];
  });
  const sparkW = Math.max(...rows.map((r) => len(r[1])));
  const valueW = Math.max(...rows.map((r) => len(r[2])));
  const room = Math.max(1, maxWidth - labelW - valueW - Math.max(...rows.map((r) => len(r[3]))) - 6);
  const lines = rows.map(([l, s, v, d]) => `${l}  ${padEnd(cut(s, Math.min(sparkW, room)), Math.min(sparkW, room))}  ${padStart(v, valueW)}  ${d}`);
  return join(capped.note ? [...lines, capped.note] : lines);
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
    check: (d) => [d.value < 0 || d.cap < 0 || (d.cap === 0 && d.value > 0) ? "Use a nonnegative value and a positive cap, or zero for both." : ""], render: (d, o) => meter(d.value, d.cap, o), summary: (d) => `${d.value} of ${d.cap}` },
  sparkline: {
    label: "Sparkline",
    render: (d, o = {}) => {
      const maxWidth = o.maxWidth ?? LAYOUT.maxWidth;
      const label = fitLabels([d.label])[0];
      const ends = `${d.values[0]} → ${d.values.at(-1)}`;
      return `${label}  ${cut(sparkline(d.values), Math.max(1, maxWidth - len(label) - len(ends) - 4))}  ${ends}`;
    },
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
    normalize: (data) => Array.isArray(data) ? data : data.steps,
    motion: motionFunnel,
    check: (d) => [checks.notNegative(d, "value", "count"), checks.neverGrows(d, "value")], render: funnel, summary: (s, { lang } = {}) => s.map((x) => `${x.label}: ${fmt(x.value, lang)}`).join(", ") },
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

kinds.barChart.motion = (data, options) => motionBarChart(data, options, kinds.barChart.render);
kinds.cohort.motion = (data, options) => motionCohort(data, options, kinds.cohort.render);
kinds.sparkline.motion = (data, options) => motionSparkline(data, options, kinds.sparkline.render);
kinds.metricPanel.motion = (data, options) => motionMetricPanel(data, options, kinds.metricPanel.render);
kinds.meter.motion = (data, options) => motionMeter(data, options, kinds.meter.render);
kinds.forecast.motion = (data, options) => motionForecast(data, options, kinds.forecast.render);
kinds.calendarStrip.motion = (data, options) => motionCalendarStrip(data, options, kinds.calendarStrip.render);
kinds.heatmap.motion = (data, options) => motionHeatmap(data, options, kinds.heatmap.render);
