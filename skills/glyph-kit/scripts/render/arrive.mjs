// Arrival in HTML: runs of cells with the same delay become one span with its delay as a style value,
// so the browser plays the arrival with no script per frame. Hidden only while a figure is arriving:
// without JavaScript, under reduced motion and in print the figure is simply there.
import { resolve } from "../registry.mjs";
import { ARRIVE_MAX, STEPPED as STEPS, STEPPED_LAND, cellsOf } from "../arrive.mjs";
import { cellWidth, graphemes } from "../text.mjs";
import { classify, paintLine, paintOptions } from "./paint.mjs";

const STAMP = /^\s*SAMPLE DATA\s*$/;
// Block cells (STEPS) step blank → ░ → ▒ → final, one step each; text snaps.
const STEP_MS = 40;
const layer = (run, glyph) => [...run].map((ch) => (STEPS.test(ch) ? glyph : " ")).join("");

// A run of block cells: ░ and ▒ layers sit on top of the final cells, each shown for one step, then
// the final cells. The layers are hidden unless the figure is arriving, so nothing else ever sees them.
// `under` keeps a scale visible (░ or ·) behind cells that haven't arrived yet.
// The layers are painted as what they show (░, ▒); only the final cells take the line's roles.
const steps = (run, at, under, layerOpts) =>
  `${under ? `<span class="gk-s0" aria-hidden="true" style="--d:${at}ms">${paintLine(layer(run, under), layerOpts)}</span>` : ""}<span class="gk-s1" aria-hidden="true" style="--d:${at}ms">${paintLine(layer(run, "░"), layerOpts)}</span><span class="gk-s2" aria-hidden="true" style="--d:${at + STEP_MS}ms">${paintLine(layer(run, "▒"), layerOpts)}</span>`;

// The landing flash: for one 120ms step each landing cell shows its inverse, in its own cell only, so
// it takes the figure's shape and never paints the gaps between cells. Inverting a shade in place
// barely changes it (▒ inverted is ▒), so a light cell turns solid in its colour and a dark one
// turns to paper; a letter turns paper on ink. A problem, a pass and the focus always flash; a measure
// flashes unless it stepped in, since stepping is its arrival.
const LIGHT = /[░▒▁▂▃▄▏▎▍▌]/u;
const FLASH_MS = 120;
// With a focus, everything else has landed by this (360ms): one step later the focus starts, steps if
// it is made of blocks, and lands by ARRIVE_MAX less its flash.
const REST_LANDS = ARRIVE_MAX - FLASH_MS - STEPPED_LAND - STEP_MS;
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function flash(run, roles, inFocus, stepped) {
  let out = "";
  let any = false;
  let col = 0;
  for (const ch of graphemes(run)) {
    const role = roles[col] || "";
    const lands = ch !== " " && (inFocus(col) || role === "x" || role === "ok" || (role === "d" && !stepped));
    if (!lands) out += " ".repeat(cellWidth(ch));
    else if (LIGHT.test(ch)) out += `<span class="gk-${role || "d"}">█</span>`;
    else if (STEPS.test(ch)) out += `<span class="gk-hole">█</span>`;
    else out += `<span class="gk-inv">${esc(ch)}</span>`;
    any ||= lands;
    col += cellWidth(ch);
  }
  return any ? out : "";
}
/** The figure's lines as HTML, with arrival spans when the type has an order. */
export function arriveLines(spec, text) {
  const def = resolve(spec);
  const lines = text.split("\n");
  // The stamp and the blank line above it are not part of the figure the order was written for.
  let end = lines.length;
  if (STAMP.test(lines.at(-1) ?? "")) end = lines.length - 2;
  if (!def.arrive) return null;
  const paintOpts = paintOptions(spec, text);
  const options = { ...spec.options, ...(spec.lang ? { lang: spec.lang } : {}) };
  const delay = def.arrive(lines.slice(0, end), def.data, options);
  // A focus arrives last: one step after everything else has landed, then lands with the flash. The
  // rest lands by 360ms (a block cell's shade steps included), so the focus, stepping or not, lands by
  // 480ms and its 120ms flash ends by 600ms, on the 40ms grid.
  const focused = (r, col) => Boolean(paintOpts.mask?.get(r)?.has(col));
  const stepping = (ch) => (!delay.exact && STEPS.test(ch) ? STEPPED_LAND : 0);
  const raw = (r, col, ch) => Math.max(0, Math.round(delay(r, col, ch) ?? 0));
  let squeeze = 1;
  if (paintOpts.mask) cellsOf(lines.slice(0, end)).forEach((cells, r) => cells.forEach(({ ch, col }) => {
    const d = ch === " " || focused(r, col) ? 0 : raw(r, col, ch);
    if (d) squeeze = Math.min(squeeze, (REST_LANDS - stepping(ch)) / d);
  }));
  const rest = (d) => (d && squeeze < 1 ? Math.max(STEP_MS, Math.floor((d * squeeze) / STEP_MS) * STEP_MS) : d);
  let landed = 0;
  if (paintOpts.mask) cellsOf(lines.slice(0, end)).forEach((cells, r) => cells.forEach(({ ch, col }) => {
    if (ch !== " " && !focused(r, col)) landed = Math.max(landed, rest(raw(r, col, ch)) + stepping(ch));
  }));
  const when = (r, col, ch) => (focused(r, col) ? landed + STEP_MS : rest(raw(r, col, ch)));
  const html = cellsOf(lines).map((cells, r) => {
    if (r >= end) return paintLine(lines[r], paintOpts);
    let out = "";
    let run = "";
    let at = 0;
    let start = 0;
    // Roles come from the whole line, so a word or a swatch split across runs keeps its colour.
    const lineRoles = classify(lines[r], { ...paintOpts, row: r });
    const focus = paintOpts.mask?.get(r);
    const flush = (col) => {
      const roles = lineRoles.slice(start, col);
      const opts = { ...paintOpts, roles };
      if (run && !at) out += paintLine(run, opts);
      else if (run) {
        const stepped = !delay.exact && STEPS.test(run) && ![...run].every((ch) => ch === "▒" || ch === " ");
        const lands = stepped ? at + STEPPED_LAND : at;
        const from = start;
        const shown = flash(run, roles, (c) => Boolean(focus?.has(from + c)), stepped);
        const final = `<span class="gk-a" style="--d:${lands}ms">${paintLine(run, opts)}</span>`;
        const layers = (stepped ? steps(run, at, delay.under, paintOpts) : "") + (shown ? `<span class="gk-s3" aria-hidden="true" style="--d:${lands}ms">${shown}</span>` : "");
        out += layers ? `<span class="gk-s">${layers}${final}</span>` : final;
      }
      run = "";
      start = col;
    };
    for (const { ch, col } of cells) {
      const d = ch === " " ? at : when(r, col, ch);
      if (d !== at) {
        flush(col);
        at = d;
      }
      run += ch;
    }
    flush(Infinity);
    return out;
  });
  // Real-time orders (the motion types) are marked, so a page can offer to play them again.
  return Object.assign(html, { exact: Boolean(delay.exact) });
}

/** CSS for arriving figures, and for the small replay button in each figure's corner. */
const REPLAY_CSS = `.gk-replay-wrap{position:relative;display:grid;min-width:0}.gk-replay{position:absolute;top:6px;right:6px;width:24px;height:24px;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;opacity:.45;font:14px/24px system-ui,sans-serif;cursor:pointer}.gk-replay::before{content:"";position:absolute;inset:-10px}.gk-replay:focus-visible{opacity:1;outline:2px solid currentColor;outline-offset:1px}.gk-replay:active{transform:scale(.97)}@media (hover:hover) and (pointer:fine){.gk-replay:hover{opacity:1}}@media print{.gk-replay{display:none}}`;

/** CSS for arriving figures. `--base` lets a deck start the figure after its title has typed. */
export const ARRIVE_CSS = `${REPLAY_CSS}
@keyframes gk-wait{from,to{visibility:hidden}}
.is-waiting .gk-a{visibility:hidden}
.is-arriving .gk-a{animation:gk-wait calc(var(--base,0ms) + var(--d)) steps(1,end)}
@keyframes gk-gone{from,to{visibility:hidden}}
.gk-s{position:relative}.gk-s0,.gk-s1,.gk-s2,.gk-s3{position:absolute;left:0;top:0;visibility:hidden;user-select:none}
.is-waiting .gk-s0{visibility:visible}.is-arriving .gk-s0{visibility:visible;animation:gk-gone 1ms steps(1,end) calc(var(--base,0ms) + var(--d)) forwards}
.is-arriving .gk-s1,.is-arriving .gk-s2{visibility:visible;animation:gk-wait calc(var(--base,0ms) + var(--d)) steps(1,end),gk-gone 1ms steps(1,end) calc(var(--base,0ms) + var(--d) + ${STEP_MS}ms) forwards}
.is-arriving .gk-s3{visibility:visible;animation:gk-wait calc(var(--base,0ms) + var(--d)) steps(1,end),gk-gone 1ms steps(1,end) calc(var(--base,0ms) + var(--d) + ${FLASH_MS}ms) forwards}
.gk-s3>*{opacity:1}.gk-s3 .gk-hole{color:var(--gk-arrive-paper);-webkit-text-stroke:2px var(--gk-arrive-paper)}.gk-s3 .gk-inv{background:var(--gk-arrive-ink);color:var(--gk-arrive-paper)}
@media (prefers-reduced-motion:reduce){.is-waiting .gk-a{visibility:visible}.is-arriving .gk-a{animation:none}.gk-s0,.gk-s1,.gk-s2,.gk-s3,.is-waiting .gk-s0,.is-arriving .gk-s0,.is-arriving .gk-s1,.is-arriving .gk-s2,.is-arriving .gk-s3{visibility:hidden;animation:none}}
@media print{.is-waiting .gk-a{visibility:visible}.is-arriving .gk-a{animation:none}.gk-s0,.gk-s1,.gk-s2,.gk-s3,.is-waiting .gk-s0,.is-arriving .gk-s0,.is-arriving .gk-s1,.is-arriving .gk-s2,.is-arriving .gk-s3{visibility:hidden;animation:none}}`;

/** Each figure arrives once, when a quarter of it is in view, and gets a small ↺ in its corner to play
 *  it again. A figure shown with a motion demo waits for the demo, and its ↺ replays both. Nothing is
 *  added under reduced motion. */
export const ARRIVE_JS = `(()=>{const figs=document.querySelectorAll("[data-arrive]");if(!figs.length||matchMedia("(prefers-reduced-motion: reduce)").matches||!("IntersectionObserver" in window))return;const run=(f)=>{f.classList.remove("is-arriving","is-waiting");void f.offsetWidth;f.classList.add("is-arriving")};const io=new IntersectionObserver((es)=>es.forEach((e)=>{if(!e.isIntersecting)return;io.unobserve(e.target);run(e.target)}),{threshold:.25});figs.forEach((f)=>{f.classList.add("is-waiting");const stage=f.closest(".gk-figure-wrap")?.querySelector("[data-gk-stage]");const wrap=document.createElement("div");wrap.className="gk-replay-wrap";f.before(wrap);wrap.append(f);const b=document.createElement("button");b.type="button";b.className="gk-replay";b.setAttribute("aria-label","Play again");b.textContent="↺";b.addEventListener("click",()=>stage?stage.querySelector("[data-gk-play]")?.click():run(f));wrap.append(b);if(!stage)io.observe(f)})})();`;
