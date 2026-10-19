// Design system docs: scales, contrast, component states, layers, token tables.
import { checks } from "../guard.mjs";
import { bar, clamp, join, len, padEnd, padStart, place, table } from "../core.mjs";

/** Spacing tokens drawn to scale, one cell per `unit` pixels. tokens: [{ name, value }] */
export function spacingScale(tokens, { unit = 4 } = {}) {
  const nameW = Math.max(...tokens.map((t) => len(t.name)));
  const maxCells = Math.max(...tokens.map((t) => Math.round(t.value / unit)));
  return join([
    ...tokens.map((t) => `${padEnd(t.name, nameW)}  ${padEnd("█".repeat(Math.max(1, Math.round(t.value / unit))), maxCells)}  ${t.value}px`),
    "",
    `One █ is ${unit}px.`
  ]);
}

/** Type sizes as bars proportional to size, with line height. steps: [{ name, size, lineHeight }] */
export function typeScale(steps, { width = 28 } = {}) {
  const nameW = Math.max(...steps.map((s) => len(s.name)));
  const top = Math.max(...steps.map((s) => s.size));
  return join(steps.map((s) => `${padEnd(s.name, nameW)}  ${bar(s.size, top, { width })}  ${s.size}/${s.lineHeight ?? Math.round(s.size * 1.4)}`));
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
export function contrast(pairs, { width = 42 } = {}) {
  const labelW = Math.max(...pairs.map((p) => len(p.label)));
  const at = (r) => Math.round((r / 21) * width);
  const marks = place([[labelW + 2 + at(3), "3"], [labelW + 2 + at(4.5), "4.5"], [labelW + 2 + at(7), "7"], [labelW + 2 + width - 3, "21:1"]]);
  const rows = pairs.map((p) => {
    const ratio = contrastRatio(p.fg, p.bg);
    const grade = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large text only" : "fails";
    const cells = [...bar(ratio, 21, { width, empty: "·" })];
    for (const t of [3, 4.5, 7]) if (cells[at(t)] === "·") cells[at(t)] = "┊";
    return `${padEnd(p.label, labelW)}  ${cells.join("")}  ${padStart(ratio.toFixed(1), 4)}:1  ${grade}`;
  });
  return join([marks, ...rows]);
}

/**
 * Which component states are designed, built or missing.
 * { variants: [...], states: [...], cells: { variant: { state: "done" | "progress" | "missing" | "na" } } }
 */
export function stateMatrix({ variants, states, cells }) {
  const glyph = { done: "██", progress: "▒▒", missing: "░░", na: "  " };
  const vW = Math.max(...variants.map(len));
  const colW = Math.max(...states.map(len)) + 2;
  const head = " ".repeat(vW + 2) + states.map((s) => padEnd(s, colW)).join("");
  const rows = variants.map((v) => `${padEnd(v, vW)}  ${states.map((s) => padEnd(glyph[cells[v]?.[s] ?? "missing"], colW)).join("")}`);
  return join([head, ...rows, "", "█ done   ▒ in progress   ░ missing   blank: doesn't apply"]);
}

/** Layers from front to back, wider as they go back. levels: [{ name, z }] (any order) */
export function layerStack(levels, { width = 12, step = 4 } = {}) {
  const sorted = [...levels].sort((a, b) => b.z - a.z);
  const nameW = Math.max(...sorted.map((l) => len(l.name)));
  const fills = ["█", "▓", "▒", "░"];
  const total = width + step * (sorted.length - 1);
  return join(
    sorted.map((l, i) => {
      const w = width + step * i;
      const last = i === sorted.length - 1;
      const fill = last ? "─" : fills[Math.min(i, fills.length - 1)];
      const pad = Math.floor((total - w) / 2);
      return `${padEnd(l.name, nameW)}  z ${padEnd(String(l.z), 4)}  ${" ".repeat(pad)}${fill.repeat(w)}`;
    })
  );
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
  tokenTable: { label: "Token table", render: tokenTable, summary: (t) => t.map((x) => `${x.name}: ${x.value}`).join(", ") },
  table: { label: "Table", render: table, summary: (r) => `Table with ${r.length - 1} rows: ${r[0].join(", ")}.` }
};
