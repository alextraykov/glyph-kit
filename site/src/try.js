// Ask for one: send the ask to the drawing function on traykov.cc and draw the answer here with the
// kit's own code, live.
//
// Picking a suggestion shows the skeleton of what it builds: structure faint, content as ░. Building
// streams: while the model works the skeleton shimmers; as soon as it names a kind, that kind's
// skeleton takes over; when the checked figure arrives it builds in over its own skeleton, and a
// moving one then plays. Reduced motion skips the shimmer and the build and shows the result.
//
// Every message is one fixed sentence from the server or this file; only a known kind name and the
// checked figure ever come from the model's side.
// Fallbacks: a draw gives up after 45 s; a moving figure that can't play is drawn still; anything that
// can't be drawn here brings the last figure back. A figure too wide for its box scrolls inside it.
import { body, label } from "./kit/render/text.mjs";
import { classify } from "./kit/render/paint.mjs";
import { LIVE } from "./kit/live/kinds.mjs";
import { animate as animateSpec, stillGrid } from "./kit/motion.mjs";
import { KINDS } from "./kit/registry.mjs";
import { autoplay } from "./kit/live/play.mjs";
import { cellsFromGrid, cellsFromText, fillFrame, planBuild, shimmerFrame, skeleton, toHtml } from "./showcase-core.mjs";
import { figureSvg } from "./kit/render/svg.mjs";
import { PALETTES, SPACING, palette } from "./kit/render/themes.mjs";

// ── The Data view: the spec laid out to read, not as code ───────────────────────────────────────
// Title, intent and source first, then the data: a list of records becomes a table, a list of words a
// line, an object its named parts. Everything is set as text, never as markup.
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const words = (key) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());
const cellText = (v) => (v === null || v === undefined ? "" : Array.isArray(v) && v.every((x) => typeof x !== "object") ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v));
function dataValue(value) {
  if (Array.isArray(value) && value.length && value.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
    const keys = [...new Set(value.flatMap((row) => Object.keys(row)))];
    const table = el("table", "data__table");
    const head = table.createTHead().insertRow();
    keys.forEach((k) => head.append(el("th", "", words(k))));
    const tbody = table.createTBody();
    value.forEach((row) => {
      const tr = tbody.insertRow();
      keys.forEach((k) => tr.append(el("td", typeof row[k] === "number" ? "is-number" : "", cellText(row[k]))));
    });
    return table;
  }
  if (Array.isArray(value)) return el("p", "data__list", cellText(value));
  if (value && typeof value === "object") {
    const box = el("div", "data__group");
    for (const [key, child] of Object.entries(value)) {
      const part = el("section", "data__part");
      part.append(el("h4", "label", words(key)), dataValue(child));
      box.append(part);
    }
    return box;
  }
  return el("p", "data__list", cellText(value));
}
// Editing: values in a table of records or a list can be changed in place. Every keystroke redraws
// the figure here with the kit's own code (no call to the model); leaving a field keeps the change as
// a new version. What the kit refuses (a funnel that grows, a number without a source) shows as the
// kit's own sentence under the data, and the figure stays as it was.
const isRecords = (v) => Array.isArray(v) && v.length > 0 && v.every((r) => r && typeof r === "object" && !Array.isArray(r));
const isWords = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" || typeof x === "number");
const parseLike = (old, text) => {
  if (typeof old !== "number") return { value: text };
  const n = Number(String(text).replace(/,/g, "").trim());
  return Number.isFinite(n) && String(text).trim() !== "" ? { value: n } : { error: "That needs to be a number." };
};
function editableData(spec, edit, error) {
  const working = structuredClone(spec);
  const field = (value, onValue, label) => {
    const input = el("input", "data__input");
    input.value = cellText(value);
    input.setAttribute("aria-label", label);
    if (typeof value === "number") input.inputMode = "decimal";
    let timer = 0;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const read = parseLike(value, input.value);
        if (read.error) return (error.textContent = read.error);
        onValue(read.value);
        error.textContent = edit.preview(structuredClone(working));
      }, 120);
    });
    input.addEventListener("change", () => {
      clearTimeout(timer);
      const read = parseLike(value, input.value);
      if (read.error) return (error.textContent = read.error);
      onValue(read.value);
      error.textContent = edit.commit(structuredClone(working));
    });
    return input;
  };
  const wrap = el("div", "data__group");
  if (isRecords(working.data)) {
    const rows = working.data;
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const table = el("table", "data__table");
    const head = table.createTHead().insertRow();
    keys.forEach((k) => head.append(el("th", "", words(k))));
    head.append(el("th", ""));
    const tbody = table.createTBody();
    rows.forEach((row, i) => {
      const tr = tbody.insertRow();
      keys.forEach((k) => {
        const v = row[k];
        const td = el("td", typeof v === "number" ? "is-number" : "");
        if (v !== null && typeof v === "object") td.textContent = cellText(v);
        else td.append(field(v ?? "", (next) => (row[k] = next), `${words(k)}, row ${i + 1}`));
        tr.append(td);
      });
      const cell = el("td", "");
      if (rows.length > 1) {
        const remove = el("button", "data__row-remove", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove row ${i + 1}`);
        remove.addEventListener("click", () => {
          rows.splice(i, 1);
          error.textContent = edit.commit(structuredClone(working), { rerender: true });
        });
        cell.append(remove);
      }
      tr.append(cell);
    });
    const add = el("button", "data__add", "Add a row");
    add.type = "button";
    add.addEventListener("click", () => {
      rows.push(structuredClone(rows.at(-1)));
      error.textContent = edit.commit(structuredClone(working), { rerender: true });
    });
    wrap.append(table, add);
  } else if (isWords(working.data)) {
    const list = el("div", "data__group");
    working.data.forEach((v, i) => list.append(field(v, (next) => (working.data[i] = next), `Item ${i + 1}`)));
    wrap.append(list);
  } else return null;
  return wrap;
}
function renderData(target, spec, edit) {
  const meta = el("dl", "data__meta");
  for (const [key, label] of [["kind", "Type"], ["title", "Title"], ["intent", "Why"], ["source", "Source"]]) {
    if (spec[key] === undefined) continue;
    meta.append(el("dt", "label", label), el("dd", "", String(spec[key])));
  }
  const copy = el("button", "data__copy", "Copy as JSON");
  copy.type = "button";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
      copy.textContent = "Copied";
    } catch {
      copy.textContent = "Couldn't copy";
    }
    setTimeout(() => (copy.textContent = "Copy as JSON"), 1600);
  });
  const about = el("div", "data__about");
  about.append(meta);
  const body = el("div", "data__body");
  const error = el("p", "data__error");
  error.setAttribute("aria-live", "polite");
  const editable = edit ? editableData(spec, edit, error) : null;
  body.append(el("h4", "label", "Data"));
  if (editable) body.append(el("p", "data__note", "Change any value: the figure redraws here, without asking the model."), editable, error);
  else body.append(dataValue(spec.data));
  if (spec.options && Object.keys(spec.options).length) body.append(el("h4", "label", "Options"), dataValue(spec.options));
  target.replaceChildren(copy, about, body);
}
const emptyData = (target, text) => target.replaceChildren(el("p", "data__empty", text));

// ── History: figures built here, kept in this browser only ──────────────────────────────────────
const HISTORY_KEY = "glyph-kit:history";
const HISTORY_MAX = 20;
const readHistory = () => {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(list) ? list.filter((e) => e && e.spec && typeof e.ask === "string") : [];
  } catch {
    return [];
  }
};
const writeHistory = (list) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {} // storage full or blocked: the builder carries on without it
};
const when = (iso) => {
  const t = new Date(iso);
  const mins = Math.round((Date.now() - t.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (new Date().toDateString() === t.toDateString()) return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return t.toLocaleDateString([], { day: "numeric", month: "short" });
};

// ── The conversation: this figure's asks and versions, kept in this browser across reloads ──────────
const THREAD_KEY = "glyph-kit:thread";
const emptyThread = () => ({ versions: [], items: [], current: -1 });
const readThread = () => {
  try {
    const t = JSON.parse(localStorage.getItem(THREAD_KEY) || "null");
    if (t && Array.isArray(t.versions) && Array.isArray(t.items) && t.versions.every((v) => v && v.spec)) return t;
  } catch {}
  return emptyThread();
};
const writeThread = (t) => {
  try {
    localStorage.setItem(THREAD_KEY, JSON.stringify({ ...t, versions: t.versions.slice(-30), items: t.items.slice(-80) }));
  } catch {}
};
/** The kit's name for a figure, for the conversation's replies. */
const kindName = ({ spec, mode }) => (mode === "moving" ? LIVE[spec.kind]?.label : KINDS[spec.kind]?.label) ?? "Figure";

// ── Export: the figure on screen as text, Markdown, an image or its data ────────────────────────
/** The figure's text: a still kind's drawing, or a moving kind's still frame. */
function figureText({ spec, mode }) {
  if (mode === "moving") {
    try {
      const { make, still, summary } = animateSpec(spec);
      return { text: stillGrid(make, still).toText(), aria: summary, still: true };
    } catch {}
  }
  return { text: body(spec), aria: label(spec), still: false };
}
/** A standalone SVG, laid out like the kit's own: title, intent, the figure on a panel, the source. */
// The palette the figure is shown and exported in: the site's own colours, or one of the kit's.
const PALETTE_KEY = "glyph-kit-palette";
const PALETTE_NAMES = { site: "This site", paper: "Paper", ink: "Ink", phosphor: "Phosphor", gilt: "Gilt" };
let currentPalette = (() => {
  try {
    const saved = localStorage.getItem(PALETTE_KEY);
    return PALETTES[saved] ? saved : "site";
  } catch {
    return "site";
  }
})();
function figureImage(spec, text) {
  const c = palette(currentPalette === "site" ? "paper" : currentPalette);
  const padX = SPACING.figurePadX;
  const padY = SPACING.figurePadY;
  const titleH = spec.title ? 48 : 0;
  const intentH = spec.intent ? 26 : 0;
  const sourceH = spec.source ? 34 : 0;
  const fig = figureSvg(text, { colors: c, cell: 10, row: 22, x0: padX * 2, y0: padY + titleH + intentH + padY });
  const width = Math.max(fig.width + padX * 4, spec.title ? spec.title.length * 11 + padX * 2 : 0);
  const panelTop = padY + titleH + intentH;
  const panelH = fig.height + padY * 2;
  const height = panelTop + panelH + sourceH + padY;
  const x = (v) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const sans = `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"`;
  return { width, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>${fig.defs}</defs>
<rect width="100%" height="100%" fill="${c.bg}"/>
${spec.title ? `<text x="${padX}" y="${padY + 26}" ${sans} font-size="22" font-weight="600" fill="${c.ink}">${x(spec.title)}</text>` : ""}
${spec.intent ? `<text x="${padX}" y="${padY + titleH + 14}" ${sans} font-size="15" fill="${c.muted}">${x(spec.intent)}</text>` : ""}
<rect x="${padX}" y="${panelTop}" width="${width - padX * 2}" height="${panelH}" fill="${c.panel}"/>
<g font-family="Menlo, 'DejaVu Sans Mono', Consolas, monospace" font-size="${(22 * 0.66).toFixed(2)}">${fig.svg}</g>
${spec.source ? `<text x="${padX}" y="${panelTop + panelH + 24}" ${sans} font-size="12.5" fill="${c.muted}">Source: ${x(spec.source)}</text>` : ""}
</svg>
` };
}
const fileName = (spec) => (String(spec.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "glyph-kit-figure");
function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** The export formats for a figure. Each returns a Blob; text ones also give the text to copy. */
function exportsFor(result) {
  const { spec } = result;
  const { text, aria, still } = figureText(result);
  const frame = still ? " (still frame)" : "";
  const plain = [spec.title, "", text, ...(spec.source ? ["", `Source: ${spec.source}`] : [])].filter((l, i) => i > 0 || l).join("\n");
  const md = [...(spec.title ? [`### ${spec.title}`, ""] : []), ...(spec.intent ? [spec.intent, ""] : []), "```text", text, "```", "", `*${aria}*`, ...(spec.source ? ["", `Source: ${spec.source}`] : [])].join("\n");
  const image = figureImage(spec, text);
  return [
    { label: `Text${frame}`, ext: "txt", copy: plain, blob: () => new Blob([plain], { type: "text/plain" }) },
    { label: `Markdown${frame}`, ext: "md", copy: md, blob: () => new Blob([md], { type: "text/markdown" }) },
    { label: `Image, SVG${frame}`, ext: "svg", blob: () => new Blob([image.svg], { type: "image/svg+xml" }) },
    { label: `Image, PNG${frame}`, ext: "png", blob: () => svgToPng(image) },
    { label: "Data", ext: "json", blob: () => new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" }) },
  ];
}
/** The SVG drawn onto a canvas at 2×. Resolves to a PNG, or rejects so the caller can offer the SVG. */
function svgToPng({ svg, width, height }) {
  return new Promise((resolveImage, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      try {
        canvas.toBlob((blob) => (blob ? resolveImage(blob) : reject(new Error("no png"))), "image/png");
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("no png"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

const PAUSED = "Drawing is paused right now. Try again later.";
const CANT = "That one couldn't be drawn. Try naming the figure you want, like a funnel or a flow.";
const TIMEOUT_MS = 45_000;

// What a custom ask shows before the model has picked a kind: a frame with a title and rows of
// placeholder bars. It hands over to that kind's own skeleton as soon as the stream names it.
const GENERIC = (() => {
  const W = 49;
  const rows = [[12, 0, 0], [0, 0, 0], [8, 24, 4], [6, 16, 4], [9, 11, 3], [5, 6, 2]];
  const line = (a, b, c) => {
    const cell = (n, w) => ("░".repeat(n) + " ".repeat(w)).slice(0, w);
    return `│ ${cell(a, 10)} ${cell(b, 28)} ${cell(c, 5)} │`;
  };
  return [`┌${"─".repeat(W - 2)}┐`, ...rows.map(([a, b, c]) => line(a, b, c)), `└${"─".repeat(W - 2)}┘`].join("\n");
})();
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

const form = document.querySelector("[data-try]");
const out = document.querySelector("[data-try-out]");

if (form instanceof HTMLFormElement && out instanceof HTMLElement) {
  const field = form.querySelector("textarea[name='ask']");
  const submit = form.querySelector("[data-try-submit]");
  const status = form.querySelector("[data-try-status]");
  const stage = out.querySelector("[data-try-stage]");
  const hint = out.querySelector("[data-try-hint]");
  const title = out.querySelector("[data-try-title]");
  const stamp = out.querySelector("[data-try-stamp]");
  const specOut = out.querySelector("[data-try-spec]");
  // The builder may have no caption line; writes to it are then dropped.
  const caption = out.querySelector("[data-try-caption]") ?? { textContent: "" };
  const tabs = [...out.querySelectorAll("[data-tab]")];
  const IDLE = "Enter to build";
  const turnstileElement = document.querySelector("#try .cf-turnstile");
  const turnstileToken = () => String(document.querySelector("#try [name='cf-turnstile-response']")?.value ?? "");
  const historyEl = out.querySelector("[data-try-history]");
  const exportEl = out.querySelector("[data-try-export]");
  const exportMenu = out.querySelector("[data-try-export-menu]");
  const chipsEl = document.querySelector(".builder .chips");
  const PLACEHOLDER = field.placeholder;
  let busy = false;
  let shown = null; // the last real figure: { result, heading }
  // The figure the next ask changes. Each change sends only this figure and the new ask, never a
  // transcript: the server treats it as data (cleanBase) and returns the whole updated figure.
  let editing = null;

  const setStatus = (text, state = "idle") => {
    status.textContent = text || IDLE;
    status.dataset.state = state;
  };
  setStatus("");

  // The hero's previews keep playing; the builder has its own preview.
  const takeOver = () => {};

  // Preview or the data behind it, in the same fixed frame.
  const selectTab = (name) => {
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === name)));
    stage.hidden = name !== "preview";
    specOut.hidden = name !== "data";
    if (historyEl) {
      historyEl.hidden = name !== "history";
      if (name === "history") renderHistory();
    }
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));

  // Enter builds; Shift+Enter makes a new line.
  field.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  const flash = () => {
    field.removeAttribute("data-invalid");
    void field.offsetWidth; // restart the two flashes
    field.setAttribute("data-invalid", "");
  };
  field.addEventListener("input", () => {
    field.removeAttribute("data-invalid");
    pressChip(null); // edited: no longer the suggestion as given
  });

  // The chip in use stays pressed until the ask is edited.
  const chips = [...document.querySelectorAll("[data-preset]")];
  function pressChip(active) {
    chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip === active)));
  }
  pressChip(null);

  // Figures keep clear of the docked prompt, whatever height it wraps to.
  const dock = document.querySelector(".builder__dock");
  const builderEl = document.querySelector(".builder");
  if (dock && builderEl) new ResizeObserver(() => builderEl.style.setProperty("--dock", `${dock.offsetHeight}px`)).observe(dock);

  // ── What's on the stage ────────────────────────────────────────────────────────────────────────
  let raf = 0;
  let stopMoving = null;
  const halt = () => {
    cancelAnimationFrame(raf);
    stopMoving?.();
    stopMoving = null;
  };
  const fit = () => {
    hint.hidden = stage.scrollWidth <= stage.clientWidth + 1;
  };
  new ResizeObserver(fit).observe(stage);

  /** A fresh <pre> sized for these cells. */
  const mount = (cells, aria) => {
    const pre = document.createElement("pre");
    pre.className = "grid-figure live";
    pre.setAttribute("role", "img");
    if (aria) pre.setAttribute("aria-label", aria);
    stage.style.setProperty("--cols", String(Math.max(0, ...cells.ch.map((r) => r.length))));
    stage.style.setProperty("--rows", String(cells.ch.length));
    stage.scrollLeft = 0;
    stage.replaceChildren(pre);
    pre.innerHTML = toHtml(cells);
    requestAnimationFrame(fit);
    return pre;
  };
  /** Run frame(t) every frame until it returns true. */
  const animate = (frame) => {
    let t = 0;
    let last = 0;
    const tick = (now) => {
      t += last ? Math.min(now - last, 100) : 0;
      last = now;
      if (!frame(t)) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  /** Show a skeleton; it shimmers while waiting. */
  const showSkeleton = (skel, { shimmer = false } = {}) => {
    halt();
    const pre = mount(skel, "Figure on its way");
    stage.dataset.state = "skeleton";
    syncExport();
    if (!shimmer || reduce.matches) return;
    animate((t) => {
      pre.innerHTML = toHtml(shimmerFrame(skel, t));
      return false;
    });
  };

  /** Cells for a result, and how to play it once built. Throws when the kit can't draw it here. */
  const prepare = ({ spec, mode }) => {
    if (mode === "moving") {
      try {
        const { make, still, summary } = animateSpec(spec);
        const g = stillGrid(make, still);
        g.toText();
        return { cells: cellsFromGrid(g), aria: summary, play: (pre) => autoplay(pre, make, still) };
      } catch {
        // Can't play here: the still drawing of the same data.
      }
    }
    const text = body(spec);
    return { cells: cellsFromText(text, classify), aria: label(spec), play: null };
  };

  const describe = (spec, heading) => {
    title.textContent = heading ?? spec.title ?? "Your figure";
    stamp.textContent = /^(illustrative|sample)/i.test(spec.source ?? "") ? "Sample data" : "";
    renderData(specOut, spec, dataEdits);
    caption.textContent = spec.intent ?? spec.title ?? "";
  };

  // ── Editing the data by hand ──────────────────────────────────────────────────────────────────
  /** Put a drawing on the stage without touching the data panel (which may have focus). */
  const redraw = (drawn) => {
    halt();
    const pre = mount(drawn.cells, drawn.aria);
    stage.dataset.state = "figure";
    if (drawn.play) stopMoving = drawn.play(pre);
  };
  const dataEdits = {
    preview(next) {
      if (!shown) return "";
      try {
        redraw(prepare({ spec: next, mode: shown.result.mode }));
        return "";
      } catch (error) {
        return error instanceof Error && error.message ? error.message : "That can't be drawn.";
      }
    },
    commit(next, { rerender = false } = {}) {
      if (!shown) return "";
      const result = { spec: next, mode: shown.result.mode };
      let drawn;
      try {
        drawn = prepare(result);
      } catch (error) {
        restore();
        return error instanceof Error && error.message ? error.message : "That can't be drawn.";
      }
      redraw(drawn);
      if (!thread.versions.length) startThread(shown.result, null, "Started from this figure.");
      shown = { result, heading: undefined };
      title.textContent = next.title ?? "Your figure";
      addVersion(result, { who: "edit", text: "You changed the data." });
      setEditing(result);
      syncExport();
      enterSplit(true);
      if (rerender) renderData(specOut, next, dataEdits);
      return "";
    }
  };

  // ── The conversation and its versions ───────────────────────────────────────────────────────
  const threadEl = out.querySelector("[data-try-thread]");
  const threadList = out.querySelector("[data-try-thread-list]");
  const dividerEl = out.querySelector("[data-try-divider]");
  let thread = readThread();
  const saveThread = () => writeThread(thread);
  const startThread = (result, ask, reply) => {
    thread = { versions: [{ spec: result.spec, mode: result.mode }], items: [...(ask ? [{ who: "you", text: ask }] : []), { who: "kit", text: reply, v: 0 }], current: 0 };
    saveThread();
  };
  const addVersion = (result, item) => {
    thread.versions.push({ spec: result.spec, mode: result.mode });
    thread.current = thread.versions.length - 1;
    thread.items.push({ ...item, v: thread.current });
    saveThread();
    renderThread();
  };
  const say = (item) => {
    thread.items.push(item);
    saveThread();
    renderThread();
  };
  function renderThread() {
    if (!threadList) return;
    threadList.replaceChildren(...thread.items.map((item) => {
      const li = el("li");
      if (item.who === "you") li.append(el("p", "thread__you", item.text));
      else if (item.who === "fail") li.append(el("p", "thread__fail", item.text));
      else {
        const button = el("button", "thread__kit");
        button.type = "button";
        button.append(el("span", "", item.text), el("span", "thread__v", `v${item.v + 1}`));
        button.setAttribute("aria-current", String(item.v === thread.current));
        button.setAttribute("aria-label", `${item.text} Version ${item.v + 1}. Show this version.`);
        button.addEventListener("click", () => openVersion(item.v));
        li.append(button);
      }
      return li;
    }));
    threadList.scrollTop = threadList.scrollHeight;
  }
  const openVersion = (i) => {
    const v = thread.versions[i];
    if (!v) return;
    try {
      show({ spec: v.spec, mode: v.mode }, undefined, { build: false });
    } catch {
      setStatus(CANT, "error");
      return;
    }
    thread.current = i;
    saveThread();
    renderThread();
    setEditing(v);
  };

  // ── The layout: docked prompt before the first build, split after it ─────────────────────────
  const wide = matchMedia("(min-width: 641px)");
  let dividerTimer = 0;
  /** The divider, drawn top to bottom (or left to right on phones) a few cells a tick, led by ▒░. */
  const drawDivider = (animate) => {
    if (!dividerEl || dividerEl.hidden) return;
    clearInterval(dividerTimer);
    const size = parseFloat(getComputedStyle(dividerEl).fontSize) || 11;
    const vertical = wide.matches;
    const n = vertical ? Math.max(2, Math.floor(out.clientHeight / (size * 1.25))) : Math.max(2, Math.floor(dividerEl.clientWidth / (size * 0.6364)));
    const line = vertical ? ["┬", ...Array(n - 2).fill("│"), "┴"] : ["├", ...Array(n - 2).fill("─"), "┤"];
    const frame = (k) => line.map((ch, i) => (i < k ? ch : i === k ? "▒" : i === k + 1 ? "░" : " ")).join(vertical ? "\n" : "");
    if (!animate || reduce.matches) return void (dividerEl.textContent = frame(n));
    let k = 0;
    const step = vertical ? 3 : 10;
    dividerEl.textContent = frame(0);
    dividerTimer = setInterval(() => {
      k += step;
      dividerEl.textContent = frame(Math.min(k, n));
      if (k >= n) clearInterval(dividerTimer);
    }, 40);
  };
  const enterSplit = (animate) => {
    if (!builderEl || builderEl.dataset.layout === "split") return;
    builderEl.dataset.layout = "split";
    if (threadEl) threadEl.hidden = false;
    if (dividerEl) dividerEl.hidden = false;
    renderThread();
    requestAnimationFrame(() => drawDivider(animate));
  };
  const leaveSplit = () => {
    if (!builderEl) return;
    builderEl.dataset.layout = "intro";
    if (threadEl) threadEl.hidden = true;
    if (dividerEl) dividerEl.hidden = true;
  };
  let lastSize = "";
  new ResizeObserver(() => {
    const size = `${out.clientWidth}x${out.clientHeight}`;
    if (size !== lastSize && builderEl?.dataset.layout === "split" && !dividerTimer) drawDivider(false);
    lastSize = size;
  }).observe(out);
  wide.addEventListener?.("change", () => drawDivider(false));
  out.querySelector("[data-try-new]")?.addEventListener("click", () => {
    thread = emptyThread();
    saveThread();
    renderThread();
    setEditing(null);
    leaveSplit();
    shown = null;
    restore();
    field.value = "";
    pressChip(null);
    setStatus("");
    selectTab("preview");
    field.focus();
  });

  // ── Changing the current figure ───────────────────────────────────────────────────────────────
  let editChip = null;
  const setEditing = (result) => {
    editing = result ? { spec: result.spec, mode: result.mode } : null;
    editChip?.remove();
    editChip = null;
    field.placeholder = editing ? "Change it: rename a step, add a row, make it moving…" : PLACEHOLDER;
    if (!editing || !chipsEl) return;
    editChip = el("button", "chip chip--editing");
    editChip.type = "button";
    editChip.setAttribute("aria-pressed", "true");
    editChip.setAttribute("aria-label", `Changing ${editing.spec.title ?? "this figure"}. Click to start a new figure instead.`);
    editChip.append(el("span", "", `Changing · ${editing.spec.title ?? "this figure"}`), el("span", "chip__x", "×"));
    editChip.addEventListener("click", () => {
      setEditing(null);
      field.focus();
    });
    chipsEl.prepend(editChip);
  };

  // ── History ──────────────────────────────────────────────────────────────────────────────────
  const remember = (ask, result) => {
    const entry = { id: Date.now().toString(36), at: new Date().toISOString(), ask, spec: result.spec, mode: result.mode, note: result.note };
    writeHistory([entry, ...readHistory()]);
  };
  let clearTimer = 0;
  function renderHistory() {
    if (!historyEl) return;
    const list = readHistory();
    if (!list.length) {
      historyEl.replaceChildren(el("p", "data__empty", "Nothing built yet. Figures you build are kept here, on this device."));
      return;
    }
    const ol = el("ol", "history");
    for (const entry of list) {
      const li = el("li", "history__item");
      const open = el("button", "history__open");
      open.type = "button";
      open.append(el("strong", "", entry.spec.title ?? "Figure"), el("span", "history__ask", entry.ask), el("span", "history__when", when(entry.at)));
      open.addEventListener("click", () => {
        try {
          show({ spec: entry.spec, mode: entry.mode }, undefined, { build: false });
        } catch {
          setStatus(CANT, "error");
          return;
        }
        field.value = "";
        pressChip(null);
        startThread({ spec: entry.spec, mode: entry.mode }, entry.ask, "Opened from history.");
        enterSplit(true);
        renderThread();
        setEditing({ spec: entry.spec, mode: entry.mode });
        setStatus(typeof entry.note === "string" ? entry.note : "");
        selectTab("preview");
      });
      const remove = el("button", "history__remove", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${entry.spec.title ?? "this figure"} from history`);
      remove.addEventListener("click", () => {
        writeHistory(readHistory().filter((e) => e.id !== entry.id));
        renderHistory();
      });
      li.append(open, remove);
      ol.append(li);
    }
    const clear = el("button", "history__clear", "Clear history");
    clear.type = "button";
    clear.addEventListener("click", () => {
      if (clear.dataset.confirm) {
        writeHistory([]);
        renderHistory();
        return;
      }
      clear.dataset.confirm = "";
      clear.textContent = "Clear everything?";
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        delete clear.dataset.confirm;
        clear.textContent = "Clear history";
      }, 3000);
    });
    historyEl.replaceChildren(ol, clear, el("p", "history__privacy", "Kept in this browser only. Nothing is sent anywhere."));
  }

  // ── Export ───────────────────────────────────────────────────────────────────────────────────
  const canExport = () => Boolean(shown) && stage.dataset.state === "figure" && !busy;
  const syncExport = () => {
    if (!exportEl) return;
    const ok = canExport();
    exportEl.toggleAttribute("data-disabled", !ok);
    exportEl.querySelector("summary").setAttribute("aria-disabled", String(!ok));
    if (!ok) exportEl.open = false;
  };
  exportEl?.querySelector("summary").addEventListener("click", (event) => {
    if (!canExport()) {
      event.preventDefault();
      return;
    }
    const items = exportsFor(shown.result);
    exportMenu.replaceChildren(...items.map((item) => {
      const row = el("div", "export__row");
      const save = el("button", "export__save", item.label);
      save.type = "button";
      save.addEventListener("click", async () => {
        const name = `${fileName(shown.result.spec)}.${item.ext}`;
        try {
          download(name, await item.blob());
        } catch {
          // The PNG couldn't be drawn here: give the SVG instead.
          const svg = items.find((i) => i.ext === "svg");
          download(`${fileName(shown.result.spec)}.svg`, await svg.blob());
        }
        exportEl.open = false;
      });
      row.append(save);
      if (item.copy) {
        const copyBtn = el("button", "export__copy", "Copy");
        copyBtn.type = "button";
        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(item.copy);
            copyBtn.textContent = "Copied";
          } catch {
            copyBtn.textContent = "Couldn't copy";
          }
          setTimeout(() => (copyBtn.textContent = "Copy"), 1600);
        });
        row.append(copyBtn);
      }
      return row;
    }));
  });
  // Colours: show the figure in one of the kit's palettes. Exports use the same one.
  const paletteEl = out.querySelector("[data-try-palette]");
  const paletteMenu = out.querySelector("[data-try-palette-menu]");
  // Four cells in the palette's own colours, on its page: data, problems, passes, lines. The site's
  // own palette uses the site's tokens, so every name in the menu starts at the same place.
  const swatchFor = (name) => {
    const c = PALETTES[name];
    const swatch = el("span", "palette__swatch");
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.background = c ? c.bg : "var(--paper)";
    for (const [role, site] of [["data", "--ink"], ["flag", "--signal-fail"], ["ok", "--signal-ok"], ["frame", "--text-caption"]]) {
      const cell = el("span", "", "█");
      cell.style.color = c ? c[role] : `var(${site})`;
      swatch.append(cell);
    }
    return swatch;
  };
  const applyPalette = (name) => {
    currentPalette = name;
    const c = PALETTES[name];
    const vars = c ? { "--paper": c.bg, "--panel": c.panel, "--ink": c.ink, "--text-caption": c.frame, "--signal-fail": c.flag, "--signal-ok": c.ok, "--palette-data": c.data } : {};
    for (const prop of ["--paper", "--panel", "--ink", "--text-caption", "--signal-fail", "--signal-ok", "--palette-data"]) {
      if (vars[prop]) stage.style.setProperty(prop, vars[prop]);
      else stage.style.removeProperty(prop);
    }
    stage.toggleAttribute("data-palette", Boolean(c));
    // The summary keeps one width: the chosen palette shows as its swatch, not as a longer label.
    paletteEl.querySelector("summary").replaceChildren(swatchFor(name), "Colours");
    paletteEl.querySelector("summary").setAttribute("aria-label", `Colours: ${PALETTE_NAMES[name]}`);
    paletteMenu.querySelectorAll("[data-palette]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.palette === name)));
  };
  if (paletteEl && paletteMenu) {
    paletteMenu.replaceChildren(...Object.keys(PALETTE_NAMES).map((name) => {
      const row = el("div", "export__row");
      const b = el("button", "export__save palette__item");
      b.type = "button";
      b.dataset.palette = name;
      b.append(swatchFor(name), PALETTE_NAMES[name]);
      b.addEventListener("click", () => {
        applyPalette(name);
        try { localStorage.setItem(PALETTE_KEY, name); } catch {}
        paletteEl.open = false;
      });
      row.append(b);
      return row;
    }));
    applyPalette(currentPalette);
  }
  document.addEventListener("click", (event) => {
    if (exportEl?.open && !exportEl.contains(event.target)) exportEl.open = false;
    if (paletteEl?.open && !paletteEl.contains(event.target)) paletteEl.open = false;
  });

  /** Draw a result: it builds in over its own skeleton, then a moving one plays. */
  const show = (result, heading, { build = true } = {}) => {
    const drawn = prepare(result); // may throw: nothing on screen has changed yet
    halt();
    const pre = mount(build && !reduce.matches ? skeleton(drawn.cells) : drawn.cells, drawn.aria);
    stage.dataset.state = "figure";
    describe(result.spec, heading);
    shown = { result, heading };
    syncExport();
    const done = () => {
      pre.innerHTML = toHtml(drawn.cells);
      if (drawn.play) stopMoving = drawn.play(pre);
    };
    if (!build || reduce.matches) return done();
    const skel = skeleton(drawn.cells);
    const plan = planBuild(drawn.cells, { lang: result.spec.lang });
    animate((t) => {
      if (t >= plan.total) {
        done();
        return true;
      }
      pre.innerHTML = toHtml(fillFrame(drawn.cells, plan, t, skel));
      return false;
    });
  };
;
  const restore = () => {
    if (shown) return show(shown.result, shown.heading, { build: false });
    // Nothing built yet: put the example back so the preview isn't left as a skeleton.
    try {
      const example = JSON.parse(document.getElementById("try-example")?.textContent || "null");
      if (example) show(example, `Example · ${example.spec.title}`, { build: false });
    } catch {}
  };

  // ── Skeletons, loaded the first time someone uses the demo ─────────────────────────────────────
  let skeletons = null;
  const loadSkeletons = () =>
    (skeletons ??= fetch(new URL("skeletons.json", import.meta.url))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})));
  const skeletonFor = async (key) => {
    const text = (await loadSkeletons())[key];
    return text ? skeleton(cellsFromText(text, classify)) : null;
  };
  form.addEventListener("focusin", loadSkeletons, { once: true });

  // Picking a suggestion shows the skeleton of what it will build.
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", async () => {
      takeOver();
      selectTab("preview");
      field.value = button.dataset.preset;
      field.removeAttribute("data-invalid");
      setEditing(null);
      pressChip(button);
      field.focus();
      if (busy) return;
      const skel = await skeletonFor(button.dataset.skeleton);
      if (!skel || busy) return;
      showSkeleton(skel);
      title.textContent = `Preview · ${button.dataset.short}`;
      stamp.textContent = "";
      caption.textContent = "Press Build to make it.";
      emptyData(specOut, "Press Build to make it. Its data shows here.");
      setStatus("");
    });
  });


  // The builder picks up the conversation from last time, or starts from an example, already built.
  if (thread.versions.length) {
    enterSplit(false);
    openVersion(Math.min(Math.max(0, thread.current), thread.versions.length - 1));
  } else {
    try {
      const example = JSON.parse(document.getElementById("try-example")?.textContent || "null");
      if (example) show(example, `Example · ${example.spec.title}`, { build: false });
    } catch {}
  }

  // ── Asking ────────────────────────────────────────────────────────────────────────────────────
  /** Read a server-sent stream: calls on(name, data) for every event. */
  const readEvents = async (response, on) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        const name = block.match(/^event: *(\w+)/m)?.[1];
        const data = block.match(/^data: *(.*)$/m)?.[1];
        if (!name || data === undefined) continue;
        try {
          on(name, JSON.parse(data));
        } catch {}
      }
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.reportValidity()) {
      flash();
      return;
    }
    takeOver();
    selectTab("preview");
    if (!editing) thread = emptyThread(); // a new figure starts a new conversation
    say({ who: "you", text: field.value });
    enterSplit(true);
    busy = true;
    syncExport();
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    setStatus("Picking a figure…");
    caption.textContent = "Building…";
    // A suggestion keeps its own skeleton; a custom ask starts from the generic one. Either shimmers.
    const pressed = chips.some((chip) => chip.getAttribute("aria-pressed") === "true");
    const current = stage.querySelector("pre");
    const base = editing;
    const ask = field.value;
    if (base) {
      let skel;
      try {
        skel = skeleton(prepare(base).cells);
      } catch {
        skel = skeleton(cellsFromText(GENERIC, () => []));
      }
      showSkeleton(skel, { shimmer: true });
    } else if (pressed && stage.dataset.state === "skeleton" && current) showSkeleton(skeleton(cellsFromText(current.textContent, () => [])), { shimmer: true });
    else showSkeleton(skeleton(cellsFromText(GENERIC, () => [])), { shimmer: true });
    title.textContent = "Building";
    stamp.textContent = "";
    emptyData(specOut, "Building. Its data shows here when it's done.");
    const timer = new AbortController();
    const timeout = setTimeout(() => timer.abort(), TIMEOUT_MS);
    try {
      let response;
      try {
        response = await fetch(form.action, {
          method: "POST",
          headers: { Accept: "text/event-stream, application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ ask, "cf-turnstile-response": turnstileToken(), ...(base ? { base: base.spec } : {}) }),
          signal: timer.signal,
        });
      } catch {
        throw new Error(PAUSED); // offline, blocked, or too slow
      }
      let result = null;
      let failure = null;
      if ((response.headers.get("content-type") ?? "").includes("event-stream") && response.body) {
        try {
          await readEvents(response, async (name, payload) => {
            if (name === "kind" && typeof payload.kind === "string") {
              const skel = await skeletonFor(payload.moving ? `moving:${payload.kind}` : payload.kind);
              if (!result && !failure) {
                if (skel) showSkeleton(skel, { shimmer: true });
                setStatus("Drawing it…");
              }
            } else if (name === "done") result = payload;
            else if (name === "fail") failure = payload;
          });
        } catch {
          throw new Error(PAUSED); // the stream broke or timed out
        }
      } else {
        const json = await response.json().catch(() => null);
        if (response.ok && json?.spec) result = json;
        else failure = json;
      }
      if (!result?.spec) throw new Error(typeof failure?.error === "string" ? failure.error : PAUSED);
      try {
        show(result);
      } catch {
        throw new Error(CANT);
      }
      setStatus(typeof result.note === "string" ? result.note : "");
      remember(ask, result);
      addVersion(result, { who: "kit", text: base ? "Changed it." : `${kindName(result)}, drawn.` });
      setEditing(result);
      field.value = "";
    } catch (error) {
      restore();
      setStatus(error instanceof Error ? error.message : PAUSED, "error");
      say({ who: "fail", text: error instanceof Error ? error.message : PAUSED });
      if (!thread.versions.length) leaveSplit();
      flash();
    } finally {
      clearTimeout(timeout);
      busy = false;
      submit.disabled = false;
      form.removeAttribute("aria-busy");
      syncExport();
      const turnstile = Reflect.get(window, "turnstile");
      if (turnstileElement && turnstile?.reset) turnstile.reset(turnstileElement);
    }
  });
}
