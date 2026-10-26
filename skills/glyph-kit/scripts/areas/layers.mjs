// Layers over a page: drawer, sheet, popover, menu, toast and dialog. Code places each one from the
// spec and the page's anchors alone, clips it, cuts covered words back to a whole word, joins its
// edge to the page's double rules and casts a ░ shadow toward the page. Every cell also gets a
// letter in the mask: p page, l layer, s shadow, so painted forms can mute the page under a layer.
import { cells, cut, padEnd, padStart, upper, width, wrap } from "../text.mjs";
import { boxLines, boxParts, pieces } from "./components.mjs";
import { buttonsText } from "./primitives.mjs";

export const LAYER_TYPES = ["drawer", "sheet", "popover", "menu", "toast", "dialog"];
/** Sizes by name, in cells at 80. A narrower page takes them down to what fits. */
export const SIZES = { drawer: { s: 24, m: 30, l: 40 }, popover: { s: 20, m: 26, l: 32 }, dialog: { s: 32, m: 40, l: 52 } };
/** Cells of page a drawer always leaves beside it. */
export const PAGE_BESIDE = 20;
const STRUCT = "─│┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬░▒▓█▲▼◄►";
const wordCh = (ch) => ch === "" || (ch != null && ch !== " " && !STRUCT.includes(ch));

/** The cells a layer of this type takes across, at page width W. */
export function layerWidth(layer, W) {
  const size = layer.size ?? "m";
  if (layer.type === "drawer") return layer.width ?? Math.max(16, Math.min(SIZES.drawer[size] ?? SIZES.drawer.m, W - PAGE_BESIDE - 4));
  if (layer.type === "popover") return layer.width ?? Math.min(SIZES.popover[size] ?? SIZES.popover.m, W - 6);
  if (layer.type === "dialog") return layer.width ?? Math.min(SIZES.dialog[size] ?? SIZES.dialog.m, W - 8);
  if (layer.type === "menu") {
    const items = (layer.items ?? []).filter((it) => it !== "-").map((it) => (typeof it === "object" && it ? it : { text: String(it ?? "") }));
    return Math.min(W - 6, Math.max(12, ...items.map((it) => width(it.text ?? "") + (it.meta ? width(it.meta) + 4 : 0) + 6)));
  }
  return 0;
}

/** A menu as a light box: one item a row, "-" a rule, meta at the right. */
function menuBox(items, w) {
  const out = ["┌" + "─".repeat(w - 2) + "┐"];
  for (const raw of items ?? []) {
    if (raw === "-") {
      out.push("├" + "─".repeat(w - 2) + "┤");
      continue;
    }
    const it = typeof raw === "object" && raw ? raw : { text: String(raw ?? "") };
    const m = it.meta ? cut(it.meta, Math.floor((w - 4) / 3)) : "";
    const room = w - 4 - width(m) - (m ? 1 : 0);
    out.push(`│ ${padEnd(cut(it.text ?? "", room), w - 4 - width(m))}${m} │`);
  }
  out.push("└" + "─".repeat(w - 2) + "┘");
  return out;
}

/** A writing surface over the grid: cells, their mask letters, the cells this layer has written and
 *  a column and row clip, so a sliding layer stops at the frame. */
function surface(g, m, clip) {
  const mine = new Set();
  const inside = (r, c) => r >= clip.r0 && r <= clip.r1 && c >= clip.c0 && c <= clip.c1 && r >= 0 && r < g.length && c >= 0 && c < g[0].length;
  const set = (r, c, ch, letter) => {
    if (!inside(r, c)) return;
    g[r][c] = ch;
    m[r][c] = letter;
    mine.add(r * 1000 + c);
  };
  /** Write text at (r, c). A wide character the clip would halve becomes a space. */
  const put = (r, c, text, letter = "l") => {
    const cs = cells(text);
    cs.forEach((ch, k) => {
      const col = c + k;
      if (!inside(r, col)) return;
      const halved = (ch === "" && !inside(r, col - 1)) || (ch !== "" && cs[k + 1] === "" && !inside(r, col + 1));
      set(r, col, halved ? " " : ch, letter);
    });
  };
  /** Swap a page joint for another, e.g. ╦ to ═ where the rule below it is covered. */
  const joint = (r, c, swaps, letter) => {
    if (!inside(r, c) || !(g[r][c] in swaps)) return;
    set(r, c, swaps[g[r][c]], letter ?? m[r][c]);
  };
  return { put, set, joint, mine, W: g[0].length, H: g.length };
}

/** A word cut at a layer's edge goes back to its last whole word, so no stub sits against the edge. */
function cleanCuts(g, before, mine, rows) {
  const W = g[0].length;
  for (let r = rows[0]; r <= rows[1]; r++) {
    for (let c = 1; c < W - 1; c++) {
      if (!mine.has(r * 1000 + c)) continue;
      const a = c;
      let b = c;
      while (b + 1 < W - 1 && mine.has(r * 1000 + b + 1)) b++;
      if (a - 1 >= 1 && !mine.has(r * 1000 + a - 1) && wordCh(g[r][a - 1]) && wordCh(before[r][a])) for (let k = a - 1; k >= 1 && wordCh(g[r][k]) && !mine.has(r * 1000 + k); k--) g[r][k] = " ";
      if (b + 1 <= W - 2 && !mine.has(r * 1000 + b + 1) && wordCh(g[r][b + 1]) && wordCh(before[r][b])) for (let k = b + 1; k <= W - 2 && wordCh(g[r][k]) && !mine.has(r * 1000 + k); k++) g[r][k] = " ";
      c = b;
    }
  }
}

/** The text of a light box and its shadow, right and below (the DOS convention). */
function shadowBox(s, r0, c, box, letter = "l") {
  const w = width(box[0]);
  box.forEach((l, i) => s.put(r0 + i, c, l, letter));
  for (let i = 1; i <= box.length; i++) s.put(r0 + i, c + w, "░", "s");
  s.put(r0 + box.length, c + 1, "░".repeat(w - 1), "s");
}

// Each layer: (layer, s, ctx, step) draws itself on the surface and returns { rect } or, when the page
// is too short for it, { need: rows }. `step` > 0 draws an arrival frame: a drawer or sheet `step`
// cells or rows short of home, a popover or menu as its top edge only, a toast a row low.
const PLACE = {
  drawer(L, s, ctx, step = 0) {
    const { W, H } = s;
    const bottom = H - 1;
    const from = ctx.from;
    const w = layerWidth(L, W);
    const inner = w - 2;
    const right = (L.side ?? "right") !== "left";
    const edge = right ? W - w - 2 + step : w + 1 - step;
    const x0 = right ? edge + 1 : edge - w;
    const body = [];
    if (L.title != null && L.title !== "") body.push(`${padEnd(cut(upper(L.title, ctx.lang), inner - 2), inner - 1)}×`, "\u0000rule");
    body.push(...pieces(L.rows ?? [], inner, ctx));
    const room = bottom - from - 1;
    const need = body.length + (L.footer?.length ? 1 : 0);
    if (need > room) return { need: need - room };
    if (L.footer?.length) {
      while (body.length < room - 1) body.push("");
      body.push(padStart(cut(buttonsText(L.footer), inner), inner));
    }
    const shadow = right ? edge - 1 : edge + 1;
    for (let r = from + 1; r < bottom; r++) {
      s.put(r, shadow, "░", "s");
      s.put(r, edge, "║");
      const line = body[r - from - 1];
      if (line === "\u0000rule") right ? s.put(r, edge, "╠" + "═".repeat(w) + "╣") : s.put(r, 0, "╠" + "═".repeat(w) + "╣");
      else s.put(r, x0, ` ${padEnd(line ?? "", inner)} `);
    }
    // The edge joins the double rules it meets; page rules under the drawer stop at its edge.
    const covered = right ? [shadow, W - 2] : [1, shadow];
    for (let c = covered[0]; c <= covered[1]; c++) {
      if (c === edge) continue;
      s.joint(from, c, { "╦": "═", "╬": "╩" });
      s.joint(bottom, c, { "╩": "═" });
    }
    s.joint(from, edge, { "═": "╦", "╩": "╬", "╦": "╦", "╬": "╬" }, "l");
    s.joint(bottom, edge, { "═": "╩", "╩": "╩" }, "l");
    const home = right ? W - w - 2 : w + 1;
    return { rect: { r0: from, r1: bottom, c0: right ? home - 1 : 0, c1: right ? W - 1 : home + 1 }, travel: w + 2, axis: "x" };
  },
  sheet(L, s, ctx, step = 0) {
    const { W, H } = s;
    const bottom = H - 1;
    const body = [`${" ".repeat(Math.floor((W - 8) / 2))}━━━━`, ...pieces([...(L.title != null && L.title !== "" ? [{ type: "heading", text: L.title }] : []), ...(L.rows ?? [])], W - 4, ctx)];
    const home = bottom - body.length - 1;
    // Four rows of the page stay in view above the sheet's shadow.
    const need = ctx.from + 6 - home;
    if (need > 0) return { need };
    const top = home + step;
    s.put(top - 1, 1, "░".repeat(W - 2), "s");
    s.put(top, 0, "╠" + "═".repeat(W - 2) + "╣");
    for (let r = top + 1; r < bottom; r++) s.put(r, 1, ` ${padEnd(body[r - top - 1] ?? "", W - 4)} `);
    for (let c = 1; c < W - 1; c++) s.joint(bottom, c, { "╩": "═" });
    return { rect: { r0: home - 1, r1: bottom, c0: 0, c1: W - 1 }, travel: body.length + 2, axis: "y" };
  },
  popover(L, s, ctx, step = 0) {
    const { W, H } = s;
    const a = ctx.anchor(L.anchor);
    const w = layerWidth(L, W);
    if (w + 6 > W) throw new Error(`A popover ${w} cells wide doesn't fit beside its anchor on a ${W}-cell page. Use size s.`);
    const box = L.type === "menu" ? menuBox(L.items, w) : boxLines(boxParts(null, L.rows ?? [], w, { lang: ctx.lang, ctx }));
    const c = Math.max(2, Math.min(a.c, W - 3 - w));
    const r0 = a.r + 1;
    const need = r0 + box.length - (H - 2);
    if (need > 0) return { need };
    // ▲ points at the middle of the anchor, inside the top edge.
    const tip = Math.max(1, Math.min(w - 2, a.c + Math.floor(a.w / 2) - c));
    const top = cells(box[0]);
    top[tip] = "▲";
    box[0] = top.join("");
    if (step) s.put(r0, c, box[0]);
    else shadowBox(s, r0, c, box);
    return { rect: { r0, r1: r0 + box.length, c0: c, c1: c + w }, steps: 1 };
  },
  toast(L, s, ctx, step = 0) {
    const { W, H } = s;
    const button = L.action ? `[ ${cut(L.action, W - 16)} ]` : "";
    const one = [L.text ?? "", button].filter(Boolean).join("  ");
    const bw = Math.min(width(one) + 4, W - 6);
    // The text wraps; the button stays whole, on the last line when it fits there.
    const lines = wrap(L.text ?? "", bw - 4, ctx.lang);
    if (button && width(lines.at(-1)) + 2 + width(button) <= bw - 4) lines[lines.length - 1] = [lines.at(-1), button].filter(Boolean).join("  ");
    else if (button) lines.push(button);
    const box = boxLines(boxParts(null, lines.map((t) => ({ type: "text", text: t })), bw, { ctx }));
    const c = W - 3 - bw;
    const r0 = H - 2 - box.length;
    const need = ctx.from + 1 - r0;
    if (need > 0) return { need };
    if (step) box.forEach((l, i) => r0 + i + 1 < H - 1 && s.put(r0 + i + 1, c, l));
    else shadowBox(s, r0, c, box);
    return { rect: { r0, r1: H - 2, c0: c, c1: c + bw }, steps: 1 };
  },
  dialog(L, s, ctx) {
    const { W, H } = s;
    const w = layerWidth(L, W);
    const rows = [...(L.rows ?? []), ...(L.footer?.length ? [{ type: "space" }, { type: "bar", right: buttonsText(L.footer) }] : [])];
    const box = boxLines(boxParts(L.title, rows, w, { lang: ctx.lang, ctx }));
    const need = box.length + 4 - H;
    if (need > 0) return { need };
    // The page is dimmed: its rules give way to plain sides, so nothing reads as broken under it.
    for (let r = 1; r < H - 1; r++) {
      s.put(r, 0, "║", "p");
      s.put(r, W - 1, "║", "p");
      s.put(r, 1, "░".repeat(W - 2), "p");
    }
    for (const r of [0, H - 1]) for (let c = 1; c < W - 1; c++) s.joint(r, c, { "╦": "═", "╩": "═", "╬": "═" });
    const r0 = Math.max(1, Math.floor((H - box.length) / 2));
    const c = Math.floor((W - w) / 2);
    box.forEach((l, i) => s.put(r0 + i, c, l));
    return { rect: { r0, r1: r0 + box.length - 1, c0: c, c1: c + w - 1 }, modal: true };
  }
};
PLACE.menu = PLACE.popover;

const copy = (g) => g.map((row) => row.slice());

/**
 * Place the layers in order over a page's lines. ctx: { from, anchor(name, grid), lang }.
 * Returns { grid, mask, placed: [{ layer, rect, before, beforeMask, redraw(step) }] } or { need }.
 */
export function placeLayers(lines, layers, ctx) {
  const W = Math.max(...lines.map(width));
  let g = lines.map((l) => {
    const cs = cells(l);
    while (cs.length < W) cs.push(" ");
    return cs;
  });
  let m = g.map((row) => row.map(() => "p"));
  const placed = [];
  for (const layer of layers) {
    const before = copy(g);
    const beforeMask = copy(m);
    const draw = (gg, mm, step) => {
      // A layer on its way in stays inside the frame; at home a drawer's or sheet's rule joins it.
      const travelling = step && (layer.type === "drawer" || layer.type === "sheet");
      const s = surface(gg, mm, { r0: 0, r1: gg.length - (travelling ? 2 : 1), c0: travelling && layer.type === "drawer" ? 1 : 0, c1: W - (travelling && layer.type === "drawer" ? 2 : 1) });
      const res = PLACE[layer.type](layer, s, { ...ctx, anchor: (name) => ctx.anchor(name, before) }, step);
      if (res.rect) cleanCuts(gg, before, s.mine, [res.rect.r0, res.rect.r1]);
      return res;
    };
    const res = draw(g, m, 0);
    if (res.need) return { need: res.need };
    placed.push({
      layer,
      ...res,
      before,
      beforeMask,
      redraw: (step) => {
        const gg = copy(before);
        const mm = copy(beforeMask);
        draw(gg, mm, step);
        return { grid: gg, mask: mm };
      }
    });
  }
  return { grid: g, mask: m, placed };
}

/** Find text on the grid, cell by cell, as a whole word. Returns { r, c, w } or null. */
export function findText(g, text, { whole = true } = {}) {
  const want = cells(text);
  if (!want.length) return null;
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c + want.length <= g[r].length; c++) {
      if (!want.every((ch, k) => g[r][c + k] === ch)) continue;
      if (whole && (wordCh(g[r][c - 1]) || (wordCh(g[r][c + want.length]) && g[r][c + want.length] !== ""))) continue;
      return { r, c, w: want.length };
    }
  }
  return null;
}
