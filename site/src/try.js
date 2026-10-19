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
import { live, stillGrid } from "./kit/live/kinds.mjs";
import { autoplay } from "./kit/live/play.mjs";
import { cellsFromGrid, cellsFromText, fillFrame, planBuild, shimmerFrame, skeleton, toHtml } from "./showcase-core.mjs";

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
function renderData(target, spec) {
  const meta = el("dl", "data__meta");
  for (const [key, label] of [["kind", "Kind"], ["title", "Title"], ["intent", "Why"], ["source", "Source"]]) {
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
  body.append(el("h4", "label", "Data"), dataValue(spec.data));
  if (spec.options && Object.keys(spec.options).length) body.append(el("h4", "label", "Options"), dataValue(spec.options));
  target.replaceChildren(copy, about, body);
}
const emptyData = (target, text) => target.replaceChildren(el("p", "data__empty", text));

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
  let busy = false;
  let shown = null; // the last real figure: { result, heading }

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
        const { make, still, summary } = live(spec);
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
    renderData(specOut, spec);
    caption.textContent = spec.intent ?? spec.title ?? "";
  };

  /** Draw a result: it builds in over its own skeleton, then a moving one plays. */
  const show = (result, heading, { build = true } = {}) => {
    const drawn = prepare(result); // may throw: nothing on screen has changed yet
    halt();
    const pre = mount(build && !reduce.matches ? skeleton(drawn.cells) : drawn.cells, drawn.aria);
    stage.dataset.state = "figure";
    describe(result.spec, heading);
    shown = { result, heading };
    const done = () => {
      pre.innerHTML = toHtml(drawn.cells);
      if (drawn.play) stopMoving = drawn.play(pre);
    };
    if (!build || reduce.matches) return done();
    const skel = skeleton(drawn.cells);
    const plan = planBuild(drawn.cells);
    animate((t) => {
      if (t >= plan.total) {
        done();
        return true;
      }
      pre.innerHTML = toHtml(fillFrame(drawn.cells, plan, t, skel));
      return false;
    });
  };
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


  // The builder starts from an example, already built.
  try {
    const example = JSON.parse(document.getElementById("try-example")?.textContent || "null");
    if (example) show(example, `Example · ${example.spec.title}`, { build: false });
  } catch {}

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
    busy = true;
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    setStatus("Picking a figure…");
    caption.textContent = "Building…";
    // A suggestion keeps its own skeleton; a custom ask starts from the generic one. Either shimmers.
    const pressed = chips.some((chip) => chip.getAttribute("aria-pressed") === "true");
    const current = stage.querySelector("pre");
    if (pressed && stage.dataset.state === "skeleton" && current) showSkeleton(skeleton(cellsFromText(current.textContent, () => [])), { shimmer: true });
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
          body: JSON.stringify({ ask: field.value, "cf-turnstile-response": turnstileToken() }),
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
              const skel = await skeletonFor(payload.moving ? `live:${payload.kind}` : payload.kind);
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
    } catch (error) {
      restore();
      setStatus(error instanceof Error ? error.message : PAUSED, "error");
      flash();
    } finally {
      clearTimeout(timeout);
      busy = false;
      submit.disabled = false;
      form.removeAttribute("aria-busy");
      const turnstile = Reflect.get(window, "turnstile");
      if (turnstileElement && turnstile?.reset) turnstile.reset(turnstileElement);
    }
  });
}
