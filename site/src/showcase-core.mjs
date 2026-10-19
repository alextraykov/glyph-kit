// The hero showcase: views of the kit centred in one fixed character box. Pure functions, shared
// by the build (the first view is in the page) and the browser (showcase.js).
//
// A view is a grid of cells: { ch: string[][], cl: string[][] } (characters and class names).

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
