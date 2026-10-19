// HTML fidelity: the same spec as a self-contained page.
// Charts stay text (a labelled <pre>). Wireframes become a working prototype: real controls on an
// artboard, styled from the design-system map's tokens, each element tagged with the component it
// stands for, notes pinned to the elements they describe. Motion specs play, with a still for reduced motion.
import { resolve } from "../registry.mjs";
import { SPACING } from "./themes.mjs";
import { isSample } from "../guard.mjs";
import { PAINT_CSS, paint } from "./paint.mjs";
import { body, label } from "./text.mjs";

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
  mono: 'Menlo, "DejaVu Sans Mono", Consolas, "Cascadia Mono", monospace',
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
        return `<button type="button" class="gk-btn${b.primary ? " gk-btn--primary" : ""}${b.danger ? " gk-btn--danger" : ""}" ${tag(m, "button")}${off ? " disabled" : ""}${b.untilChange ? " data-until-change" : ""}${b.closes ? " data-close" : ""}>${esc(b.label)}</button>`;
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
  space: () => `<div class="gk-gap" aria-hidden="true"></div>`,
  divider: () => `<hr class="gk-rule">`
};

let ids = 0;
function rowsHtml(rows, map) {
  return rows
    .map((r) => {
      const draw = PRIMITIVE_HTML[r.type];
      if (!draw) throw new Error(`Unknown wireframe primitive: ${r.type}`);
      const html = draw(r, map, `gk-f${++ids}`);
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
    const items = Array.from({ length: d.count }, (_, i) => `<div class="gk-actor gk-actor--small" style="--i:${i}"></div>`).join("");
    return {
      css: `.gk-stage.is-from .gk-actor{opacity:0;transform:translateY(14px);transition:none}.gk-stage:not(.is-from) .gk-actor{transition:opacity ${d.duration}ms ${curveCss(d.curve)} calc(var(--i)*${d.delay}ms),transform ${d.duration}ms ${curveCss(d.curve)} calc(var(--i)*${d.delay}ms)}`,
      html: `<div class="gk-actors">${items}</div>`
    };
  }
  if (spec.kind === "filmstrip" || spec.kind === "intentCard") {
    const ms = d.ms ?? 400;
    return {
      css: `.gk-stage .gk-track{position:relative;height:40px;border-bottom:1px dashed var(--gk-line)}.gk-stage .gk-track .gk-actor{position:absolute;top:4px;left:calc(100% - 32px);width:32px;height:32px}.gk-stage.is-from .gk-track .gk-actor{left:0;transition:none}.gk-stage:not(.is-from) .gk-track .gk-actor{transition:left ${ms}ms ${curveCss(d.easing)}}`,
      html: `<div class="gk-track"><div class="gk-actor"></div></div>`
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
.gk-input,.gk-select select{width:100%;height:38px;padding:0 12px;border:1px solid var(--gk-line);border-radius:calc(var(--gk-radius) * .7);background:var(--gk-surface);color:var(--gk-ink);font:inherit;transition:border-color var(--gk-duration-base) var(--gk-easing-base)}
.gk-input:hover,.gk-select select:hover{border-color:color-mix(in srgb,var(--gk-ink) 35%,var(--gk-line))}
.gk-select{position:relative;display:block}
.gk-select select{appearance:none;-webkit-appearance:none;padding-right:40px;cursor:pointer}
.gk-select::after{content:"";position:absolute;right:16px;top:50%;width:7px;height:7px;border-right:1.5px solid var(--gk-muted);border-bottom:1.5px solid var(--gk-muted);transform:translateY(-70%) rotate(45deg);pointer-events:none}
.gk-switch{appearance:none;-webkit-appearance:none;position:relative;flex:none;width:40px;height:24px;margin:0;border-radius:999px;background:color-mix(in srgb,var(--gk-ink) 18%,transparent);cursor:pointer;transition:background var(--gk-duration-base) var(--gk-easing-base)}
.gk-switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--gk-surface);box-shadow:0 1px 2px rgb(0 0 0 / .25);transition:transform var(--gk-duration-base) var(--gk-easing-base)}
.gk-switch:checked{background:var(--gk-accent)}.gk-switch:checked::after{transform:translateX(16px)}
.gk-check,.gk-radio{width:18px;height:18px;margin:0;accent-color:var(--gk-accent)}
.gk-radios{display:flex;flex-wrap:wrap;gap:8px 20px;margin:0;padding:0;border:0}.gk-radios label{display:inline-flex;align-items:center;gap:8px}
.gk-actions{display:flex;flex-wrap:wrap;gap:10px}.gk-actions--end{justify-content:flex-end}
.gk-btn{height:38px;padding:0 16px;border:1px solid var(--gk-line);border-radius:calc(var(--gk-radius) * .7);background:var(--gk-surface);color:var(--gk-ink);font:500 14px/1 var(--gk-font);cursor:pointer;transition:background var(--gk-duration-base) var(--gk-easing-base),opacity var(--gk-duration-base) var(--gk-easing-base)}
.gk-btn:hover{background:var(--gk-panel)}
.gk-btn--primary{background:var(--gk-accent);border-color:var(--gk-accent);color:var(--gk-on-accent)}.gk-btn--primary:hover{background:color-mix(in srgb,var(--gk-accent) 86%,var(--gk-surface))}
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
@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important}.gk-play{display:none}}
`;

let stages = 0;

/** The figure part of a spec, as an HTML fragment (used by the page and the deck). */
export function fragment(spec, { map, notes = true } = {}) {
  resolve(spec);
  // Made-up data is stamped on the prototype too, not only on text figures.
  const sample = isSample(spec.source) ? `<span class="gk-chip gk-chip--sample">Sample data</span>` : "";
  if (spec.kind === "screen") return sample + screenHtml(spec.data, map, { notes });
  if (spec.kind === "responsive")
    return sample + `<div class="gk-pair">${spec.data.map((s) => `<figure><figcaption>${esc(s.label)}</figcaption>${screenHtml(s.spec, map, { notes: false })}</figure>`).join("")}</div>`;
  const figure = `<pre class="gk-figure" role="img" aria-label="${esc(label(spec))}">${paint(body(spec))}</pre>`;
  const demo = motionDemo(spec);
  if (!demo) return figure;
  // Every demo rule starts with .gk-stage; scope it to this stage so several demos can share a page.
  const id = `gk-stage-${++stages}`;
  return `<div class="gk-figure-wrap">${figure}<div class="gk-stage" id="${id}" data-gk-stage><style>${demo.css.replaceAll(".gk-stage", `#${id}.gk-stage`)}</style>${demo.html}<p>Under reduced motion this shows the end state only.</p><button type="button" class="gk-btn gk-play" data-gk-play>Play again</button></div></div>`;
}

// Behaviour for prototypes: tabs select, dialogs close and reopen, "until change" buttons wake up, motion plays.
const PLAY_JS = `
document.querySelectorAll("[data-gk-stage]").forEach((s)=>{const b=s.querySelector("[data-gk-play]");const play=()=>{s.classList.add("is-from");void s.offsetWidth;requestAnimationFrame(()=>requestAnimationFrame(()=>s.classList.remove("is-from")))};b&&b.addEventListener("click",play);if(!matchMedia("(prefers-reduced-motion: reduce)").matches)play()});
document.querySelectorAll(".gk-tabs").forEach((t)=>t.addEventListener("click",(e)=>{const b=e.target.closest("[role=tab]");if(!b)return;t.querySelectorAll("[role=tab]").forEach((x)=>x.setAttribute("aria-selected",String(x===b)))}));
document.querySelectorAll("[data-screen]").forEach((screen)=>{const wake=()=>screen.querySelectorAll("[data-until-change]").forEach((b)=>b.disabled=false);screen.addEventListener("input",wake);screen.addEventListener("change",wake);const d=screen.querySelector("[data-dialog]");if(!d)return;d.querySelectorAll("[data-close]").forEach((b)=>b.addEventListener("click",()=>{d.hidden=true;screen.querySelector("[data-reopen]")?.removeAttribute("hidden")}));addEventListener("keydown",(e)=>{if(e.key==="Escape")d.hidden=true});screen.querySelector(".gk-list")?.addEventListener("click",()=>{d.hidden=false})});
`;

const page = ({ title, intent, source, content, text, map }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${map?.stylesheet ? `<link rel="stylesheet" href="${esc(map.stylesheet)}">` : ""}
<style>${tokensCss(map)}${BASE_CSS}</style>
</head>
<body>
<header class="gk-top"><span class="gk-chip">Prototype</span><h1>${esc(title)}</h1>${intent ? `<p>${esc(intent)}</p>` : ""}</header>
<main class="gk-canvas">${content}</main>
<footer class="gk-foot"><span>${source ? `Source: ${esc(source)}` : "Made with Glyph kit"}</span>${
  text ? `<details><summary>The same spec as text</summary><pre class="gk-figure">${esc(text)}</pre></details>` : ""
}</footer>
<script>${PLAY_JS}</script>
</body>
</html>
`;

/** A whole self-contained page for one spec, or for a list of specs one after another. */
export function renderHtml(spec, { map, title: pageTitle } = {}) {
  if (Array.isArray(spec)) {
    const content = `<div style="display:grid;gap:56px;justify-items:center;width:100%">${spec
      .map((s) => `<section style="display:grid;gap:16px;justify-items:center;width:100%"><h2 style="margin:0;font-size:16px">${esc(s.title ?? resolve(s).label)}</h2>${fragment(s, { map })}</section>`)
      .join("")}</div>`;
    return page({ title: pageTitle ?? "Glyph kit", content, map });
  }
  const def = resolve(spec);
  const isScreen = spec.kind === "screen" || spec.kind === "responsive";
  return page({
    title: spec.title ?? def.label,
    intent: spec.intent,
    source: spec.source,
    content: fragment(spec, { map }),
    text: isScreen ? body(spec) : "",
    map
  });
}

export { BASE_CSS, PLAY_JS, esc, tokensCss };
