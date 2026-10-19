// Wireframes: a screen built from a layout spec, using a small primitive vocabulary.
// The same primitive names map to real components in design-system.map.json (see reference/spec.md).
import { BOX, center, join, len, padEnd, padStart, wrap } from "../core.mjs";

/**
 * The primitives. Each returns the lines it occupies inside a frame of `w` characters.
 * Every row may carry `note: "1"`; the marker [1] is drawn outside the frame.
 */
export const PRIMITIVES = {
  heading: (r, w) => [r.text.toUpperCase().slice(0, w)],
  text: (r, w) => wrap(r.text, w),
  muted: (r, w) => wrap(r.text, w).map((l) => l), // shown in the text form as plain text; the HTML form greys it
  input: (r, w) => {
    const label = r.label ? padEnd(r.label, r.labelWidth ?? Math.min(14, len(r.label) + 2)) : "";
    const room = Math.max(4, w - len(label) - 2);
    const value = r.value ?? r.placeholder ?? "";
    return [`${label}[${[...(value + "_".repeat(room))].slice(0, room).join("")}]`];
  },
  search: (r, w) => {
    const hint = r.hint ?? "";
    return [`> ${padEnd(r.placeholder ?? "Search", w - 2 - len(hint))}${hint}`];
  },
  buttons: (r, w) => {
    const parts = r.items.map((b) => (b.primary ? `[[ ${b.label} ]]` : b.disabled ? `[ ${b.label} ]░` : `[ ${b.label} ]`));
    const text = parts.join("  ");
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
      return `${mark} ${padEnd(it.text, room - 2 - len(meta))}${meta}`;
    });
    if (!scroll) return lines;
    return lines.map((l, i) => `${l} ${i === 0 ? "▲" : i === lines.length - 1 ? "▼" : i === 1 ? "■" : "▒"}`);
  },
  table: (r, w) => {
    const cols = r.columns.length;
    const cw = Math.floor((w - (cols - 1)) / cols);
    const fmt = (cells) => cells.map((c) => padEnd(String(c).slice(0, cw), cw)).join(" ");
    return [fmt(r.columns), "─".repeat(w), ...r.rows.map(fmt)];
  },
  image: (r, w) => {
    const h = r.height ?? 3;
    const label = `[ ${r.label ?? "image"} ]`;
    return Array.from({ length: h }, (_, i) => (i === Math.floor(h / 2) ? center(label, w, "░") : "░".repeat(w)));
  },
  skeleton: (r, w) => Array.from({ length: r.lines ?? 3 }, (_, i) => "░".repeat(Math.max(4, Math.round(w * [0.9, 0.7, 0.8, 0.5][i % 4])))),
  empty: (r, w) => {
    const lines = ["", ...wrap(r.text, w - 4).map((l) => center(l, w))];
    if (r.action) lines.push("", center(`[[ ${r.action} ]]`, w));
    return [...lines, ""];
  },
  space: () => [""],
  divider: () => ["\u0000divider"]
};

/**
 * A screen in a double-line frame. spec: { title, width?, rows: [{ type, …, note? }], overlay? }
 * overlay: { title, rows } draws a dialog over a ░ dimmer.
 * Notes: rows with `note` get a marker outside the frame; spec.notes: { "1": "text" } are listed below.
 */
export function screen(spec, { width } = {}) {
  const W = spec.width ?? width ?? 46;
  const inner = W - 4;
  const b = BOX.double;
  const marks = [];
  const body = [];
  for (const row of spec.rows) {
    const draw = PRIMITIVES[row.type];
    if (!draw) throw new Error(`Unknown wireframe primitive: ${row.type}`);
    draw(row, inner).forEach((line, i) => {
      body.push(line);
      marks.push(i === 0 && row.note ? `[${row.note}]` : "");
    });
  }
  const title = spec.title ? `${b.h} ${spec.title} ` : "";
  let lines = [b.tl + title + b.h.repeat(Math.max(0, W - 2 - len(title))) + b.tr];
  body.forEach((line) => {
    if (line === "\u0000divider") lines.push(b.lt + b.h.repeat(W - 2) + b.rt);
    else lines.push(`${b.v} ${padEnd([...line].slice(0, inner).join(""), inner)} ${b.v}`);
  });
  lines.push(b.bl + b.h.repeat(W - 2) + b.br);
  if (spec.overlay) lines = overlay(lines, spec.overlay, W);
  const withMarks = lines.map((l, i) => (marks[i - 1] ? `${l} ${marks[i - 1]}` : l));
  const notes = Object.entries(spec.notes ?? {}).map(([k, v]) => `[${k}] ${v}`);
  return join(notes.length ? [...withMarks, "", ...notes] : withMarks);
}

function overlay(lines, dialog, W) {
  const dw = Math.min(W - 8, dialog.width ?? 30);
  const box = screen({ title: dialog.title, width: dw, rows: dialog.rows }).split("\n").map((l) => l.replace(/═/g, "─").replace(/║/g, "│").replace(/[╔╗╚╝]/g, (c) => ({ "╔": "┌", "╗": "┐", "╚": "└", "╝": "┘" })[c]).replace(/[╠╣]/g, (c) => (c === "╠" ? "├" : "┤")));
  const top = Math.max(1, Math.floor((lines.length - box.length) / 2));
  const left = Math.floor((W - dw) / 2);
  return lines.map((line, i) => {
    if (i === 0 || i === lines.length - 1) return line;
    const chars = [...line];
    for (let c = 1; c < W - 1; c++) chars[c] = "░";
    const bi = i - top;
    if (bi >= 0 && bi < box.length) [...box[bi]].forEach((ch, k) => (chars[left + k] = ch));
    return chars.join("");
  });
}

/** Two screens side by side, labelled, e.g. desktop and mobile. screens: [{ label, spec }] */
export function responsive(screens, { gap = 4 } = {}) {
  const drawn = screens.map((s) => [s.label, ...screen(s.spec).split("\n")]);
  const widths = drawn.map((d) => Math.max(...d.map(len)));
  const h = Math.max(...drawn.map((d) => d.length));
  return join(
    Array.from({ length: h }, (_, i) => drawn.map((d, k) => padEnd(d[i] ?? "", widths[k])).join(" ".repeat(gap)))
  );
}

export const kinds = {
  screen: {
    label: "Screen wireframe",
    render: screen,
    summary: (s) => `${s.title ?? "Screen"}: ${s.rows.map((r) => r.type).join(", ")}${s.overlay ? `, with a ${s.overlay.title} dialog over it` : ""}.`
  },
  responsive: {
    label: "Responsive pair",
    render: responsive,
    summary: (s) => s.map((x) => `${x.label}: ${x.spec.rows.map((r) => r.type).join(", ")}`).join(". ")
  }
};
