// Hero showcase: one frame that shows what the kit draws, view after view. Between views the whole
// frame takes the dither press, the same fill as the site's buttons: 8 px cells fill through levels
// 2 → 4 → 6 → 8 in reading order (steps inside, a curve across), the next view swaps in while the
// frame is covered, and the cells empty 6 → 4 → 2 → 0 to show it. The figures themselves don't move.
// Every view builds in (showcase-core.mjs): lines draw on, words scramble and settle, numbers count
// up, bars grow. The first view builds when the hero first comes on screen; each later one builds
// while the press reveals it. Moving views start moving once built.
// It only runs on screen, pauses while pointed at or focused, and shows the first view as it is,
// with no motion, for reduced motion.
import { STEP_MS } from "./kit/live/grid.mjs";
import { live, stillGrid } from "./kit/live/kinds.mjs";
import { classify } from "./kit/render/paint.mjs";
import { blank, buildFrame, cellsFromGrid, cellsFromText, centre, planBuild, toHtml } from "./showcase-core.mjs";

const HOLD_MS = 4200; // a still view
const HOLD_LIVE_MS = 6000; // a moving view, long enough to see it move
const CELL = 8; // px, like the button press
const DOT = CELL / 4; // a 4 × 4 ordered-dither tile per cell
const STEP = 40; // ms per level, the site's tick
const SPREAD = 360; // ms from the first cell to the last
const COVER = [2, 4, 6, 8];
const REVEAL = [6, 4, 2, 0];
const SWAP_AT = SPREAD + COVER.length * STEP; // every cell is solid here
const PRESS_MS = SWAP_AT + SPREAD + REVEAL.length * STEP;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const curve = (x) => (1 - Math.pow(2, -8 * x)) / (1 - Math.pow(2, -8));

const root = document.querySelector("[data-showcase]");
const data = JSON.parse(document.getElementById("showcase")?.textContent || "null");
const specs = JSON.parse(document.getElementById("live-specs")?.textContent || "{}");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

if (root && data && !reduce.matches) {
  const grid = root.querySelector("[data-showcase-grid]");
  const caption = root.querySelector("[data-showcase-caption]");
  const { H, W } = data;

  // The press: a canvas over the whole frame, bar and caption included.
  const press = document.createElement("canvas");
  press.className = "showcase__press";
  press.setAttribute("aria-hidden", "true");
  root.append(press);
  const ctx = press.getContext("2d");
  let cells = null;
  const layout = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = root.clientWidth;
    const h = root.clientHeight;
    press.width = Math.round(w * dpr);
    press.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    cells = { cols, rows, delay: Array.from({ length: cols }, (_, x) => curve(x / Math.max(1, cols - 1)) * SPREAD) };
  };
  const levelAt = (t, x) => {
    const d = cells.delay[x];
    if (t < SWAP_AT) {
      const k = Math.floor((t - d) / STEP);
      return k < 0 ? 0 : COVER[Math.min(k, COVER.length - 1)];
    }
    const k = Math.floor((t - SWAP_AT - d) / STEP);
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
  let swapped = false;
  let building = null; // { box, plan, t } while a view builds in
  let started = false;
  const build = (k) => {
    const box = views[k].box();
    building = { box, plan: planBuild(box), t: 0 };
  };
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
    caption.textContent = views[k].caption;
    grid.setAttribute("aria-label", views[k].label);
  };

  const tick = (now) => {
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    if (!started) {
      started = true;
      build(i);
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
      if (!paused && !building) elapsed += dt;
      if (elapsed >= (views[i].live ? HOLD_LIVE_MS : HOLD_MS)) {
        layout();
        phase = "press";
        elapsed = 0;
        swapped = false;
      }
    } else {
      elapsed += dt;
      if (!swapped && elapsed >= SWAP_AT) {
        // Covered: swap the words, and start the next view building in underneath.
        swapped = true;
        i = (i + 1) % views.length;
        views[i].reset();
        label(i);
        build(i);
        draw(buildFrame(building.box, building.plan, 0));
      }
      paintPress(elapsed);
      if (elapsed >= PRESS_MS) {
        paintPress(null);
        phase = "hold";
        elapsed = 0;
      }
    }
    raf = requestAnimationFrame(tick);
  };

  // The first view builds in, so start from an empty box of the same size (the page keeps its height).
  draw(blank(views[0].box()));
  document.documentElement.dataset.showcaseState = "ready";

  // The builder takes the preview over when someone picks a suggestion or types: stop for good.
  let stopped = false;
  const sync = () => {
    cancelAnimationFrame(raf);
    last = 0;
    if (!stopped && visible && !document.hidden) raf = requestAnimationFrame(tick);
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
  grid.tabIndex = 0;
}
