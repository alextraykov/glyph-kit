// Play a moving diagram into a <pre>. The caller owns the clock: call advance(ms) on every frame or
// tick while it should move, and still() when motion stops (reduced motion, paused, off screen).
// Time is accumulated, not read from a wall clock, so pausing and resuming carries on smoothly.
import { STEP_MS } from "./grid.mjs";
import { stillGrid } from "./kinds.mjs";

export function player(pre, make, still, { prefix = "gl-" } = {}) {
  let frame = null;
  let pos = still;
  let shown = -1;
  let last = "";
  const draw = (g) => {
    const html = g.toHtml(prefix);
    if (html !== last) pre.innerHTML = last = html;
  };
  return {
    /** Move on by ms of real time. Starts from the still frame, so nothing jumps. */
    advance(ms) {
      if (!frame) {
        frame = make();
        for (let s = 0; s < Math.floor(pos); s++) frame(s, 0);
      }
      pos += Math.min(ms, 200) / STEP_MS;
      // Draw on the step, never between: marks move a whole cell at a time, and the page is only
      // rewritten when something changed.
      const step = Math.floor(pos);
      if (step === shown) return;
      shown = step;
      draw(frame(step, 0));
    },
    /** Show the still frame and forget the running state. */
    still() {
      frame = null;
      pos = still;
      shown = -1;
      draw(stillGrid(make, still));
    }
  };
}

// One moving thing per view: of the players on a page, only the one most in view plays.
const players = new Set();
const resync = () => players.forEach((p) => p.sync());
const leader = () => [...players].reduce((best, p) => (p.ratio > (best?.ratio ?? 0) ? p : best), null);

/** A self-running player for standalone pages: requestAnimationFrame, paused off screen, for reduced
 *  motion, and when another moving diagram is more in view. `solo: false` lets it play beside others,
 *  for a page where every figure in view moves. Returns a stop function. */
export function autoplay(pre, make, still, { solo = true } = {}) {
  const p = player(pre, make, still);
  const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
  let visible = true;
  let prev = 0;
  let raf = 0;
  let stopped = false;
  let printing = false;
  const loop = (now) => {
    if (prev) p.advance(now - prev);
    prev = now;
    raf = requestAnimationFrame(loop);
  };
  // Counted as just in view until the observer reports, so a diagram starts at once.
  const self = { ratio: 0.01, sync: () => sync() };
  const sync = () => {
    cancelAnimationFrame(raf);
    prev = 0;
    if (stopped) return;
    if (reduce?.matches || printing || document.hidden) p.still();
    else if (visible && (!solo || leader() === self)) raf = requestAnimationFrame(loop);
  };
  players.add(self);
  const observer = new IntersectionObserver((entries) => {
    const e = entries.at(-1);
    visible = e.isIntersecting;
    self.ratio = visible ? e.intersectionRatio || 0.01 : 0;
    resync();
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  observer.observe(pre.element ?? pre);
  reduce?.addEventListener?.("change", sync);
  const beforePrint = () => { printing = true; sync(); };
  const afterPrint = () => { printing = false; sync(); };
  addEventListener("beforeprint", beforePrint);
  addEventListener("afterprint", afterPrint);
  document.addEventListener("visibilitychange", sync);
  p.still();
  sync();
  return () => {
    stopped = true;
    players.delete(self);
    resync();
    cancelAnimationFrame(raf);
    observer.disconnect();
    reduce?.removeEventListener?.("change", sync);
    removeEventListener("beforeprint", beforePrint);
    removeEventListener("afterprint", afterPrint);
    document.removeEventListener("visibilitychange", sync);
    p.still();
  };
}
