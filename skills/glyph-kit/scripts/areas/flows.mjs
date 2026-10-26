import { Grid } from "../live/grid.mjs";
import { upper } from "../text.mjs";
// UX flows: linear and branching flows, state machines, journey maps, sitemaps.
import { checks } from "../guard.mjs";
import { BOX, cut, flow, join, len, padEnd, textCells, tree, wrap } from "../core.mjs";
import { LAYOUT, capRows, fitLabels, stack } from "../layout.mjs";
import { ARRIVE_MAX, ARRIVE_STEP, byColumns } from "../arrive.mjs";

/** A decision reads as a question; a label that already ends in one keeps it. */
const asked = (label) => (/[?？]$/.test(label) ? label : `${label}?`);

/**
 * A top-to-bottom flow with decisions. Each decision can send one branch to the right.
 * steps: [{ label, type?: "step" | "decision" | "end", no?: { label, to? } }]
 * A decision's main path continues down as "yes"; `no` draws a box to the right, level with the
 * question, and `no.to` names where that branch goes next. Steps are solid frames, decisions dotted,
 * the end double. Every box on the spine shares one width, with its text centred (LAYOUT.pad).
 */
export function branchFlow(steps, { gap = 3, maxText = LAYOUT.labelMax, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(steps, LAYOUT.rowsMax, "steps");
  steps = capped.rows;
  const pad = LAYOUT.pad;
  // A label longer than maxText wraps onto more lines inside its box; only a single word wider than
  // the box is cut. Cutting every long label made agents shorten their labels and draw again.
  const textOf = (s) => (s.type === "decision" ? asked(s.label) : String(s.label ?? ""));
  const longest = Math.min(maxText, Math.max(...steps.map((s) => len(textOf(s)))));
  const W = longest + pad * 2 + 2;
  const linesOf = (text, max) => wrap(text, max).map((line) => cut(line, max));
  // A branch box may hang one row below its decision, beside the "yes" line; any taller and the
  // decision grows to match, so the branch never runs into the next step.
  const evenUp = (lines, rows) => [...lines, ...Array(Math.max(0, rows - lines.length)).fill("")];
  const spine = Math.floor((W - 1) / 2);
  const grid = [];
  const put = (r, c, str) => {
    while (grid.length <= r) grid.push([]);
    textCells(str).forEach((ch, i) => {
      while (grid[r].length < c + i) grid[r].push(" ");
      grid[r][c + i] = ch;
    });
  };
  const centre = (t, w) => {
    const left = Math.floor((w - len(t)) / 2);
    return " ".repeat(left) + t + " ".repeat(w - left - len(t));
  };
  const frame = (r, c, w, lines, style, joint) => {
    const b = style === "double" ? BOX.double : BOX.light;
    const h = style === "dotted" ? "┄" : b.h;
    const v = style === "dotted" ? "┆" : b.v;
    put(r, c, b.tl + h.repeat(w - 2) + b.tr);
    lines.forEach((t, k) => put(r + 1 + k, c, v + centre(t, w - 2) + v));
    const bottom = [...(b.bl + h.repeat(w - 2) + b.br)];
    if (joint) bottom[spine] = BOX.light.tt;
    put(r + 1 + lines.length, c, bottom.join(""));
    return lines.length + 2;
  };

  let r = 0;
  steps.forEach((s, i) => {
    const last = i === steps.length - 1;
    const decision = s.type === "decision";
    const style = decision ? "dotted" : last || s.type === "end" ? "double" : "solid";
    let lines = linesOf(textOf(s), W - 2 - pad * 2);
    let side = null;
    if (decision && s.no) {
      side = [...linesOf(s.no.label, maxText), ...(s.no.to ? linesOf(`→ ${s.no.to}`, maxText) : [])];
      lines = evenUp(lines, side.length - 1);
    }
    const height = frame(r, 0, W, lines, style, !last);
    if (side) {
      const arrow = `${"─".repeat(gap)} no ${"─".repeat(gap)}►`;
      const sw = Math.max(...side.map(len)) + pad * 2 + 2;
      if (W + len(arrow) + sw > maxWidth) throw new Error(`This branch needs ${W + len(arrow) + sw} cells; shorten the decision or branch label to fit ${maxWidth}.`);
      put(r + 1, W - 1, BOX.light.lt + arrow);
      frame(r, W + len(arrow), sw, side, "solid", false);
    }
    r += height;
    if (!last) {
      put(r, spine, decision ? `${BOX.light.v} yes` : BOX.light.v);
      put(r + 1, spine, "▼");
      r += 2;
    }
  });
  if (capped.note) put(r, 0, capped.note);
  return join(grid.map((row) => row.join("")));
}

/**
 * A state machine as its transitions, aligned in columns. transitions: [{ from, event, to }]
 * Lists every state first, so nothing unreachable hides.
 */
/** The state machine as a diagram: states in a row, the next state straight along it, every other
 *  transition on its own lane (forward above, back below), events written on their lines. Ends are
 *  double boxes. Returns null when it won't fit, and the list form is drawn instead. */
function stateDiagram(clean, states, start, dead, maxWidth) {
  const names = [start, ...states.filter((s) => s !== start)];
  const W = Math.max(11, ...names.map((n) => len(n) + 4));
  const longest = Math.max(0, ...clean.map((t) => len(t.event)));
  const GAP = Math.max(8, longest + 4);
  const xs = names.map((_, i) => i * (W + GAP));
  const cols = xs.at(-1) + W;
  if (cols > maxWidth) return null;
  const idx = (n) => names.indexOf(n);
  const mid = (i) => xs[i] + Math.floor(W / 2);
  const shape = clean.map((t) => ({ ...t, a: idx(t.from), b: idx(t.to) }));
  const ups = shape.filter((e) => e.b > e.a + 1 || (e.b === e.a + 1 && shape.some((o) => o !== e && o.a === e.a && o.b === e.b))).length;
  const downs = shape.filter((e) => e.b <= e.a).length;
  const T = ups * 2 + 2; // the box row's middle line
  let up = 0, down = 0;
  const g = new Grid(T + 3 + downs * 2 + 1, cols);
  const seen = new Set();
  shape.forEach((e) => {
    const key = `${e.a}>${e.b}`;
    if (e.b === e.a + 1 && !seen.has(key)) {
      seen.add(key);
      g.line([[T, xs[e.a] + W], [T, xs[e.b] - 1]]);
      g.label(T - 1, xs[e.a] + W, xs[e.b] - 1, cut(e.event, GAP - 2));
      return;
    }
    const forward = e.b > e.a;
    const ca = mid(e.a) + (forward ? 2 : -2), cb = mid(e.b) - (forward ? 2 : -2);
    const y = forward ? T - 3 - up++ * 2 : T + 3 + down++ * 2;
    const edge = forward ? T - 2 : T + 2;
    g.line([[edge, ca], [y, ca], [y, cb], [edge, cb]]);
    g.label(y, Math.min(ca, cb), Math.max(ca, cb), cut(` ${e.event} `, Math.abs(cb - ca) + 1));
  });
  // The start is a heavy box, ends are double boxes, every other state a light one.
  const frame = (i, [h, v, tl, tr, bl, br]) => {
    const inner = W - 2, left = Math.floor((inner - len(names[i])) / 2);
    g.text(T - 1, xs[i], `${tl}${h.repeat(inner)}${tr}`);
    g.text(T, xs[i], `${v}${" ".repeat(left)}${names[i]}${" ".repeat(inner - left - len(names[i]))}${v}`);
    g.text(T + 1, xs[i], `${bl}${h.repeat(inner)}${br}`);
  };
  names.forEach((n, i) => {
    if (n === start) frame(i, [..."━┃┏┓┗┛"]);
    else if (dead.includes(n)) frame(i, [..."═║╔╗╚╝"]);
    else g.box(T - 1, xs[i], W, n);
  });
  return g.toText().split("\n");
}

export function stateMachine(transitions, { initial, maxWidth = LAYOUT.maxWidth } = {}) {
  const partMax = Math.min(LAYOUT.labelMax, Math.floor((maxWidth - 11) / 3));
  const clean = transitions.map((t) => ({ ...t, from: cut(t.from, partMax), event: cut(t.event, partMax), to: cut(t.to, partMax) }));
  const capped = capRows(clean, LAYOUT.rowsMax, "transitions");
  const states = [...new Set(clean.flatMap((t) => [t.from, t.to]))];
  const fromW = Math.max(0, ...capped.rows.map((t) => len(t.from)));
  const evW = Math.max(0, ...capped.rows.map((t) => len(t.event)));
  const start = cut(initial ?? clean[0]?.from ?? "", partMax);
  const reachable = new Set([start]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of clean) if (reachable.has(t.from) && !reachable.has(t.to)) reachable.add(t.to), (grew = true);
  }
  const lost = states.filter((s) => !reachable.has(s));
  const dead = states.filter((s) => !clean.some((t) => t.from === s));
  if (!capped.note && states.length <= 6) {
    let diagram = null;
    try { diagram = stateDiagram(clean, states, start, dead, maxWidth); } catch { diagram = null; }
    if (diagram) return join([...diagram, "", ...wrap(`The heavy box is the start. Ends: ${dead.join(", ") || "none"}.${lost.length ? ` Unreachable: ${lost.join(", ")}.` : ""}`, maxWidth)]);
  }
  const stateText = `states  ${states.map((s) => (s === start ? `[${s}]` : s)).join(" · ")}`;
  const stateLines = len(stateText) <= maxWidth ? [stateText] : wrap(stateText, maxWidth);
  const endLines = wrap(`[ ] marks the start. Ends: ${dead.join(", ") || "none"}.${lost.length ? ` Unreachable: ${lost.join(", ")}.` : ""}`, maxWidth);
  return join([
    ...stateLines,
    "",
    ...capped.rows.map((t) => `${padEnd(t.from, fromW)} ──[ ${padEnd(t.event, evW)} ]──► ${t.to}`),
    ...(capped.note ? [capped.note] : []),
    "",
    ...endLines
  ]);
}

/**
 * Journey map: stages across, rows for what people do, think and how they feel (-2..2).
 * stages: [{ label, doing, thinking, feeling }]
 */
const journeyLabelW = 12; // "thinking" plus room before the first stage

function journeyWidth(stages, { colWidth: preferred = 18, maxWidth = LAYOUT.maxWidth } = {}) {
  const available = Math.floor((maxWidth - journeyLabelW) / Math.max(1, stages.length));
  if (available < 10) throw new Error(`A journey map fits at most ${Math.floor((maxWidth - journeyLabelW) / 10)} stages at ${maxWidth} cells; this one has ${stages.length}.`);
  return Math.min(preferred, available);
}

/** Where each stage's column starts, in cells. The stages arrive in order, evenly spaced so the last
 *  one lands within the budget, never more than 240ms apart. */
export const journeyColumns = (stages, options) => {
  const colWidth = journeyWidth(stages, options);
  const step = Math.max(2 * ARRIVE_STEP, Math.min(6 * ARRIVE_STEP, Math.floor((ARRIVE_MAX - 2 * ARRIVE_STEP) / Math.max(1, stages.length) / ARRIVE_STEP) * ARRIVE_STEP));
  return { cuts: stages.map((_, i) => journeyLabelW + i * colWidth), step };
};

export function journeyMap(stages, options = {}) {
  const { lang } = options;
  const labelW = journeyLabelW;
  const colWidth = journeyWidth(stages, options);
  const labels = fitLabels(stages.map((s) => s.label), colWidth - 1);
  const cell = (text) => wrap(text ?? "", colWidth - 2);
  const row = (name, pick) => {
    const cols = stages.map((s) => cell(pick(s)));
    const h = Math.max(...cols.map((c) => c.length));
    return Array.from({ length: h }, (_, i) =>
      padEnd(i ? "" : name, labelW) + cols.map((c) => padEnd(c[i] ?? "", colWidth)).join("")
    );
  };
  const feel = (v) => ({ 2: "▲▲ great", 1: "▲ good", 0: "· neutral", "-1": "▼ poor", "-2": "▼▼ bad" })[Math.round(v)] ?? "";
  const rule = " ".repeat(labelW) + stages.map(() => "─".repeat(colWidth - 2) + "  ").join("");
  return join([
    padEnd("STAGE", labelW) + stages.map((s, i) => padEnd(upper(labels[i], lang), colWidth)).join(""),
    rule,
    ...row("doing", (s) => s.doing),
    "",
    ...row("thinking", (s) => s.thinking && `“${s.thinking}”`),
    "",
    ...row("feeling", (s) => feel(s.feeling))
  ]);
}

export const kinds = {
  flow: { label: "Linear flow", render: (steps, o) => flow(steps, o), summary: (s) => s.join(", then ") },
  branchFlow: {
    label: "Flow with decisions",
    render: branchFlow,
    summary: (s) => s.map((x) => (x.type === "decision" ? `${asked(x.label)} if not, ${x.no?.label ?? "stop"}` : x.label)).join(", then ")
  },
  stateMachine: {
    label: "State machine",
    normalize: (data) => Array.isArray(data) ? data : data.transitions.map((transition) => ({ ...transition, event: transition.event ?? transition.label ?? "" })),
    render: stateMachine,
    summary: (t) => t.map((x) => `${x.from} goes to ${x.to} on ${x.event}`).join(". ")
  },
  journeyMap: { label: "Journey map",
    check: (d) => [checks.within(d, "feeling", -2, 2, "feeling")], render: journeyMap, arrive: (lines, data, options) => byColumns(journeyColumns(data, options)), summary: (s) => s.map((x) => `${x.label}: ${x.doing}`).join(". ") },
  tree: {
    label: "Tree or sitemap",
    render: tree,
    summary: (n) => {
      const names = [];
      const walk = (x) => (Array.isArray(x) ? x.forEach(walk) : (names.push(x.name), x.children?.forEach(walk)));
      walk(n);
      return names.join(", ");
    }
  }
};

