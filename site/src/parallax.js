// Stepped parallax: layers drift at their own rate as the page scrolls, in 4 px steps (steps inside,
// never a glide), the same way the rest of the site moves. Elements opt in with data-depth: 0 stays
// with the page, higher drifts more. Behind the hero, a dither field drifts slower than everything and
// darkens one shade at a time (░ → ▒ → ▓) as you scroll, like the press.
// Off for reduced motion; without scripts nothing moves and everything sits where the layout puts it.
const STEP = 4; // px
const MAX = 64; // px, under the 72 px between sections, so no layer reaches the next one
const RAMP = " ░▒▓";
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

// data-lag: starts in place and trails the scroll (the hero name); otherwise drift around the middle.
// data-settle: starts higher and settles into place as it reaches the middle of the screen, so it never
// moves toward the content under it. Only headings and the hero move: never a cell inside a grid, so
// the grid's dividers stay lined up.
const layers = [...document.querySelectorAll("[data-depth]")].map((el) => ({ el, depth: Number(el.dataset.depth) || 0, lag: el.hasAttribute("data-lag"), settle: el.hasAttribute("data-settle"), y: 0 }));
const hero = document.querySelector(".hero");

// The dither field: a grid of cells whose shade follows a fixed pattern plus the scroll.
let field = null;
if (hero) {
  const pre = document.createElement("pre");
  pre.className = "hero__field";
  pre.setAttribute("aria-hidden", "true");
  hero.prepend(pre);
  field = { pre, level: -1, cols: 0, rows: 0, y: 0 };
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const drawField = (level) => {
  const { cols, rows } = field;
  let out = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Denser to the right and lower down; the scroll adds whole shades.
      const base = (c / cols) * 2.2 + (r / rows) * 0.8 + BAYER[(r % 4) * 4 + (c % 4)] / 16;
      out += RAMP[Math.max(0, Math.min(3, Math.floor(base + level) - 1))];
    }
    out += "\n";
  }
  field.pre.textContent = out;
};
const sizeField = () => {
  if (!field) return;
  const cell = parseFloat(getComputedStyle(field.pre).fontSize) || 22;
  field.cols = Math.ceil(innerWidth / (cell * 0.6364));
  field.rows = Math.ceil(hero.clientHeight / cell) + 4;
  field.level = -1;
};

const quantise = (v) => Math.round(Math.max(-MAX, Math.min(MAX, v)) / STEP) * STEP;
let queued = false;
const update = () => {
  queued = false;
  const vh = innerHeight;
  for (const layer of layers) {
    const rect = layer.el.getBoundingClientRect();
    if (rect.bottom < -MAX || rect.top > vh + MAX) continue;
    // Where it would sit without this transform, relative to the middle of the screen.
    const centre = rect.top - layer.y + rect.height / 2;
    const y = layer.lag
      ? Math.round(Math.min(scrollY * layer.depth, vh / 2) / STEP) * STEP
      : layer.settle
        ? quantise(Math.min(0, -(centre - vh / 2) * layer.depth))
        : quantise(-(centre - vh / 2) * layer.depth);
    if (y !== layer.y) {
      layer.y = y;
      layer.el.style.transform = `translate3d(0, ${y}px, 0)`;
    }
  }
  if (field) {
    const progress = Math.max(0, Math.min(1, scrollY / Math.max(1, hero.offsetHeight + 300)));
    const level = Math.floor(progress * 4) / 2; // four steps across the hero
    if (level !== field.level) {
      field.level = level;
      drawField(level);
    }
    const y = Math.round((scrollY * 0.62) / STEP) * STEP;
    if (y !== field.y) {
      field.y = y;
      field.pre.style.transform = `translate3d(0, ${y}px, 0)`;
    }
  }
};
const queue = () => {
  if (!queued) {
    queued = true;
    requestAnimationFrame(update);
  }
};

const start = () => {
  if (reduce.matches) {
    layers.forEach((layer) => {
      layer.y = 0;
      layer.el.style.transform = "";
    });
    if (field) field.pre.hidden = true;
    return;
  }
  if (field) field.pre.hidden = false;
  sizeField();
  queue();
};
addEventListener("scroll", queue, { passive: true });
addEventListener("resize", () => {
  sizeField();
  queue();
});
reduce.addEventListener?.("change", start);
start();
