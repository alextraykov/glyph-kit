// Design system docs: scales, contrast, colour, component states, layers, token tables.
import { checks } from "../guard.mjs";
import { bar, clamp, cut, join, len, padEnd, padStart, place, table } from "../core.mjs";
import { LAYOUT, capRows, fitLabels } from "../layout.mjs";
import { readingOrder } from "../arrive.mjs";
import { contrastRatio, luminance } from "../render/themes.mjs";

/** WCAG contrast ratio between two hex colours (shared with the theme check). */
export { contrastRatio };

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

const HEX6 = /^#[0-9a-f]{6}$/i;
const ratioText = (r) => padStart(r.toFixed(1), 4);
// A swatch is ██ followed by its own value; every rendered form draws it in that colour.
const swatch = (hex) => `██ ${hex.toLowerCase()}`;

/**
 * A tonal scale: one column per hue, one row per step, each step's contrast on the page.
 * { hues: [{ name, steps: [{ name, value: "#rrggbb" }] }], page: "#rrggbb" }
 * ▲ marks the first step in each hue that reads as words on the page (4.5 to 1).
 */
export function palette({ hues, page = "#ffffff" }, { maxWidth = LAYOUT.maxWidth } = {}) {
  const stepNames = [...new Set(hues.flatMap((h) => h.steps.map((s) => String(s.name))))];
  const capped = capRows(stepNames, LAYOUT.rowsMax, "steps");
  const nameW = Math.max(4, ...capped.rows.map(len));
  const colW = len(`▲ ${swatch("#000000")} 21.0`);
  const fits = Math.floor((maxWidth - nameW - 2 + 2) / (colW + 2));
  if (hues.length > fits) throw new Error(`A palette fits ${fits} hues at ${maxWidth} cells; this one has ${hues.length}. Split it into two figures.`);
  const heads = fitLabels(hues.map((h) => h.name), colW - 2);
  // Hue names sit over the swatches, past the ▲ column.
  const head = `${" ".repeat(nameW + 4)}${heads.map((h) => padEnd(h, colW)).join("  ")}`.trimEnd();
  const marked = hues.map((h) => h.steps.find((s) => contrastRatio(s.value, page) >= 4.5)?.name);
  const rows = capped.rows.map((step) => {
    const cells = hues.map((h, i) => {
      const s = h.steps.find((x) => String(x.name) === step);
      if (!s) return " ".repeat(colW);
      return `${String(marked[i]) === step ? "▲" : " "} ${swatch(s.value)} ${ratioText(contrastRatio(s.value, page))}`;
    });
    return `${padEnd(step, nameW)}  ${cells.join("  ")}`.trimEnd();
  });
  return join([head, ...rows, ...(capped.note ? [capped.note] : []), "", `Contrast on the page, ${page.toLowerCase()}. ▲ first step that reads as words: 4.5 to 1.`]);
}

const NEEDS = { words: 4.5, marks: 3, lines: 1.5 };
const verdict = (use, ratios) => {
  const worst = Math.min(...ratios);
  if (use === "words") return worst >= 7 ? "AAA" : worst >= 4.5 ? "AA" : "fails";
  return worst >= NEEDS[use] ? "ok" : "fails";
};

/**
 * What each colour is for: role, token, its light and dark values, each on its page, and a verdict.
 * { page: { light: "#rrggbb", dark?: "#rrggbb" }, roles: [{ role, token, light, dark?, use: "words" | "marks" | "lines" }] }
 * Words need 4.5 to 1 (7 for AAA), marks 3 and lines 1.5, the same as the theme check.
 */
export function colourRoles({ page, roles }, { maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(roles);
  const rows = capped.rows;
  const dark = Boolean(page.dark) && rows.some((r) => r.dark);
  const cell = (hex, bg) => (hex ? `${swatch(hex)} ${ratioText(contrastRatio(hex, bg))}` : "");
  const colW = len(cell("#000000", "#ffffff"));
  const fixed = 2 + 2 + colW + (dark ? 3 + colW : 0) + 3 + len("fails");
  const roleW = Math.min(Math.max(4, ...rows.map((r) => len(r.role))), 14);
  const tokenW = Math.max(5, Math.min(Math.max(5, ...rows.map((r) => len(r.token ?? ""))), maxWidth - roleW - 2 - fixed));
  const roleL = fitLabels(rows.map((r) => r.role), roleW);
  const line = (role, token, light, darkCol, last) =>
    `${padEnd(role, roleW)}  ${padEnd(token, tokenW)}  ${padEnd(light, colW)}${dark ? `   ${padEnd(darkCol, colW)}` : ""}   ${last}`.trimEnd();
  const head = line("role", "token", `light ${page.light.toLowerCase()}`, `dark ${page.dark?.toLowerCase()}`, "");
  const lines = rows.map((r, i) => {
    const ratios = [contrastRatio(r.light, page.light), ...(dark && r.dark ? [contrastRatio(r.dark, page.dark)] : [])];
    return line(roleL[i], cut(r.token ?? "", tokenW), cell(r.light, page.light), dark ? cell(r.dark, page.dark) : "", verdict(r.use ?? "words", ratios));
  });
  return join([head.trimEnd(), ...lines, ...(capped.note ? [capped.note] : []), "", "Words need 4.5 to 1 (7 for AAA), marks 3, lines 1.5."]);
}

const colourChecks = {
  palette: (d) => {
    const problems = [];
    if (!d?.hues?.length) problems.push("A palette needs hues: [{ name, steps: [{ name, value }] }].");
    for (const h of d?.hues ?? []) {
      for (const s of h.steps ?? []) if (!HEX6.test(String(s.value))) problems.push(`${h.name} ${s.name}: write the colour as a hex value like #1f4fd6, not ${s.value}.`);
      const lums = (h.steps ?? []).filter((s) => HEX6.test(String(s.value))).map((s) => luminance(s.value));
      const dir = Math.sign((lums.at(-1) ?? 0) - (lums[0] ?? 0));
      const breaks = lums.findIndex((l, i) => i > 0 && Math.sign(l - lums[i - 1]) !== dir && l !== lums[i - 1]);
      if (dir && breaks > 0) problems.push(`${h.name} ${h.steps[breaks].name} is ${dir < 0 ? "lighter" : "darker"} than ${h.steps[breaks - 1].name}; a scale's steps get steadily ${dir < 0 ? "darker" : "lighter"}.`);
    }
    if (d?.page && !HEX6.test(String(d.page))) problems.push(`Write the page colour as a hex value like #ffffff, not ${d.page}.`);
    return problems;
  },
  colourRoles: (d) => {
    const problems = [];
    if (!HEX6.test(String(d?.page?.light))) problems.push('Colour roles need the page colours: { "page": { "light": "#ffffff", "dark": "#0d0d0c" } }.');
    if (d?.page?.dark && !HEX6.test(String(d.page.dark))) problems.push(`Write the dark page colour as a hex value, not ${d.page.dark}.`);
    for (const r of d?.roles ?? []) {
      for (const k of ["light", "dark"]) if (r[k] != null && !HEX6.test(String(r[k]))) problems.push(`${r.role} ${k}: write the colour as a hex value like #1f4fd6, not ${r[k]}.`);
      if (r.light == null) problems.push(`${r.role} needs its light colour.`);
      if (r.use && !NEEDS[r.use]) problems.push(`${r.role}: use is words, marks or lines, not ${r.use}.`);
    }
    if (!d?.roles?.length) problems.push("Colour roles need roles: [{ role, token, light, dark, use }].");
    return problems;
  }
};

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
  palette: {
    label: "Palette",
    check: colourChecks.palette,
    render: palette,
    arrive: readingOrder,
    summary: (d) => d.hues.map((h) => `${h.name}: ${h.steps.length} steps, words from ${h.steps.find((s) => contrastRatio(s.value, d.page ?? "#ffffff") >= 4.5)?.name ?? "no step"}`).join(". ") + "."
  },
  colourRoles: {
    label: "Colour roles",
    check: colourChecks.colourRoles,
    render: colourRoles,
    arrive: readingOrder,
    summary: (d) => {
      const failing = d.roles.filter((r) => verdict(r.use ?? "words", [contrastRatio(r.light, d.page.light), ...(d.page.dark && r.dark ? [contrastRatio(r.dark, d.page.dark)] : [])]) === "fails");
      return `${d.roles.length} colour roles${failing.length ? `; ${failing.map((r) => r.role).join(", ")} ${failing.length === 1 ? "fails" : "fail"} contrast` : ", all passing contrast"}.`;
    }
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
