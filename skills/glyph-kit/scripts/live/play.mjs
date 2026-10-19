// Play a moving diagram into a <pre>. The caller owns the clock: call advance(ms) on every frame or
// tick while it should move, and still() when motion stops (reduced motion, paused, off screen).
// Time is accumulated, not read from a wall clock, so pausing and resuming carries on smoothly.
import { STEP_MS } from "./grid.mjs";
import { stillGrid } from "./kinds.mjs";

export function player(pre, make, still, { prefix = "gl-" } = {}) {
  let frame = null;
  let pos = still;
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
      const step = Math.floor(pos);
      draw(frame(step, pos - step));
    },
    /** Show the still frame and forget the running state. */
    still() {
      frame = null;
      pos = still;
      draw(stillGrid(make, still));
    }
  };
}

/** A self-running player for standalone pages: requestAnimationFrame, paused off screen and
 *  for reduced motion. Returns a stop function. */
export function autoplay(pre, make, still) {
  const p = player(pre, make, still);
  const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
  let visible = true;
  let prev = 0;
  let raf = 0;
  const loop = (now) => {
    if (prev) p.advance(now - prev);
    prev = now;
    raf = requestAnimationFrame(loop);
  };
  const sync = () => {
    cancelAnimationFrame(raf);
    prev = 0;
    if (reduce?.matches) p.still();
    else if (visible) raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    sync();
  }).observe(pre);
  reduce?.addEventListener?.("change", sync);
  p.still();
  sync();
  return () => cancelAnimationFrame(raf);
}
