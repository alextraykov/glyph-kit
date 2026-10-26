// HTML fidelity: the same spec as a self-contained page.
// Charts stay text (a labelled <pre>). Wireframes become a working prototype: real controls on an
// artboard, styled from the design-system map's tokens, each element tagged with the component it
// stands for, notes pinned to the elements they describe. Motion specs play, with a still for reduced motion.
import { FONT_CSS } from "./font.mjs";
import { resolve } from "../registry.mjs";
import { SPACING } from "./themes.mjs";
import { isSample } from "../guard.mjs";
import { PAINT_CSS, paint } from "./paint.mjs";
import { ARRIVE_CSS, ARRIVE_JS, arriveLines } from "./arrive.mjs";
import { staggerStarts } from "../areas/motion.mjs";
import { body, label } from "./text.mjs";
import { moves, stillText } from "../motion.mjs";
import { inlineMotion, renderLiveHtml } from "../live/html.mjs";
import { isLayout } from "../areas/layouts.mjs";
import { renderLayoutPage } from "./page.mjs";
import { SPLITS, layoutPage } from "../areas/page.mjs";
import { maskOf } from "./mask.mjs";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Neutral defaults. A design-system map replaces any of them. */
export const DEFAULT_TOKENS = {
  ink: "#16161a",
  surface: "#ffffff",
  panel: "#f3f3f1",
  muted: "#6b6b70",
  line: "#e2e2de",
  accent: "#16161a",
  onAccent: "#ffffff",
  danger: "#c4401c",
  ok: "#0a7a50",
  space: "8px",
  radius: "10px",
  font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"Departure Mono", Menlo, "DejaVu Sans Mono", Consolas, "Cascadia Mono", monospace',
  durationBase: "200ms",
  easingBase: "cubic-bezier(0.2, 0, 0, 1)"
};

const cssName = (k) => `--gk-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
const tokensCss = (map) => {
  const t = { ...DEFAULT_TOKENS, ...(map?.tokens ?? {}) };
  return `:root{${Object.entries(t).map(([k, v]) => `${cssName(k)}:${v}`).join(";")}}`;
};

const component = (map, primitive) => map?.components?.[primitive]?.name ?? primitive;
const tag = (map, primitive) => `data-component="${esc(component(map, primitive))}"`;

// One element per wireframe primitive, mirroring PRIMITIVES in areas/wireframes.mjs.
const PRIMITIVE_HTML = {
  heading: (r, m) => `<h3 class="gk-h" ${tag(m, "heading")}>${esc(r.text)}</h3>`,
  text: (r, m) => `<p class="gk-p" ${tag(m, "text")}>${esc(r.text)}</p>`,
  muted: (r, m) => `<p class="gk-p gk-muted" ${tag(m, "text")}>${esc(r.text)}</p>`,
  input: (r, m, id) =>
    `<div class="gk-row gk-row--field"><label for="${id}">${esc(r.label ?? "")}</label><input class="gk-input" id="${id}" value="${esc(r.value ?? "")}" placeholder="${esc(r.placeholder ?? "")}" ${tag(m, "input")}></div>`,
  search: (r, m, id) =>
    `<div class="gk-search" ${tag(m, "search")}><label class="gk-sr" for="${id}">Search</label><span class="gk-search__icon" aria-hidden="true"></span><input class="gk-input" id="${id}" type="search" placeholder="${esc(r.placeholder ?? "Search")}">${r.hint ? `<kbd>${esc(r.hint)}</kbd>` : ""}</div>`,
  buttons: (r, m) =>
    `<div class="gk-actions${r.align === "right" ? " gk-actions--end" : ""}">${r.items
      .map((b) => {
        const off = b.disabled || b.untilChange;
        return anchored(b.label, `<button type="button" class="gk-btn${b.primary ? " gk-btn--primary" : ""}${b.danger ? " gk-btn--danger" : ""}" ${tag(m, "button")}${off ? " disabled" : ""}${b.untilChange ? " data-until-change" : ""}${b.closes ? " data-close" : ""}>${esc(b.label)}</button>`);
      })
      .join("")}</div>`,
  checkbox: (r, m, id) =>
    `<div class="gk-row"><input class="gk-check" type="checkbox" id="${id}"${r.checked ? " checked" : ""} ${tag(m, "checkbox")}><label for="${id}">${esc(r.label)}</label></div>`,
  radio: (r, m, id) =>
    `<fieldset class="gk-radios" ${tag(m, "radio")}><legend class="gk-sr">${esc(r.label ?? "Choose one")}</legend>${r.options
      .map((o, i) => `<label><input class="gk-radio" type="radio" name="${id}" value="${i}"${o === r.selected ? " checked" : ""}> ${esc(o)}</label>`)
      .join("")}</fieldset>`,
  toggle: (r, m, id) =>
    `<div class="gk-row gk-row--toggle"><label for="${id}">${esc(r.label)}</label><input class="gk-switch" id="${id}" type="checkbox" role="switch"${r.on ? " checked" : ""} ${tag(m, "toggle")}></div>`,
  select: (r, m, id) =>
    `<div class="gk-row gk-row--field"><label for="${id}">${esc(r.label ?? "")}</label><span class="gk-select"><select id="${id}" ${tag(m, "select")}>${[r.value, ...(r.options ?? [])]
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((o) => `<option>${esc(o)}</option>`)
      .join("")}</select></span></div>`,
  tabs: (r, m) =>
    `<div class="gk-tabs" role="tablist" ${tag(m, "tabs")}>${r.items
      .map((t) => `<button type="button" role="tab" aria-selected="${t === r.selected}">${esc(t)}</button>`)
      .join("")}</div>`,
  list: (r, m) =>
    `<ul class="gk-list" ${tag(m, "list")}>${r.items
      .map((it) => (typeof it === "string" ? { text: it } : it))
      .map(
        (it) =>
          `<li${it.selected ? ' aria-current="true"' : ""}${it.disabled ? ' aria-disabled="true"' : ""}><span>${esc(it.text)}</span><span class="gk-meta">${esc(it.meta ?? "")}</span></li>`
      )
      .join("")}</ul>`,
  table: (r, m) =>
    `<table class="gk-table" ${tag(m, "table")}><thead><tr>${r.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${r.rows
      .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`,
  image: (r, m) =>
    `<div class="gk-image" role="img" aria-label="${esc(r.label ?? "Image")}" style="--rows:${r.height ?? 3}" ${tag(m, "image")}><span>${esc(r.label ?? "image")}</span></div>`,
  skeleton: (r, m) => `<div class="gk-skeleton" role="status" aria-label="Loading" ${tag(m, "skeleton")}>${"<span></span>".repeat(r.lines ?? 3)}</div>`,
  empty: (r, m) =>
    `<div class="gk-empty" ${tag(m, "emptyState")}><span class="gk-empty__mark" aria-hidden="true">░▒▓</span><p>${esc(r.text)}</p>${
      r.action ? `<button type="button" class="gk-btn gk-btn--primary" ${tag(m, "button")}>${esc(r.action)}</button>` : ""
    }</div>`,
  bar: (r, m) => `<div class="gk-bar"><span class="gk-bar__left">${barText(r.left, m)}</span><span class="gk-bar__right">${r.actions?.length ? PRIMITIVE_HTML.buttons({ items: r.actions }, m) : barText(r.right, m)}</span></div>`,
  space: () => `<div class="gk-gap" aria-hidden="true"></div>`,
  divider: (r) => (r.label ? `<div class="gk-or" role="separator"><span>${esc(r.label)}</span></div>` : `<hr class="gk-rule">`)
};

// Text in a bar may carry buttons written as the text form writes them: [[ Primary ]], [ Plain ].
function barText(text, map) {
  const parts = String(text ?? "").split(/(\[\[ .+? \]\]|\[ .+? \])/);
  return parts
    .map((t) => {
      const b = t.match(/^\[(\[)? (.+?) \]\]?$/);
      if (b) return PRIMITIVE_HTML.buttons({ items: [{ label: b[2], primary: Boolean(b[1]) }] }, map);
      if (t.startsWith("> ")) return `<span class="gk-search gk-search--bar"><span class="gk-search__icon" aria-hidden="true"></span><input class="gk-input" type="search" aria-label="Search" placeholder="${esc(t.slice(2))}" ${tag(map, "search")}></span>`;
      return t.trim() ? `<span>${esc(t.trim())}</span>` : "";
    })
    .join("");
}

// Popovers and menus are placed right after their anchor, inside a relative wrapper, so they open
// under it with no measuring. While a page is drawn, `anchors` holds the layers still to place.
let anchors = null;
function anchored(name, html) {
  const layer = anchors?.get(String(name ?? ""));
  if (!layer) return html;
  anchors.delete(String(name));
  const opened = html.replace(/^<(button|a|li|div)/, `<$1 aria-expanded="true" aria-controls="${layer.id}" aria-haspopup="${layer.menu ? "menu" : "dialog"}"`);
  return `<span class="gk-anchor">${opened}${layer.html}</span>`;
}

// Components and layers: each becomes a real element tagged with the map's name for it, its inner
// pieces with data-part, and choice-valued options with the props the map gives them.
const entry = (map, kind) => map?.components?.[kind];
const part = (map, kind, key) => `data-part="${esc(entry(map, kind)?.parts?.[key] ?? key)}"`;
const NOT_PROPS = new Set(["type", "name", "import", "parts", "anchor", "selected", "id", "note"]);
function propsOf(map, kind, piece) {
  const e = entry(map, kind);
  if (!e) return "";
  const out = [];
  for (const [k, v] of Object.entries(piece)) {
    const m = e[k];
    if (NOT_PROPS.has(k) || m == null || v == null || v === false) continue;
    if (typeof m === "object") m[v] != null && out.push(m[v]);
    else out.push(/=/.test(m) || v === true ? m : `${m}="${v}"`);
  }
  return out.length ? ` data-props="${esc(out.join(" "))}"` : "";
}
const ctag = (map, kind, piece) => `${tag(map, kind)}${propsOf(map, kind, piece)}`;
const itemOf = (t) => (t && typeof t === "object" ? t : { text: String(t ?? "") });
const btns = (items, map) => (items?.length ? PRIMITIVE_HTML.buttons({ items }, map) : "");

const COMPONENT_HTML = {
  nav: (r, m) =>
    `<nav class="gk-nav" ${ctag(m, "nav", r)}>${r.brand ? `<span class="gk-nav__brand">${esc(r.brand)}</span>` : ""}<ul class="gk-nav__items">${(r.items ?? [])
      .map(itemOf)
      .map((t) => `<li>${anchored(t.text, `<a href="#" ${part(m, "nav", "items")}${t.text === r.selected ? ' aria-current="page"' : ""}>${esc(t.text)}</a>`)}</li>`)
      .join("")}</ul>${r.actions?.length ? `<div class="gk-nav__actions" ${part(m, "nav", "actions")}>${btns(r.actions, m)}</div>` : ""}</nav>`,
  tabsBar: (r, m) =>
    `<div class="gk-tabsbar" ${ctag(m, "tabsBar", r)}><div class="gk-tabs" role="tablist">${(r.items ?? [])
      .map(itemOf)
      .map((t) => anchored(t.text, `<button type="button" role="tab" aria-selected="${t.text === r.selected}" ${part(m, "tabsBar", "items")}>${esc(t.text)}${t.count != null ? ` <span class="gk-count" ${part(m, "tabsBar", "count")}>${esc(t.count)}</span>` : ""}</button>`))
      .join("")}</div>${btns(r.actions, m)}</div>`,
  fieldGroup: (r, m) =>
    `<fieldset class="gk-fieldset" ${ctag(m, "fieldGroup", r)}>${r.title ? `<legend class="gk-h" ${part(m, "fieldGroup", "title")}>${esc(r.title)}</legend>` : ""}${r.help ? `<p class="gk-p gk-muted" ${part(m, "fieldGroup", "help")}>${esc(r.help)}</p>` : ""}${rowsHtml(r.fields ?? [], m)}</fieldset>`,
  dataTable: (r, m) => {
    const cols = r.columns ?? [];
    const rows = (r.rows ?? []).slice(0, 12);
    const checked = new Set(r.checked ?? []);
    const box = (on, label) => (r.selectable ? `<td class="gk-dt__check"><input class="gk-check" type="checkbox" aria-label="${esc(label)}"${on ? " checked" : ""} ${tag(m, "checkbox")}></td>` : "");
    const bar = r.search || r.actions?.length
      ? `<div class="gk-dt__bar" role="toolbar">${r.search ? `<div class="gk-search" ${part(m, "dataTable", "search")}><span class="gk-search__icon" aria-hidden="true"></span><input class="gk-input" type="search" aria-label="Search" placeholder="${esc(r.search)}"></div>` : "<span></span>"}<div ${part(m, "dataTable", "actions")}>${btns(r.actions, m)}</div></div>`
      : "";
    const more = (r.rows ?? []).length - rows.length;
    return `<div class="gk-dt" ${ctag(m, "dataTable", r)}>${bar}<table class="gk-table"><thead><tr>${r.selectable ? '<th scope="col"><span class="gk-sr">Select</span></th>' : ""}${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows
      .map((row, i) => `<tr>${box(checked.has(i), `Select row ${i + 1}`)}${cols.map((c, k) => `<td>${esc((Array.isArray(row) ? row[k] : row?.[c]) ?? "")}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>${more > 0 ? `<p class="gk-p gk-muted">… and ${more} more rows</p>` : ""}${
      r.total != null ? `<nav class="gk-paging" aria-label="Pages" ${part(m, "dataTable", "total")}><span>${rows.length ? `1–${rows.length}` : "0"} of ${esc(r.total)}</span><button type="button" class="gk-btn" aria-label="Previous page">◄</button><button type="button" class="gk-btn" aria-label="Next page">►</button></nav>` : ""
    }</div>`;
  },
  card: (r, m) =>
    `<article class="gk-card" ${ctag(m, "card", r)}>${r.title || r.meta ? `<header ${part(m, "card", "title")}><h4>${esc(r.title ?? "")}</h4>${r.meta ? `<span class="gk-chip">${esc(r.meta)}</span>` : ""}</header>` : ""}<div class="gk-body">${rowsHtml(r.rows ?? [], m)}</div>${
      r.footer?.length ? `<footer ${part(m, "card", "footer")}>${btns(r.footer, m)}</footer>` : ""
    }</article>`,
  stats: (r, m) =>
    `<dl class="gk-stats" ${ctag(m, "stats", r)}>${(r.items ?? []).slice(0, 4).map((s) => `<div class="gk-stat"><dt>${esc(s?.label)}</dt><dd class="gk-stat__value">${esc(s?.value)}</dd>${s?.change != null ? `<dd class="gk-meta">${esc(s.change)}</dd>` : ""}</div>`).join("")}</dl>`,
  emptyState: (r, m) =>
    `<div class="gk-empty" ${ctag(m, "emptyState", r)}><span class="gk-empty__mark" aria-hidden="true">░░░</span>${r.title ? `<h3 class="gk-h">${esc(r.title)}</h3>` : ""}<p>${esc(r.text ?? "")}</p>${btns([r.action && { label: r.action, primary: true }, r.secondary && { label: r.secondary }].filter(Boolean), m)}</div>`
};

let ids = 0;
function rowsHtml(rows, map) {
  return rows
    .map((r) => {
      const draw = PRIMITIVE_HTML[r.type] ?? COMPONENT_HTML[r.type];
      if (!draw) throw new Error(`Unknown wireframe primitive: ${r.type}`);
      const html = r.id != null ? anchored(r.id, draw(r, map, `gk-f${++ids}`)) : draw(r, map, `gk-f${++ids}`);
      return r.note ? `<div class="gk-noted">${html}<span class="gk-pin" aria-hidden="true">${esc(r.note)}</span></div>` : html;
    })
    .join("\n");
}

/** One screen as a working prototype: an app surface with its own dialog and pinned notes. */
function screenHtml(spec, map, { notes = true } = {}) {
  const dialog = spec.overlay
    ? `<div class="gk-dimmer" data-dialog><section class="gk-dialog" role="dialog" aria-modal="true" aria-labelledby="gk-d${++ids}" ${tag(map, "dialog")}><h3 id="gk-d${ids}">${esc(spec.overlay.title)}</h3><div class="gk-body">${rowsHtml(
        spec.overlay.rows.map((r) => (r.type === "buttons" ? { ...r, align: "right", items: r.items.map((b) => ({ ...b, closes: true })) } : r)),
        map
      )}</div></section></div>`
    : "";
  const list = Object.entries(spec.notes ?? {});
  const screen = `<section class="gk-screen" aria-label="${esc(spec.title ?? "Screen")}" style="--w:${spec.width ?? 46}" data-screen>${
    spec.title ? `<header class="gk-screen__bar"><span>${esc(spec.title)}</span></header>` : ""
  }<div class="gk-body">${rowsHtml(spec.rows, map)}</div>${dialog}</section>`;
  if (!notes || !list.length) return `<div class="gk-board">${screen}</div>`;
  return `<div class="gk-board">${screen}<ol class="gk-notes" aria-label="Notes">${list
    .map(([k, v]) => `<li><span class="gk-pin" aria-hidden="true">${esc(k)}</span><span><span class="gk-sr">Note ${esc(k)}: </span>${esc(v)}</span></li>`)
    .join("")}</ol></div>`;
}

// A page as a working prototype: its sections as real regions, columns as a CSS grid, and each layer
// as the element it stands for. The page under a drawer, sheet, popover, menu or toast stays
// interactive and takes the muted colour; a dialog keeps its dimmer and aria-modal.
function layerHtml(L, map, id, { right } = {}) {
  const t = L.type;
  const title = L.title ? `<h3 id="${id}-t" ${part(map, t, "title")}>${esc(L.title)}</h3>` : "";
  const labelled = L.title ? ` aria-labelledby="${id}-t"` : ` aria-label="${esc(t)}"`;
  const close = `<button type="button" class="gk-x" aria-label="Close" data-close>×</button>`;
  const rows = () => rowsHtml((L.rows ?? []).map((r) => (r.type === "buttons" ? { ...r, items: r.items.map((b) => ({ ...b, closes: true })) } : r)), map);
  const foot = L.footer?.length ? `<footer class="gk-layer__foot" ${part(map, t, "footer")}>${btns(L.footer.map((b) => ({ ...b, closes: true })), map)}</footer>` : "";
  if (t === "drawer")
    return `<aside class="gk-drawer gk-drawer--${L.side === "left" ? "left" : "right"}" id="${id}" role="dialog" aria-modal="false"${labelled} data-layer ${ctag(map, t, L)}><header class="gk-layer__head">${title}${close}</header><div class="gk-body">${rows()}</div>${foot}</aside>`;
  if (t === "sheet")
    return `<section class="gk-sheet" id="${id}" role="dialog" aria-modal="false"${labelled} data-layer ${ctag(map, t, L)}><span class="gk-sheet__handle" aria-hidden="true"></span><header class="gk-layer__head">${title}${close}</header><div class="gk-body">${rows()}</div></section>`;
  if (t === "popover")
    return `<div class="gk-popover${right ? " gk-popover--end" : ""}" id="${id}" role="dialog" aria-label="${esc(L.anchor)}" data-layer ${ctag(map, t, L)}><div class="gk-body">${rows()}</div></div>`;
  if (t === "menu")
    return `<div class="gk-menu${right ? " gk-popover--end" : ""}" id="${id}" role="menu" aria-label="${esc(L.anchor)}" data-layer ${ctag(map, t, L)}>${(L.items ?? [])
      .map((it) => (it === "-" ? `<hr role="separator" ${part(map, t, "-")}>` : `<button type="button" role="menuitem" data-close ${part(map, t, "items")}><span>${esc(itemOf(it).text)}</span>${itemOf(it).meta ? `<kbd>${esc(itemOf(it).meta)}</kbd>` : ""}</button>`))
      .join("")}</div>`;
  if (t === "toast")
    return `<div class="gk-toast" id="${id}" role="status" data-layer ${ctag(map, t, L)}><span>${esc(L.text)}</span>${L.action ? `<button type="button" class="gk-btn" data-close ${part(map, t, "action")}>${esc(L.action)}</button>` : ""}</div>`;
  return `<div class="gk-dimmer" id="${id}" data-layer data-modal><section class="gk-dialog" role="dialog" aria-modal="true"${labelled} ${ctag(map, "dialog", L)}>${title}<div class="gk-body">${rows()}${foot}</div></section></div>`;
}

const columnsCss = (s) => {
  const n = s.columns.length;
  const parts = Array.isArray(s.widths) ? [...s.widths.slice(0, n - 1), Math.max(1, 76 - s.widths.slice(0, n - 1).reduce((a, b) => a + b, 0))] : SPLITS[s.split] ?? Array(n).fill(1);
  return parts.map((p) => `minmax(0,${p}fr)`).join(" ");
};

function sectionHtml(s, i, map) {
  const above = i === 0 ? "none" : s.above ?? "double";
  const cls = `gk-sec gk-sec--${above}${s.align === "center" ? " gk-sec--center" : ""}${s.measure === "narrow" ? " gk-sec--narrow" : ""}`;
  const pad = s.pad ? ` style="--pad:${Math.min(2, s.pad)}"` : "";
  if (s.columns)
    return `<div class="${cls}"${pad}><div class="gk-cols${s.rule === false ? "" : " gk-cols--rule"}" style="grid-template-columns:${columnsCss(s)}">${s.columns.map((c) => `<div class="gk-body">${rowsHtml(c ?? [], map)}</div>`).join("")}</div></div>`;
  if (s.cards) return `<div class="${cls}"${pad}><div class="gk-cards" style="--n:${s.cards.length}">${s.cards.map((c) => COMPONENT_HTML.card({ type: "card", ...c }, map)).join("")}</div></div>`;
  return `<div class="${cls}"${pad}><div class="gk-body">${rowsHtml(s.rows ?? [], map)}</div></div>`;
}

function pageHtml(spec, map, { notes = true } = {}) {
  const d = spec.data;
  const W = d.width ?? 80;
  const lay = layoutPage(d, { lang: spec.lang });
  const layers = (d.layers ?? []).map((L, k) => ({ L, id: `gk-l${++ids}`, right: (lay.placed[k]?.rect?.c0 ?? 0) > W / 2 }));
  anchors = new Map();
  for (const x of layers) if (x.L.type === "popover" || x.L.type === "menu") anchors.set(String(x.L.anchor), { id: x.id, menu: x.L.type === "menu", html: "" });
  // Layers anchored inside another layer are drawn with it: draw the free layers' html first.
  const html = {};
  const draw = (x) => (html[x.id] ??= layerHtml(x.L, map, x.id, x));
  for (const x of [...layers].reverse()) if (anchors.has(String(x.L.anchor))) anchors.get(String(x.L.anchor)).html = draw(x);
  const sections = (d.sections ?? []).slice(0, 8).map((s, i) => sectionHtml(s, i, map));
  layers.filter((x) => x.L.type !== "popover" && x.L.type !== "menu").forEach(draw);
  const drawer = layers.filter((x) => x.L.type === "drawer").map((x) => html[x.id]).join("");
  const others = layers.filter((x) => x.L.type !== "drawer" && x.L.type !== "popover" && x.L.type !== "menu").map((x) => html[x.id]).join("");
  // An anchor the page didn't draw as a control (rare) still gets its layer, at the page's corner.
  const lost = [...anchors.values()].map((a) => a.html).join("");
  anchors = null;
  const [first, ...rest] = sections.length > 1 ? sections : ["", ...sections];
  const head = d.url
    ? `<header class="gk-browser"><span aria-hidden="true">◄ ►</span><span class="gk-url">${esc(d.url)}</span></header>`
    : d.title ? `<header class="gk-screen__bar"><span>${esc(d.title)}</span></header>` : "";
  const muted = layers.some((x) => x.L.type !== "dialog");
  const page = `<section class="gk-screen gk-page${muted ? " gk-page--under" : ""}" aria-label="${esc(d.title ?? spec.title ?? "Page")}" style="--w:${W}" data-page>${head}${first}<div class="gk-page__rest">${rest.join("")}${drawer}</div>${others}${lost ? `<div class="gk-lost">${lost}</div>` : ""}</section>`;
  const list = Object.entries(d.notes ?? {});
  if (!notes || !list.length) return `<div class="gk-board">${page}</div>`;
  return `<div class="gk-board">${page}<ol class="gk-notes" aria-label="Notes">${list.map(([k, v]) => `<li><span class="gk-pin" aria-hidden="true">${esc(k)}</span><span><span class="gk-sr">Note ${esc(k)}: </span>${esc(v)}</span></li>`).join("")}</ol></div>`;
}

const curveCss = (c) => (Array.isArray(c) ? `cubic-bezier(${c.join(",")})` : c ?? "ease-out");
const cssProp = (p) => (p === "shadow" ? "box-shadow" : p);
const cssValue = (property, value) => {
  const v = String(value).trim();
  if (property === "transform") {
    const m = v.match(/^(x|y)\s*(-?[\d.]+)(px|%)?$/i);
    if (m) return `translate${m[1].toUpperCase()}(${m[2]}${m[3] ?? "px"})`;
    const s = v.match(/^scale\s*([\d.]+)$/i);
    if (s) return `scale(${s[1]})`;
  }
  if (property === "shadow" || property === "box-shadow") return v === "none" ? "0 0 0 rgb(0 0 0 / 0)" : "0 10px 30px rgb(0 0 0 / .16)";
  return v;
};

// Playable motion for the motion kinds. The still (shown under reduced motion) is the end state.
function motionDemo(spec) {
  const d = spec.data;
  if (spec.kind === "transitionSpec") {
    const from = d.map((t) => `${cssProp(t.property)}:${cssValue(t.property, t.from)}`).join(";");
    const to = d.map((t) => `${cssProp(t.property)}:${cssValue(t.property, t.to)}`).join(";");
    const tr = d.map((t) => `${cssProp(t.property)} ${t.end - t.start}ms ${curveCss(t.easing ?? [0.2, 0, 0, 1])} ${t.start}ms`).join(",");
    return { css: `.gk-stage .gk-actor{${to}}.gk-stage.is-from .gk-actor{${from};transition:none}.gk-stage:not(.is-from) .gk-actor{transition:${tr}}`, html: `<div class="gk-actor gk-actor--card"></div>` };
  }
  if (spec.kind === "stagger") {
    // The same start times the figure draws, so the cards and the bars agree.
    const items = staggerStarts(d).map((at) => `<div class="gk-actor gk-actor--small" style="--at:${at}ms"></div>`).join("");
    return {
      css: `.gk-stage.is-from .gk-actor{opacity:0;transform:translateY(14px);transition:none}.gk-stage:not(.is-from) .gk-actor{transition:opacity ${d.duration}ms ${curveCss(d.curve)} var(--at),transform ${d.duration}ms ${curveCss(d.curve)} var(--at)}`,
      html: `<div class="gk-actors">${items}</div>`
    };
  }
  return null;
}

const BASE_CSS = `
:root{--gk-data:var(--gk-accent);--gk-frame:var(--gk-muted);--gk-flag:var(--gk-danger)}
${PAINT_CSS("--gk-")}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;color-scheme:light}
body{margin:0;background:var(--gk-surface);color:var(--gk-ink);font:15px/1.5 var(--gk-font);-webkit-font-smoothing:antialiased}
:focus-visible{outline:2px solid var(--gk-accent);outline-offset:2px}
.gk-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.gk-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px;padding:14px 24px;background:var(--gk-surface);border-bottom:1px solid var(--gk-line)}
.gk-top h1{margin:0;font-size:15px;font-weight:600}
.gk-top p{margin:0;color:var(--gk-muted);font-size:14px}
.gk-chip--sample{justify-self:center;align-self:center;color:var(--gk-danger);border-color:currentColor}.gk-chip{padding:2px 8px;border:1px solid var(--gk-line);border-radius:999px;color:var(--gk-muted);font:500 11px/1.6 var(--gk-mono);letter-spacing:.04em;text-transform:uppercase}
.gk-canvas{min-height:calc(100vh - 53px);display:grid;place-items:center;padding:56px 24px;background-color:var(--gk-panel);background-image:radial-gradient(color-mix(in srgb,var(--gk-ink) 14%,transparent) 1px,transparent 1px);background-size:16px 16px}
.gk-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px;padding:12px 24px;color:var(--gk-muted);font-size:13px;border-top:1px solid var(--gk-line);background:var(--gk-surface)}
.gk-foot details summary{cursor:pointer}
.gk-foot pre{max-width:100%;overflow:auto}
pre.gk-figure{margin:0;padding:32px 36px;background:var(--gk-surface);border:1px solid var(--gk-line);border-radius:var(--gk-radius);font:13.5px/${SPACING.figureLine} var(--gk-mono);white-space:pre;overflow-x:auto;font-variant-ligatures:none;letter-spacing:0;max-width:100%}
.gk-board{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:center;gap:28px}
.gk-screen{position:relative;width:min(100%,max(320px,calc(var(--w) * 11.5px)));background:var(--gk-surface);border:1px solid var(--gk-line);border-radius:var(--gk-radius);box-shadow:0 1px 2px rgb(0 0 0 / .05),0 18px 48px rgb(0 0 0 / .09)}
.gk-screen__bar{display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid var(--gk-line);font-weight:600}
.gk-body{display:grid;gap:14px;padding:20px}
.gk-h{margin:0;color:var(--gk-muted);font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.gk-p{margin:0}.gk-muted,.gk-meta{color:var(--gk-muted)}
.gk-gap{height:2px}
.gk-rule{margin:4px -20px;border:0;border-top:1px solid var(--gk-line)}
.gk-row{display:flex;align-items:center;gap:12px;min-height:36px}
.gk-row--toggle{justify-content:space-between}
.gk-row--field{display:grid;grid-template-columns:minmax(96px,34%) 1fr}
.gk-row--field label{color:var(--gk-muted)}
.gk-input,.gk-select select{width:100%;height:38px;padding:0 12px;border:1px solid var(--gk-line);border-radius:calc(var(--gk-radius) * .7);background:var(--gk-surface);color:var(--gk-ink);font:inherit;transition:border-color min(var(--gk-duration-base),150ms) ease}
@media (hover:hover) and (pointer:fine){.gk-input:hover,.gk-select select:hover{border-color:color-mix(in srgb,var(--gk-ink) 35%,var(--gk-line))}}
.gk-select{position:relative;display:block}
.gk-select select{appearance:none;-webkit-appearance:none;padding-right:40px;cursor:pointer}
.gk-select::after{content:"";position:absolute;right:16px;top:50%;width:7px;height:7px;border-right:1.5px solid var(--gk-muted);border-bottom:1.5px solid var(--gk-muted);transform:translateY(-70%) rotate(45deg);pointer-events:none}
.gk-switch{appearance:none;-webkit-appearance:none;position:relative;flex:none;width:40px;height:24px;margin:0;border-radius:999px;background:color-mix(in srgb,var(--gk-ink) 18%,transparent);cursor:pointer;transition:background var(--gk-duration-base) var(--gk-easing-base)}
.gk-switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--gk-surface);box-shadow:0 1px 2px rgb(0 0 0 / .25);transition:transform var(--gk-duration-base) var(--gk-easing-base)}
.gk-switch:checked{background:var(--gk-accent)}.gk-switch:checked::after{transform:translateX(16px)}
.gk-check,.gk-radio{width:18px;height:18px;margin:0;accent-color:var(--gk-accent)}
.gk-radios{display:flex;flex-wrap:wrap;gap:8px 20px;margin:0;padding:0;border:0}.gk-radios label{display:inline-flex;align-items:center;gap:8px}
.gk-actions{display:flex;flex-wrap:wrap;gap:10px}.gk-actions--end{justify-content:flex-end}
.gk-btn{height:38px;padding:0 16px;border:1px solid var(--gk-line);border-radius:calc(var(--gk-radius) * .7);background:var(--gk-surface);color:var(--gk-ink);font:500 14px/1 var(--gk-font);cursor:pointer;transition:background min(var(--gk-duration-base),150ms) ease,opacity var(--gk-duration-base) var(--gk-easing-base),transform 150ms cubic-bezier(.25,.46,.45,.94)}
.gk-btn:active:not(:disabled){transform:scale(.97)}
@media (hover:hover) and (pointer:fine){.gk-btn:hover{background:var(--gk-panel)}}
.gk-btn--primary{background:var(--gk-accent);border-color:var(--gk-accent);color:var(--gk-on-accent)}@media (hover:hover) and (pointer:fine){.gk-btn--primary:hover{background:color-mix(in srgb,var(--gk-accent) 86%,var(--gk-surface))}}
.gk-btn--danger{background:var(--gk-danger);border-color:var(--gk-danger);color:#fff}
.gk-btn:disabled{opacity:.4;cursor:not-allowed}
.gk-search{position:relative;display:flex;align-items:center}.gk-search .gk-input{padding-left:36px;padding-right:72px}
.gk-search__icon{position:absolute;left:13px;width:11px;height:11px;border:1.5px solid var(--gk-muted);border-radius:50%}.gk-search__icon::after{content:"";position:absolute;right:-5px;bottom:-4px;width:6px;height:1.5px;background:var(--gk-muted);transform:rotate(45deg)}
.gk-search kbd{position:absolute;right:10px;padding:2px 6px;border:1px solid var(--gk-line);border-radius:5px;color:var(--gk-muted);font:11px var(--gk-mono)}
.gk-tabs{display:flex;gap:4px;margin:-6px -4px 0;border-bottom:1px solid var(--gk-line)}
.gk-tabs button{position:relative;padding:8px 10px 12px;border:0;background:none;color:var(--gk-muted);font:500 14px/1 var(--gk-font);cursor:pointer}
.gk-tabs button[aria-selected=true]{color:var(--gk-ink)}
.gk-tabs button[aria-selected=true]::after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:2px;background:var(--gk-accent)}
.gk-list{margin:0 -20px;padding:0;list-style:none}
.gk-list li{display:flex;justify-content:space-between;gap:12px;padding:10px 20px;border-top:1px solid var(--gk-line)}
.gk-list li:last-child{border-bottom:1px solid var(--gk-line)}
.gk-list [aria-current]{background:color-mix(in srgb,var(--gk-accent) 8%,transparent);box-shadow:inset 3px 0 var(--gk-accent);font-weight:500}
.gk-list [aria-disabled]{color:var(--gk-muted)}
.gk-table{width:100%;border-collapse:collapse;font-size:14px}.gk-table th{color:var(--gk-muted);font-weight:500;text-align:left}.gk-table :is(th,td){padding:8px 0;border-bottom:1px solid var(--gk-line)}
.gk-image{display:grid;place-items:center;min-height:calc(var(--rows) * 30px);border-radius:calc(var(--gk-radius) * .7);background:repeating-linear-gradient(135deg,var(--gk-panel) 0 8px,color-mix(in srgb,var(--gk-panel) 50%,var(--gk-surface)) 8px 16px)}
.gk-image span{padding:2px 8px;border-radius:999px;background:var(--gk-surface);color:var(--gk-muted);font:12px var(--gk-mono)}
.gk-skeleton{display:grid;gap:10px}.gk-skeleton span{height:12px;border-radius:6px;background:var(--gk-panel)}.gk-skeleton span:nth-child(2){width:72%}.gk-skeleton span:nth-child(3){width:84%}
.gk-empty{display:grid;justify-items:center;gap:12px;padding:28px 12px;text-align:center}.gk-empty p{max-width:30ch;margin:0;color:var(--gk-muted)}
.gk-empty__mark{font:22px/1 var(--gk-mono);letter-spacing:2px;color:var(--gk-muted)}
.gk-noted{position:relative}
.gk-pin{display:inline-grid;place-items:center;flex:none;width:22px;height:22px;border-radius:50%;background:var(--gk-accent);color:var(--gk-on-accent);font:600 12px/1 var(--gk-font)}
.gk-noted > .gk-pin{position:absolute;right:-33px;top:50%;transform:translateY(-50%);box-shadow:0 0 0 3px var(--gk-surface)}
.gk-notes{display:grid;gap:12px;width:min(100%,260px);margin:0;padding:16px;list-style:none;background:var(--gk-surface);border:1px solid var(--gk-line);border-radius:var(--gk-radius);font-size:14px}
.gk-notes li{display:flex;gap:10px;align-items:flex-start}
.gk-dimmer{position:absolute;inset:0;display:grid;place-items:center;padding:20px;border-radius:inherit;background:rgb(10 10 12 / .42)}
.gk-dimmer[hidden]{display:none}
.gk-dialog{width:min(100%,360px);background:var(--gk-surface);border-radius:var(--gk-radius);box-shadow:0 24px 64px rgb(0 0 0 / .28)}
.gk-dialog h3{margin:0;padding:18px 20px 0;font-size:16px}
.gk-dialog .gk-body{padding-top:10px}
.gk-pair{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:40px}
.gk-pair figure{display:grid;gap:12px;margin:0}.gk-pair figcaption{color:var(--gk-muted);font:500 12px var(--gk-mono)}
.gk-stage{display:grid;gap:14px;width:min(100%,520px);padding:20px;background:var(--gk-surface);border:1px solid var(--gk-line);border-radius:var(--gk-radius)}
.gk-stage p{margin:0;color:var(--gk-muted);font-size:13px}
.gk-actor{width:120px;height:72px;border-radius:calc(var(--gk-radius) * .7);background:var(--gk-accent)}
.gk-actor--small{width:56px;height:56px}.gk-actors{display:flex;gap:10px}
.gk-figure-wrap{display:grid;justify-items:center;gap:20px}
.gk-page{overflow:clip}.gk-page .gk-body{padding:16px 20px}
.gk-browser{display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:1px solid var(--gk-line);color:var(--gk-muted);font:13px var(--gk-mono)}.gk-url{flex:1;padding:6px 12px;border-radius:999px;background:var(--gk-panel);color:var(--gk-ink)}
.gk-sec{padding-block:calc(var(--pad,0) * 12px)}.gk-sec--double{border-top:1px solid var(--gk-line)}.gk-sec--line{margin-inline:20px;border-top:1px solid var(--gk-line)}.gk-sec--line .gk-body{padding-inline:0}.gk-sec--space{margin-top:12px}
.gk-sec--center .gk-body{justify-items:center;text-align:center}.gk-sec--narrow .gk-body{width:min(100%,460px);margin-inline:auto}
.gk-cols{display:grid}.gk-cols--rule>*+*{border-left:1px solid var(--gk-line)}
.gk-cards{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:16px;padding:16px 20px}
.gk-card{display:grid;grid-template-rows:auto 1fr auto;border:1px solid var(--gk-line);border-radius:var(--gk-radius);background:var(--gk-surface)}.gk-card header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:14px 16px 0}.gk-card h4{margin:0;font-size:15px}.gk-card .gk-body{padding:12px 16px}.gk-card footer{padding:12px 16px;border-top:1px solid var(--gk-line)}
.gk-nav{display:flex;align-items:center;gap:24px}.gk-nav__brand{font-weight:700;letter-spacing:.04em;text-transform:uppercase}.gk-nav__items{display:flex;gap:18px;margin:0;padding:0;list-style:none}.gk-nav__items a{color:var(--gk-muted);text-decoration:none;padding-bottom:6px}.gk-nav__items a[aria-current]{color:var(--gk-ink);box-shadow:inset 0 -2px var(--gk-accent)}.gk-nav__actions{margin-left:auto}
.gk-tabsbar{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;border-bottom:1px solid var(--gk-line)}.gk-tabsbar .gk-tabs{border:0;margin:0}.gk-count{margin-left:4px;padding:1px 7px;border-radius:999px;background:var(--gk-panel);color:var(--gk-muted);font-size:12px}
.gk-bar{display:flex;align-items:center;justify-content:space-between;gap:12px}.gk-bar>span{display:flex;align-items:center;gap:10px}.gk-search--bar{min-width:220px}
.gk-or{display:flex;align-items:center;gap:12px;color:var(--gk-muted);font-size:13px}.gk-or::before,.gk-or::after{content:"";flex:1;border-top:1px solid var(--gk-line)}
.gk-fieldset{display:grid;gap:12px;margin:0;padding:0;border:0}.gk-fieldset legend{margin-bottom:4px;padding:0}
.gk-dt{display:grid;gap:12px}.gk-dt__bar{display:flex;justify-content:space-between;gap:12px}.gk-dt__bar .gk-search{flex:1;max-width:320px}.gk-dt__check{width:28px}
.gk-paging{display:flex;align-items:center;gap:8px;color:var(--gk-muted);font-size:14px}.gk-paging span{margin-right:auto}.gk-paging .gk-btn{width:38px;padding:0}
.gk-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin:0}.gk-stat{padding:12px 14px;border:1px solid var(--gk-line);border-radius:var(--gk-radius)}.gk-stat dt{color:var(--gk-muted);font-size:13px}.gk-stat dd{margin:0}.gk-stat__value{font-size:22px;font-weight:600}
.gk-page__rest{position:relative}
.gk-page--under .gk-sec{color:var(--gk-muted)}.gk-page--under .gk-sec .gk-btn--primary{opacity:.6}
.gk-drawer,.gk-sheet,.gk-popover,.gk-menu,.gk-toast{color:var(--gk-ink);background:var(--gk-surface);text-align:left}
.gk-drawer{position:absolute;top:0;bottom:0;width:min(85%,max(240px,38%));display:grid;grid-template-rows:auto 1fr auto;box-shadow:0 0 0 1px var(--gk-line),0 18px 48px rgb(0 0 0 / .16)}.gk-drawer--right{right:0}.gk-drawer--left{left:0}
.gk-layer__head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:16px 20px 0}.gk-layer__head h3{margin:0;font-size:16px}.gk-layer__foot{display:flex;justify-content:flex-end;padding:12px 20px;border-top:1px solid var(--gk-line)}
.gk-x{width:32px;height:32px;border:0;border-radius:50%;background:none;color:var(--gk-muted);font-size:18px;cursor:pointer}
.gk-sheet{position:absolute;left:0;right:0;bottom:0;border-top:1px solid var(--gk-line);box-shadow:0 -18px 48px rgb(0 0 0 / .14)}.gk-sheet__handle{display:block;width:40px;height:4px;margin:10px auto 0;border-radius:2px;background:var(--gk-line)}
.gk-anchor{position:relative;display:inline-flex}
.gk-popover,.gk-menu{position:absolute;top:calc(100% + 8px);left:0;z-index:2;min-width:220px;border:1px solid var(--gk-line);border-radius:var(--gk-radius);box-shadow:0 12px 32px rgb(0 0 0 / .16)}.gk-popover--end{left:auto;right:0}
.gk-menu{display:grid;padding:6px;min-width:180px}.gk-menu button{display:flex;justify-content:space-between;gap:16px;padding:8px 10px;border:0;border-radius:6px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}.gk-menu hr{width:100%;margin:4px 0;border:0;border-top:1px solid var(--gk-line)}.gk-menu kbd{color:var(--gk-muted);font:12px var(--gk-mono)}
@media (hover:hover) and (pointer:fine){.gk-menu button:hover{background:var(--gk-panel)}}
.gk-toast{position:absolute;right:16px;bottom:16px;display:flex;align-items:center;gap:14px;padding:10px 12px 10px 16px;border:1px solid var(--gk-line);border-radius:var(--gk-radius);box-shadow:0 12px 32px rgb(0 0 0 / .16)}
.gk-lost{position:absolute;top:56px;right:20px}
[data-layer][hidden]{display:none}
/* Reduced motion: nothing moves, colour and opacity still fade so state changes stay readable. */
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0s!important}.gk-switch::after,.gk-stage *{transition:none!important}.gk-btn{transition:background min(var(--gk-duration-base),150ms) ease,opacity var(--gk-duration-base) var(--gk-easing-base)}.gk-btn:active:not(:disabled){transform:none}.gk-play{display:none}}
.gk-figure{--gk-arrive-ink:var(--gk-data);--gk-arrive-paper:var(--gk-surface)}
${ARRIVE_CSS}
`;

let stages = 0;

/** The figure part of a spec, as an HTML fragment (used by the page and the deck). */
export function fragment(spec, { map, notes = true } = {}) {
  resolve(spec);
  // Made-up data is stamped on the prototype too, not only on text figures.
  const sample = isSample(spec.source) ? `<span class="gk-chip gk-chip--sample">Sample data</span>` : "";
  if (spec.kind === "screen") return sample + screenHtml(spec.data, map, { notes });
  if (spec.kind === "page") return sample + pageHtml(spec, map, { notes });
  if (spec.kind === "responsive")
    return sample + `<div class="gk-pair">${spec.data.map((s) => `<figure><figcaption>${esc(s.label)}</figcaption>${screenHtml(s.spec, map, { notes: false })}</figure>`).join("")}</div>`;
  if (spec.motion && moves(spec.kind)) return `<pre lang="${esc(spec.lang ?? "en")}" class="gk-figure" data-moving role="img" aria-label="${esc(label(spec))}">${esc(stillText(spec))}</pre><template data-motion-spec>${esc(JSON.stringify(spec))}</template>`;
  const text = body(spec);
  const arrived = arriveLines(spec, text);
  const figure = `<pre lang="${esc(spec.lang ?? "en")}" class="gk-figure"${arrived ? " data-arrive" : ""} role="img" aria-label="${esc(label(spec))}">${arrived ? arrived.join("\n") : paint(text)}</pre>`;
  const demo = motionDemo(spec);
  if (!demo) return figure;
  // Every demo rule starts with .gk-stage; scope it to this stage so several demos can share a page.
  const id = `gk-stage-${++stages}`;
  return `<div class="gk-figure-wrap">${figure}<div class="gk-stage" id="${id}" data-gk-stage><style>${demo.css.replaceAll(".gk-stage", `#${id}.gk-stage`)}</style>${demo.html}<p>${demo.note ? `${demo.note} ` : ""}Under reduced motion this shows the end state only.</p><button type="button" class="gk-btn gk-play" data-gk-play>Play again</button></div></div>`;
}

// Behaviour for prototypes: tabs select, dialogs close and reopen, "until change" buttons wake up, motion plays.
const PLAY_JS = `
document.querySelectorAll("[data-gk-stage]").forEach((s)=>{const b=s.querySelector("[data-gk-play]");const fig=s.parentElement.querySelector("[data-arrive]");const play=()=>{s.classList.add("is-from");void s.offsetWidth;if(fig){fig.classList.remove("is-arriving","is-waiting");void fig.offsetWidth}requestAnimationFrame(()=>requestAnimationFrame(()=>{s.classList.remove("is-from");fig&&fig.classList.add("is-arriving")}))};b&&b.addEventListener("click",play);if(matchMedia("(prefers-reduced-motion: reduce)").matches||!("IntersectionObserver" in window))return;s.classList.add("is-from");const io=new IntersectionObserver((es)=>{if(!es[0].isIntersecting)return;io.disconnect();play()},{threshold:.5});io.observe(s)});
document.querySelectorAll(".gk-tabs").forEach((t)=>t.addEventListener("click",(e)=>{const b=e.target.closest("[role=tab]");if(!b)return;t.querySelectorAll("[role=tab]").forEach((x)=>x.setAttribute("aria-selected",String(x===b)))}));
document.querySelectorAll("[data-screen]").forEach((screen)=>{const wake=()=>screen.querySelectorAll("[data-until-change]").forEach((b)=>b.disabled=false);screen.addEventListener("input",wake);screen.addEventListener("change",wake);const d=screen.querySelector("[data-dialog]");if(!d)return;d.querySelectorAll("[data-close]").forEach((b)=>b.addEventListener("click",()=>{d.hidden=true;screen.querySelector("[data-reopen]")?.removeAttribute("hidden")}));addEventListener("keydown",(e)=>{if(e.key==="Escape")d.hidden=true});screen.querySelector(".gk-list")?.addEventListener("click",()=>{d.hidden=false})});
document.querySelectorAll("[data-page]").forEach((p)=>{const layers=[...p.querySelectorAll("[data-layer]")];const ctl=(l)=>p.querySelector('[aria-controls="'+l.id+'"]');const sync=()=>p.classList.toggle("gk-page--under",layers.some((l)=>!l.hidden&&!l.hasAttribute("data-modal")));const show=(l,on)=>{l.hidden=!on;ctl(l)?.setAttribute("aria-expanded",String(on));sync()};layers.forEach((l)=>{l.querySelectorAll("[data-close]").forEach((b)=>b.addEventListener("click",(e)=>{if(b.closest("[data-layer]")===l)show(l,false)}));ctl(l)?.addEventListener("click",(e)=>{if(l.contains(e.target))return;e.stopPropagation();show(l,l.hidden)})});addEventListener("keydown",(e)=>{if(e.key==="Escape")layers.forEach((l)=>show(l,false))});document.addEventListener("click",(e)=>layers.filter((l)=>l.matches(".gk-popover,.gk-menu")&&!l.hidden&&!l.contains(e.target)).forEach((l)=>show(l,false)));const wake=()=>p.querySelectorAll("[data-until-change]").forEach((b)=>b.disabled=false);p.addEventListener("input",wake);p.addEventListener("change",wake)})
`;

const page = ({ title, intent, source, content, text, mask, map, moving = false, lang = "en" }) => `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${map?.stylesheet ? `<link rel="stylesheet" href="${esc(map.stylesheet)}">` : ""}
<style>${FONT_CSS()}${tokensCss(map)}${BASE_CSS}</style>
</head>
<body>
<header class="gk-top"><span class="gk-chip">Prototype</span><h1>${esc(title)}</h1>${intent ? `<p>${esc(intent)}</p>` : ""}</header>
<main class="gk-canvas">${content}</main>
<footer class="gk-foot"><span>${source ? `Source: ${esc(source)}` : "Made with Glyph kit"}</span>${
  text ? `<details><summary>The same spec as text</summary><pre class="gk-figure">${mask ? paint(text, { mask }) : esc(text)}</pre></details>` : ""
}</footer>
<script>${PLAY_JS}${ARRIVE_JS}</script>
${moving ? `<script>${inlineMotion(moving)}\ndocument.querySelectorAll('[data-motion-spec]').forEach(t => { const spec = JSON.parse(t.content.textContent); const {make,still} = animate(spec); autoplay(t.previousElementSibling,make,still); });</script>` : ""}
</body>
</html>
`;

// The kinds a list of specs plays, or false when nothing moves.
const playing = (specs) => { const kinds = specs.filter((s) => s.motion && moves(s.kind)).map((s) => s.kind); return kinds.length ? kinds : false; };

/** A whole self-contained page for one spec, or for a list of specs one after another. */
export function renderHtml(spec, { map, title: pageTitle } = {}) {
  if (!Array.isArray(spec) && spec.motion && moves(spec.kind)) return renderLiveHtml(spec);
  if (!Array.isArray(spec) && isLayout(spec)) return renderLayoutPage(spec);
  if (Array.isArray(spec)) {
    const content = `<div style="display:grid;gap:56px;justify-items:center;width:100%">${spec
      .map((s) => `<section style="display:grid;gap:16px;justify-items:center;width:100%"><h2 style="margin:0;font-size:16px">${esc(s.title ?? resolve(s).label)}</h2>${fragment(s, { map })}</section>`)
      .join("")}</div>`;
    return page({ lang: spec[0]?.lang, title: pageTitle ?? "Glyph kit", content, map, moving: playing(spec) });
  }
  const def = resolve(spec);
  const isScreen = spec.kind === "screen" || spec.kind === "responsive" || spec.kind === "page";
  return page({
    lang: spec.lang,
    title: spec.title ?? def.label,
    intent: spec.intent,
    source: spec.source,
    content: fragment(spec, { map }),
    text: isScreen ? body(spec) : "",
    mask: spec.kind === "page" ? maskOf(spec) : undefined,
    map
  });
}

export { BASE_CSS, PLAY_JS, esc, tokensCss };
