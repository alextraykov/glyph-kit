import { upper } from "../text.mjs";
// Wireframes: a screen built from a layout spec, using a small primitive vocabulary.
// The same primitive names map to real components in design-system.map.json (see reference/spec.md).
import { BOX, center, cut, join, len, padEnd, padStart, textCells, wrap } from "../core.mjs";
import { LAYOUT, capRows } from "../layout.mjs";

// Everyday language accepted by say.mjs. Keep each row's aliases beside the
// primitive it names so the reader and the renderer share one closed vocabulary.
export const ROW_NAMES = Object.freeze({
  heading: ["heading", "header", "section heading", "section title", "title inside"],
  text: ["text", "paragraph", "sentence", "copy", "description"],
  muted: ["hint", "help text", "small print", "secondary text", "muted caption", "caption"],
  input: ["field", "input", "text box", "box to type in", "somewhere to type"],
  search: ["search", "search box", "search field", "find box"],
  buttons: ["button", "buttons", "actions"],
  checkbox: ["checkbox", "tick box", "check"],
  radio: ["radio", "radio buttons", "radio options", "choices", "pick one", "pick one of"],
  toggle: ["toggle", "switch", "on/off"],
  select: ["dropdown", "select", "picker", "menu", "choose from"],
  tabs: ["tabs", "segments", "sections across the top"],
  list: ["list", "rows", "items", "entries"],
  table: ["table", "grid of", "columns"],
  image: ["image", "picture", "photo", "chart placeholder", "thumbnail"],
  skeleton: ["loading", "placeholder lines", "skeleton"],
  empty: ["empty state", "empty message", "nothing here yet"],
  space: ["gap", "space", "breathing room", "blank line"],
  divider: ["horizontal line", "line", "rule", "divider", "separator"]
});

export const SCREEN_NAMES = Object.freeze([
  "popover", "popup", "dialog", "modal", "sheet", "panel", "card", "screen", "page", "window"
]);

/**
 * The primitives. Each returns the lines it occupies inside a frame of `w` characters.
 * Every row may carry `note: "1"`; the marker [1] is drawn outside the frame.
 */
export const PRIMITIVES = {
  heading: (r, w, lang) => [cut(upper(r.text, lang), w)],
  text: (r, w) => wrap(r.text, w),
  muted: (r, w) => wrap(r.text, w).map((l) => l), // shown in the text form as plain text; the HTML form greys it
  input: (r, w) => {
    const label = r.label ? padEnd(r.label, r.labelWidth ?? Math.min(14, len(r.label) + 2)) : "";
    const room = Math.max(4, w - len(label) - 2);
    const value = cut(r.value ?? r.placeholder ?? "", room);
    return [`${label}[${value + "_".repeat(Math.max(0, room - len(value)))}]`];
  },
  search: (r, w) => {
    const hint = r.hint ?? "";
    return [`> ${padEnd(r.placeholder ?? "Search", w - 2 - len(hint))}${hint}`];
  },
  buttons: (r, w) => {
    const parts = r.items.map((b) => (b.primary ? `[[ ${b.label} ]]` : b.disabled ? `[ ${b.label} ]░` : `[ ${b.label} ]`));
    const text = parts.join("  ");
    return [r.align === "right" ? padStart(text, w) : text];
  },
  checkbox: (r) => [`[${r.checked ? "x" : " "}] ${r.label}`],
  radio: (r) => [r.options.map((o) => `(${o === r.selected ? "x" : " "}) ${o}`).join("   ")],
  toggle: (r, w) => {
    const sw = r.on ? "[ ■] on " : "[■ ] off";
    return [`${padEnd(r.label, w - len(sw))}${sw}`];
  },
  select: (r, w) => {
    const label = r.label ? `${r.label}  ` : "";
    return [`${label}[ ${padEnd(r.value, Math.max(6, w - len(label) - 5))} ▼]`];
  },
  tabs: (r) => {
    const cells = r.items.map((t) => ` ${t} `);
    const top = cells.join("│");
    const under = cells.map((c, i) => (r.items[i] === r.selected ? "━".repeat(len(c)) : " ".repeat(len(c)))).join(" ");
    return [top, under];
  },
  list: (r, w) => {
    const items = r.items.map((it) => (typeof it === "string" ? { text: it } : it));
    const scroll = r.scroll ?? items.length > 4;
    const room = w - (scroll ? 2 : 0);
    const lines = items.map((it) => {
      const mark = it.selected ? "█" : it.disabled ? "░" : " ";
      const meta = it.meta ?? "";
      return `${mark} ${padEnd(cut(it.text, room - 2 - len(meta)), room - 2 - len(meta))}${meta}`;
    });
    if (!scroll) return lines;
    return lines.map((l, i) => `${l} ${i === 0 ? "▲" : i === lines.length - 1 ? "▼" : i === 1 ? "■" : "▒"}`);
  },
  table: (r, w) => {
    const cols = r.columns.length;
    const cw = Math.floor((w - (cols - 1)) / cols);
    const fmt = (cells) => cells.map((c) => padEnd(cut(String(c), cw), cw)).join(" ");
    return [fmt(r.columns), "─".repeat(w), ...r.rows.map(fmt)];
  },
  image: (r, w) => {
    const h = r.height ?? 3;
    const label = cut(`[ ${r.label ?? "image"} ]`, w);
    return Array.from({ length: h }, (_, i) => (i === Math.floor(h / 2) ? center(label, w, "░") : "░".repeat(w)));
  },
  skeleton: (r, w) => Array.from({ length: r.lines ?? 3 }, (_, i) => "░".repeat(Math.max(4, Math.round(w * [0.9, 0.7, 0.8, 0.5][i % 4])))),
  empty: (r, w) => {
    const lines = ["", ...wrap(r.text, w - 4).map((l) => center(l, w))];
    if (r.action) lines.push("", center(`[[ ${r.action} ]]`, w));
    return [...lines, ""];
  },
  space: () => [""],
  divider: () => ["\u0000divider"]
};

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
    const draw = PRIMITIVES[row.type];
    if (!draw) throw new Error(`Unknown wireframe primitive: ${row.type}`);
    draw(row, inner, lang).forEach((line, i) => {
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

// Screen layouts: regions inside one double frame, each filled with the same primitives as a screen.

/** Draw primitive rows into a region `w` cells wide. A divider spans the region. */
function region(rows = [], w, lang) {
  if (!Array.isArray(rows)) throw new Error("A region is a list of rows, like a screen's rows.");
  const capped = capRows(rows);
  const lines = [];
  for (const row of capped.rows) {
    const draw = PRIMITIVES[row?.type];
    if (!draw) throw new Error(`Unknown wireframe primitive: ${row?.type}`);
    for (const value of [row.height, row.lines]) {
      if (value != null && (!Number.isInteger(value) || value < 1 || value > LAYOUT.rowsMax)) throw new Error(`A wireframe block needs between 1 and ${LAYOUT.rowsMax} rows.`);
    }
    for (const line of draw(row, w, lang)) lines.push(line === "\u0000divider" ? "─".repeat(w) : cut(line, w));
  }
  if (capped.note) lines.push(cut(capped.note, w));
  return lines;
}

const frameWidth = (data, fallback, maxWidth) => {
  const W = Math.min(data.width ?? fallback, maxWidth);
  if (!Number.isInteger(W) || W < 40) throw new Error("A screen layout needs a width of at least 40 cells.");
  return W;
};
const titleBar = (title, room) => (title ? `═ ${cut(title, Math.max(1, room - 3))} ` : "");

/** Header across the top, a sidebar and the content. data: { title?, width?, header?, sidebar, content, sidebarWidth? } */
export function appShell(data, { maxWidth = LAYOUT.maxWidth, lang } = {}) {
  const W = frameWidth(data, 64, maxWidth);
  const S = data.sidebarWidth ?? 18;
  if (!Number.isInteger(S) || S < 10 || S > W - 24) throw new Error(`The sidebar can be 10 to ${W - 24} cells wide at a width of ${W}.`);
  const C = W - S - 5;
  const b = BOX.double;
  const header = data.header?.length ? region(data.header, W - 4, lang) : [];
  const side = region(data.sidebar, S - 2, lang);
  const main = region(data.content, C, lang);
  const split = (l, r) => l + b.h.repeat(S) + b.tt + b.h.repeat(W - S - 3) + r;
  const lines = [];
  if (header.length) {
    const t = titleBar(data.title, W - 2);
    lines.push(b.tl + t + b.h.repeat(W - 2 - len(t)) + b.tr);
    header.forEach((l) => lines.push(`${b.v} ${padEnd(l, W - 4)} ${b.v}`));
    lines.push(split(b.lt, b.rt));
  } else {
    const t = titleBar(data.title, S);
    lines.push(b.tl + t + b.h.repeat(S - len(t)) + b.tt + b.h.repeat(W - S - 3) + b.tr);
  }
  const h = Math.max(side.length, main.length, 1);
  for (let i = 0; i < h; i++) lines.push(`${b.v} ${padEnd(side[i] ?? "", S - 2)} ${b.v} ${padEnd(main[i] ?? "", C)} ${b.v}`);
  lines.push(b.bl + b.h.repeat(S) + b.bt + b.h.repeat(W - S - 3) + b.br);
  return join(lines);
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
  const cards = capped.rows.map((card) => {
    const t = card?.title ? `─ ${cut(card.title, cw - 6)} ` : "";
    return { top: "┌" + t + "─".repeat(cw - 2 - len(t)) + "┐", rows: region(card?.rows ?? [], cw - 4, lang) };
  });
  const b = BOX.double;
  const body = data.header?.length ? [...region(data.header, inner, lang), "\u0000divider"] : [];
  for (let r = 0; r < cards.length; r += n) {
    const group = cards.slice(r, r + n);
    const h = Math.max(1, ...group.map((c) => c.rows.length));
    if (r) body.push("");
    body.push(group.map((c) => c.top).join("  "));
    for (let i = 0; i < h; i++) body.push(group.map((c) => `│ ${padEnd(c.rows[i] ?? "", cw - 4)} │`).join("  "));
    body.push(group.map(() => "└" + "─".repeat(cw - 2) + "┘").join("  "));
  }
  if (capped.note) body.push("", capped.note);
  const t = titleBar(data.title, W - 2);
  const lines = [b.tl + t + b.h.repeat(W - 2 - len(t)) + b.tr];
  body.forEach((l) => lines.push(l === "\u0000divider" ? b.lt + b.h.repeat(W - 2) + b.rt : `${b.v} ${padEnd(l, inner)} ${b.v}`));
  lines.push(b.bl + b.h.repeat(W - 2) + b.br);
  return join(lines);
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

export const kinds = {
  screen: {
    label: "Screen wireframe",
    render: screen,
    summary: (s) => `${s.title ?? "Screen"}: ${s.rows.map((r) => r.type).join(", ")}${s.overlay ? `, with a ${s.overlay.title} dialog over it` : ""}.`
  },
  responsive: {
    label: "Responsive pair",
    render: responsive,
    summary: (s) => s.map((x) => `${x.label}: ${x.spec.rows.map((r) => r.type).join(", ")}`).join(". ")
  },
  appShell: {
    label: "App shell",
    wireframe: true,
    render: appShell,
    summary: (d) => `${d.title ?? "Screen"}: ${d.header?.length ? `header (${types(d.header)}), ` : ""}sidebar (${types(d.sidebar)}), content (${types(d.content)}).`
  },
  cardGrid: {
    label: "Card grid",
    wireframe: true,
    render: cardGrid,
    summary: (d) => `${d.title ?? "Screen"}: ${d.cards?.length ?? 0} cards${d.cards?.length ? `: ${d.cards.map((c) => c?.title ?? "untitled").join(", ")}` : ""}.`
  },
  listDetail: {
    label: "List and detail",
    wireframe: true,
    render: listDetail,
    summary: (d) => `${d.title ?? "Screen"}: a list of ${d.list?.length ?? 0} with ${typeof d.selected === "number" ? d.list?.[d.selected] : d.selected ?? "nothing"} selected, and its detail (${types(d.detail)}).`
  },
  modal: {
    label: "Modal over a page",
    wireframe: true,
    render: modal,
    summary: (d) => `${d.title ?? "Screen"}, with a ${d.dialog?.title ?? "dialog"} dialog over it.`
  }
};
