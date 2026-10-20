// Experiments and metrics: funnels, cohorts, test results, metric panels, plus the core charts.
import { checks } from "../guard.mjs";
import {
  bar,
  barChart,
  calendarStrip,
  clamp,
  compare,
  compareColumns,
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
import { LAYOUT, capRows, fitLabels, stack } from "../layout.mjs";
import { motionFunnel } from "../motion/process.mjs";
import { Grid, changes } from "../live/grid.mjs";
import { barsFill, byColumns } from "../arrive.mjs";

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

const overlaps = (variants) => variants.length === 2 && variants[0].high >= variants[1].low && variants[1].high >= variants[0].low;

// One scale for every reading, so the axis and the bars never shift between them.
function abLayout(sets, { min, max, width: preferred = 36, unit = "%", decimals = 1, maxWidth = LAYOUT.maxWidth } = {}) {
  const all = sets.flat();
  const lo = min ?? Math.min(...all.map((v) => v.low));
  const hi = max ?? Math.max(...all.map((v) => v.high));
  const labels = fitLabels(sets.at(-1).map((v) => v.label));
  const labelW = Math.max(0, ...labels.map(len));
  const f = (x) => `${x.toFixed(decimals)}${unit}`;
  const suffixW = Math.max(0, ...all.map((v) => len(`${f(v.value)} (${f(v.low)}–${f(v.high)})`)));
  const width = Math.max(4, Math.min(preferred, maxWidth - labelW - suffixW - 5));
  return { lo, hi, labels, labelW, f, width };
}

// The figure as parts: `fixed` is drawn as is, `value` is a number that scrambles when it changes.
// The verdict is a sentence, so it switches in one step.
function abParts(variants, note, { lo, hi, labels, labelW, f, width }, tail = "") {
  const at = (x) => clamp(Math.round(((x - lo) / (hi - lo || 1)) * width), 0, width);
  const rows = variants.map((v, n) => {
    const cells = Array(width + 1).fill(" ");
    for (let i = at(v.low); i <= at(v.high); i++) cells[i] = "─";
    cells[at(v.low)] = "├";
    cells[at(v.high)] = "┤";
    cells[at(v.value)] = "█";
    return { fixed: `${padEnd(labels[n], labelW)}  ${cells.join("")}  `, value: `${f(v.value)} (${f(v.low)}–${f(v.high)})` };
  });
  const axis = place([
    [labelW + 2, f(lo)],
    [labelW + 2 + Math.round(width / 2) - 1, f((lo + hi) / 2)],
    [labelW + 2 + width - len(f(hi)) + 1, f(hi)]
  ]);
  const verdict = (overlaps(variants) ? "The intervals overlap: no clear difference yet." : "The intervals don't overlap.") + tail;
  return [...rows, ...(note ? [{ fixed: note }] : []), { fixed: axis }, { fixed: "" }, { fixed: verdict }];
}

// What the earlier readings add to the last one, in one sentence.
function abHistory(readings) {
  const earlier = readings.slice(0, -1);
  if (!overlaps(readings.at(-1).variants)) {
    const until = earlier.filter((r) => overlaps(r.variants)).at(-1);
    return until ? ` They overlapped until day ${until.day}.` : "";
  }
  const apart = earlier.find((r) => r.variants.length === 2 && !overlaps(r.variants));
  return apart ? ` On day ${apart.day} they looked apart.` : "";
}

// One reading with its day line on top; the last one also carries the history.
function abReadingParts(readings, k, layout, { days, lang } = {}) {
  const r = readings[k];
  const capped = capRows(r.variants);
  const day = cut(`day ${r.day}${days ? ` of ${days}` : ""}${r.people != null ? ` · ${fmt(r.people, lang)} people` : ""}`, LAYOUT.maxWidth);
  return [{ fixed: "", value: day }, { fixed: "" }, ...abParts(capped.rows, capped.note, layout, k === readings.length - 1 ? abHistory(readings) : "")];
}

const abSets = (readings) => readings.map((r) => capRows(r.variants).rows);

/**
 * Test result with confidence intervals on one scale. variants: [{ label, value, low, high }]
 * █ is the measured value, ├ ┤ the interval. With `{ readings: [{ day, people?, variants }], days? }`
 * it draws the last reading, says what the earlier ones showed, and moves through them.
 */
export function abResult(variants, options = {}) {
  if (variants.readings) {
    const layout = abLayout(abSets(variants.readings), options);
    return join(abReadingParts(variants.readings, variants.readings.length - 1, layout, { days: variants.days, lang: options.lang }).map((p) => p.fixed + (p.value ?? "")));
  }
  const capped = capRows(variants);
  return join(abParts(capped.rows, capped.note, abLayout([capped.rows], options)).map((p) => p.fixed + (p.value ?? "")));
}

/** The test running: one reading every 8 steps, the last held for 20, then back to the first. */
export function motionAbResult(data, options = {}) {
  const readings = data.readings;
  if (!readings) throw new Error("A test result moves only when it has readings over time. Add data.readings, one per day, each with its variants.");
  const layout = abLayout(abSets(readings), options);
  const frames = readings.map((_, k) => abReadingParts(readings, k, layout, { days: data.days, lang: options.lang }));
  const HOLD = 8;
  const CYCLE = (readings.length - 1) * HOLD + 20;
  const cols = Math.max(...frames.flat().map((p) => len(p.fixed + (p.value ?? ""))));
  return {
    still: (readings.length - 1) * HOLD + 10,
    make: () => {
      const since = changes();
      return (step) => {
        const s = Math.floor(step) % CYCLE;
        const k = Math.min(readings.length - 1, Math.floor(s / HOLD));
        const parts = frames[k];
        const before = frames[(k || readings.length) - 1];
        const g = new Grid(parts.length, cols);
        parts.forEach((p, row) => {
          g.text(row, 0, p.fixed);
          if (!p.value) return;
          // Only the characters that differ from the reading before scramble; the rest stay put.
          const age = since(row, p.value, step);
          const was = [...(before[row].value ?? "")];
          let col = len(p.fixed);
          let run = "";
          const flush = () => { if (run) g.scramble(row, col - len(run), run, age, step, row === 0 ? "mute" : ""); run = ""; };
          [...p.value].forEach((ch, i) => {
            if (ch === was[i]) { flush(); g.text(row, col, ch, row === 0 ? "mute" : ""); }
            else run += ch;
            col += len(ch);
          });
          flush();
        });
        return g;
      };
    }
  };
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
  const trendW = Math.max(5, Math.min(sparkW, room));
  const lines = rows.map(([l, s, v, d]) => `${l}   ${padEnd(cut(s, trendW), trendW)}   ${padStart(v, valueW)}   ${d}`);
  const head = `${padEnd("metric", labelW)}   ${padEnd("trend", trendW)}   ${padStart("now", valueW)}   change`;
  return join([head, "", ...stack(lines), ...(capped.note ? [capped.note] : [])]);
}

export const kinds = {
  barChart: { label: "Bar chart",
    check: (d) => [checks.notNegative(d, "value")], render: barChart, arrive: barsFill, summary: (rows) => rows.map((r) => `${r.label}: ${r.text ?? r.value}`).join(". ") },
  compare: {
    label: "Comparison",
    check: (d) => [checks.within(d, "a", 0, 1, "before share"), checks.within(d, "b", 0, 1, "after share")],
    render: compare,
    arrive: (lines, data, options) => byColumns(compareColumns(data, options)),
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
    // A list of variants, or { readings: [{ day, people?, variants }], days? }: the last reading is the result.
    normalize: (d) => {
      if (Array.isArray(d) || !d?.readings) return d;
      if (!d.readings.length) throw new Error("A test result over time needs at least one reading.");
      return Object.assign([...d.readings.at(-1).variants], { readings: d.readings, days: d.days });
    },
    check: (d) => [
      checks.ordered(d, ["low", "value", "high"], "the value should sit inside its range"),
      ...(d.readings ? [
        checks.inTimeOrder(d.readings, "day", "reading"),
        ...d.readings.slice(0, -1).map((r) => checks.ordered(r.variants, ["low", "value", "high"], `on day ${r.day} the value should sit inside its range`)),
        ...d.readings.map((r) => (r.variants.map((v) => v.label).join("\n") === d.map((v) => v.label).join("\n") ? "" : `The reading on day ${r.day} has different variants from the last one.`))
      ] : [])
    ],
    render: abResult,
    motion: motionAbResult,
    summary: (v) => v.map((x) => `${x.label}: ${x.value} (${x.low} to ${x.high})`).join(". ") + (v.readings ? `. ${v.readings.length} readings, day ${v.readings[0].day} to day ${v.readings.at(-1).day}.${abHistory(v.readings)}` : "")
  },
  metricPanel: {
    label: "Metric panel",
    render: metricPanel,
    summary: (items) => items.map((m) => `${m.label}: ${m.values.at(-1)}${m.unit ?? ""}`).join(". ")
  }
};

