// Design system docs: scales, contrast, component states, layers, token tables.
import { checks } from "../guard.mjs";
import { bar, clamp, cut, join, len, padEnd, padStart, place, table } from "../core.mjs";
import { LAYOUT, capRows, fitLabels } from "../layout.mjs";
import { readingOrder } from "../arrive.mjs";

/** Spacing tokens drawn to scale, one cell per `unit` pixels. tokens: [{ name, value }] */
export function spacingScale(tokens, { unit = 4, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(tokens);
  const labels = fitLabels(capped.rows.map((t) => t.name));
  const nameW = Math.max(0, ...labels.map(len));
  const natural = Math.max(...capped.rows.map((t) => Math.round(t.value / unit)));
  const suffixW = Math.max(0, ...capped.rows.map((t) => len(`${t.value}px`)));
  const maxCells = Math.max(1, Math.min(natural, maxWidth - nameW - suffixW - 4));
  return join([
    ...capped.rows.map((t, i) => `${padEnd(labels[i], nameW)}  ${padEnd("█".repeat(Math.max(1, Math.min(maxCells, Math.round(t.value / unit)))), maxCells)}  ${t.value}px`),
    ...(capped.note ? [capped.note] : []),
    "",
    `One █ is ${unit}px.`
  ]);
}

/** Type sizes as bars proportional to size, with line height. steps: [{ name, size, lineHeight }] */
export function typeScale(steps, { width: preferred = 28, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(steps);
  steps = capped.rows;
  const labels = fitLabels(steps.map((s) => s.name));
  const nameW = Math.max(0, ...labels.map(len));
  const top = Math.max(...steps.map((s) => s.size));
  const suffixW = Math.max(0, ...steps.map((s) => len(`${s.size}/${s.lineHeight ?? Math.round(s.size * 1.4)}`)));
  const width = Math.max(4, Math.min(preferred, maxWidth - nameW - suffixW - 4));
  const lines = steps.map((s, i) => `${padEnd(labels[i], nameW)}  ${bar(s.size, top, { width })}  ${s.size}/${s.lineHeight ?? Math.round(s.size * 1.4)}`);
  return join(capped.note ? [...lines, capped.note] : lines);
}

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
/** WCAG contrast ratio between two hex colours. */
export function contrastRatio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/**
 * Contrast of colour pairs against WCAG 2 thresholds. pairs: [{ label, fg, bg }]
 * The scale runs to 21:1; the thresholds 3, 4.5 and 7 are marked above it.
 */
export function contrast(pairs, { width: preferred = 42, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(pairs);
  pairs = capped.rows;
  const labels = fitLabels(pairs.map((p) => p.label));
  const labelW = Math.max(0, ...labels.map(len));
  const suffixWidth = Math.max(0, ...pairs.map((p) => {
    const ratio = contrastRatio(p.fg, p.bg);
    const grade = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large text only" : "fails";
    return len(`  ${padStart(ratio.toFixed(1), 4)}:1  ${grade}`);
  }));
  const width = Math.max(8, Math.min(preferred, maxWidth - labelW - 2 - suffixWidth));
  const at = (r) => Math.round((r / 21) * width);
  // Threshold labels need a space between them; on a narrow scale a label that would touch the one
  // before it is dropped, and its ┊ still marks the place.
  // The scale's end always keeps its label.
  const kept = [];
  for (const [col, text] of [[at(3), "3"], [at(4.5), "4.5"], [at(7), "7"]]) {
    const prev = kept.at(-1);
    if ((!prev || col > prev[0] + len(prev[1])) && col + len(text) < width - 3) kept.push([col, text]);
  }
  const marks = place([...kept, [width - 3, "21:1"]].map(([col, text]) => [labelW + 2 + col, text]));
  const rows = pairs.map((p, i) => {
    const ratio = contrastRatio(p.fg, p.bg);
    const grade = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large text only" : "fails";
    const cells = [...bar(ratio, 21, { width, empty: "·" })];
    for (const t of [3, 4.5, 7]) if (cells[at(t)] === "·") cells[at(t)] = "┊";
    return `${padEnd(labels[i], labelW)}  ${cells.join("")}  ${padStart(ratio.toFixed(1), 4)}:1  ${grade}`;
  });
  return join([marks, ...rows, ...(capped.note ? [capped.note] : [])]);
}

/**
 * Which component states are designed, built or missing.
 * { variants: [...], states: [...], cells: { variant: { state: "done" | "progress" | "missing" | "na" } } }
 */
export function stateMatrix({ variants, states, cells }, { maxWidth = LAYOUT.maxWidth } = {}) {
  const glyph = { done: "██", progress: "▒▒", missing: "░░", na: "  " };
  const capped = capRows(variants, LAYOUT.rowsMax, "variants");
  const variantLabels = fitLabels(capped.rows);
  const vW = Math.max(0, ...variantLabels.map(len));
  const available = Math.floor((maxWidth - vW - 2) / Math.max(1, states.length));
  if (available < 4) throw new Error(`A component state table fits at most ${Math.floor((maxWidth - vW - 2) / 4)} states at ${maxWidth} cells; this one has ${states.length}.`);
  const colW = Math.min(Math.max(...states.map(len)) + 2, available);
  const stateLabels = states.map((state) => cut(state, colW - 1));
  const head = " ".repeat(vW + 2) + stateLabels.map((s) => padEnd(s, colW)).join("");
  const rows = capped.rows.map((v, i) => `${padEnd(variantLabels[i], vW)}  ${states.map((s) => padEnd(glyph[cells[v]?.[s] ?? "missing"], colW)).join("")}`);
  return join([head, ...rows, ...(capped.note ? [capped.note] : []), "", "█ done   ▒ in progress   ░ missing   blank: doesn't apply"]);
}

/** Layers from front to back, wider as they go back. levels: [{ name, z }] (any order) */
export function layerStack(levels, { width: preferred = 12, step = 4, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows([...levels].sort((a, b) => b.z - a.z));
  const sorted = capped.rows;
  const labels = fitLabels(sorted.map((l) => l.name));
  const nameW = Math.max(0, ...labels.map(len));
  const fills = ["█", "▓", "▒", "░"];
  const fixed = nameW + 6 + Math.max(4, ...sorted.map((l) => len(String(l.z))));
  const stepSize = sorted.length > 1 ? Math.max(0, Math.min(step, Math.floor((maxWidth - fixed - 4) / (sorted.length - 1)))) : 0;
  const width = Math.max(4, Math.min(preferred, maxWidth - fixed - stepSize * Math.max(0, sorted.length - 1)));
  const total = width + stepSize * (sorted.length - 1);
  const lines = sorted.map((l, i) => {
      const w = width + stepSize * i;
      const last = i === sorted.length - 1;
      const fill = last ? "─" : fills[Math.min(i, fills.length - 1)];
      const pad = Math.floor((total - w) / 2);
      return `${padEnd(labels[i], nameW)}  z ${padEnd(String(l.z), 4)}  ${" ".repeat(pad)}${fill.repeat(w)}`;
    });
  return join(capped.note ? [...lines, capped.note] : lines);
}

/** Design tokens as a table. tokens: [{ name, value, use }] */
export function tokenTable(tokens) {
  return table([["Token", "Value", "Use"], ...tokens.map((t) => [t.name, t.value, t.use ?? ""])]);
}

export const kinds = {
  spacingScale: { label: "Spacing scale",
    check: (d) => [checks.notNegative(d, "value")], render: spacingScale, summary: (t) => t.map((x) => `${x.name} ${x.value}px`).join(", ") },
  typeScale: { label: "Type scale", render: typeScale, summary: (s) => s.map((x) => `${x.name} ${x.size}px`).join(", ") },
  contrast: {
    label: "Contrast check",
    render: contrast,
    summary: (p) => p.map((x) => `${x.label}: ${contrastRatio(x.fg, x.bg).toFixed(1)} to 1`).join(". ")
  },
  stateMatrix: {
    label: "Component states",
    render: stateMatrix,
    summary: (d) => `${d.variants.length} variants by ${d.states.length} states.`
  },
  layerStack: { label: "Layer stack", render: layerStack, summary: (l) => l.map((x) => `${x.name} at ${x.z}`).join(", ") },
  tokenTable: { label: "Token table", render: tokenTable, arrive: readingOrder, summary: (t) => t.map((x) => `${x.name}: ${x.value}`).join(", ") },
  table: { label: "Table", render: table, arrive: readingOrder, summary: (r) => `Table with ${r.length - 1} rows: ${r[0].join(", ")}.` }
};
