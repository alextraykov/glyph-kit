// Pages: a list of sections, top to bottom, in one double frame. A section holds rows (pieces, top to
// bottom), columns (two to four lists of pieces side by side) or cards (a row of cards of one
// height). Code works out every separator and joint: a column rule takes ╦ on the double rule above,
// ╩ on the one below, ╬ where two column sections meet at one column. Layers go over the page.
import { ARRIVE_MAX, ARRIVE_STEP } from "../arrive.mjs";
import { LAYOUT, capRows } from "../layout.mjs";
import { cells, center, cut, padEnd, width, wrap } from "../text.mjs";
import { boxParts, namesOf, pieces, sideBySide } from "./components.mjs";
import { findText, placeLayers } from "./layers.mjs";
import { PRIMITIVES } from "./primitives.mjs";

export const SPLITS = { "1:1": [1, 1], "1:2": [1, 2], "1:3": [1, 3], "1:4": [1, 4], "2:1": [2, 1], "1:1:1": [1, 1, 1], "1:2:1": [1, 2, 1], "1:1:2": [1, 1, 2], "1:1:1:1": [1, 1, 1, 1] };
export const PAGE = { minWidth: 40, maxWidth: 80, maxRows: 80, sections: 8, columns: 4, columnCells: 12, cards: 3, layers: 2, narrow: 40 };
const NUMBER = ["One", "Two", "Three", "Four"];

/** Cells for each column of a section `inner` cells wide: by `widths` (cells for every column but
 *  the last), by `split`, or equal shares; the spare cells go to the last column. */
export function spans(section, inner) {
  const n = section.columns.length;
  const avail = inner - (n - 1);
  if (Array.isArray(section.widths)) {
    const out = Array.from({ length: n }, (_, i) => (i < n - 1 ? section.widths[i] ?? Math.floor(avail / n) : 0));
    out[n - 1] = avail - out.slice(0, -1).reduce((a, b) => a + b, 0);
    return out;
  }
  const parts = SPLITS[section.split] ?? Array(n).fill(1);
  const total = parts.reduce((a, b) => a + b, 0);
  const out = parts.map((p) => Math.floor((avail * p) / total));
  out[n - 1] = avail - out.slice(0, -1).reduce((a, b) => a + b, 0);
  return out;
}

const kindOf = (s) => (s?.columns ? "columns" : s?.cards ? "cards" : "rows");
const titleBar = (title, room) => (title ? `═ ${cut(title, Math.max(1, room - 3))} ` : "");

/**
 * The page without its layers. Returns its lines and what layers need: the row under the first
 * section (where a drawer starts), the blank row a taller page repeats, where each piece with an id
 * or note sits, and the names a layer can anchor to.
 */
export function drawPage(data, { lang } = {}) {
  const W = data.width ?? 80;
  const inner = W - 2;
  if (!Array.isArray(data.sections) || !data.sections.length) throw new Error("A page needs at least one section in \"sections\".");
  const capped = capRows(data.sections, PAGE.sections, "sections");
  const sections = capped.note ? [...capped.rows, { rows: [{ type: "muted", text: capped.note }] }] : capped.rows;
  const ctx = { lang };
  const names = [];
  const marks = [];
  // Where each section's top boundary is double (a ═ rule or the frame), so column rules can join it.
  const above = sections.map((s, i) => (i === 0 ? (data.url ? "double" : "frame") : s.above ?? "double"));
  const doubleAt = (i) => i >= sections.length || above[i] === "double" || above[i] === "frame";
  const rulesOf = (s, i) => {
    if (kindOf(s) !== "columns" || s.rule === false || !doubleAt(i) || !doubleAt(i + 1)) return [];
    const sp = spans(s, inner);
    const out = [];
    let c = 0;
    for (let k = 0; k < sp.length - 1; k++) out.push((c += sp[k]) + k);
    return out;
  };
  const rules = sections.map(rulesOf);
  const edge = (fillPrev, fillNext) => {
    const row = Array(inner).fill("═");
    for (const c of fillPrev) row[c] = "╩";
    for (const c of fillNext) row[c] = row[c] === "╩" ? "╬" : "╦";
    return row;
  };

  const lines = [];
  // The top frame: the title in its edge, stopping short of the first joint.
  const top = edge([], data.url ? [] : rules[0]);
  const firstJoint = top.findIndex((ch) => ch !== "═");
  cells(titleBar(data.title, firstJoint < 0 ? inner : firstJoint)).forEach((ch, i) => (top[i] = ch));
  lines.push("╔" + top.join("") + "╗");
  if (data.url) lines.push(`║ ◄ ►  ${PRIMITIVES.input({ value: data.url }, inner - 7)[0]} ║`);

  let from = 0;
  let lastBlank = `║${" ".repeat(inner)}║`;
  sections.forEach((s, i) => {
    const kind = kindOf(s);
    const sep = i === 0 ? (data.url ? "double" : "none") : above[i];
    if (sep === "double") lines.push("╠" + edge(i ? rules[i - 1] : [], rules[i]).join("") + "╣");
    else if (sep === "line") lines.push(`║ ${"─".repeat(inner - 2)} ║`);
    else if (sep === "space") lines.push(`║${" ".repeat(inner)}║`);
    if (i === 1) from = sep === "double" ? lines.length - 1 : 0;
    const ruled = rules[i].length > 0;
    const sp = kind === "columns" ? spans(s, inner) : [inner];
    const blank = `║${sp.map((n) => " ".repeat(n)).join(ruled ? "║" : " ")}║`;
    const pad = Math.max(0, Math.min(2, s.pad ?? 0));
    for (let p = 0; p < pad; p++) lines.push(blank);
    const start = lines.length;
    if (kind === "columns") {
      const drawn = s.columns.map((col, k) => pieces(col, sp[k] - 2, ctx));
      const h = Math.max(1, ...drawn.map((d) => d.length));
      for (let r = 0; r < h; r++) lines.push(`║${drawn.map((d, k) => ` ${padEnd(d[r] ?? "", sp[k] - 2)} `).join(ruled ? "║" : " ")}║`);
      let x = 1;
      drawn.forEach((d, k) => {
        for (const mk of d.marks) marks.push({ ...mk, r: start + mk.line, c: x + 1, w: sp[k] - 2 });
        x += sp[k] + 1;
      });
      s.columns.forEach((col) => (col ?? []).forEach((p) => names.push(...namesOf(p))));
    } else if (kind === "cards") {
      const n = s.count ?? s.cards.length;
      const cw = Math.floor((inner - 2 - 2 * (n - 1)) / n);
      const drawn = sideBySide(s.cards.map((c) => boxParts(c?.title, c?.rows ?? [], cw, { meta: c?.meta, footer: c?.footer, lang, ctx })));
      for (const l of drawn) lines.push(`║ ${padEnd(l, inner - 2)} ║`);
      s.cards.forEach((c, k) => {
        if (c?.id != null || c?.note != null) marks.push({ id: c.id, note: c.note, r: start, c: 2 + k * (cw + 2), w: cw, height: drawn.length });
        names.push(...namesOf({ type: "card", ...c }));
      });
    } else {
      const mw = s.measure === "narrow" ? Math.min(PAGE.narrow, inner - 2) : inner - 2;
      const left = 2 + Math.floor((inner - 2 - mw) / 2);
      const drawn = pieces(s.rows ?? [], mw, ctx);
      for (const l of drawn) {
        const line = s.align === "center" ? center(l.trimEnd(), mw) : padEnd(l, mw);
        lines.push(`║ ${padEnd(s.measure === "narrow" ? center(line, inner - 2) : line, inner - 2)} ║`);
      }
      for (const mk of drawn.marks) marks.push({ ...mk, r: start + mk.line, c: left, w: mw });
      (s.rows ?? []).forEach((p) => names.push(...namesOf(p)));
    }
    for (let p = 0; p < pad; p++) lines.push(blank);
    lastBlank = blank;
  });
  lines.push("╚" + edge(rules.at(-1), []).join("") + "╝");
  return { lines, W, from, lastBlank, marks, names: [...new Set(names)] };
}

/** The page with its layers: { lines, mask (or null), placed, base }. A layer that needs more room
 *  than the page has makes the page grow, with blank rows under its last section. */
export function layoutPage(data, { lang } = {}) {
  const base = drawPage(data, { lang });
  const layers = Array.isArray(data.layers) ? data.layers : [];
  const grownBy = (extra) => [...base.lines.slice(0, -1), ...Array(extra).fill(base.lastBlank), base.lines.at(-1)];
  let extra = 0;
  for (let tries = 0; tries <= layers.length * 2; tries++) {
    const lines = grownBy(extra);
    if (!layers.length) return { lines, mask: null, placed: [], base, rows: lines.length };
    const grid0 = lines.map(cells);
    const ids = new Map(base.marks.filter((mk) => mk.id != null).map((mk) => [String(mk.id), { r: mk.r, c: mk.c, w: Math.min(mk.w, width(base.lines[mk.r]) - mk.c) }]));
    const layerNames = [];
    const anchor = (name, grid) => {
      const key = String(name ?? "");
      const hit = ids.get(key) ?? findText(grid0, `[[ ${key} ]]`, { whole: false }) ?? findText(grid0, `[ ${key} ]`, { whole: false }) ?? findText(grid0, key) ?? findText(grid, `[[ ${key} ]]`, { whole: false }) ?? findText(grid, `[ ${key} ]`, { whole: false }) ?? findText(grid, key);
      if (!hit) throw new Error(`There is no ${key || "empty name"} to anchor to. This page has: ${[...base.names, ...layerNames].join(", ") || "nothing to anchor to"}.`);
      // A button's anchor is its label's cells, so ▲ sits over the middle of the button.
      return hit;
    };
    layers.forEach((l) => (l?.rows ?? []).forEach((p) => layerNames.push(...namesOf(p))));
    const res = placeLayers(lines, layers, { from: base.from, anchor, lang });
    if (res.need) {
      extra += res.need;
      continue;
    }
    const text = res.grid.map((row) => row.join(""));
    const muted = res.placed.some((p) => !p.modal);
    return { lines: text, mask: muted ? res.mask.map((row) => row.join("")) : null, placed: res.placed, base, rows: text.length };
  }
  throw new Error("The layers need more room than a page can give; take out a layer or some of its rows.");
}

/** Note markers outside the frame, and the notes listed under it. */
function withNotes(lines, data, marks, W, maxWidth) {
  const at = new Map(marks.filter((mk) => mk.note != null).map((mk) => [mk.r, `[${mk.note}]`]));
  const out = lines.map((l, r) => {
    if (!at.has(r)) return l;
    if (maxWidth - W < 4) throw new Error("Leave at least four cells beside the page for note markers.");
    return `${l} ${cut(at.get(r), maxWidth - W - 1)}`;
  });
  const notes = Object.entries(data.notes ?? {}).flatMap(([k, v]) => wrap(`[${k}] ${v}`, maxWidth));
  return notes.length ? [...out, "", ...notes] : out;
}

function checkRows(n) {
  if (n > PAGE.maxRows) throw new Error(`This page needs ${n} rows; a page has at most ${PAGE.maxRows}. Take out a section or split it into two pages.`);
}

/** A page as text. data: { title?, width?, url?, sections, layers?, notes? } */
export function page(data, { maxWidth = LAYOUT.maxWidth, lang } = {}) {
  const W = data.width ?? 80;
  if (!Number.isInteger(W) || W < PAGE.minWidth || W > Math.min(PAGE.maxWidth, maxWidth)) throw new Error(`A page is ${PAGE.minWidth} to ${Math.min(PAGE.maxWidth, maxWidth)} cells wide.`);
  const { lines, base } = layoutPage(data, { lang });
  checkRows(lines.length);
  return withNotes(lines, data, base.marks, W, maxWidth).map((l) => l.replace(/\s+$/, "")).join("\n");
}

/** One letter per cell of the page: p page, l layer, s shadow. Null when nothing mutes the page. */
export function pageMask(data, { lang } = {}) {
  return layoutPage(data, { lang }).mask;
}

const snap = (ms) => Math.round(ms / ARRIVE_STEP) * ARRIVE_STEP;
const BOXES = "─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬";
export const PAGE_ARRIVES = 360; // the page settles by then; its layers follow

/** Arrival frames for each layer: how it looks at each step on its way in, over its rectangle only.
 *  The last frame is the layer at home, the final figure. */
export function layerFrames(placedLayer) {
  const { layer, rect, travel, axis, steps } = placedLayer;
  if (placedLayer.modal) return [];
  if (axis === "x") return [0.6, 0.28, 0.125, 0.03, 0].map((f) => Math.round(travel * f)).filter((v, i, a) => i === 0 || v !== a[i - 1]).map((step) => ({ step, ...placedLayer.redraw(step), rect }));
  if (axis === "y") return [0.55, 0.25, 0.08, 0].map((f) => Math.round(travel * f)).filter((v, i, a) => i === 0 || v !== a[i - 1]).map((step) => ({ step, ...placedLayer.redraw(step), rect }));
  return [...Array(steps ?? 1).keys()].map((k) => ({ step: k + 1, ...placedLayer.redraw(k + 1), rect })).concat([{ step: 0, ...placedLayer.redraw(0), rect }]).map((f) => ({ ...f, layer }));
}

const cutRow = (row, c0, c1) => {
  const out = row.slice(c0, c1 + 1);
  if (out[0] === "") out[0] = " ";
  if (row[c1 + 1] === "" && out.length) out[out.length - 1] = " ";
  return out.join("");
};

/**
 * The page's arrival: the frame, then each line in reading order within PAGE_ARRIVES, then each layer
 * once. A drawer slides in from its edge in whole cells, a sheet rises in rows, a popover or menu
 * lands its edge and then its body, a toast rises a row; a dialog lands whole. The returned delay
 * function carries `frames`: short-lived overlays for each layer's rectangle (see render/arrive.mjs).
 */
export function pageArrival(lines, data, options = {}) {
  const lay = layoutPage(data, options);
  const content = lines.map((line) => [...line].some((ch) => ch !== " " && !BOXES.includes(ch)));
  const n = content.filter(Boolean).length;
  const ease = (i) => 1 - Math.sqrt(1 - i / Math.max(1, n));
  const order = content.map((has, r) => (has ? content.slice(0, r).filter(Boolean).length : -1));
  const rowAt = (r) => (order[r] < 0 ? 0 : ARRIVE_STEP + snap(n < 2 ? 0 : ((PAGE_ARRIVES - ARRIVE_STEP) * ease(order[r])) / ease(n - 1)));
  const frames = [];
  const lands = [];
  let t = PAGE_ARRIVES + ARRIVE_STEP;
  for (const p of lay.placed) {
    const shots = layerFrames(p).slice(0, -1);
    const start = Math.max(PAGE_ARRIVES, Math.min(t, ARRIVE_MAX - shots.length * ARRIVE_STEP));
    const land = start + shots.length * ARRIVE_STEP;
    const { r0, r1, c0, c1 } = p.rect;
    const prev = lands.filter((q) => q.r0 <= r1 && q.r1 >= r0 && q.c0 <= c1 && q.c1 >= c0);
    const rows = {};
    for (let r = r0; r <= r1 && r < lay.lines.length; r++) {
      const under = p.modal ? null : { at: Math.max(rowAt(r), ...prev.map((q) => q.land)), text: cutRow(p.before[r], c0, c1), mask: cutRow(p.beforeMask[r], c0, c1) };
      rows[r] = [];
      if (under && start > under.at) rows[r].push({ ...under, len: start - under.at });
      shots.forEach((s, k) => rows[r].push({ at: start + k * ARRIVE_STEP, len: ARRIVE_STEP, text: cutRow(s.grid[r], c0, c1), mask: cutRow(s.mask[r], c0, c1) }));
    }
    frames.push({ r0, r1, c0, c1, rows });
    lands.push({ r0, r1, c0, c1, land });
    t = land;
  }
  const delay = (r, col, ch) => {
    const hit = lands.findLast((q) => r >= q.r0 && r <= q.r1 && col >= q.c0 && col <= q.c1);
    if (hit) return hit.land;
    if (r >= lay.lines.length) return PAGE_ARRIVES;
    if (col >= cells(lay.lines[r] ?? "").length) return PAGE_ARRIVES;
    return BOXES.includes(ch) ? 0 : rowAt(r);
  };
  return Object.assign(delay, { frames });
}
