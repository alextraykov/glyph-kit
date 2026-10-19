// The hero showcase: views of the kit in one fixed character box, and the dither transition between
// them. Pure functions, shared by the build (the first frame is in the page) and the browser.
//
// A view is a grid of cells: { ch: string[][], cl: string[][] } (characters and class names).
// The transition is the site's dither press, in characters: every cell that has ink in either view
// steps ░ → ▒ → ▓ → █ → ▓ → ▒ → ░ and lands on the next view. Each cell changes in steps; the start
// times across the box follow a curve (fast at first, settling), in reading order.

export const SEQ = ["░", "▒", "▓", "█", "▓", "▒", "░"];
export const STEP_MS = 40;
export const SPREAD_MS = 520;
export const TRANSITION_MS = SPREAD_MS + SEQ.length * STEP_MS;

const esc = (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c);

/** Cells from text, coloured with the kit's paint roles (classify from render/paint.mjs). */
export function cellsFromText(text, classify) {
  const lines = text.split("\n");
  return {
    ch: lines.map((l) => [...l]),
    cl: lines.map((l) => classify(l).map((role) => (role ? `gk-${role}` : "")))
  };
}

/** Cells from a moving diagram's Grid (after toText() has settled its light). */
export const cellsFromGrid = (g) => ({ ch: g.ch.map((r) => [...r]), cl: g.cl.map((r) => r.map((c) => (c ? `gl-${c}` : ""))) });

export const size = (cells) => ({ rows: cells.ch.length, cols: Math.max(0, ...cells.ch.map((r) => r.length)) });

/** Place cells in the middle of an H × W box. */
export function centre(cells, H, W) {
  const { rows, cols } = size(cells);
  const top = Math.max(0, Math.floor((H - rows) / 2));
  const left = Math.max(0, Math.floor((W - cols) / 2));
  const ch = Array.from({ length: H }, () => Array(W).fill(" "));
  const cl = Array.from({ length: H }, () => Array(W).fill(""));
  cells.ch.forEach((row, r) =>
    row.forEach((c, k) => {
      if (top + r < H && left + k < W) {
        ch[top + r][left + k] = c;
        cl[top + r][left + k] = cells.cl[r]?.[k] ?? "";
      }
    })
  );
  return { ch, cl };
}

/** HTML for a box of cells: one span per run of one class, trailing spaces kept so the box holds its size. */
export function toHtml({ ch, cl }) {
  return ch
    .map((row, r) => {
      let out = "";
      let open = "";
      row.forEach((c, k) => {
        const cls = cl[r][k];
        if (cls !== open) {
          if (open) out += "</span>";
          if (cls) out += `<span class="${cls}">`;
          open = cls;
        }
        out += esc(c);
      });
      return open ? `${out}</span>` : out;
    })
    .join("\n");
}

const easeOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -8 * x)) / (1 - Math.pow(2, -8));

/** When each cell starts its steps, in ms: reading order, across first, with a curve. */
export function delays(H, W) {
  return Array.from({ length: H }, (_, r) => Array.from({ length: W }, (_, c) => easeOut((c / W) * 0.7 + (r / H) * 0.3) * SPREAD_MS));
}

/** One frame of the transition from box A to box B, t ms after it began. */
export function between(A, B, t, wait) {
  const H = A.ch.length;
  const W = A.ch[0].length;
  const ch = Array.from({ length: H }, () => Array(W).fill(" "));
  const cl = Array.from({ length: H }, () => Array(W).fill(""));
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) {
      const a = A.ch[r][c];
      const b = B.ch[r][c];
      const k = Math.floor((t - wait[r][c]) / STEP_MS);
      if ((a === " " && b === " ") || k >= SEQ.length) [ch[r][c], cl[r][c]] = [b, B.cl[r][c]];
      else if (k < 0) [ch[r][c], cl[r][c]] = [a, A.cl[r][c]];
      else ch[r][c] = SEQ[k];
    }
  return { ch, cl };
}
