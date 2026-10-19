import { upper } from "../text.mjs";
import { motionFlow, motionBranchFlow, motionStateMachine, motionJourneyMap } from "../motion/flows.mjs";
// UX flows: linear and branching flows, state machines, journey maps, sitemaps.
import { checks } from "../guard.mjs";
import { BOX, cut, flow, join, len, padEnd, textCells, tree, wrap } from "../core.mjs";
import { LAYOUT, capRows, fitLabels } from "../layout.mjs";

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
  const textOf = (s) => cut(s.type === "decision" ? `${s.label}?` : s.label, maxText);
  const longest = Math.min(maxText, Math.max(...steps.map((s) => len(textOf(s)))));
  const W = longest + pad * 2 + 2;
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
    const lines = wrap(textOf(s), W - 2 - pad * 2);
    const height = frame(r, 0, W, lines, style, !last);
    if (decision && s.no) {
      const arrow = `${"─".repeat(gap)} no ${"─".repeat(gap)}►`;
      const side = [cut(s.no.label, maxText), ...(s.no.to ? [cut(`→ ${s.no.to}`, maxText)] : [])];
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
export function journeyMap(stages, { colWidth: preferred = 18, maxWidth = LAYOUT.maxWidth, lang } = {}) {
  const labelW = 9;
  const available = Math.floor((maxWidth - labelW) / Math.max(1, stages.length));
  if (available < 10) throw new Error(`A journey map fits at most ${Math.floor((maxWidth - labelW) / 10)} stages at ${maxWidth} cells; this one has ${stages.length}.`);
  const colWidth = Math.min(preferred, available);
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
    summary: (s) => s.map((x) => (x.type === "decision" ? `${x.label}? if not, ${x.no?.label ?? "stop"}` : x.label)).join(", then ")
  },
  stateMachine: {
    label: "State machine",
    normalize: (data) => Array.isArray(data) ? data : data.transitions.map((transition) => ({ ...transition, event: transition.event ?? transition.label ?? "" })),
    render: stateMachine,
    summary: (t) => t.map((x) => `${x.from} goes to ${x.to} on ${x.event}`).join(". ")
  },
  journeyMap: { label: "Journey map",
    check: (d) => [checks.within(d, "feeling", -2, 2, "feeling")], render: journeyMap, summary: (s) => s.map((x) => `${x.label}: ${x.doing}`).join(". ") },
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

kinds.flow.motion = (data, options) => motionFlow(data, options, kinds.flow.render);
kinds.branchFlow.motion = (data, options) => motionBranchFlow(data, options, kinds.branchFlow.render);
kinds.stateMachine.motion = (data, options) => motionStateMachine(data, options, kinds.stateMachine.render);
kinds.journeyMap.motion = (data, options) => motionJourneyMap(data, options, kinds.journeyMap.render);
