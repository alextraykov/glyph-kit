// Motion: intent, timing, transitions, choreography, frames and easing tokens.
import { checks } from "../guard.mjs";
import { BOX, EASINGS, clamp, cut, gantt, join, len, padEnd, padStart, ruler, velocity } from "../core.mjs";
import { LAYOUT, capRows, fitLabels, stack } from "../layout.mjs";
import { framesAtTime, readingOrder, rulerFill, speedOverTime, timeline } from "../arrive.mjs";

const bez = (p1, p2, t) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
/** Progress (0..1, may overshoot) of a cubic-bezier at time x (0..1). */
export function progressAt(curve, x) {
  const [x1, y1, x2, y2] = typeof curve === "string" ? EASINGS[curve] : curve;
  let lo = 0;
  let hi = 1;
  let t = x;
  for (let i = 0; i < 40; i++) {
    t = (lo + hi) / 2;
    if (bez(x1, x2, t) < x) lo = t;
    else hi = t;
  }
  return bez(y1, y2, t);
}

const curveText = (c) => (typeof c === "string" ? c : `cubic-bezier(${c.join(", ")})`);

/** Duration ruler and speed glyph per row. rows: [{ label, ms, easing, easingName? }] */
export function motionTiming(rows, { maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(rows);
  const labels = fitLabels(capped.rows.map((r) => r.label));
  const labelW = Math.max(0, ...labels.map(len));
  const names = capped.rows.map((r) => cut(r.easingName ?? curveText(r.easing), 18));
  const nameW = Math.max(0, ...names.map(len));
  const rulerWidth = Math.max(8, Math.min(20, maxWidth - labelW - nameW - 26));
  // A blank row between tracks, so each ruler and speed curve reads on its own.
  const tracks = capped.rows.map(
    (r, i) => `${padEnd(labels[i], labelW)}  ▕${ruler(r.ms, { cells: rulerWidth })}▏  ${padStart(String(r.ms), 4)}ms   ${padEnd(names[i], nameW)}   ${velocity(r.easing)}`
  );
  return join([
    `${" ".repeat(labelW + 2)}${padEnd("duration", rulerWidth + 2)}  ${" ".repeat(6)}   ${padEnd("easing", nameW)}   speed`,
    "",
    ...stack(tracks),
    ...(capped.note ? [capped.note] : []),
    "",
    `${" ".repeat(labelW + 2)} ${cut("0·········250········500ms", maxWidth - labelW - 3)}`
  ]);
}

/**
 * Motion intent: why it moves, what starts it, what changes, and what reduced motion shows instead.
 * { name, purpose, trigger, from, to, ms, easing, easingName?, reduced }
 */
export function intentCard(m, { width = 56 } = {}) {
  const b = BOX.light;
  const inner = width - 4;
  const field = (k, v) => `${padEnd(k, 10)}${v}`;
  const rows = [
    field("why", m.purpose),
    field("when", m.trigger),
    field("change", `${m.from} → ${m.to}`),
    field("timing", `▕${ruler(m.ms)}▏ ${m.ms}ms`),
    field("easing", `${velocity(m.easing)}  ${m.easingName ?? curveText(m.easing)}`),
    field("reduced", m.reduced)
  ].flatMap((r) => {
    const out = [];
    let rest = r;
    while (len(rest) > inner) {
      const cut = rest.lastIndexOf(" ", inner);
      out.push(rest.slice(0, cut > 10 ? cut : inner));
      rest = " ".repeat(10) + rest.slice(cut > 10 ? cut + 1 : inner);
    }
    return [...out, rest];
  });
  const title = ` ${cut(m.name, width - 6)} `;
  return [
    b.tl + b.h + title + b.h.repeat(Math.max(0, width - 3 - len(title))) + b.tr,
    ...rows.map((r) => `${b.v} ${padEnd(r, inner)} ${b.v}`),
    b.bl + b.h.repeat(width - 2) + b.br
  ].join("\n");
}

/** One transition, property by property. tracks: [{ property, from, to, start, end }] in ms. */
export function transitionSpec(tracks, { width = 30, maxWidth = LAYOUT.maxWidth } = {}) {
  const capped = capRows(tracks);
  tracks = capped.rows;
  const scale = Math.max(...tracks.map((t) => t.end));
  const chart = gantt(
    tracks.map((t) => ({ label: t.property, start: t.start, end: t.end })),
    { scale, width, airy: false }
  ).split("\n");
  const rowW = Math.max(...chart.slice(0, -1).map(len));
  return join([
    ...stack(tracks.map((t, i) => {
      const room = Math.floor((maxWidth - rowW - 6) / 2);
      if (room < 1) throw new Error("Use shorter transition labels to leave room for the values.");
      return `${padEnd(chart[i], rowW)}   ${cut(String(t.from), room)} → ${cut(String(t.to), room)}`;
    })),
    ...(capped.note ? [capped.note] : []),
    chart.at(-1)
  ]);
}

/**
 * A staggered entrance. { count, duration, delay, curve? } — with `curve`, delays follow it
 * (bunched at the start for an ease-out), otherwise they are evenly spaced.
 */
/** When each item starts, in ms: evenly spaced, or along `curve` when one is given. */
export const staggerStarts = ({ count, delay, curve }) =>
  Array.from({ length: count }, (_, i) => Math.round(curve && count > 1 ? progressAt(curve, i / (count - 1)) * delay * (count - 1) : i * delay));

export function stagger({ count, duration, delay, curve, label = "item" }, { width = 40 } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > LAYOUT.rowsMax) throw new Error(`A stagger supports between 1 and ${LAYOUT.rowsMax} items.`);
  const starts = staggerStarts({ count, delay, curve });
  const tracks = starts.map((s, i) => ({ label: `${label} ${i + 1}`, start: s, end: s + duration }));
  return join([
    gantt(tracks, { scale: Math.max(...tracks.map((t) => t.end)), width }),
    "",
    `${count} × ${duration}ms, ${curve ? `delays follow ${curveText(curve)}` : `${delay}ms apart`}. Done at ${Math.max(...tracks.map((t) => t.end))}ms.`
  ]);
}

/** Where an element is on each frame. { frames, easing, width? } Equal time between rows. */
export function filmstrip({ frames = 8, easing = "ease-out", ms }, { width = 32 } = {}) {
  if (!Number.isInteger(frames) || frames < 1 || frames > LAYOUT.rowsMax) throw new Error(`A filmstrip supports between 1 and ${LAYOUT.rowsMax} frames.`);
  const rows = Array.from({ length: frames + 1 }, (_, i) => {
    const p = progressAt(easing, i / frames);
    const at = clamp(Math.round(p * (width - 1)), 0, width + 2);
    const track = Array(width).fill("·");
    if (at < width) track[at] = "█";
    const time = ms ? `${Math.round((ms * i) / frames)}ms` : `f${i}`;
    return `${padStart(time, 6)}  ${track.join("")}${at >= width ? "█ overshoot" : ""}`;
  });
  return join([...rows, `${" ".repeat(8)}start${" ".repeat(Math.max(1, width - 8))}end`]);
}

/** Easing tokens with their speed glyph. tokens: [{ name, curve, use }] */
export function easingTable(tokens) {
  const capped = capRows(tokens);
  const names = fitLabels(capped.rows.map((t) => t.name));
  const curves = capped.rows.map((t) => cut(curveText(t.curve), 32));
  const nameW = Math.max(0, ...names.map(len));
  const curveW = Math.max(0, ...curves.map(len));
  const speedW = len(velocity(capped.rows[0]?.curve));
  const useW = Math.max(4, LAYOUT.maxWidth - nameW - speedW - curveW - 9);
  // A header names the speed curve, and a blank row sits between tokens so the curves don't touch.
  const head = `${padEnd("token", nameW)}   ${padEnd("speed", speedW)}   ${padEnd("curve", curveW)}   use for`;
  const lines = capped.rows.map((t, i) => `${padEnd(names[i], nameW)}   ${velocity(t.curve)}   ${padEnd(curves[i], curveW)}   ${cut(t.use ?? "", useW)}`);
  return join([head, "", ...stack(lines), ...(capped.note ? [capped.note] : [])]);
}

export const kinds = {
  motionTiming: { label: "Motion timing",
    check: (d) => [checks.notNegative(d, "ms", "duration")], render: motionTiming, arrive: (lines) => rulerFill(lines), summary: (r) => r.map((x) => `${x.label}: ${x.ms}ms`).join(". ") },
  intentCard: {
    label: "Motion intent",
    render: intentCard,
    // The card reads in order; then its timing ruler fills over the real duration.
    arrive: (lines) => { const read = readingOrder(lines); return rulerFill(lines, { base: (r, col, ch) => read(r, col, ch) }); },
    summary: (m) => `${m.purpose}. ${m.trigger}. ${m.ms}ms. Reduced motion: ${m.reduced}`
  },
  transitionSpec: {
    label: "Transition spec",
    check: (d) => [checks.notNegative(d, "start"), checks.ordered(d, ["start", "end"], "it should end after it starts")],
    render: transitionSpec,
    arrive: timeline,
    summary: (t) => t.map((x) => `${x.property} ${x.from} to ${x.to}, ${x.start} to ${x.end}ms`).join(". ")
  },
  stagger: { label: "Stagger", render: stagger, arrive: timeline, summary: (s) => `${s.count} items, ${s.duration}ms each.` },
  filmstrip: { label: "Frame strip", render: filmstrip, arrive: framesAtTime, summary: (f) => `Position on each of ${f.frames} frames with ${curveText(f.easing ?? "ease-out")}.` },
  easingTable: { label: "Easing tokens", render: easingTable, arrive: (lines) => speedOverTime(lines), summary: (t) => t.map((x) => x.name).join(", ") }
};

