// The page grammar: what can go inside what, which options each piece takes, and the limits. Every
// check runs before drawing and the checker reports all problems at once, each a sentence that names
// the fix, so one retry fixes them all. A near miss is never quietly accepted: "did you mean" offers
// the closest valid name, and the spec stays the record. Unknown options on the old primitives only
// warn, so 0.2 specs keep working.
import { COMPONENTS, FIELD_TYPES, MAX_STATS, statsNeed, statsTooWide } from "./components.mjs";
import { LAYER_TYPES, PAGE_BESIDE } from "./layers.mjs";
import { PAGE, SPLITS, layoutPage, spans } from "./page.mjs";
import { PRIMITIVES } from "./primitives.mjs";

export const PIECES = [...Object.keys(PRIMITIVES), ...Object.keys(COMPONENTS)];

export const OPTIONS = {
  heading: ["text"], text: ["text"], muted: ["text"], input: ["label", "value", "placeholder", "labelWidth"], search: ["placeholder", "hint"],
  buttons: ["items", "align"], checkbox: ["label", "checked"], radio: ["options", "selected", "label"], toggle: ["label", "on"],
  select: ["label", "value", "options"], tabs: ["items", "selected"], list: ["items", "scroll"], table: ["columns", "rows"],
  image: ["label", "height"], skeleton: ["lines"], empty: ["text", "action"], bar: ["left", "right", "actions"], space: [], divider: ["label"],
  nav: ["brand", "items", "selected", "actions"], tabsBar: ["items", "selected", "actions"], fieldGroup: ["title", "help", "fields"],
  dataTable: ["columns", "rows", "search", "actions", "selectable", "checked", "total"], card: ["title", "meta", "rows", "footer"],
  stats: ["items"], emptyState: ["title", "text", "action", "secondary"],
  drawer: ["side", "size", "title", "rows", "footer"], sheet: ["title", "rows"], popover: ["anchor", "size", "rows"], menu: ["anchor", "items"],
  toast: ["text", "action"], dialog: ["size", "title", "rows", "footer"]
};
/** Accepted on top of the named options: the escape hatch for specs written by hand. */
const HATCH = { drawer: ["width"], popover: ["width"], dialog: ["width"] };
const COMMON = ["type", "id", "note"];
const PAGE_OPTIONS = ["title", "width", "url", "sections", "layers", "notes"];
const SECTION_OPTIONS = ["rows", "columns", "cards", "above", "rule", "align", "measure", "pad", "split"];
const NUMBER = ["one", "two", "three", "four", "five", "six", "seven", "eight"];

/** Warnings from the last checks: unknown options on primitives. The command line prints them. */
export const warnLog = new Set();

/** Edits between two names (insert, delete, change, swap two neighbours). */
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** The valid name closest to `name`: one that differs only in case, or is at most two edits away. */
export function closest(name, names) {
  const s = String(name ?? "");
  const same = names.find((n) => n.toLowerCase() === s.toLowerCase());
  if (same) return same;
  let best = null;
  let bestD = 3;
  for (const n of names) {
    const d = distance(s.toLowerCase(), n.toLowerCase());
    if (d < bestD) [best, bestD] = [n, d];
  }
  return best;
}

const a = (word) => (/^[aeiou]/i.test(word) ? "An" : "A");
const list = (items, last = "and") => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`);
const meant = (name, names) => {
  const near = closest(name, names);
  return near ? ` Did you mean ${near}?` : "";
};
const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

/** Problems with one option's value: a sentence, or nothing. */
function choice(owner, key, value, allowed, word = owner) {
  return value === undefined || allowed.includes(value) ? "" : `${a(word)} ${word}'s ${key} is ${list(allowed.map(String), "or")}.`;
}

function unknownOptions(type, piece, extra = []) {
  const known = [...COMMON, ...OPTIONS[type], ...(HATCH[type] ?? []), ...extra];
  return Object.keys(piece).filter((k) => !known.includes(k)).map((k) => `${a(type)} ${type} takes ${list(OPTIONS[type])}; "${k}" isn't one.`);
}

/**
 * Check one piece. `where` is "section", "card" or "layer"; `owner` names what holds it; `cells` is
 * the width it gets. Pushes into problems and warnings.
 */
function checkPiece(p, { where, owner, cells }, out) {
  const place = where === "layer" ? `a ${owner}'s rows` : where === "card" ? "a card's rows" : "a section's rows";
  if (!isObject(p) || p.type == null) return out.problems.push(`Every piece needs a "type"; one in ${place} has none.`);
  const type = p.type;
  if (LAYER_TYPES.includes(type)) {
    if (where === "layer") return out.problems.push(`${a(owner)} ${owner} can't hold ${a(type).toLowerCase()} ${type}. Make the ${type} the page's next layer, anchored to a button in the ${owner}.`);
    return out.problems.push(`${a(type)} ${type} is a layer: put it in "layers", not in ${place}.`);
  }
  if (!PIECES.includes(type)) return out.problems.push(`There is no piece called "${type}".${meant(type, [...PIECES, ...LAYER_TYPES])} Pieces: ${PIECES.join(", ")}.`);
  if (where === "card" && type === "card") return out.problems.push("A card can't hold a card. Put the cards side by side in a cards section.");
  if (where === "card" && COMPONENTS[type]) return out.problems.push(`A card holds primitives; ${a(type).toLowerCase()} ${type} can't go in it.`);
  if (where === "layer" && COMPONENTS[type] && type !== "fieldGroup") return out.problems.push(`${a(owner)} ${owner}'s rows hold primitives and fieldGroup; ${a(type).toLowerCase()} ${type} can't go in it.`);
  const unknown = unknownOptions(type, p);
  if (COMPONENTS[type]) out.problems.push(...unknown);
  else for (const w of unknown) out.warnings.push(w.replace(/\.$/, ", so it is left out."));
  if (type === "stats") {
    const n = Array.isArray(p.items) ? p.items.length : 0;
    if (n > MAX_STATS) out.problems.push(`A stats piece shows up to ${MAX_STATS} items; this one has ${n}. Use two stats pieces.`);
    else if (n && cells < statsNeed(n)) out.problems.push(statsTooWide(n, cells));
  }
  if (type === "fieldGroup") {
    for (const f of Array.isArray(p.fields) ? p.fields : []) {
      if (!FIELD_TYPES.includes(f?.type)) out.problems.push(`A fieldGroup's fields are ${list(FIELD_TYPES, "or")}; "${f?.type}" isn't one.`);
      else for (const w of unknownOptions(f.type, f)) out.warnings.push(w.replace(/\.$/, ", so it is left out."));
    }
  }
  if (type === "card") {
    if (p.rows != null && !Array.isArray(p.rows)) out.problems.push("A card's rows are a list of pieces.");
    for (const r of Array.isArray(p.rows) ? p.rows : []) checkPiece(r, { where: "card", owner: "card", cells: cells - 4 }, out);
  }
  if (type === "dataTable" && p.columns != null && !Array.isArray(p.columns)) out.problems.push("A dataTable's columns are a list of names.");
}

/** Every problem with a page spec, as sentences. Warnings go to warnLog. */
export function checkPage(data) {
  const out = { problems: [], warnings: [] };
  const P = out.problems;
  if (!isObject(data)) return ['A page\'s data is an object with "sections".'];
  for (const k of Object.keys(data)) if (!PAGE_OPTIONS.includes(k)) P.push(`A page takes ${list(PAGE_OPTIONS)}; "${k}" isn't one.`);
  const W = data.width ?? 80;
  if (!Number.isInteger(W) || W < PAGE.minWidth || W > PAGE.maxWidth) P.push(`A page is ${PAGE.minWidth} to ${PAGE.maxWidth} cells wide.`);
  const inner = (Number.isInteger(W) ? Math.min(Math.max(W, PAGE.minWidth), PAGE.maxWidth) : 80) - 2;
  if (!Array.isArray(data.sections) || !data.sections.length) P.push('A page needs at least one section in "sections".');
  (Array.isArray(data.sections) ? data.sections : []).forEach((s, i) => {
    const name = `Section ${i + 1}`;
    if (!isObject(s)) return P.push(`${name} isn't a section: a section is an object with rows, columns or cards.`);
    for (const k of Object.keys(s)) if (!SECTION_OPTIONS.includes(k) && k !== "widths") P.push(`A section takes ${list(SECTION_OPTIONS)}; "${k}" isn't one.`);
    const held = ["rows", "columns", "cards"].filter((k) => s[k] !== undefined);
    if (held.length !== 1) P.push(`${name} holds ${held.length ? list(held) : "nothing"}; a section holds one of rows, columns or cards.`);
    P.push(...[choice("section", "above", s.above, ["double", "line", "space", "none"]), choice("section", "align", s.align, ["left", "center"]), choice("section", "measure", s.measure, ["full", "narrow"]), choice("section", "pad", s.pad, [0, 1, 2]), choice("section", "rule", s.rule, [true, false])].filter(Boolean));
    if (s.columns !== undefined) {
      if (!Array.isArray(s.columns) || !s.columns.every(Array.isArray)) return P.push(`${name}'s columns are a list of lists of pieces, one list a column.`);
      const n = s.columns.length;
      if (n > PAGE.columns) return P.push(`A section has at most ${PAGE.columns} columns; ${name.toLowerCase()} has ${n}.`);
      if (n < 2) return P.push("A columns section has 2 to 4 columns; use rows for one.");
      if (s.split !== undefined && !SPLITS[s.split]) P.push(`split is one of ${Object.keys(SPLITS).join(", ")}.`);
      else if (s.split !== undefined && SPLITS[s.split].length !== n) P.push(`split "${s.split}" is for ${NUMBER[SPLITS[s.split].length - 1]} columns; ${name.toLowerCase()} has ${NUMBER[n - 1]}.`);
      else if (s.split === undefined && s.split === undefined && s.widths !== undefined && (!Array.isArray(s.widths) || !s.widths.every(Number.isInteger))) P.push("A section's widths are whole cells, one for each column but the last.");
      else {
        const need = n * PAGE.columnCells + (n - 1);
        const sp = spans(s, inner);
        if (need > inner) P.push(`${NUMBER[n - 1][0].toUpperCase() + NUMBER[n - 1].slice(1)} columns need ${need} cells; this page has ${inner} inside its frame.`);
        else if (Math.min(...sp) < PAGE.columnCells) P.push(`With ${s.split ? `split ${s.split}` : "these widths"}, a column gets ${Math.min(...sp)} cells; a column needs ${PAGE.columnCells}. Use a more even split or a wider page.`);
        s.columns.forEach((col, k) => col.forEach((p) => checkPiece(p, { where: "section", cells: (sp[k] ?? 14) - 2 }, out)));
      }
    } else if (s.cards !== undefined) {
      if (!Array.isArray(s.cards)) return P.push(`${name}'s cards are a list of cards.`);
      const n = s.cards.length;
      if (n > PAGE.cards) return P.push(`A cards section holds 2 or 3 cards; ${name.toLowerCase()} has ${n}. Use two cards sections.`);
      if (n < 2) return P.push("A cards section holds 2 or 3 cards; for one card, put a card piece in rows.");
      const cw = Math.floor((inner - 2 - 2 * (n - 1)) / n);
      s.cards.forEach((c) => (isObject(c) ? checkPiece({ type: "card", ...c }, { where: "section", cells: cw }, out) : P.push("A card is an object with a title and rows.")));
    } else if (s.rows !== undefined) {
      if (!Array.isArray(s.rows)) return P.push(`${name}'s rows are a list of pieces.`);
      const cells = s.measure === "narrow" ? Math.min(PAGE.narrow, inner - 2) : inner - 2;
      s.rows.forEach((p) => checkPiece(p, { where: "section", cells }, out));
    }
  });
  const layers = data.layers ?? [];
  if (!Array.isArray(layers)) P.push("A page's layers are a list.");
  else if (layers.length > PAGE.layers) P.push(`A page has at most ${PAGE.layers} layers; this one has ${layers.length}.`);
  else
    for (const L of layers) {
      if (!isObject(L) || !LAYER_TYPES.includes(L.type)) {
        const t = L?.type;
        P.push(PIECES.includes(t) ? `${a(t)} ${t} is a piece, not a layer: put it in a section's rows. Layers: ${LAYER_TYPES.join(", ")}.` : `There is no layer called "${t}".${meant(t, LAYER_TYPES)} Layers: ${LAYER_TYPES.join(", ")}.`);
        continue;
      }
      const t = L.type;
      P.push(...unknownOptions(t, L));
      P.push(...[choice(t, "side", L.side, ["left", "right"]), OPTIONS[t].includes("size") ? choice(t, "size", L.size, ["s", "m", "l"]) : ""].filter(Boolean));
      if (L.width !== undefined) {
        const max = t === "drawer" ? inner - PAGE_BESIDE - 2 : inner - 6;
        if (!Number.isInteger(L.width) || L.width < 16 || L.width > max) P.push(`${a(t)} ${t} is 16 to ${max} cells wide on a ${inner + 2}-cell page; better, give it a size: s, m or l.`);
      }
      if ((t === "popover" || t === "menu") && (L.anchor == null || L.anchor === "")) P.push(`${a(t)} ${t} needs an anchor: a button's label, a nav, tab or list item, or a piece's id.`);
      if (t === "menu" && !Array.isArray(L.items)) P.push('A menu needs "items": text, { text, meta }, or "-" for a rule.');
      if (t === "toast" && (L.text == null || L.text === "")) P.push('A toast needs "text".');
      if (L.rows !== undefined && !Array.isArray(L.rows)) P.push(`${a(t)} ${t}'s rows are a list of pieces.`);
      for (const p of Array.isArray(L.rows) ? L.rows : []) checkPiece(p, { where: "layer", owner: t, cells: 24 }, out);
    }
  if (data.notes !== undefined && !isObject(data.notes)) P.push('A page\'s notes are an object: { "1": "text" }.');
  // Anchors need the page drawn, so they are checked once everything else is right.
  if (!P.length && layers.length) {
    try {
      layoutPage(data);
    } catch (error) {
      P.push(error.message);
    }
  }
  for (const w of out.warnings) warnLog.add(w);
  return P;
}
