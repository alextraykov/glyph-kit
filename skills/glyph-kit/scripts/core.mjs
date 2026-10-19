// glyph-kit core: pure functions that turn data into text diagrams.
// No dependencies, no DOM. Every function returns a string (lines joined with "\n").
// The command line lives in glyph-kit.mjs; the registry of kinds in registry.mjs.

import {
  cellWidth,
  cells as textCells,
  center,
  cut,
  formatNumber,
  graphemes,
  isRtl,
  padEnd,
  padStart,
  upper,
  width,
  wrap
} from "./text.mjs";
import { LAYOUT, capRows, fitColumns, fitLabels } from "./layout.mjs";

export { cellWidth, center, cut, formatNumber, graphemes, isRtl, padEnd, padStart, textCells, upper, width, wrap };

export const SHADES = [" ", "░", "▒", "▓", "█"];
export const EIGHTHS_LEFT = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"]; // horizontal, 1/8 to 7/8 of a cell
export const EIGHTHS_LOW = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"]; // vertical, for sparklines
export const BOX = {
  light: { h: "─", v: "│", tl: "┌", tr: "┐", bl: "└", br: "┘", lt: "├", rt: "┤", tt: "┬", bt: "┴", x: "┼" },
  heavy: { h: "━", v: "┃", tl: "┏", tr: "┓", bl: "┗", br: "┛", lt: "┣", rt: "┫", tt: "┳", bt: "┻", x: "╋" },
  double: { h: "═", v: "║", tl: "╔", tr: "╗", bl: "╚", br: "╝", lt: "╠", rt: "╣", tt: "╦", bt: "╩", x: "╬" }
};

// Shared helpers, also used by the area modules.
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const len = width;
export const join = (lines) => lines.map((l) => l.replace(/\s+$/, "")).join("\n");
/** Place text pieces at fixed columns on one line: place([[0, "a"], [10, "b"]]). */
export const place = (pieces) => {
  const row = [];
  for (const [col, text] of pieces) textCells(text).forEach((ch, i) => (row[col + i] = ch));
  return Array.from(row, (ch) => ch ?? " ").join("").replace(/\s+$/, "");
};

/**
 * One horizontal bar with 1/8-cell precision.
 * A positive value never draws as empty: it gets at least ▏, because an empty bar reads as zero.
 * A value past max fills the bar and ends with "+".
 */
export function bar(value, max, { width = 20, empty = " " } = {}) {
  if (!Number.isFinite(value) || value <= 0 || max <= 0) return empty.repeat(width);
  if (value > max) return "█".repeat(width) + "+";
  const units = (value / max) * width;
  let full = Math.floor(units);
  let eighth = Math.round((units - full) * 8);
  if (eighth === 8) {
    full += 1; // carry into a whole cell instead of dropping the remainder
    eighth = 0;
  }
  if (full === 0 && eighth === 0) eighth = 1;
  const head = "█".repeat(full) + EIGHTHS_LEFT[eighth];
  return head + empty.repeat(Math.max(0, width - len(head)));
}

/** Labelled horizontal bar chart. rows: [{ label, value, text? }] */
export function barChart(rows, { width: preferred = 24, max, lang, format = lang ? (n) => new Intl.NumberFormat(lang).format(n) : String, empty = " ", maxWidth = LAYOUT.maxWidth } = {}) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 0);
  const capped = capRows(rows);
  const labels = fitLabels(capped.rows.map((r) => r.label));
  const values = capped.rows.map((r) => cut(r.text ?? format(r.value), 16));
  const labelW = Math.max(0, ...labels.map(len));
  const valueW = Math.max(0, ...values.map(len));
  const width = Math.max(4, Math.min(preferred, maxWidth - labelW - valueW - 4 - (max != null ? 1 : 0)));
  const lines = capped.rows.map((r, i) => `${padEnd(labels[i], labelW)}  ${bar(r.value, top, { width, empty })}  ${values[i]}`);
  return join(capped.note ? [...lines, capped.note] : lines);
}

/**
 * Coarse whole-cell bar for comparisons. ░ keeps the scale visible, so 0% still reads as a bar.
 */
export function cells(fraction, { width = 10 } = {}) {
  const f = clamp(Number(fraction) || 0, 0, 1);
  let n = Math.round(f * width);
  if (f > 0 && n === 0) n = 1;
  return "█".repeat(n) + "░".repeat(width - n);
}

/** Side-by-side comparison table. rows: [{ label, a, b, aText, bText }] with a and b as 0..1. */
export function compare(rows, { headers = ["", "A", "B"], width: preferred = 10, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(rows);
  const labels = fitLabels(capped.rows.map((r) => r.label));
  const texts = capped.rows.flatMap((r) => [cut(r.aText ?? "", 12), cut(r.bText ?? "", 12)]);
  const labelW = Math.max(len(headers[0]), ...labels.map(len));
  const textW = Math.max(0, ...texts.map(len));
  const width = Math.max(2, Math.min(preferred, Math.floor((maxWidth - labelW - textW * 2 - 7) / 2)));
  const cell = (f, t) => `${cells(f, { width })} ${cut(t ?? "", 12)}`;
  const aCol = capped.rows.map((r) => cell(r.a, r.aText));
  const colW = Math.max(len(headers[1]), ...aCol.map(len)) + 2;
  const lines = [
    `${padEnd(headers[0], labelW)}  ${padEnd(headers[1], colW)}${headers[2]}`,
    ...capped.rows.map((r, i) => `${padEnd(labels[i], labelW)}  ${padEnd(aCol[i], colW)}${cell(r.b, r.bText)}`)
  ];
  return join(capped.note ? [...lines, capped.note] : lines);
}

/**
 * Measured values in █, projected values in ░, in the same bar.
 * rows: [{ label, measured, projected?, text? }]
 */
export function forecast(rows, { width: preferred = 36, max, legend = "░ = projected at the current pace", maxWidth = LAYOUT.maxWidth } = {}) {
  const top = (max ?? Math.max(...rows.map((r) => (r.measured ?? 0) + (r.projected ?? 0)))) || 1;
  if (rows.some((r) => (r.measured ?? 0) < 0 || (r.projected ?? 0) < 0 || (r.measured ?? 0) + (r.projected ?? 0) > top)) throw new Error("Forecast values must fit between zero and the scale maximum.");
  const capped = capRows(rows);
  const labels = fitLabels(capped.rows.map((r) => r.label));
  const texts = capped.rows.map((r) => cut(r.text ?? "", 18));
  const labelW = Math.max(0, ...labels.map(len));
  const textW = Math.max(0, ...texts.map(len));
  const width = Math.max(4, Math.min(preferred, maxWidth - labelW - textW - 3));
  const lines = capped.rows.map((r, i) => {
    const m = Math.round(((r.measured ?? 0) / top) * width);
    const p = Math.round((((r.measured ?? 0) + (r.projected ?? 0)) / top) * width) - m;
    const body = "█".repeat(m) + "░".repeat(Math.max(0, p));
    return `${padEnd(labels[i], labelW)} ${padEnd(body, width)}  ${texts[i]}`;
  });
  if (capped.note) lines.push(capped.note);
  return join(rows.some((r) => r.projected) ? [...lines, cut(legend, maxWidth)] : lines);
}

/** A bracketed meter against a cap: [ ████████░░░░ ] 64% of the cap */
export function meter(value, cap, { width = 24, label = "of the cap" } = {}) {
  const f = cap > 0 ? value / cap : 0;
  const n = clamp(Math.round(f * width), f > 0 ? 1 : 0, width);
  const over = f > 1 ? " over" : "";
  return `[ ${"█".repeat(n)}${"░".repeat(width - n)} ] ${Math.round(f * 100)}% ${label}${over}`;
}

/** Sparkline from ▁ to █. null or undefined draws a gap. */
export function sparkline(values, { min, max } = {}) {
  const nums = values.filter(Number.isFinite);
  if (!nums.length) return "";
  const lo = min ?? Math.min(...nums);
  const hi = max ?? Math.max(...nums);
  const span = hi - lo || 1;
  return values
    .map((v) => (Number.isFinite(v) ? EIGHTHS_LOW[clamp(Math.round(((v - lo) / span) * 7), 0, 7)] : " "))
    .join("");
}

/** Density grid. Each value 0..1 picks blank, ░, ▒, ▓ or █. */
export function heatmap(grid, { rowLabels = [], colLabels = "", levels = SHADES, cellWidth = 2, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(grid);
  const labels = fitLabels(capped.rows.map((_, i) => rowLabels[i] ?? ""));
  const labelW = Math.max(0, ...labels.map(len));
  const maxCols = Math.max(1, Math.floor((maxWidth - (labelW ? labelW + 1 : 0)) / cellWidth));
  const omittedCols = Math.max(0, ...capped.rows.map((row) => row.length - maxCols));
  const pick = (v) => {
    if (!Number.isFinite(v) || v <= 0) return levels[0];
    return levels[clamp(Math.ceil(v * (levels.length - 1)), 1, levels.length - 1)];
  };
  const lines = capped.rows.map((row, i) => {
    const lead = rowLabels.length ? padEnd(labels[i], labelW) + " " : "";
    return lead + row.slice(0, maxCols).map((v) => pick(v).repeat(cellWidth)).join("");
  });
  if (colLabels) lines.unshift(cut((labelW ? " ".repeat(labelW + 1) : "") + colLabels, maxWidth));
  if (omittedCols) lines.push(`… and ${omittedCols} more columns`);
  if (capped.note) lines.push(capped.note);
  return join(lines);
}

/** One character per day: ■ for a hit, · for a miss, blank for no data. */
export function calendarStrip(days, { hit = "■", miss = "·", gap = "  ", maxWidth = LAYOUT.maxWidth } = {}) {
  const room = Math.max(1, Math.floor((maxWidth + len(gap)) / (1 + len(gap))));
  const omitted = Math.max(0, days.length - room);
  const line = days.slice(0, room).map((d) => (d == null ? " " : d ? hit : miss)).join(gap);
  return omitted ? `${line}\n… and ${omitted} more days` : line;
}

/**
 * Timeline (Gantt) strip. tracks: [{ label, start, end, loop? }] in ms.
 * A loop runs to the end of the scale and ends with →.
 */
export function gantt(tracks, { scale, width: preferred = 40, unit = "ms", ticks = 3, maxWidth = LAYOUT.maxWidth } = {}) {
  const top = (scale ?? Math.max(...tracks.map((t) => t.end))) || 1;
  const capped = capRows(tracks);
  const labels = fitLabels(capped.rows.map((t) => t.label));
  const labelW = Math.max(0, ...labels.map(len));
  const at = (ms) => clamp(Math.round((ms / top) * width), 0, width);
  const fmt = (ms) => (unit === "ms" && ms >= 1000 ? `${+(ms / 1000).toFixed(2)}s` : `${ms}${unit}`);
  const ranges = capped.rows.map((t) => t.loop ? `${fmt(t.start)}, repeats` : `${fmt(t.start)}–${fmt(t.end)}`);
  const rangeW = Math.max(0, ...ranges.map(len));
  const width = Math.max(4, Math.min(preferred, maxWidth - labelW - rangeW - 3));
  const lines = capped.rows.map((t, i) => {
    const s = at(t.start);
    const e = t.loop ? width : Math.min(width, Math.max(s + 1, at(t.end)));
    const strip = "·".repeat(s) + "█".repeat(e - s) + "·".repeat(width - e);
    return `${padEnd(labels[i], labelW)} ${strip}${t.loop ? "→" : " "} ${ranges[i]}`;
  });
  const axis = Array(width + 1).fill(" ");
  const marks = [];
  for (let i = 0; i < ticks; i++) {
    const v = (top * i) / (ticks - 1);
    marks.push([Math.round((i / (ticks - 1)) * width), fmt(Math.round(v))]);
  }
  marks.forEach(([pos, text], i) => {
    const start = i === marks.length - 1 ? Math.max(0, pos - len(text) + 1) : pos;
    textCells(text).forEach((ch, k) => (axis[start + k] = ch));
  });
  if (capped.note) lines.push(capped.note);
  return join([...lines, " ".repeat(labelW + 1) + axis.join("")]);
}

/** Duration ruler: 20 cells of 25ms by default. ▌ marks a half cell, + a value past the scale. */
export function ruler(ms, { scaleMs = 500, cells: n = 20 } = {}) {
  if (ms == null) return "·".repeat(n);
  if (ms < 0) throw new Error("A duration must be zero or greater.");
  const per = scaleMs / n;
  const full = Math.floor(ms / per);
  if (full >= n) return "█".repeat(n) + "+";
  const half = ms - full * per >= per / 2 ? "▌" : "";
  return ("█".repeat(full) + half).padEnd(n, "·");
}

// Cubic bezier helpers for the velocity glyph.
const bez = (p1, p2, t) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
const bezDx = (p1, p2, t) => 3 * (1 - t) * (1 - t) * p1 + 6 * (1 - t) * t * (p2 - p1) + 3 * t * t * (1 - p2);
function solveT([x1, , x2], x) {
  let t = x;
  for (let i = 0; i < 8; i++) {
    const d = bezDx(x1, x2, t);
    if (Math.abs(d) < 1e-6) break;
    const next = t - (bez(x1, x2, t) - x) / d;
    if (next < 0 || next > 1) break;
    t = next;
  }
  if (Math.abs(bez(x1, x2, t) - x) < 1e-5) return t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    t = (lo + hi) / 2;
    if (bez(x1, x2, t) < x) lo = t;
    else hi = t;
  }
  return t;
}

export const EASINGS = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1]
};

/**
 * Speed over time for a cubic-bezier: n equal slices of time, bar height = progress in that slice.
 * Ends with ↺ when the curve overshoots or runs backwards.
 */
export function velocity(curve, n = 8) {
  const b = typeof curve === "string" ? EASINGS[curve] : curve;
  if (!b) return "—";
  const ys = [];
  for (let k = 0; k <= n; k++) ys.push(bez(b[1], b[3], solveT(b, k / n)));
  const d = ys.slice(1).map((y, i) => y - ys[i]);
  const mx = Math.max(...d.map(Math.abs)) || 1;
  const over = ys.some((y) => y > 1.001) || d.some((v) => v < -1e-6);
  return d.map((v) => EIGHTHS_LOW[Math.round((Math.abs(v) / mx) * 7)]).join("") + (over ? "↺" : "");
}

/** Frame text in a box. Optional title sits in the top border. */
export function box(text, { title, style = "light", padding = 1 } = {}) {
  const b = BOX[style];
  const lines = String(text).split("\n");
  const inner = Math.max(...lines.map(len), title ? len(title) + 2 : 0) + padding * 2;
  const pad = " ".repeat(padding);
  const top = title
    ? b.tl + b.h + ` ${title} ` + b.h.repeat(Math.max(0, inner - len(title) - 3)) + b.tr
    : b.tl + b.h.repeat(inner) + b.tr;
  return [top, ...lines.map((l) => b.v + pad + padEnd(l, inner - padding * 2) + pad + b.v), b.bl + b.h.repeat(inner) + b.br].join(
    "\n"
  );
}

/** Boxes in a row joined by arrows: ┌───┐ ──► ┌───┐ */
export function flow(steps, { arrow = " ──► ", style = "light", maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(steps, LAYOUT.rowsMax, "steps");
  const labels = fitLabels(capped.rows);
  const boxes = labels.map((s) => box(s, { style }).split("\n"));
  const draw = (group) => {
    const height = Math.max(...group.map((b) => b.length));
    const mid = Math.floor(height / 2);
    return Array.from({ length: height }, (_, row) => {
      const link = row === mid ? arrow : " ".repeat(len(arrow));
      return group.map((b) => b[row] ?? " ".repeat(len(b[0]))).join(link);
    });
  };
  const natural = draw(boxes);
  if (boxes.length <= 4 && natural.every((line) => len(line) <= maxWidth) && !capped.note) return join(natural);
  const groups = [];
  let group = [];
  for (const current of boxes) {
    const next = [...group, current];
    if (group.length && (next.length > 4 || draw(next).some((line) => len(line) > maxWidth))) {
      groups.push(group);
      group = [current];
    } else group = next;
  }
  if (group.length) groups.push(group);
  const out = [];
  groups.forEach((row, i) => {
    out.push(...draw(row));
    if (i < groups.length - 1) out.push("│", "▼");
  });
  if (capped.note) out.push(capped.note);
  return join(out);
}

/** File or concept tree. node: { name, note?, children? } or an array of them. */
export function tree(nodes, { noteColumn, maxWidth = LAYOUT.maxWidth, maxDepth = 3 } = {}) {
  const rows = [];
  const descendants = (node) => 1 + (node.children ?? []).reduce((n, child) => n + descendants(child), 0);
  const walk = (list, prefix, depth) =>
    list.forEach((n, i) => {
      const last = i === list.length - 1;
      rows.push([prefix + (last ? "└── " : "├── ") + cut(n.name, LAYOUT.labelMax), n.note]);
      if (n.children?.length && depth >= maxDepth) rows.push([prefix + (last ? "    " : "│   ") + `└── … and ${n.children.reduce((sum, child) => sum + descendants(child), 0)} more`, ""]);
      else if (n.children) walk(n.children, prefix + (last ? "    " : "│   "), depth + 1);
    });
  const roots = Array.isArray(nodes) ? nodes : [nodes];
  roots.forEach((r) => {
    rows.push([cut(r.name, LAYOUT.labelMax), r.note]);
    if (r.children) walk(r.children, "", 1);
  });
  const capped = capRows(rows);
  const col = Math.min(noteColumn ?? Math.max(...capped.rows.map(([t]) => len(t))) + 3, Math.floor(maxWidth * 0.65));
  const out = capped.rows.map(([t, note]) => note ? padEnd(cut(t, col - 1), col) + cut(note, maxWidth - col) : cut(t, maxWidth));
  if (capped.note) out.push(capped.note);
  return join(out);
}

/** Table drawn with box characters. rows: arrays of strings; first row is the header. */
export function table(rows, { style = "light", align = [], maxWidth = LAYOUT.maxWidth } = {}) {
  const b = BOX[style];
  const cols = Math.max(...rows.map((r) => r.length));
  const [headRaw = [], ...bodyRaw] = rows;
  const capped = capRows(bodyRaw);
  const logical = [headRaw, ...capped.rows];
  if (capped.note) logical.push([capped.note]);
  const w = fitColumns(logical, { maxWidth });
  const cell = (v, c) => (align[c] === "right" ? padStart(String(v ?? ""), w[c]) : padEnd(String(v ?? ""), w[c]));
  const rule = (l, m, r) => l + w.map((n) => b.h.repeat(n + 2)).join(m) + r;
  const lines = (r) => {
    const wrapped = Array.from({ length: cols }, (_, c) => wrap(String(r[c] ?? ""), w[c]));
    const h = Math.max(...wrapped.map((parts) => parts.length));
    return Array.from({ length: h }, (_, i) => b.v + wrapped.map((parts, c) => ` ${cell(parts[i] ?? "", c)} `).join(b.v) + b.v);
  };
  const [head, ...body] = logical.map((r) => Array.from({ length: cols }, (_, c) => r[c] ?? ""));
  return [rule(b.tl, b.tt, b.tr), ...lines(head), rule(b.lt, b.x, b.rt), ...body.flatMap(lines), rule(b.bl, b.bt, b.br)].join("\n");
}

/** A status key on the density ladder. items: [{ level: 0..4, label }] */
export function statusKey(items, { width = 12 } = {}) {
  const capped = capRows(items);
  const labels = fitLabels(capped.rows.map((i) => i.label));
  const lines = capped.rows.map((i, n) => `${SHADES[Math.round(clamp(i.level, 0, 4))].repeat(width)}  ${labels[n]}`);
  return join(capped.note ? [...lines, capped.note] : lines);
}
