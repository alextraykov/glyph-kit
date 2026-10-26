// Arrival in HTML: runs of cells with the same delay become one span with its delay as a style value,
// so the browser plays the arrival with no script per frame. Hidden only while a figure is arriving:
// without JavaScript, under reduced motion and in print the figure is simply there.
import { resolve } from "../registry.mjs";
import { cellsOf } from "../arrive.mjs";
import { paintLine } from "./paint.mjs";
import { maskOf } from "./mask.mjs";
import { width } from "../text.mjs";

const STAMP = /^\s*SAMPLE DATA\s*$/;
// Block cells step blank → ░ → ▒ → final, one step each; text snaps.
const STEPS = /[█▓▒■▁▂▃▄▅▆▇▏▎▍▌▋▊▉]/u;
const STEP_MS = 40;
const layer = (run, glyph) => [...run].map((ch) => (STEPS.test(ch) ? glyph : " ")).join("");

// A run of block cells: ░ and ▒ layers sit on top of the final cells, each shown for one step, then
// the final cells. The layers are hidden unless the figure is arriving, so nothing else ever sees them.
// `under` keeps a scale visible (░ or ·) behind cells that haven't arrived yet.
const stepped = (run, at, under, opts) =>
  `<span class="gk-s">${under ? `<span class="gk-s0" aria-hidden="true" style="--d:${at}ms">${paintLine(layer(run, under), opts)}</span>` : ""}<span class="gk-s1" aria-hidden="true" style="--d:${at}ms">${paintLine(layer(run, "░"), opts)}</span><span class="gk-s2" aria-hidden="true" style="--d:${at + STEP_MS}ms">${paintLine(layer(run, "▒"), opts)}</span><span class="gk-a" style="--d:${at + 2 * STEP_MS}ms">${paintLine(run, opts)}</span></span>`;

// A layer on its way in (a drawer sliding, a sheet rising): each frame of its rectangle is an
// aria-hidden overlay over the line, shown for `len` ms from `at`. The real cells land last.
const overlay = (o) =>
  `<span class="gk-o" aria-hidden="true" style="--d:${o.at}ms;--l:${o.len}ms">${paintLine(" ".repeat(o.c0) + o.text, { mask: "p".repeat(o.c0) + o.mask })}</span>`;

/** The figure's lines as HTML, with arrival spans when the type has an order. */
export function arriveLines(spec, text) {
  const def = resolve(spec);
  const lines = text.split("\n");
  // The stamp and the blank line above it are not part of the figure the order was written for.
  let end = lines.length;
  if (STAMP.test(lines.at(-1) ?? "")) end = lines.length - 2;
  if (!def.arrive) return null;
  const options = { ...spec.options, ...(spec.lang ? { lang: spec.lang } : {}) };
  const delay = def.arrive(lines.slice(0, end), def.data, options);
  const mask = def.mask ? maskOf(spec) : undefined;
  const html = cellsOf(lines).map((cells, r) => {
    if (r >= end) return paintLine(lines[r]);
    let out = "";
    let run = "";
    let at = 0;
    let from = 0;
    const flush = () => {
      const opts = mask?.[r] ? { mask: mask[r].slice(from, from + width(run)) } : {};
      if (run) out += !at ? paintLine(run, opts) : !delay.exact && STEPS.test(run) && ![...run].every((ch) => ch === "▒" || ch === " ") ? stepped(run, at, delay.under, opts) : `<span class="gk-a" style="--d:${at}ms">${paintLine(run, opts)}</span>`;
      run = "";
    };
    for (const { ch, col } of cells) {
      const d = ch === " " ? at : Math.max(0, Math.round(delay(r, col, ch) ?? 0));
      if (d !== at) {
        flush();
        at = d;
        from = col;
      }
      run += ch;
    }
    flush();
    const over = (delay.frames ?? []).flatMap((f) => (f.rows[r] ?? []).map((o) => ({ ...o, c0: f.c0 })));
    return over.length ? `<span class="gk-s">${over.map(overlay).join("")}${out}</span>` : out;
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
@keyframes gk-land{from{background:var(--gk-arrive-ink);color:var(--gk-arrive-paper)}to{background:transparent}}
.is-arriving .gk-a{animation:gk-wait calc(var(--base,0ms) + var(--d)) steps(1,end)}
.is-arriving .gk-a .gk-x,.is-arriving .gk-a .gk-d{animation:gk-land 120ms steps(1,end) calc(var(--base,0ms) + var(--d))}
@keyframes gk-gone{from,to{visibility:hidden}}
.gk-s{position:relative}.gk-s0,.gk-s1,.gk-s2{position:absolute;left:0;top:0;visibility:hidden;user-select:none}
.is-waiting .gk-s0{visibility:visible}.is-arriving .gk-s0{visibility:visible;animation:gk-gone 1ms steps(1,end) calc(var(--base,0ms) + var(--d)) forwards}
.is-arriving .gk-s1,.is-arriving .gk-s2{visibility:visible;animation:gk-wait calc(var(--base,0ms) + var(--d)) steps(1,end),gk-gone 1ms steps(1,end) calc(var(--base,0ms) + var(--d) + 40ms) forwards}
.is-arriving .gk-s .gk-a .gk-d{animation:none}
.gk-o{position:absolute;left:0;top:0;visibility:hidden;user-select:none;pointer-events:none;white-space:pre}
.is-arriving .gk-o{visibility:visible;animation:gk-wait calc(var(--base,0ms) + var(--d)) steps(1,end),gk-gone 1ms steps(1,end) calc(var(--base,0ms) + var(--d) + var(--l)) forwards}
@media (prefers-reduced-motion:reduce){.is-waiting .gk-a{visibility:visible}.is-arriving .gk-a,.is-arriving .gk-a .gk-d{animation:none}.gk-s0,.gk-s1,.gk-s2,.gk-o,.is-waiting .gk-s0,.is-arriving .gk-s0,.is-arriving .gk-s1,.is-arriving .gk-s2,.is-arriving .gk-o{visibility:hidden;animation:none}}
@media print{.is-waiting .gk-a{visibility:visible}.is-arriving .gk-a,.is-arriving .gk-a .gk-d{animation:none}.gk-s0,.gk-s1,.gk-s2,.gk-o,.is-waiting .gk-s0,.is-arriving .gk-s0,.is-arriving .gk-s1,.is-arriving .gk-s2,.is-arriving .gk-o{visibility:hidden;animation:none}}`;

/** Each figure arrives once, when a quarter of it is in view, and gets a small ↺ in its corner to play
 *  it again. A figure shown with a motion demo waits for the demo, and its ↺ replays both. Nothing is
 *  added under reduced motion. */
export const ARRIVE_JS = `(()=>{const figs=document.querySelectorAll("[data-arrive]");if(!figs.length||matchMedia("(prefers-reduced-motion: reduce)").matches||!("IntersectionObserver" in window))return;const run=(f)=>{f.classList.remove("is-arriving","is-waiting");void f.offsetWidth;f.classList.add("is-arriving")};const io=new IntersectionObserver((es)=>es.forEach((e)=>{if(!e.isIntersecting)return;io.unobserve(e.target);run(e.target)}),{threshold:.25});figs.forEach((f)=>{f.classList.add("is-waiting");const stage=f.closest(".gk-figure-wrap")?.querySelector("[data-gk-stage]");const wrap=document.createElement("div");wrap.className="gk-replay-wrap";f.before(wrap);wrap.append(f);const b=document.createElement("button");b.type="button";b.className="gk-replay";b.setAttribute("aria-label","Play again");b.textContent="↺";b.addEventListener("click",()=>stage?stage.querySelector("[data-gk-play]")?.click():run(f));wrap.append(b);if(!stage)io.observe(f)})})();`;
