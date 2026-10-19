// Deck fidelity: specs as a presentation you'd actually give. One self-contained HTML file.
//
// A deck is { title, subtitle?, byline?, theme?: "paper" | "ink" | "phosphor" | "gilt", slides: [...] },
// or just a list of specs. Figures are coloured by role (render/paint.mjs) in the theme's palette.
// A slide is either a spec (any kind) with an optional `present` block, or one of:
//   { type: "title", title, subtitle?, byline? }   { type: "section", kicker?, title }
//   { type: "statement", kicker?, text }
// present: {
//   command?: "glyph-kit render usage.json",  // types in as a terminal command before the figure prints
//   steps?: [{ lines: [from, to], say: "…" }], // camera stops: zoom to those lines (0-based), caption below
//   flag?: "x |fails",                         // lines matching this pattern flash twice after printing
//   notes?: "…",                               // presenter notes (press N)
//   kicker?: "…"                               // the small label above the title
// }
// Keys: → / space / click step forward, ← back, Home / End, N notes, F full screen. The address keeps
// the slide and step (#3.2). Reduced motion: nothing types or prints, the camera cuts. Printing gives
// one page per slide in its final state.
import { resolve } from "../registry.mjs";
import { BASE_CSS, PLAY_JS, esc, fragment, tokensCss } from "./html.mjs";
import { PAINT_CSS, paintLine } from "./paint.mjs";
import { PALETTES, SPACING } from "./themes.mjs";
import { body, label } from "./text.mjs";

const DECK_CSS = `
html,body{height:100%;margin:0;overflow:hidden;background:var(--gk-deck-bg)}
body{color:var(--gk-deck-ink)}
.gk-deck{position:fixed;inset:0 0 36px;overflow:hidden}
.gk-stagebox{position:absolute;left:50%;top:50%;width:1600px;height:900px;transform-origin:center}
.gk-slide{position:absolute;inset:0;display:none;grid-template-rows:auto minmax(0,1fr) auto;gap:28px;padding:72px 88px 56px;background:var(--gk-deck-bg)}
.gk-slide.is-current{display:grid}
.gk-kicker{margin:0;color:var(--gk-deck-muted);font:500 18px/1.4 var(--gk-mono);letter-spacing:.04em;text-transform:uppercase}
.gk-slide h2{margin:6px 0 0;font:600 60px/1.05 var(--gk-font);letter-spacing:-.025em;max-width:24ch}
.gk-lead{margin:14px 0 0;max-width:60ch;color:var(--gk-deck-muted);font:400 26px/1.4 var(--gk-font)}
.gk-view{position:relative;overflow:hidden;min-height:0}
.gk-world{position:absolute;left:0;top:0;transform-origin:0 0;transition:transform 700ms cubic-bezier(.2,0,0,1)}
.gk-fig{margin:0;font:20px/${SPACING.figureLine} var(--gk-mono);font-variant-ligatures:none;letter-spacing:0;color:var(--gk-deck-ink)}
.gk-ln{display:block;width:max-content;min-height:${SPACING.figureLine}em;white-space:pre;transition:opacity 400ms ease}
.gk-cmd{display:block;width:max-content;margin-bottom:.6em;color:var(--gk-deck-muted);white-space:pre}
.gk-cmd b{color:var(--gk-deck-ink);font-weight:400}
.gk-dim .gk-ln:not(.is-focus),.gk-dim .gk-cmd{opacity:.2}
.gk-say{display:flex;gap:16px;align-items:baseline;min-height:42px;margin:0;font:400 28px/1.35 var(--gk-font)}
.gk-say:empty{visibility:hidden}
.gk-say::before{content:"►";color:var(--gk-deck-data);font:18px var(--gk-mono)}
.gk-source-line{margin:0;color:var(--gk-deck-muted);font:400 15px/1.4 var(--gk-mono)}
.gk-slide--title,.gk-slide--statement{align-content:center;grid-template-rows:auto}
.gk-slide--title h2{font-size:104px;max-width:14ch}
.gk-slide--title .gk-lead{font-size:32px}
.gk-ramp{margin-bottom:32px;color:var(--gk-deck-data);font:64px/1 var(--gk-mono);letter-spacing:14px}
.gk-slide--section{align-content:end;grid-template-rows:auto}
.gk-slide--section h2{font-size:88px}
.gk-statement{margin:0;max-width:24ch;font:600 72px/1.12 var(--gk-font);letter-spacing:-.025em}
.gk-proto{width:max-content}
.gk-proto .gk-board{flex-wrap:nowrap}
.gk-proto .gk-screen{width:max(320px,calc(var(--w) * 11.5px))}
.gk-proto .gk-notes{width:260px}
.gk-bar{position:fixed;left:0;right:0;bottom:0;height:36px;display:flex;align-items:center;gap:16px;padding:0 16px;color:var(--gk-deck-muted);font:13px/1 var(--gk-mono);pointer-events:none}
.gk-ticks{letter-spacing:1px;white-space:nowrap;overflow:hidden}
.gk-count{margin-left:auto}
.gk-notes-panel{position:fixed;left:16px;right:16px;bottom:44px;max-height:30vh;overflow:auto;margin:0;padding:16px 20px;border:1px solid var(--gk-deck-muted);background:var(--gk-deck-bg);color:var(--gk-deck-ink);font:17px/1.5 var(--gk-font);white-space:pre-wrap}
.gk-notes-panel[hidden]{display:none}
.gk-hint{position:fixed;right:16px;top:12px;margin:0;color:var(--gk-deck-muted);font:12px var(--gk-mono)}
@keyframes gk-type{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes gk-flash{0%,49%{background:var(--gk-deck-flag);color:var(--gk-deck-bg)}50%,100%{background:transparent}}
.is-printing .gk-ln,.is-printing .gk-cmd,.is-typing{animation:gk-type var(--d,160ms) steps(var(--n,18),end) both;animation-delay:var(--at,0ms)}
.is-printing .gk-ln.is-flag{animation:gk-type 160ms steps(18,end) both var(--at,0ms),gk-flash 260ms steps(1) calc(var(--at,0ms) + 220ms) 2}
@media (prefers-reduced-motion:reduce){.gk-world{transition:none}.is-printing .gk-ln,.is-printing .gk-cmd,.is-typing,.is-printing .gk-ln.is-flag{animation:none!important;clip-path:none}}
@media print{
  @page{size:1600px 900px;margin:0}
  html,body{overflow:visible;height:auto}
  .gk-deck{position:static;display:block}
  .gk-stagebox{position:static;transform:none!important;height:auto}
  .gk-slide{position:relative;display:grid!important;width:1600px;height:900px;break-after:page}
  .gk-bar,.gk-notes-panel,.gk-hint{display:none!important}
  .gk-ln,.gk-cmd,.gk-title{opacity:1!important;animation:none!important;clip-path:none!important}
  /* No camera on paper: the figure sits at a fixed presentation size. */
  .gk-view{overflow:visible}
  .gk-world{position:static;transform:none!important}
  .gk-fig{font-size:30px}
  .gk-proto{zoom:1.4}
}
`;

// Deck palettes come from themes.mjs, renamed to the deck's custom properties.
export const THEMES = Object.fromEntries(
  Object.entries(PALETTES).map(([name, p]) => [
    name,
    { "deck-bg": p.bg, "deck-ink": p.ink, "deck-muted": p.muted, "deck-data": p.data, "deck-frame": p.frame, "deck-flag": p.flag, "deck-ok": p.ok }
  ])
);

const lines = (text) => text.split("\n").map((l, i) => `<span class="gk-ln" data-l="${i}">${paintLine(l) || " "}</span>`).join("");

function figureSlide(spec, i, total, map, kicker) {
  const def = resolve(spec);
  const p = spec.present ?? {};
  const screen = spec.kind === "screen" || spec.kind === "responsive";
  const fig = screen
    ? `<div class="gk-proto">${fragment(spec, { map })}</div>`
    : `<pre class="gk-fig" role="img" aria-label="${esc(label(spec))}">${p.command ? `<span class="gk-cmd">$ <b>${esc(p.command)}</b></span>` : ""}${lines(body(spec))}</pre>`;
  return `<section class="gk-slide" data-steps="${esc(JSON.stringify(p.steps ?? []))}" data-flag="${esc(p.flag ?? "")}" aria-roledescription="slide" aria-label="${i + 1} of ${total}">
<header><p class="gk-kicker">${esc(kicker || def.label)}</p><h2 class="gk-title">${esc(spec.title ?? def.label)}</h2>${spec.intent ? `<p class="gk-lead">${esc(spec.intent)}</p>` : ""}</header>
<div class="gk-view"><div class="gk-world">${fig}</div></div>
<footer><p class="gk-say" aria-live="polite"></p>${spec.source ? `<p class="gk-source-line">Source: ${esc(spec.source)}</p>` : ""}</footer>
<template class="gk-notes-src">${esc(p.notes ?? "")}</template>
</section>`;
}

function plainSlide(slide, i, total) {
  const aria = `aria-roledescription="slide" aria-label="${i + 1} of ${total}" data-steps="[]"`;
  const notes = `<template class="gk-notes-src">${esc(slide.notes ?? "")}</template>`;
  if (slide.type === "title")
    return `<section class="gk-slide gk-slide--title" ${aria}><div><div class="gk-ramp" aria-hidden="true">░▒▓█</div><h2 class="gk-title">${esc(slide.title)}</h2>${slide.subtitle ? `<p class="gk-lead">${esc(slide.subtitle)}</p>` : ""}${slide.byline ? `<p class="gk-kicker" style="margin-top:40px">${esc(slide.byline)}</p>` : ""}</div>${notes}</section>`;
  if (slide.type === "section")
    return `<section class="gk-slide gk-slide--section" ${aria}><div>${slide.kicker ? `<p class="gk-kicker">${esc(slide.kicker)}</p>` : ""}<h2 class="gk-title">${esc(slide.title)}</h2></div>${notes}</section>`;
  if (slide.type === "statement")
    return `<section class="gk-slide gk-slide--statement" ${aria}><div>${slide.kicker ? `<p class="gk-kicker" style="margin-bottom:24px">${esc(slide.kicker)}</p>` : ""}<p class="gk-statement gk-title">${esc(slide.text)}</p></div>${notes}</section>`;
  throw new Error(`Unknown slide type "${slide.type}". Use title, section, statement, or a spec with a kind.`);
}

// Runs in the browser. Kept as a real function so it is syntax-checked with the module.
function runtime() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const box = document.querySelector(".gk-stagebox");
  const slides = [...document.querySelectorAll(".gk-slide")];
  const ticks = document.querySelector(".gk-ticks");
  const count = document.querySelector(".gk-count");
  const panel = document.querySelector(".gk-notes-panel");
  let slide = 0;
  let step = 0;

  const fitStage = () => {
    const k = Math.min(innerWidth / 1600, (innerHeight - 36) / 900);
    box.style.transform = `translate(-50%, -50%) scale(${k})`;
  };
  const stepsOf = (s) => JSON.parse(s.dataset.steps || "[]");

  // Fit the figure into the view, or zoom to a range of lines and dim the rest.
  const camera = (s, target) => {
    const view = s.querySelector(".gk-view");
    const world = s.querySelector(".gk-world");
    if (!view || !world) return;
    const fig = world.firstElementChild;
    const vw = view.clientWidth;
    const vh = view.clientHeight;
    let x = 0;
    let y = 0;
    let w = fig.scrollWidth;
    let h = fig.scrollHeight;
    const lns = [...world.querySelectorAll(".gk-ln")];
    lns.forEach((l) => l.classList.remove("is-focus"));
    world.classList.toggle("gk-dim", Boolean(target));
    if (target && lns.length) {
      const pick = lns.slice(target.lines[0], target.lines[1] + 1);
      pick.forEach((l) => l.classList.add("is-focus"));
      x = Math.min(...pick.map((l) => l.offsetLeft));
      y = pick[0].offsetTop;
      w = Math.max(...pick.map((l) => l.offsetLeft + l.offsetWidth)) - x;
      h = pick.at(-1).offsetTop + pick.at(-1).offsetHeight - y;
    }
    const k = Math.min(vw / w, vh / h, target ? 3 : 2.2);
    world.style.transform = `translate(${(vw - w * k) / 2 - x * k}px, ${target ? (vh - h * k) / 2 - y * k : 0}px) scale(${k})`;
  };

  // Type the title, type the command, print the figure line by line, flash flagged lines.
  const play = (s) => {
    if (reduce) return;
    const title = s.querySelector(".gk-title");
    if (title) {
      const n = title.textContent.length;
      title.style.setProperty("--n", n);
      title.style.setProperty("--d", `${Math.min(n * 22, 420)}ms`);
      title.classList.remove("is-typing");
      void title.offsetWidth;
      title.classList.add("is-typing");
    }
    const fig = s.querySelector(".gk-fig");
    if (!fig) return;
    const flag = s.dataset.flag ? new RegExp(s.dataset.flag) : null;
    let at = 320;
    const cmd = fig.querySelector(".gk-cmd");
    if (cmd) {
      const n = cmd.textContent.length;
      cmd.style.setProperty("--n", n);
      cmd.style.setProperty("--d", `${n * 34}ms`);
      cmd.style.setProperty("--at", `${at}ms`);
      at += n * 34 + 280;
    }
    fig.querySelectorAll(".gk-ln").forEach((l, i) => {
      l.style.setProperty("--at", `${at + i * 42}ms`);
      l.classList.toggle("is-flag", Boolean(flag && flag.test(l.textContent)));
    });
    fig.classList.remove("is-printing");
    void fig.offsetWidth;
    fig.classList.add("is-printing");
  };

  const decode = (t) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

  const render = (animate) => {
    const s = slides[slide];
    slides.forEach((x, i) => x.classList.toggle("is-current", i === slide));
    const steps = stepsOf(s);
    const target = step > 0 ? steps[step - 1] : null;
    camera(s, target);
    const say = s.querySelector(".gk-say");
    if (say) say.textContent = target?.say ?? "";
    if (animate) play(s);
    ticks.textContent = slides.map((_, i) => (i < slide ? "█" : i === slide ? "▓" : "░")).join("");
    count.textContent = `${slide + 1} / ${slides.length}${steps.length ? ` · step ${step} of ${steps.length}` : ""}`;
    panel.textContent = decode(s.querySelector(".gk-notes-src")?.innerHTML ?? "") || "No notes for this slide.";
    history.replaceState(null, "", `#${slide + 1}.${step}`);
  };

  const go = (dir) => {
    const steps = stepsOf(slides[slide]).length;
    if (dir > 0) {
      if (step < steps) step += 1;
      else if (slide < slides.length - 1) {
        slide += 1;
        step = 0;
        return render(true);
      }
    } else if (step > 0) step -= 1;
    else if (slide > 0) {
      slide -= 1;
      step = stepsOf(slides[slide]).length;
    }
    render(false);
  };

  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, select, textarea")) return;
    const key = e.key.toLowerCase();
    if (["arrowright", "pagedown", " ", "enter"].includes(key)) {
      e.preventDefault();
      go(1);
    } else if (["arrowleft", "pageup", "backspace"].includes(key)) {
      e.preventDefault();
      go(-1);
    } else if (key === "home") {
      slide = 0;
      step = 0;
      render(true);
    } else if (key === "end") {
      slide = slides.length - 1;
      step = 0;
      render(true);
    } else if (key === "n") panel.hidden = !panel.hidden;
    else if (key === "f") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  });
  document.querySelector(".gk-deck").addEventListener("click", (e) => {
    if (e.target.closest("button, a, input, select, label, [role=tab], .gk-screen")) return;
    go(e.clientX > innerWidth / 4 ? 1 : -1);
  });
  addEventListener("resize", () => {
    fitStage();
    camera(slides[slide], step ? stepsOf(slides[slide])[step - 1] : null);
  });

  const [s0, st0] = location.hash.slice(1).split(".").map((n) => parseInt(n, 10));
  slide = Math.min(Math.max((s0 || 1) - 1, 0), slides.length - 1);
  step = Math.min(st0 || 0, stepsOf(slides[slide]).length);
  fitStage();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => render(true));
}

/** deck: { title, subtitle?, byline?, theme?, slides } or a list of specs. Returns one HTML file. */
export function renderDeck(deck, { title: titleOverride, map } = {}) {
  const d = Array.isArray(deck) ? { title: titleOverride ?? "Deck", slides: deck } : { ...deck, title: titleOverride ?? deck.title };
  const theme = THEMES[d.theme ?? "paper"] ?? THEMES.paper;
  const total = d.slides.length;
  let section = "";
  const html = d.slides
    .map((s, i) => {
      if (s.type === "section") section = s.title;
      return s.kind ? figureSlide(s, i, total, map, s.present?.kicker ?? section) : plainSlide(s, i, total);
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.title)}</title>
${map?.stylesheet ? `<link rel="stylesheet" href="${esc(map.stylesheet)}">` : ""}
<style>${tokensCss(map)}:root{${Object.entries(theme).map(([k, v]) => `--gk-${k}:${v}`).join(";")}}${BASE_CSS}${DECK_CSS}${PAINT_CSS("--gk-deck-")}</style>
</head>
<body>
<main class="gk-deck"><div class="gk-stagebox">
${html}
</div></main>
<div class="gk-bar" aria-hidden="true"><span class="gk-ticks"></span><span class="gk-count"></span></div>
<pre class="gk-notes-panel" hidden aria-label="Presenter notes"></pre>
<p class="gk-hint" aria-hidden="true">→ next · ← back · N notes · F full screen</p>
<script>${PLAY_JS}(${runtime.toString()})();</script>
</body>
</html>
`;
}
