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

// ── Building a view in ───────────────────────────────────────────────────────────────────────────
// The site's motion vocabulary, per character: lines and frames draw on, words scramble through
// the ramp and settle, numbers count up, and bars grow cell by cell (░ → ▒ → solid), outward from
// a centre line where there is one. Each mark changes in steps; start times across the box follow
// a curve in reading order, the same left-to-right sweep as the press.
export const RAMP = " .:+*#%@";
export const BUILD_STEP = 40;
const BLOCKS = "█▓▒░▀▄▌▐▏▎▍▋▊▉▁▂▃▅▆▇■";
const LINES = "─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬╭╮╰╯┄┆╎┊╷╵▕·►◄▲▼→↺";
const AXIS = "|│┊╎";
const COUNT_STEPS = 14;
const curve = (x) => (x >= 1 ? 1 : (1 - Math.pow(2, -8 * x)) / (1 - Math.pow(2, -8)));
const scrambleGlyph = (r, c, k) => RAMP[1 + ((r * 31 + c * 17 + k * 7) % (RAMP.length - 1))];

/** Plan how a box builds in: for every cell, what kind of mark it is and when it starts (ms). */
export function planBuild(box) {
  const H = box.ch.length;
  const W = box.ch[0]?.length ?? 0;
  const at = (r, c) => curve(Math.min(1, (c / Math.max(1, W)) * 0.7 + (r / Math.max(1, H)) * 0.3));
  const plan = Array.from({ length: H }, () => Array(W).fill(null));
  let total = 0;
  const end = (ms) => (total = Math.max(total, ms));

  box.ch.forEach((row, r) => {
    const line = row.join("");
    // Quantities count up, keeping their width, commas and decimals. Small whole numbers are labels
    // (note markers, steps), so they scramble in like words instead.
    for (const m of line.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
      const raw = m[0];
      if (!raw.includes(".") && Number(raw.replace(/,/g, "")) < 10) continue;
      const tok = {
        len: raw.length,
        value: Number(raw.replace(/,/g, "")),
        decimals: raw.includes(".") ? raw.split(".")[1].length : 0,
        grouped: raw.includes(","),
        d: 240 + at(r, m.index) * 620
      };
      for (let k = 0; k < raw.length; k++) plan[r][m.index + k] = { kind: "num", tok, k };
      end(tok.d + COUNT_STEPS * BUILD_STEP);
    }
    // Runs of blocks grow along the row, away from a centre line when they touch one.
    for (let c = 0; c < W; ) {
      if (!BLOCKS.includes(row[c]) || plan[r][c]) {
        c++;
        continue;
      }
      let e = c;
      while (e < W && BLOCKS.includes(row[e])) e++;
      const towardsLeft = AXIS.includes(row[e] ?? "");
      const len = e - c;
      const d0 = 280 + at(r, towardsLeft ? e : c) * 480;
      for (let j = 0; j < len; j++) {
        const step = towardsLeft ? len - 1 - j : j;
        plan[r][c + j] = { kind: "block", d: d0 + step * 14 };
        end(d0 + step * 14 + 2 * BUILD_STEP);
      }
      c = e;
    }
    row.forEach((ch, c) => {
      if (ch === " " || plan[r][c]) return;
      if (LINES.includes(ch)) {
        plan[r][c] = { kind: "line", d: at(r, c) * 560 };
        end(plan[r][c].d + BUILD_STEP);
      } else {
        plan[r][c] = { kind: "text", d: 120 + at(r, c) * 700 };
        end(plan[r][c].d + 3 * BUILD_STEP);
      }
    });
  });
  return { plan, total };
}

const format = (tok, v) => {
  const s = tok.grouped ? v.toLocaleString("en-US", { minimumFractionDigits: tok.decimals, maximumFractionDigits: tok.decimals }) : v.toFixed(tok.decimals);
  return s.length >= tok.len ? s.slice(-tok.len) : " ".repeat(tok.len - s.length) + s;
};

/** One frame of a box building in, t ms after it started. */
export function buildFrame(box, { plan }, t) {
  const ch = box.ch.map((row) => row.map(() => " "));
  const cl = box.cl.map((row) => row.map(() => ""));
  plan.forEach((row, r) =>
    row.forEach((p, c) => {
      if (!p) return;
      const final = box.ch[r][c];
      const k = Math.floor((t - (p.kind === "num" ? p.tok.d : p.d)) / BUILD_STEP);
      if (k < 0) return;
      let out = final;
      if (p.kind === "line") out = k === 0 ? "·" : final;
      else if (p.kind === "block") out = final === "░" || k >= 2 ? final : k === 0 ? "░" : "▒";
      else if (p.kind === "text") out = k < 3 ? scrambleGlyph(r, c, k) : final;
      else if (p.kind === "num") {
        const progress = Math.min(1, k / COUNT_STEPS);
        const v = progress >= 1 ? p.tok.value : Number((p.tok.value * progress).toFixed(p.tok.decimals));
        out = format(p.tok, v)[p.k];
      }
      ch[r][c] = out;
      cl[r][c] = box.cl[r][c];
    })
  );
  return { ch, cl };
}

/** An empty box of the same size: what shows before the first view builds. */
export const blank = (box) => ({ ch: box.ch.map((row) => row.map(() => " ")), cl: box.cl.map((row) => row.map(() => "")) });
