// Image fidelity: a spec drawn as an SVG, with no font needed for the graphics.
// Every character sits on a fixed grid. Block characters become rectangles, the shades ░▒▓ become
// real 25/50/75% dither patterns, box drawing becomes vector lines (light, heavy and double),
// arrows become shapes, and text is locked to its cell width so columns always line up.
// Colours come from the theme's roles (themes.mjs, paint.mjs). PNG is this SVG rasterised (export.mjs).
import { resolve } from "../registry.mjs";
import { classify } from "./paint.mjs";
import { SPACING, palette } from "./themes.mjs";
import { body, label } from "./text.mjs";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const n = (v) => +v.toFixed(2);

// [up, right, down, left], weight: 1 light, 2 heavy, 3 double.
const BOX = {};
const def = (chars, weight, dirs) => [...chars].forEach((c, i) => (BOX[c] = { w: weight, d: dirs[i] }));
const DIRS = [
  [0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 1, 0, 0], [1, 0, 0, 1],
  [1, 1, 1, 0], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 0, 1], [1, 1, 1, 1]
];
def("─│┌┐└┘├┤┬┴┼", 1, DIRS);
def("━┃┏┓┗┛┣┫┳┻╋", 2, DIRS);
def("═║╔╗╚╝╠╣╦╩╬", 3, DIRS);
def("╭╮╰╯", 1, [DIRS[2], DIRS[3], DIRS[4], DIRS[5]]);

const LEFT_EIGHTHS = "▏▎▍▌▋▊▉"; // 1/8 … 7/8 wide
const LOW_EIGHTHS = "▁▂▃▄▅▆▇"; // 1/8 … 7/8 tall
const SHADES = { "░": 0.25, "▒": 0.5, "▓": 0.75 };

/** Draw lines of text as SVG elements on a grid. Returns { svg, width, height } for the inner figure. */
export function figureSvg(text, { colors, cell = 10, row = 22, x0 = 0, y0 = 0 } = {}) {
  const c = colors;
  const roleColor = { d: c.data, e: c.data, f: c.frame, x: c.flag, ok: c.ok, "": c.ink };
  const lines = text.split("\n");
  const cols = Math.max(1, ...lines.map((l) => [...l].length));
  const band = row * 0.72; // block height: leaves a gap between rows so charts breathe
  const out = [];
  const patterns = new Map();
  const pattern = (shade, color) => {
    const id = `gk-p${Object.keys(SHADES).indexOf(shade)}-${color.replace(/[^a-z0-9]/gi, "")}`;
    if (!patterns.has(id)) {
      // 4×4 ordered dither: 4, 8 or 12 of 16 dots lit, the same 25/50/75% as the VGA shades.
      const lit = { "░": [[0, 0], [2, 1], [0, 2], [2, 3]], "▒": [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 3], [3, 3]] }[shade];
      const dots = (shade === "▓" ? [[0, 0], [1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2], [3, 2], [0, 3], [2, 3], [3, 3]] : lit)
        .map(([x, y]) => `<rect x="${x * 1.5}" y="${y * 1.5}" width="1.5" height="1.5"/>`)
        .join("");
      patterns.set(id, `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><g fill="${color}">${dots}</g></pattern>`);
    }
    return `url(#${id})`;
  };

  lines.forEach((line, r) => {
    const chars = [...line];
    const roles = classify(line);
    const top = y0 + r * row;
    const cy = top + row / 2;
    let run = "";
    let runStart = 0;
    let runColor = c.ink;
    const flush = () => {
      if (run.trim()) {
        const x = x0 + runStart * cell;
        out.push(
          `<text x="${n(x)}" y="${n(cy + row * 0.25)}" fill="${runColor}" textLength="${n(run.length * cell)}" lengthAdjust="spacingAndGlyphs">${esc(run)}</text>`
        );
      }
      run = "";
    };
    chars.forEach((ch, i) => {
      const x = x0 + i * cell;
      const color = roleColor[roles[i]] ?? c.ink;
      const box = BOX[ch];
      const graphic = box || ch === "█" || ch in SHADES || LEFT_EIGHTHS.includes(ch) || LOW_EIGHTHS.includes(ch) || "▀▄▐■□·►◄▲▼▕┊".includes(ch);
      if (ch === " ") {
        // Words are placed one by one: SVG would collapse the spaces inside a run.
        flush();
        return;
      }
      if (!graphic) {
        if (!run) {
          runStart = i;
          runColor = color;
        } else if (color !== runColor) {
          flush();
          runStart = i;
          runColor = color;
        }
        run += ch;
        return;
      }
      flush();
      const bTop = cy - band / 2;
      if (ch === "█") out.push(`<rect x="${n(x)}" y="${n(bTop)}" width="${n(cell + 0.3)}" height="${n(band)}" fill="${color}"/>`);
      else if (ch in SHADES) out.push(`<rect x="${n(x)}" y="${n(bTop)}" width="${n(cell + 0.3)}" height="${n(band)}" fill="${pattern(ch, color)}"/>`);
      else if (LEFT_EIGHTHS.includes(ch)) out.push(`<rect x="${n(x)}" y="${n(bTop)}" width="${n(((LEFT_EIGHTHS.indexOf(ch) + 1) / 8) * cell)}" height="${n(band)}" fill="${color}"/>`);
      else if (LOW_EIGHTHS.includes(ch)) {
        const h = ((LOW_EIGHTHS.indexOf(ch) + 1) / 8) * band;
        out.push(`<rect x="${n(x + 0.5)}" y="${n(bTop + band - h)}" width="${n(cell - 1)}" height="${n(h)}" fill="${color}"/>`);
      } else if (ch === "▀") out.push(`<rect x="${n(x)}" y="${n(bTop)}" width="${cell}" height="${n(band / 2)}" fill="${color}"/>`);
      else if (ch === "▄") out.push(`<rect x="${n(x)}" y="${n(cy)}" width="${cell}" height="${n(band / 2)}" fill="${color}"/>`);
      else if (ch === "▐") out.push(`<rect x="${n(x + cell / 2)}" y="${n(bTop)}" width="${n(cell / 2)}" height="${n(band)}" fill="${color}"/>`);
      else if (ch === "■" || ch === "□") {
        const s = cell * 0.62;
        out.push(`<rect x="${n(x + (cell - s) / 2)}" y="${n(cy - s / 2)}" width="${n(s)}" height="${n(s)}" ${ch === "■" ? `fill="${color}"` : `fill="none" stroke="${color}" stroke-width="1.2"`}/>`);
      } else if (ch === "·") out.push(`<circle cx="${n(x + cell / 2)}" cy="${n(cy)}" r="1.25" fill="${color}"/>`);
      else if (ch === "▕") out.push(`<rect x="${n(x + cell - 1.6)}" y="${n(top + 2)}" width="1.6" height="${n(row - 4)}" fill="${color}"/>`);
      else if (ch === "┊") out.push(`<line x1="${n(x + cell / 2)}" y1="${n(top)}" x2="${n(x + cell / 2)}" y2="${n(top + row)}" stroke="${color}" stroke-width="1" stroke-dasharray="2 3"/>`);
      else if ("►◄▲▼".includes(ch)) {
        const a = cell * 0.38;
        const mx = x + cell / 2;
        const pts = {
          "►": [[mx - a, cy - a], [mx + a, cy], [mx - a, cy + a]],
          "◄": [[mx + a, cy - a], [mx - a, cy], [mx + a, cy + a]],
          "▲": [[mx - a, cy + a * 0.8], [mx, cy - a * 0.8], [mx + a, cy + a * 0.8]],
          "▼": [[mx - a, cy - a * 0.8], [mx, cy + a * 0.8], [mx + a, cy - a * 0.8]]
        }[ch];
        out.push(`<polygon points="${pts.map(([px, py]) => `${n(px)},${n(py)}`).join(" ")}" fill="${color}"/>`);
      } else if (box) out.push(boxLines(box, x, top, cell, row, color));
    });
    flush();
  });

  return { svg: out.join(""), defs: [...patterns.values()].join(""), width: cols * cell, height: lines.length * row };
}

function boxLines({ w, d: [u, r, dn, l] }, x, top, cell, row, color) {
  const cx = x + cell / 2;
  const cy = top + row / 2;
  const edge = { u: top, d: top + row, l: x, r: x + cell };
  if (w !== 3) {
    const sw = w === 2 ? 2.6 : 1.3;
    const seg = [];
    if (u) seg.push(`M${n(cx)} ${n(cy)}V${n(edge.u)}`);
    if (dn) seg.push(`M${n(cx)} ${n(cy)}V${n(edge.d)}`);
    if (l) seg.push(`M${n(cx)} ${n(cy)}H${n(edge.l)}`);
    if (r) seg.push(`M${n(cx)} ${n(cy)}H${n(edge.r)}`);
    return `<path d="${seg.join("")}" stroke="${color}" stroke-width="${sw}" stroke-linecap="square" fill="none"/>`;
  }
  // Double lines: per quadrant, an L where both its sides are present, or a straight run past the
  // centre where only one is, so corners, tees and crossings all close cleanly.
  const dd = 1.9;
  const has = { u, d: dn, l, r };
  const seg = [];
  for (const [v, sy] of [["u", -1], ["d", 1]]) {
    for (const [h, sx] of [["l", -1], ["r", 1]]) {
      const px = cx + sx * dd;
      const py = cy + sy * dd;
      if (has[v] && has[h]) seg.push(`M${n(px)} ${n(edge[v])}V${n(py)}H${n(edge[h])}`);
      else if (has[v]) seg.push(`M${n(px)} ${n(edge[v])}V${n(cy - sy * dd)}`);
      else if (has[h]) seg.push(`M${n(edge[h])} ${n(py)}H${n(cx - sx * dd)}`);
    }
  }
  return `<path d="${seg.join("")}" stroke="${color}" stroke-width="1.2" fill="none"/>`;
}

/**
 * A spec as a standalone SVG: title, the figure on a panel, the source. Options:
 * theme (paper | ink | phosphor | gilt), cell and row size in px, frame: false for the figure alone.
 */
export function renderSvg(spec, { theme = "paper", cell = 10, row = 22, frame = true } = {}) {
  const def = resolve(spec);
  const c = palette(theme);
  const text = body(spec);
  const padX = SPACING.figurePadX;
  const padY = SPACING.figurePadY;
  const titleH = frame && spec.title ? 48 : 0;
  const intentH = frame && spec.intent ? 26 : 0;
  const sourceH = frame && spec.source ? 34 : 0;
  const fig = figureSvg(text, { colors: c, cell, row, x0: padX * 2, y0: padY + titleH + intentH + padY });
  const width = Math.max(fig.width + padX * 4, frame && spec.title ? spec.title.length * 11 + padX * 2 : 0);
  const panelTop = padY + titleH + intentH;
  const panelH = fig.height + padY * 2;
  const height = panelTop + panelH + sourceH + padY;
  const font = `font-family="Menlo, 'DejaVu Sans Mono', Consolas, monospace" font-size="${n(row * 0.66)}"`;
  const sans = `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label(spec))}">
<title>${esc(spec.title ?? def.label)}</title>
<defs>${fig.defs}</defs>
<rect width="100%" height="100%" fill="${c.bg}"/>
${frame && spec.title ? `<text x="${padX}" y="${padY + 26}" ${sans} font-size="22" font-weight="600" fill="${c.ink}">${esc(spec.title)}</text>` : ""}
${frame && spec.intent ? `<text x="${padX}" y="${padY + titleH + 14}" ${sans} font-size="15" fill="${c.muted}">${esc(spec.intent)}</text>` : ""}
<rect x="${padX}" y="${panelTop}" width="${width - padX * 2}" height="${panelH}" rx="6" fill="${c.panel}"/>
<g ${font}>${fig.svg}</g>
${frame && spec.source ? `<text x="${padX}" y="${panelTop + panelH + 24}" ${sans} font-size="12.5" fill="${c.muted}">Source: ${esc(spec.source)}</text>` : ""}
</svg>
`;
}
