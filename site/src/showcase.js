// Hero showcase: one box that shows what the kit draws, view after view. Between views every
// character with ink steps through the dither press (░ ▒ ▓ █ ▓ ▒ ░) and lands on the next one.
// It only runs on screen, pauses while pointed at or focused, and stays on the first view for
// reduced motion. The first view is already in the page, so nothing moves on load.
import { STEP_MS } from "./kit/live/grid.mjs";
import { live, stillGrid } from "./kit/live/kinds.mjs";
import { classify } from "./kit/render/paint.mjs";
import { TRANSITION_MS, between, cellsFromGrid, cellsFromText, centre, delays, toHtml } from "./showcase-core.mjs";

const HOLD_MS = 4200; // a still view
const HOLD_LIVE_MS = 6000; // a moving view, long enough to see it move

const root = document.querySelector("[data-showcase]");
const data = JSON.parse(document.getElementById("showcase")?.textContent || "null");
const specs = JSON.parse(document.getElementById("live-specs")?.textContent || "{}");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

if (root && data && !reduce.matches) {
  const grid = root.querySelector("[data-showcase-grid]");
  const title = root.querySelector("[data-showcase-title]");
  const count = root.querySelector("[data-showcase-count]");
  const caption = root.querySelector("[data-showcase-caption]");
  const { H, W } = data;
  const wait = delays(H, W);

  // Each view knows how to give its current box. Moving views keep their own clock.
  const views = data.views.map((v) => {
    if (!v.live) {
      const box = centre(cellsFromText(v.text, classify), H, W);
      return { ...v, box: () => box, reset() {}, advance() {} };
    }
    const { make, still } = live(specs[v.live]);
    let frame;
    let pos;
    const view = {
      ...v,
      reset() {
        frame = make();
        for (let s = 0; s < still; s++) frame(s, 0);
        pos = still;
      },
      advance(ms) {
        pos += Math.min(ms, 200) / STEP_MS;
      },
      box() {
        const step = Math.floor(pos);
        const g = frame(step, pos - step);
        g.toText();
        return centre(cellsFromGrid(g), H, W);
      }
    };
    view.reset();
    return view;
  });

  let i = 0;
  let phase = "hold";
  let elapsed = 0;
  let from = null;
  let to = null;
  let swapped = false;
  let visible = false;
  let paused = false;
  let last = 0;
  let drawn = "";
  let raf = 0;

  const draw = (box) => {
    const html = toHtml(box);
    if (html !== drawn) grid.innerHTML = drawn = html;
  };
  const label = (k) => {
    title.textContent = views[k].title;
    count.textContent = `${k + 1} / ${views.length}`;
    caption.textContent = views[k].caption;
    grid.setAttribute("aria-label", views[k].label);
  };

  const tick = (now) => {
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    if (phase === "hold") {
      const view = views[i];
      if (view.live) {
        view.advance(dt);
        draw(view.box());
      }
      if (!paused) elapsed += dt;
      if (elapsed >= (view.live ? HOLD_LIVE_MS : HOLD_MS)) {
        const next = (i + 1) % views.length;
        views[next].reset();
        from = view.box();
        to = views[next].box();
        phase = "swap";
        elapsed = 0;
        swapped = false;
      }
    } else {
      elapsed += dt;
      draw(between(from, to, elapsed, wait));
      if (!swapped && elapsed >= TRANSITION_MS / 2) {
        swapped = true;
        label((i + 1) % views.length);
      }
      if (elapsed >= TRANSITION_MS) {
        i = (i + 1) % views.length;
        phase = "hold";
        elapsed = 0;
        draw(views[i].box());
      }
    }
    raf = requestAnimationFrame(tick);
  };

  const sync = () => {
    cancelAnimationFrame(raf);
    last = 0;
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  }, { threshold: 0.3 }).observe(root);
  document.addEventListener("visibilitychange", sync);
  // Pointing at it or focusing it holds the current view so it can be read.
  root.addEventListener("pointerenter", () => (paused = true));
  root.addEventListener("pointerleave", () => (paused = false));
  root.addEventListener("focusin", () => (paused = true));
  root.addEventListener("focusout", () => (paused = false));
  grid.tabIndex = 0;
}
