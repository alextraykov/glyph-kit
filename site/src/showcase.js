// Hero showcase: one frame that shows what the kit draws, view after view. Between views the frame
// under its bar takes the dither press, the same fill as the site's buttons: 8 px cells fill through
// levels 2 → 4 → 6 → 8 in reading order (steps inside, a curve across), the next view swaps in while
// the frame is covered, and the cells empty 6 → 4 → 2 → 0 to show it. The figures themselves don't move.
// Every view builds in (showcase-core.mjs): lines draw on, words scramble and settle, numbers count
// up, bars grow. The first view builds when the hero first comes on screen; each later one builds
// while the press reveals it. Moving views start moving once built.
// ← and → step through the views with a quicker press. Once someone steps, the views stop changing on
// their own. The frame keeps one height, and each view fills it as far as its shape allows.
// It only runs on screen and pauses while pointed at or focused. With reduced motion nothing moves:
// it stays on the first view, a step swaps at once, and moving views show their still frame.
import { STEP_MS } from "./kit/live/grid.mjs";
import { live } from "./kit/live/kinds.mjs";
import { blank, buildFrame, cellsFromGrid, crop, planBuild, toHtml } from "./showcase-core.mjs";

const HOLD_MS = 4200; // a still view
const HOLD_LIVE_MS = 6000; // a moving view, long enough to see it move
const CELL = 8; // px, like the button press
const DOT = CELL / 4; // a 4 × 4 ordered-dither tile per cell
const AUTO = { spread: 360, step: 40 }; // ms from the first cell to the last, and per level: the site's tick
const QUICK = { spread: 100, step: 30 }; // a step someone asked for, about 0.4 s in all
const COVER = [2, 4, 6, 8];
const REVEAL = [6, 4, 2, 0];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const curve = (x) => (1 - Math.pow(2, -8 * x)) / (1 - Math.pow(2, -8));

const root = document.querySelector("[data-showcase]");
const data = JSON.parse(document.getElementById("showcase")?.textContent || "null");
const specs = JSON.parse(document.getElementById("live-specs")?.textContent || "{}");
const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;

if (root && data) {
  const grid = root.querySelector("[data-showcase-grid]");
  const stage = grid.closest(".stage");
  const caption = root.querySelector("[data-showcase-caption]");
  const title = root.querySelector("[data-showcase-title]");
  const count = root.querySelector("[data-showcase-count]");
  const stepper = root.querySelector("[data-showcase-step]");

  // Each view gives its current box, cut to the ink it ever uses, and keeps its own clock.
  const views = data.views.map((v) => {
    const { make, still } = live(specs[v.live]);
    let frame;
    let pos;
    const view = {
      ...v,
      size: { rows: v.rows[1] - v.rows[0], cols: v.crop[1] - v.crop[0] },
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
        return crop(cellsFromGrid(g), v.crop, v.rows);
      }
    };
    view.reset();
    return view;
  });

  let i = 0;
  let manual = false; // someone took over: no more changing on its own
  let paused = false;
  let phase = "hold";
  let elapsed = 0;
  let swapped = false;
  let target = 0;
  let building = null; // { box, plan, t } while a view builds in
  let drawn = "";

  const draw = (box) => {
    const html = toHtml(box);
    if (html !== drawn) grid.innerHTML = drawn = html;
  };
  const counter = (k) => {
    title.textContent = views[k].title;
    count.textContent = `${k + 1} / ${views.length}`;
  };
  const label = () => {
    const v = views[i];
    counter(i);
    caption.textContent = v.caption;
    grid.style.setProperty("--vcols", v.size.cols);
    grid.style.setProperty("--vrows", v.size.rows);
    grid.setAttribute("aria-label", v.label);
  };
  const build = () => {
    const box = views[i].box();
    building = { box, plan: planBuild(box), t: 0 };
  };
  const takeOver = () => {
    if (manual) return;
    manual = true;
    caption.setAttribute("aria-live", "polite"); // say the view's caption when someone steps, never on its own
  };

  // The press: a canvas over the frame under the bar, caption included.
  const press = document.createElement("canvas");
  press.className = "showcase__press";
  press.setAttribute("aria-hidden", "true");
  if (motion) root.append(press);
  const ctx = press.getContext("2d");
  let cells = null;
  let pace = AUTO;
  const swapAt = () => pace.spread + COVER.length * pace.step;
  const pressMs = () => swapAt() + pace.spread + REVEAL.length * pace.step;
  const layout = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const top = stage.offsetTop;
    const w = root.clientWidth;
    const h = root.clientHeight - top;
    press.style.top = `${top}px`;
    press.style.height = `${h}px`;
    press.width = Math.round(w * dpr);
    press.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    cells = { cols, rows, delay: Array.from({ length: cols }, (_, x) => curve(x / Math.max(1, cols - 1)) * pace.spread) };
  };
  const levelAt = (t, x) => {
    const d = cells.delay[x];
    if (t < swapAt()) {
      const k = Math.floor((t - d) / pace.step);
      return k < 0 ? 0 : COVER[Math.min(k, COVER.length - 1)];
    }
    const k = Math.floor((t - swapAt() - d) / pace.step);
    return k < 0 ? 8 : REVEAL[Math.min(k, REVEAL.length - 1)];
  };
  // One repeating tile per level (2, 4 and 6 of 8), so a whole column fills in one call.
  const tiles = {};
  const tile = (level, ink) => {
    const key = `${level}${ink}`;
    if (tiles[key]) return tiles[key];
    const c = document.createElement("canvas");
    c.width = c.height = CELL;
    const g = c.getContext("2d");
    g.fillStyle = ink;
    for (let k = 0; k < 16; k++) if (BAYER[k] < level * 2) g.fillRect((k % 4) * DOT, Math.floor(k / 4) * DOT, DOT, DOT);
    return (tiles[key] = ctx.createPattern(c, "repeat"));
  };
  const paintPress = (t) => {
    ctx.clearRect(0, 0, press.width, press.height);
    if (t === null) return;
    const ink = getComputedStyle(root).getPropertyValue("--ink").trim() || "#080808";
    // Every cell in a column shares its level: reading order runs left to right.
    for (let x = 0; x < cells.cols; x++) {
      const level = levelAt(t, x);
      if (!level) continue;
      ctx.fillStyle = level >= 8 ? ink : tile(level, ink);
      ctx.fillRect(x * CELL, 0, CELL, cells.rows * CELL);
    }
  };

  const startPress = (k, kind) => {
    pace = kind;
    layout();
    phase = "press";
    elapsed = 0;
    swapped = false;
    target = k;
  };
  // Covered: swap the words, and start the next view building in underneath.
  const swap = () => {
    swapped = true;
    i = target;
    views[i].reset();
    label();
    build();
    draw(buildFrame(building.box, building.plan, 0));
  };
  // Straight to view k: with reduced motion, or off screen.
  const jump = (k) => {
    i = k;
    building = null;
    phase = "hold";
    elapsed = 0;
    paintPress(null);
    views[i].reset();
    label();
    draw(views[i].box());
  };

  let started = false;
  let visible = false;
  let last = 0;
  let raf = 0;
  const running = () => motion && visible && !document.hidden;
  const tick = (now) => {
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    if (!started) {
      started = true;
      build();
    }
    if (building) {
      building.t += dt;
      if (building.t >= building.plan.total) {
        draw(building.box);
        building = null;
      } else draw(buildFrame(building.box, building.plan, building.t));
    } else if (views[i].live) {
      views[i].advance(dt);
      draw(views[i].box());
    }
    if (phase === "hold") {
      if (!paused && !manual && !building) elapsed += dt;
      if (elapsed >= (views[i].live ? HOLD_LIVE_MS : HOLD_MS)) startPress((i + 1) % views.length, AUTO);
    } else {
      elapsed += dt;
      if (!swapped && elapsed >= swapAt()) swap();
      paintPress(elapsed);
      if (elapsed >= pressMs()) {
        paintPress(null);
        phase = "hold";
        elapsed = 0;
      }
    }
    raf = requestAnimationFrame(tick);
  };

  // A step someone asked for. A second step while the frame is still covering goes straight to the
  // newer view; once it is revealing, the press starts again.
  const go = (k) => {
    k = (k + views.length) % views.length;
    takeOver();
    if (!running() || !started) return jump(k);
    counter(k);
    if (phase === "press" && !swapped) target = k;
    else startPress(k, QUICK);
  };

  label();
  // The first view builds in, so start from an empty frame of its size (the page keeps its height).
  draw(motion ? blank(views[0].box()) : views[0].box());
  stepper.hidden = false;
  document.documentElement.dataset.showcaseState = "ready";

  // The builder takes the preview over when someone picks a suggestion or types: stop for good.
  let stopped = false;
  const sync = () => {
    cancelAnimationFrame(raf);
    last = 0;
    if (!stopped && running()) raf = requestAnimationFrame(tick);
  };
  document.addEventListener("showcase:stop", () => {
    stopped = true;
    sync();
    press.remove();
  }, { once: true });
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

  root.querySelector("[data-showcase-prev]").addEventListener("click", () => go(i - 1));
  root.querySelector("[data-showcase-next]").addEventListener("click", () => go(i + 1));
  // ← and → step anywhere in the frame.
  root.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    go(i + step);
  });
  grid.tabIndex = 0;
}
