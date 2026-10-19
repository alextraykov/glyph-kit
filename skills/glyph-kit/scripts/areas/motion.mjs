// Motion: intent, timing, transitions, choreography, frames and easing tokens.
import { checks } from "../guard.mjs";
import { BOX, EASINGS, clamp, gantt, join, len, padEnd, padStart, ruler, velocity } from "../core.mjs";

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
export function motionTiming(rows) {
  const labelW = Math.max(...rows.map((r) => len(r.label)));
  const nameW = Math.max(...rows.map((r) => len(r.easingName ?? curveText(r.easing))));
  return join([
    ...rows.map(
      (r) => `${padEnd(r.label, labelW)} ▕${ruler(r.ms)}▏ ${padStart(String(r.ms), 4)}ms  ${padEnd(r.easingName ?? curveText(r.easing), nameW)}  ${velocity(r.easing)}`
    ),
    `${" ".repeat(labelW)} 0·········250········500ms`
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
  const title = ` ${m.name} `;
  return [
    b.tl + b.h + title + b.h.repeat(Math.max(0, width - 3 - len(title))) + b.tr,
    ...rows.map((r) => `${b.v} ${padEnd(r, inner)} ${b.v}`),
    b.bl + b.h.repeat(width - 2) + b.br
  ].join("\n");
}

/** One transition, property by property. tracks: [{ property, from, to, start, end }] in ms. */
export function transitionSpec(tracks, { width = 30 } = {}) {
  const scale = Math.max(...tracks.map((t) => t.end));
  const chart = gantt(
    tracks.map((t) => ({ label: t.property, start: t.start, end: t.end })),
    { scale, width }
  ).split("\n");
  const rowW = Math.max(...chart.slice(0, -1).map(len));
  return join([
    ...tracks.map((t, i) => `${padEnd(chart[i], rowW)}   ${t.from} → ${t.to}`),
    chart.at(-1)
  ]);
}

/**
 * A staggered entrance. { count, duration, delay, curve? } — with `curve`, delays follow it
 * (bunched at the start for an ease-out), otherwise they are evenly spaced.
 */
export function stagger({ count, duration, delay, curve, label = "item" }, { width = 40 } = {}) {
  const span = delay * (count - 1);
  const starts = Array.from({ length: count }, (_, i) =>
    Math.round(curve && count > 1 ? progressAt(curve, i / (count - 1)) * span : i * delay)
  );
  const tracks = starts.map((s, i) => ({ label: `${label} ${i + 1}`, start: s, end: s + duration }));
  return join([
    gantt(tracks, { scale: Math.max(...tracks.map((t) => t.end)), width }),
    "",
    `${count} × ${duration}ms, ${curve ? `delays follow ${curveText(curve)}` : `${delay}ms apart`}. Done at ${Math.max(...tracks.map((t) => t.end))}ms.`
  ]);
}

/** Where an element is on each frame. { frames, easing, width? } Equal time between rows. */
export function filmstrip({ frames = 8, easing = "ease-out", ms }, { width = 32 } = {}) {
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
  const nameW = Math.max(...tokens.map((t) => len(t.name)));
  const curveW = Math.max(...tokens.map((t) => len(curveText(t.curve))));
  return join(tokens.map((t) => `${padEnd(t.name, nameW)}  ${velocity(t.curve)}  ${padEnd(curveText(t.curve), curveW)}  ${t.use ?? ""}`));
}

export const kinds = {
  motionTiming: { label: "Motion timing",
    check: (d) => [checks.notNegative(d, "ms", "duration")], render: motionTiming, summary: (r) => r.map((x) => `${x.label}: ${x.ms}ms`).join(". ") },
  intentCard: {
    label: "Motion intent",
    render: intentCard,
    summary: (m) => `${m.purpose}. ${m.trigger}. ${m.ms}ms. Reduced motion: ${m.reduced}`
  },
  transitionSpec: {
    label: "Transition spec",
    check: (d) => [checks.notNegative(d, "start"), checks.ordered(d, ["start", "end"], "it should end after it starts")],
    render: transitionSpec,
    summary: (t) => t.map((x) => `${x.property} ${x.from} to ${x.to}, ${x.start} to ${x.end}ms`).join(". ")
  },
  stagger: { label: "Stagger", render: stagger, summary: (s) => `${s.count} items, ${s.duration}ms each.` },
  filmstrip: { label: "Frame strip", render: filmstrip, summary: (f) => `Position on each of ${f.frames} frames with ${curveText(f.easing ?? "ease-out")}.` },
  easingTable: { label: "Easing tokens", render: easingTable, summary: (t) => t.map((x) => x.name).join(", ") }
};
