import { checks } from "../guard.mjs";
import { stillGrid } from "../motion/shared.mjs";
import { motionLoop, motionFunnel, motionStates, motionQueue, motionRollout, motionLoading } from "../motion/process.mjs";
// Each kind: label, how to make it, a summary for screen readers, and its own data checks.
const has = (list, name, what) => (list.includes(name) ? "" : `"${name}" isn't one of the ${what}.`);
const legacy = {
  loop: {
    label: "Rework loop",
    motion: motionLoop,
    summary: (d) => `Work moves through ${d.stages.join(", ")}${d.back ? `; about ${Math.round(d.back.share * 100)}% is sent back from ${d.back.from} to ${d.back.to}` : ""}.`,
    check: (d) => !d.back ? [] : [
      has(d.stages, d.back.from, "stages"),
      has(d.stages, d.back.to, "stages"),
      d.stages.indexOf(d.back.to) >= d.stages.indexOf(d.back.from) ? `Work can only be sent back to an earlier stage than ${d.back.from}.` : "",
      d.back.share < 0 || d.back.share > 1 ? `The share sent back is ${d.back.share}; write 30% as 0.3.` : ""
    ]
  },
  funnel: {
    label: "Moving funnel",
    motion: motionFunnel,
    summary: (d, { lang } = {}) => `Funnel: ${d.steps.map((s) => `${s.label} ${s.value.toLocaleString(lang ?? "en-US")}`).join(", ")}.`,
    check: (d) => [checks.notNegative(d.steps, "value", "count"), checks.neverGrows(d.steps, "value")]
  },
  states: {
    label: "State machine",
    motion: motionStates,
    summary: (d) => `States ${d.states.join(", ")}; the token plays the path ${d.path.join(" → ")}.`,
    check: (d) => [
      ...d.transitions.flatMap((t) => [has(d.states, t.from, "states"), has(d.states, t.to, "states")]),
      ...d.path.slice(1).map((n, i) => (d.transitions.some((t) => t.from === d.path[i] && t.to === n) ? "" : `The path goes from ${d.path[i]} to ${n}, but there's no transition for that.`))
    ]
  },
  queue: {
    label: "Work queue",
    motion: motionQueue,
    summary: (d) => `Columns ${d.columns.map((c) => `${c.label}${c.limit ? ` (limit ${c.limit})` : ""}`).join(", ")}. Work piles up before the slowest column.`,
    check: (d) => [checks.within(d.columns, "limit", 1, 99, "limit"), checks.notNegative(d.columns, "pace", "time per card")]
  },
  rollout: {
    label: "Staged rollout",
    motion: motionRollout,
    summary: (d) => `Rollout to ${d.stages.join("%, ")}%, guarded by ${d.metric ?? "a metric"} at ${d.limit ?? 2}%${d.breachAt ? `; it trips at ${d.breachAt}% and rolls back` : ""}.`,
    check: (d) => [
      d.stages.some((p, i) => p < 0 || p > 100 || (i && p <= d.stages[i - 1])) ? "Rollout stages should climb from above 0 to at most 100%." : "",
      d.breachAt !== undefined && !d.stages.includes(d.breachAt) ? `The guard trips at ${d.breachAt}%, which isn't one of the stages.` : ""
    ]
  },
  loading: {
    label: "Loading sequence",
    motion: motionLoading,
    summary: (d) => `In ${d.duration ?? 1800}ms: ${d.phases.map((p) => `${p.show} at ${p.at}ms`).join(", ")}.`,
    check: (d) => [
      checks.inTimeOrder(d.phases, "at", "phase"),
      d.phases.some((p) => p.at > (d.duration ?? 1800)) ? `A phase starts after the ${d.duration ?? 1800}ms the sequence lasts.` : "",
      ...d.phases.map((p) => has(["tap", "skeleton", "text", "image"], p.show, "things a loading sequence can show (tap, skeleton, text, image)"))
    ]
  }
};


export const kinds = Object.fromEntries(Object.entries(legacy).filter(([kind]) => kind !== "funnel").map(([kind, def]) => [kind, { ...def, render: (data, options) => { const { make, still } = def.motion(data, options); return stillGrid(make, still).toText(); } }]));
