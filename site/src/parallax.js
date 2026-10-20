// Stepped parallax on section headings only: the kicker and the two-beat h2 settle down into place in
// 4 px steps (steps inside, never a glide) as the heading comes up from the bottom of the screen, then stay
// put. Only those two lines move, by a transform, so nothing else on the page shifts, no layout moves
// and no gap opens between sections. Behind the hero, a dither field darkens one shade at a time
// (░ → ▒ → ▓) as you scroll, like the press; it does not drift.
// Off for reduced motion; without scripts nothing moves and everything sits where the layout puts it.
const STEP = 4; // px
const MAX = 16; // px, well inside the 72 px between sections
const SETTLE = 0.75; // headings are in place once their middle passes three quarters down the screen
const RAMP = " ░▒▓";
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
// Phones and touch screens scroll with momentum; stepped layers fight it, so nothing moves there.
const touch = matchMedia("(max-width: 900px), (pointer: coarse)");

// A heading opts in with data-depth and data-settle; it is measured as a whole (and never moves itself),
// but only its kicker and h2 are shifted, so links and notes in the heading stay where they are.
const layers = [...document.querySelectorAll("[data-depth][data-settle]")].map((el) => ({
  el,
  depth: Number(el.dataset.depth) || 0,
  text: [...el.querySelectorAll(":scope > .kicker, :scope > h2")],
  y: 0,
}));
const place = (layer, y) => {
  layer.y = y;
  for (const t of layer.text) t.style.transform = y ? `translate3d(0, ${y}px, 0)` : "";
};
const hero = document.querySelector(".hero");

// The dither field: a grid of cells whose shade follows a fixed pattern plus the scroll.
let field = null;
if (hero) {
  const pre = document.createElement("pre");
  pre.className = "hero__field";
  pre.setAttribute("aria-hidden", "true");
  hero.prepend(pre);
  field = { pre, level: -1, cols: 0, rows: 0 };
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

let queued = false;
const update = () => {
  queued = false;
  const vh = innerHeight;
  for (const layer of layers) {
    const rect = layer.el.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > vh + MAX) continue;
    // Below the settle line the text sits up to MAX higher, in the space above the section, and comes down
    // into place; it never moves toward the content under it.
    const below = rect.top + rect.height / 2 - vh * SETTLE;
    const y = -Math.round(Math.max(0, Math.min(MAX, below * layer.depth)) / STEP) * STEP || 0;
    if (y !== layer.y) place(layer, y);
  }
  if (field) {
    const progress = Math.max(0, Math.min(1, scrollY / Math.max(1, hero.offsetHeight + 300)));
    const level = Math.floor(progress * 4) / 2; // four steps across the hero
    if (level !== field.level) {
      field.level = level;
      drawField(level);
    }
  }
};
const queue = () => {
  if (!queued) {
    queued = true;
    requestAnimationFrame(update);
  }
};

const still = () => reduce.matches || touch.matches;
const start = () => {
  if (still()) {
    layers.forEach((layer) => place(layer, 0));
    if (field) {
      // Reduced motion hides the field; on touch screens it stays, drawn once and not moving.
      field.pre.hidden = reduce.matches;
      if (!reduce.matches) {
        sizeField();
        drawField(0);
      }
    }
    return;
  }
  if (field) field.pre.hidden = false;
  sizeField();
  queue();
};
addEventListener("scroll", () => { if (!still()) queue(); }, { passive: true });
addEventListener("resize", () => {
  sizeField();
  queue();
});
reduce.addEventListener?.("change", start);
touch.addEventListener?.("change", start);
start();
