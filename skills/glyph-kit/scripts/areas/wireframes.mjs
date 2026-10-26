// Wireframes: a screen built from a layout spec, using a small primitive vocabulary.
// The same primitive names map to real components in design-system.map.json (see reference/spec.md).
import { BOX, center, cut, join, len, padEnd, padStart, textCells, wrap } from "../core.mjs";
import { LAYOUT, capRows } from "../layout.mjs";
import { PRIMITIVES } from "./primitives.mjs";
import { COMPONENTS } from "./components.mjs";
import { drawPage, page, pageArrival, pageMask } from "./page.mjs";
import { checkPage } from "./grammar.mjs";

export { PRIMITIVES } from "./primitives.mjs";

/**
 * A screen in a double-line frame. spec: { title, width?, rows: [{ type, …, note? }], overlay? }
 * overlay: { title, rows } draws a dialog over a ░ dimmer.
 * Notes: rows with `note` get a marker outside the frame; spec.notes: { "1": "text" } are listed below.
 */
export function screen(spec, { width, maxWidth = LAYOUT.maxWidth, lang } = {}) {
  const W = Math.min(spec.width ?? width ?? 46, maxWidth);
  if (W < 12) throw new Error("A screen needs at least 12 cells to keep its frame and content readable.");
  const inner = W - 4;
  const b = BOX.double;
  const marks = [];
  const body = [];
  const capped = capRows(spec.rows);
  for (const row of capped.rows) {
    for (const value of [row.height, row.lines]) {
      if (value != null && (!Number.isInteger(value) || value < 1 || value > LAYOUT.rowsMax)) throw new Error(`A wireframe block needs between 1 and ${LAYOUT.rowsMax} rows.`);
    }
    const draw = PRIMITIVES[row.type] ?? COMPONENTS[row.type];
    if (!draw) throw new Error(`Unknown wireframe primitive: ${row.type}`);
    draw(row, inner, lang, { lang }).forEach((line, i) => {
      body.push(line);
      marks.push(i === 0 && row.note ? `[${row.note}]` : "");
    });
  }
  if (capped.note) {
    body.push(cut(capped.note, inner));
    marks.push("");
  }
  const title = spec.title ? `${b.h} ${cut(spec.title, W - 6)} ` : "";
  let lines = [b.tl + title + b.h.repeat(Math.max(0, W - 2 - len(title))) + b.tr];
  body.forEach((line) => {
    if (line === "\u0000divider") lines.push(b.lt + b.h.repeat(W - 2) + b.rt);
    else lines.push(`${b.v} ${padEnd(cut(line, inner), inner)} ${b.v}`);
  });
  lines.push(b.bl + b.h.repeat(W - 2) + b.br);
  if (spec.overlay) lines = overlay(lines, spec.overlay, W, lang);
  const withMarks = lines.map((l, i) => {
    if (!marks[i - 1]) return l;
    if (maxWidth - W < 4) throw new Error("Leave at least four cells beside the screen for note markers.");
    return `${l} ${cut(marks[i - 1], maxWidth - W - 1)}`;
  });
  const notes = Object.entries(spec.notes ?? {}).flatMap(([k, v]) => wrap(`[${k}] ${v}`, maxWidth));
  return join(notes.length ? [...withMarks, "", ...notes] : withMarks);
}

function overlay(lines, dialog, W, lang) {
  const dw = Math.min(W - 8, dialog.width ?? 30);
  const box = screen({ title: dialog.title, width: dw, rows: dialog.rows }, { lang }).split("\n").map((l) => l.replace(/═/g, "─").replace(/║/g, "│").replace(/[╔╗╚╝]/g, (c) => ({ "╔": "┌", "╗": "┐", "╚": "└", "╝": "┘" })[c]).replace(/[╠╣]/g, (c) => (c === "╠" ? "├" : "┤")));
  const top = Math.max(1, Math.floor((lines.length - box.length) / 2));
  if (box.length > lines.length - 2) throw new Error("The dialog needs a taller screen to keep all of its content visible.");
  const left = Math.floor((W - dw) / 2);
  return lines.map((line, i) => {
    if (i === 0 || i === lines.length - 1) return line;
    const chars = textCells(line);
    for (let c = 1; c < W - 1; c++) chars[c] = "░";
    const bi = i - top;
    if (bi >= 0 && bi < box.length) textCells(box[bi]).forEach((ch, k) => (chars[left + k] = ch));
    return chars.join("");
  });
}

/** Two screens side by side, labelled, e.g. desktop and mobile. screens: [{ label, spec }] */
export function responsive(screens, { gap = 4, maxWidth = LAYOUT.maxWidth, lang } = {}) {
  const drawn = screens.map((s) => [s.label, ...screen(s.spec, { lang }).split("\n")]);
  const widths = drawn.map((d) => Math.max(...d.map(len)));
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, screens.length - 1);
  if (total > maxWidth) throw new Error(`${screens.length} screens need ${total} cells side by side; ${maxWidth} fit. Make the screens narrower or show them separately.`);
  const h = Math.max(...drawn.map((d) => d.length));
  return join(
    Array.from({ length: h }, (_, i) => drawn.map((d, k) => padEnd(d[i] ?? "", widths[k])).join(" ".repeat(gap)))
  );
}

// Screen layouts: presets that build a page (areas/page.mjs) and draw the same bytes as before.

const frameWidth = (data, fallback, maxWidth) => {
  const W = Math.min(data.width ?? fallback, maxWidth);
  if (!Number.isInteger(W) || W < 40) throw new Error("A screen layout needs a width of at least 40 cells.");
  return W;
};
const drawn = (data, lang) => join(drawPage(data, { lang }).lines);

/** Header across the top, a sidebar and the content. data: { title?, width?, header?, sidebar, content, sidebarWidth? } */
export function appShell(data, { maxWidth = LAYOUT.maxWidth, lang } = {}) {
  const W = frameWidth(data, 64, maxWidth);
  const S = data.sidebarWidth ?? 18;
  if (!Number.isInteger(S) || S < 10 || S > W - 24) throw new Error(`The sidebar can be 10 to ${W - 24} cells wide at a width of ${W}.`);
  for (const rows of [data.sidebar, data.content]) if (rows != null && !Array.isArray(rows)) throw new Error("A region is a list of rows, like a screen's rows.");
  const sections = data.header?.length ? [{ rows: data.header }] : [];
  sections.push({ columns: [data.sidebar ?? [], data.content ?? []], widths: [S] });
  return drawn({ title: data.title, width: W, sections }, lang);
}

/** Cards in a grid, two or three to a row, under an optional header. data: { title?, width?, header?, cards: [{ title, rows }], columns? } */
export function cardGrid(data, { maxWidth = LAYOUT.maxWidth, lang } = {}) {
  const W = frameWidth(data, 80, maxWidth);
  const inner = W - 4;
  if (!Array.isArray(data.cards) || !data.cards.length) throw new Error("A card grid needs at least one card in \"cards\".");
  const n = data.columns ?? (inner >= 3 * 20 + 4 ? 3 : 2);
  if (![1, 2, 3].includes(n)) throw new Error("A card grid has 1, 2 or 3 columns.");
  const cw = Math.floor((inner - 2 * (n - 1)) / n);
  if (cw < 14) throw new Error(`${n} cards side by side need ${n * 14 + 2 * (n - 1) + 4} cells; make the grid wider or use fewer columns.`);
  const capped = capRows(data.cards, 6, "cards");
  const sections = data.header?.length ? [{ rows: data.header }] : [];
  for (let r = 0; r < capped.rows.length; r += n) sections.push({ cards: capped.rows.slice(r, r + n), count: n, ...(r ? { above: "space" } : {}) });
  if (capped.note) sections.push({ above: "none", rows: [{ type: "space" }, { type: "text", text: capped.note }] });
  return drawn({ title: data.title, width: W, sections }, lang);
}

/** A list on the left, the selected item's detail on the right. data: { title?, width?, header?, list: [text], selected?, detail, listWidth? } */
export function listDetail(data, options = {}) {
  if (!Array.isArray(data.list) || !data.list.length) throw new Error("A list and detail screen needs items in \"list\".");
  const selected = typeof data.selected === "number" ? data.selected : data.list.indexOf(data.selected);
  const items = data.list.map((text, i) => ({ text: String(text ?? ""), selected: i === selected }));
  return appShell({ title: data.title, width: data.width ?? 72, header: data.header, sidebar: [{ type: "list", items }], content: data.detail, sidebarWidth: data.listWidth ?? 26 }, options);
}

/** A dialog over a dimmed page. data: { title?, width?, page: rows, dialog: { title, rows, width? } } */
export function modal(data, options = {}) {
  if (!data.dialog || !Array.isArray(data.dialog.rows)) throw new Error("A modal needs a \"dialog\" with a title and rows.");
  return screen({ title: data.title, width: data.width ?? 56, rows: data.page ?? [], overlay: data.dialog }, options);
}

const types = (rows) => (Array.isArray(rows) ? rows.map((r) => r?.type).join(", ") : "");

const pieceTypes = (rows) => (Array.isArray(rows) ? rows.map((r) => r?.type).filter(Boolean) : []);
const sectionTypes = (s) => [...new Set(s?.columns ? s.columns.flatMap(pieceTypes) : s?.cards ? ["cards"] : pieceTypes(s?.rows))].join(", ");

export const kinds = {
  page: {
    label: "Page",
    wireframe: true,
    render: page,
    mask: pageMask,
    arrive: pageArrival,
    check: checkPage,
    summary: (d) =>
      `${d.title ?? "Page"}: ${(d.sections ?? []).map((s) => `${s?.columns ? `${s.columns.length} columns` : "a section"} (${sectionTypes(s)})`).join(", ")}${d.layers?.length ? `, with ${d.layers.map((l) => `a ${l?.type}${l?.title ? ` "${l.title}"` : ""}`).join(" and ")} over it` : ""}.`
  },
  screen: {
    example: {"title": "Views", "width": 40, "rows": [{"type": "empty", "text": "No saved views yet. Save a filter to find it here.", "action": "Save this view"}]},
    label: "Screen wireframe",
    render: screen,
    summary: (s) => `${s.title ?? "Screen"}: ${s.rows.map((r) => r.type).join(", ")}${s.overlay ? `, with a ${s.overlay.title} dialog over it` : ""}.`
  },
  responsive: {
    example: [{"label": "Desktop", "spec": {"title": "Report", "width": 40, "rows": [{"type": "image", "label": "chart", "height": 3}, {"type": "text", "text": "Revenue by month, last 12 months."}, {"type": "buttons", "items": [{"label": "Export", "primary": true}, {"label": "Share"}]}]}}, {"label": "Mobile", "spec": {"title": "Report", "width": 24, "rows": [{"type": "image", "label": "chart", "height": 3}, {"type": "buttons", "items": [{"label": "Export", "primary": true}]}]}}],
    label: "Responsive pair",
    render: responsive,
    summary: (s) => s.map((x) => `${x.label}: ${x.spec.rows.map((r) => r.type).join(", ")}`).join(". ")
  },
  appShell: {
    example: {"title": "Acme", "header": [{"type": "search", "placeholder": "Search"}], "sidebar": [{"type": "list", "items": [{"text": "Projects", "selected": true}, "Reports"]}], "content": [{"type": "heading", "text": "Projects"}, {"type": "table", "columns": ["name", "owner"], "rows": [["Checkout", "Mia"], ["Billing", "Ana"]]}], "width": 48, "sidebarWidth": 14},
    label: "App shell",
    wireframe: true,
    render: appShell,
    summary: (d) => `${d.title ?? "Screen"}: ${d.header?.length ? `header (${types(d.header)}), ` : ""}sidebar (${types(d.sidebar)}), content (${types(d.content)}).`
  },
  cardGrid: {
    example: {"title": "Templates", "cards": [{"title": "Readout", "rows": [{"type": "image", "height": 1}]}, {"title": "Status", "rows": [{"type": "image", "height": 1}]}], "width": 48},
    label: "Card grid",
    wireframe: true,
    render: cardGrid,
    summary: (d) => `${d.title ?? "Screen"}: ${d.cards?.length ?? 0} cards${d.cards?.length ? `: ${d.cards.map((c) => c?.title ?? "untitled").join(", ")}` : ""}.`
  },
  listDetail: {
    example: {"title": "Inbox", "list": ["Mia", "Sam", "Ana"], "selected": 0, "detail": [{"type": "text", "text": "Ship the new copy Monday?"}, {"type": "buttons", "items": [{"label": "Reply", "primary": true}]}], "width": 48, "listWidth": 16},
    label: "List and detail",
    wireframe: true,
    render: listDetail,
    summary: (d) => `${d.title ?? "Screen"}: a list of ${d.list?.length ?? 0} with ${typeof d.selected === "number" ? d.list?.[d.selected] : d.selected ?? "nothing"} selected, and its detail (${types(d.detail)}).`
  },
  modal: {
    example: {"title": "Projects", "page": [{"type": "skeleton", "lines": 4}], "dialog": {"title": "Delete project?", "rows": [{"type": "buttons", "items": [{"label": "Cancel"}, {"label": "Delete", "primary": true}]}]}, "width": 44},
    label: "Modal over a page",
    wireframe: true,
    render: modal,
    summary: (d) => `${d.title ?? "Screen"}, with a ${d.dialog?.title ?? "dialog"} dialog over it.`
  }
};
