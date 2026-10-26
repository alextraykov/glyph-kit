// Wireframe primitives: one control or line each. Every function returns the lines it occupies
// inside a frame of `w` cells. Screens, pages, components and layers all draw with these.
import { upper } from "../text.mjs";
import { center, cut, len, padEnd, padStart, wrap } from "../core.mjs";

/** One button as text: [[ primary ]], [ plain ], [ disabled ]░. */
export const buttonText = (b) => (b.primary ? `[[ ${b.label} ]]` : b.disabled ? `[ ${b.label} ]░` : `[ ${b.label} ]`);
/** A row of buttons, two cells apart. */
export const buttonsText = (items = []) => items.map(buttonText).join("  ");

/** Left text and right text on one line of `w` cells. The left side gives way first, and keeps two
 *  cells clear of the right; a right side wider than the line is cut. */
export function barLine(left, right, w) {
  const r = len(right) > w ? cut(right, w) : String(right ?? "");
  if (!r) return cut(left, w);
  const room = w - len(r) - 2;
  if (room < 1) return padStart(r, w);
  return padEnd(cut(left, room), w - len(r)) + r;
}

/**
 * The primitives. Each returns the lines it occupies inside a frame of `w` characters.
 * Every row may carry `note: "1"`; the marker [1] is drawn outside the frame.
 */
export const PRIMITIVES = {
  heading: (r, w, lang) => [cut(upper(r.text, lang), w)],
  text: (r, w) => wrap(r.text, w),
  muted: (r, w) => wrap(r.text, w).map((l) => l), // shown in the text form as plain text; the HTML form greys it
  input: (r, w) => {
    const label = r.label ? padEnd(r.label, r.labelWidth ?? Math.min(14, len(r.label) + 2)) : "";
    const room = Math.max(4, w - len(label) - 2);
    const value = cut(r.value ?? r.placeholder ?? "", room);
    return [`${label}[${value + "_".repeat(Math.max(0, room - len(value)))}]`];
  },
  search: (r, w) => {
    const hint = r.hint ?? "";
    return [`> ${padEnd(r.placeholder ?? "Search", w - 2 - len(hint))}${hint}`];
  },
  buttons: (r, w) => {
    const text = buttonsText(r.items);
    return [r.align === "right" ? padStart(text, w) : text];
  },
  checkbox: (r) => [`[${r.checked ? "x" : " "}] ${r.label}`],
  radio: (r) => [r.options.map((o) => `(${o === r.selected ? "x" : " "}) ${o}`).join("   ")],
  toggle: (r, w) => {
    const sw = r.on ? "[ ■] on " : "[■ ] off";
    return [`${padEnd(r.label, w - len(sw))}${sw}`];
  },
  select: (r, w) => {
    const label = r.label ? `${r.label}  ` : "";
    return [`${label}[ ${padEnd(r.value, Math.max(6, w - len(label) - 5))} ▼]`];
  },
  tabs: (r) => {
    const cells = r.items.map((t) => ` ${t} `);
    const top = cells.join("│");
    const under = cells.map((c, i) => (r.items[i] === r.selected ? "━".repeat(len(c)) : " ".repeat(len(c)))).join(" ");
    return [top, under];
  },
  list: (r, w) => {
    const items = r.items.map((it) => (typeof it === "string" ? { text: it } : it));
    const scroll = r.scroll ?? items.length > 4;
    const room = w - (scroll ? 2 : 0);
    const lines = items.map((it) => {
      const mark = it.selected ? "█" : it.disabled ? "░" : " ";
      const meta = it.meta ?? "";
      return `${mark} ${padEnd(cut(it.text, room - 2 - len(meta)), room - 2 - len(meta))}${meta}`;
    });
    if (!scroll) return lines;
    return lines.map((l, i) => `${l} ${i === 0 ? "▲" : i === lines.length - 1 ? "▼" : i === 1 ? "■" : "▒"}`);
  },
  table: (r, w) => {
    const cols = r.columns.length;
    const cw = Math.floor((w - (cols - 1)) / cols);
    const fmt = (cells) => cells.map((c) => padEnd(cut(String(c), cw), cw)).join(" ");
    return [fmt(r.columns), "─".repeat(w), ...r.rows.map(fmt)];
  },
  image: (r, w) => {
    const h = r.height ?? 3;
    const label = cut(`[ ${r.label ?? "image"} ]`, w);
    return Array.from({ length: h }, (_, i) => (i === Math.floor(h / 2) ? center(label, w, "░") : "░".repeat(w)));
  },
  skeleton: (r, w) => Array.from({ length: r.lines ?? 3 }, (_, i) => "░".repeat(Math.max(4, Math.round(w * [0.9, 0.7, 0.8, 0.5][i % 4])))),
  empty: (r, w) => {
    const lines = ["", ...wrap(r.text, w - 4).map((l) => center(l, w))];
    if (r.action) lines.push("", center(`[[ ${r.action} ]]`, w));
    return [...lines, ""];
  },
  bar: (r, w) => [barLine(r.left ?? "", r.right ?? buttonsText(r.actions), w)],
  space: () => [""],
  // A labelled divider is a light rule with its label in the middle, inside the frame.
  divider: (r, w) => [r.label ? center(` ${cut(r.label, Math.max(1, w - 6))} `, w, "─") : "\u0000divider"]
};
