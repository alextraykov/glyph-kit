// Components: named recipes of primitives with a few options. Each expands to lines at the width it
// is given, and code works out every width and alignment: label columns, column widths, equal card
// heights, paging text. The model gives words and choices, never cells.
import { LAYOUT, capRows } from "../layout.mjs";
import { cellWidth, center, cut, graphemes, padEnd, upper, width, wrap } from "../text.mjs";
import { PRIMITIVES, barLine, buttonsText } from "./primitives.mjs";

/** Text clipped to `n` cells without a cut mark, for rules and underlines that follow text. */
export function clip(text, n) {
  let out = "";
  let used = 0;
  for (const ch of graphemes(text)) {
    const c = cellWidth(ch);
    if (used + c > n) break;
    out += ch;
    used += c;
  }
  return out;
}

export const TABLE_ROWS = 12;
export const STAT_CELLS = 14;
export const MAX_STATS = 4;

/** Cells a row of n stats needs. */
export const statsNeed = (n) => n * STAT_CELLS + 2 * (n - 1);

const item = (t) => (t && typeof t === "object" ? t : { text: String(t ?? "") });

/** A light box: the title in its top edge, `meta` at the right of the edge, a ├─┤ footer of buttons.
 *  Returns its parts, so a row of cards can be padded to one height before the footer. */
export function boxParts(title, rows, w, { meta, footer, lang, ctx } = {}) {
  const inner = w - 4;
  // Title and meta share the edge: the meta takes what the title leaves, and at least half.
  const room = w - 9;
  const m = meta != null && meta !== "" && w >= 16 ? ` ${cut(meta, Math.min(width(meta), Math.max(Math.floor(room / 2), room - width(title ?? ""))))} ─` : "";
  const t = title != null && title !== "" ? `─ ${cut(title, Math.max(1, w - 6 - width(m)))} ` : "";
  const top = "┌" + t + "─".repeat(Math.max(0, w - 2 - width(t) - width(m))) + m + "┐";
  const body = pieces(rows ?? [], inner, { ...ctx, lang }).map((l) => `│ ${padEnd(l, inner)} │`);
  const tail = footer?.length ? ["├" + "─".repeat(w - 2) + "┤", `│ ${padEnd(cut(buttonsText(footer), inner), inner)} │`] : [];
  tail.push("└" + "─".repeat(w - 2) + "┘");
  return { top, body, tail, blank: `│ ${" ".repeat(inner)} │` };
}

/** A box's lines with its body padded to at least `rows` rows. */
export const boxLines = ({ top, body, tail, blank }, rows = 0) => [top, ...body, ...Array(Math.max(0, rows - body.length)).fill(blank), ...tail];

/** Boxes side by side, two cells apart, padded to one height. */
export function sideBySide(parts) {
  const h = Math.max(...parts.map((p) => p.body.length));
  const drawn = parts.map((p) => boxLines(p, h));
  return drawn[0].map((_, i) => drawn.map((d) => d[i]).join("  "));
}

/** Widths for n boxes in `w` cells, two apart; the last takes the spare cells. */
export function boxWidths(n, w) {
  const each = Math.floor((w - 2 * (n - 1)) / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? w - (each + 2) * (n - 1) : each));
}

export const COMPONENTS = {
  /** Brand, items, the selected item underlined with ━, actions pushed right. */
  nav: (r, w, lang) => {
    const brandText = r.brand ? upper(r.brand, lang) : "";
    const brand = brandText ? padEnd(brandText, Math.max(8, width(brandText) + 4)) : "";
    const items = (r.items ?? []).map((t) => String(item(t).text ?? ""));
    const left = brand + items.join("   ");
    const right = buttonsText(r.actions);
    const shown = right ? Math.min(width(left), w - width(right) - 2) : Math.min(width(left), w);
    const sel = items.indexOf(r.selected);
    const line = barLine(left, right, w);
    if (sel < 0) return [line];
    const col = width(brand) + items.slice(0, sel).reduce((a, t) => a + width(t) + 3, 0);
    const n = Math.min(width(items[sel]), shown - col);
    return n > 0 ? [line, " ".repeat(col) + "━".repeat(n)] : [line];
  },
  /** Tab labels with counts, then a ─ rule with ━ under the selected tab. */
  tabsBar: (r, w) => {
    const items = (r.items ?? []).map(item);
    const label = (t) => (t.count != null && t.count !== "" ? `${t.text ?? ""} ${t.count}` : String(t.text ?? ""));
    const left = items.map(label).join("   ");
    const right = buttonsText(r.actions);
    const shown = right ? Math.min(width(left), w - width(right) - 2) : Math.min(width(left), w);
    let under = "";
    for (const t of items) under += (t.text === r.selected ? "━" : "─").repeat(width(label(t))) + "───";
    return [barLine(left, right, w), clip(clip(under, Math.max(0, shown)) + "─".repeat(w), w)];
  },
  /** A heading, muted help, then fields with their labels lined up to the longest label. */
  fieldGroup: (r, w, lang) => {
    const fields = Array.isArray(r.fields) ? r.fields : [];
    const labelled = fields.filter((f) => (f?.type === "input" || f?.type === "select") && f.label);
    const lw = labelled.length ? Math.min(Math.max(...labelled.map((f) => width(f.label))) + 2, Math.max(4, Math.floor(w / 2))) : 0;
    const out = [];
    if (r.title) out.push(cut(upper(r.title, lang), w));
    if (r.help) out.push(...wrap(r.help, w, lang));
    for (const f of fields) {
      const label = f.label && (f.type === "input" || f.type === "select") ? cut(f.label, Math.max(1, lw - 2)) : "";
      if (f.type === "input") out.push(...PRIMITIVES.input({ ...f, label, labelWidth: label ? lw : 0 }, w));
      else if (f.type === "select" && label) out.push(padEnd(label, lw) + PRIMITIVES.select({ ...f, label: "", value: cut(f.value ?? "", Math.max(6, w - lw - 5)) }, w - lw)[0]);
      else if (f.type === "select") out.push(...PRIMITIVES.select({ ...f, value: cut(f.value ?? "", Math.max(6, w - 5)) }, w));
      else if (FIELD_TYPES.includes(f.type)) out.push(...PRIMITIVES[f.type](f, w, lang));
      else throw new Error(`A fieldGroup's fields are ${FIELD_TYPES.join(", ").replace(/, (\w+)$/, " or $1")}; "${f?.type}" isn't one.`);
    }
    return out;
  },
  /** A toolbar (search left, buttons right), a table whose columns are sized to their content,
   *  checkboxes, and paging. */
  dataTable: (r, w, lang) => {
    const names = (r.columns ?? []).map((c) => String(c ?? ""));
    const columns = names.map((c) => upper(c, lang));
    const cols = Math.max(1, columns.length);
    const capped = capRows(r.rows ?? [], TABLE_ROWS);
    // A row is a list of cells, or an object keyed by column name.
    const rows = capped.rows.map((row) => Array.from({ length: cols }, (_, i) => String((Array.isArray(row) ? row[i] : row?.[names[i]]) ?? "")));
    const pre = r.selectable ? 4 : 0;
    const avail = w - pre - 2 * (cols - 1);
    if (avail < cols * 3) throw new Error(`A dataTable with ${cols} columns needs ${pre + cols * 3 + 2 * (cols - 1)} cells; this column has ${w}. Leave out a column or give the table its own section.`);
    const widths = columns.map((c, i) => Math.max(1, width(c), ...rows.map((row) => width(row[i]))));
    const sum = () => widths.reduce((a, b) => a + b, 0);
    // Too wide: the widest column gives way first. Room to spare: the narrowest grows, so columns even out.
    while (sum() > avail) widths[widths.indexOf(Math.max(...widths))]--;
    while (sum() < avail) widths[widths.indexOf(Math.min(...widths))]++;
    const checked = new Set(r.checked ?? []);
    const fmt = (cells, mark) => (pre ? `${mark} ` : "") + cells.map((c, i) => padEnd(cut(c, widths[i]), widths[i])).join("  ");
    const out = [];
    if (r.search || r.actions?.length) out.push(barLine(r.search ? `> ${r.search}` : "", buttonsText(r.actions), w), "");
    out.push(fmt(columns.length ? columns : [""], "[ ]"), "─".repeat(w));
    rows.forEach((row, i) => out.push(fmt(row, checked.has(i) ? "[x]" : "[ ]")));
    if (capped.note) out.push(cut(capped.note, w));
    if (r.total != null && r.total !== "") out.push("", barLine(`${rows.length ? `1–${rows.length}` : "0"} of ${r.total}`, "[ ◄ ]  [ ► ]", w));
    return out;
  },
  /** A light box with the title in its top edge and a footer of buttons. */
  card: (r, w, lang, ctx) => boxLines(boxParts(r.title, r.rows, w, { meta: r.meta, footer: r.footer, lang, ctx })),
  /** A row of small cards of equal width, the last taking the spare cells. */
  stats: (r, w, lang, ctx) => {
    const items = (r.items ?? []).slice(0, MAX_STATS).map((s) => s ?? {});
    if (!items.length) return [];
    if (w < statsNeed(items.length)) throw new Error(statsTooWide(items.length, w));
    const change = items.some((s) => s.change != null && s.change !== "");
    return sideBySide(boxWidths(items.length, w).map((cw, i) => boxParts(items[i].label, [{ type: "heading", text: items[i].value ?? "" }, ...(change ? [{ type: "text", text: items[i].change ?? "" }] : [])], cw, { lang, ctx })));
  },
  /** A ░ mark, a heading, wrapped text and the buttons, all centred. */
  emptyState: (r, w, lang) => {
    const out = ["", center("░░░░░░", w), center("░░░░░░", w), "", center(cut(upper(r.title ?? "", lang), w), w)];
    for (const l of wrap(r.text ?? "", Math.max(4, w - 8), lang)) out.push(center(l, w));
    const items = [r.action ? { label: r.action, primary: true } : null, r.secondary ? { label: r.secondary } : null].filter(Boolean);
    out.push("");
    if (items.length) out.push(center(cut(buttonsText(items), w), w), "");
    return out;
  }
};

export const FIELD_TYPES = ["input", "select", "toggle", "checkbox", "radio"];
const NUMBER = ["One", "Two", "Three", "Four"];
export const statsTooWide = (n, w) => `${NUMBER[n - 1] ?? n} stats need ${statsNeed(n)} cells; this column has ${w}. Use split 1:1 or give the stats their own section.`;

/** The names a layer can anchor to in one piece: buttons, nav, tab and list items, and its id. */
export function namesOf(r) {
  if (!r || typeof r !== "object") return [];
  const labels = (items) => (Array.isArray(items) ? items.map((b) => b?.label).filter((x) => x != null && x !== "") : []);
  const texts = (items) => (Array.isArray(items) ? items.map((t) => item(t).text).filter((x) => x != null && x !== "") : []);
  const out = [];
  if (r.type === "buttons") out.push(...labels(r.items));
  if (r.type === "nav") out.push(...texts(r.items), ...labels(r.actions));
  if (r.type === "tabs" || r.type === "list") out.push(...texts(r.items));
  if (r.type === "tabsBar") out.push(...texts(r.items), ...labels(r.actions));
  if (r.type === "dataTable") out.push(...labels(r.actions));
  if (r.type === "bar") out.push(...labels(r.actions), ...[...String(r.right ?? "").matchAll(/\[\[? (.+?) \]\]?/g)].map((m) => m[1]));
  if (r.type === "card") out.push(...(r.rows ?? []).flatMap(namesOf), ...labels(r.footer));
  if (r.type === "fieldGroup") out.push(...(r.fields ?? []).flatMap(namesOf));
  if (r.type === "emptyState") out.push(...[r.action, r.secondary].filter(Boolean));
  if (r.type === "empty" && r.action) out.push(r.action);
  if (r.id) out.push(r.id);
  return out.map(String);
}

/**
 * Pieces drawn into a region `w` cells wide: primitives and components, top to bottom. A divider
 * spans the region. The lines carry `marks`: where each piece with an id or a note starts.
 */
export function pieces(rows = [], w, ctx = {}) {
  if (!Array.isArray(rows)) throw new Error("A region is a list of rows, like a screen's rows.");
  const capped = capRows(rows);
  const lines = [];
  const marks = [];
  for (const row of capped.rows) {
    const draw = COMPONENTS[row?.type] ?? PRIMITIVES[row?.type];
    if (!draw) throw new Error(`Unknown wireframe primitive: ${row?.type}`);
    for (const value of [row.height, row.lines]) {
      if (value != null && (!Number.isInteger(value) || value < 1 || value > LAYOUT.rowsMax)) throw new Error(`A wireframe block needs between 1 and ${LAYOUT.rowsMax} rows.`);
    }
    const start = lines.length;
    for (const line of draw(row, w, ctx.lang, ctx)) lines.push(line === "\u0000divider" ? "─".repeat(w) : cut(line, w));
    if (row.id != null || row.note != null) marks.push({ id: row.id, note: row.note, line: start, height: lines.length - start });
  }
  if (capped.note) lines.push(cut(capped.note, w));
  return Object.assign(lines, { marks });
}
