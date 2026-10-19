import { checks } from "../guard.mjs";
import { stillGrid } from "../motion/shared.mjs";
import { motionLoop, motionFunnel, motionStates, motionQueue, motionRollout, motionLoading } from "../motion/process.mjs";
import { motionHandoff, motionRetry, motionCache, motionSplit, motionIncident } from "../motion/process.mjs";
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

const processKind = (label, motion, check, summary) => ({ label, motion, check, summary, render: (data, options) => { const { make, still } = motion(data, options); return stillGrid(make, still).toText(); } });
const nonnegative = (value) => Number.isFinite(value) && value >= 0;

kinds.handoff = processKind("Handoff between teams", motionHandoff, (data) => [
  new Set(data.lanes).size !== data.lanes.length ? "Each lane needs a different name." : "",
  ...data.steps.map((step) => !data.lanes.includes(step.lane) ? `The lane ${step.lane} is not listed.` : !nonnegative(step.wait ?? 0) ? "Waiting time must be zero or greater." : "")
], (data) => `Work follows ${data.steps.map((step) => `${step.label} in ${step.lane}`).join(", then ")}.`);

kinds.retry = processKind("Retry with backoff", motionRetry, (data) => [
  !Number.isInteger(data.succeedOn) || data.succeedOn < 1 || data.succeedOn > data.attempts ? "The successful attempt must be between 1 and the attempt count." : "",
  !Number.isFinite(data.base) || data.base <= 0 ? "The first backoff must be greater than zero." : "",
  !Number.isFinite(data.factor) || data.factor < 1 ? "The backoff factor must be at least one." : ""
], (data) => `Up to ${data.attempts} attempts, starting at ${data.base}${data.unit ?? "ms"} with a factor of ${data.factor}; attempt ${data.succeedOn} succeeds.`);

kinds.cache = processKind("Cache hit or miss", motionCache, (data) => [
  !Number.isFinite(data.hitRate) || data.hitRate < 0 || data.hitRate > 1 ? "The hit rate must be between zero and one." : "",
  data.ttl != null && !nonnegative(data.ttl) ? "Cache lifetime must be zero or greater." : "",
  typeof data.origin !== "string" ? "Name the origin that handles a cache miss." : ""
], (data) => `${Math.round(data.hitRate * 100)}% of requests hit the cache; misses go to ${data.origin}.`);

kinds.split = processKind("Traffic split", motionSplit, (data) => [
  Math.abs(data.variants.reduce((sum, item) => sum + item.share, 0) - 1) > 1e-9 ? "Variant shares must add up to one." : "",
  ...data.variants.map((item) => !nonnegative(item.share) || item.share > 1 || (item.converts != null && (!nonnegative(item.converts) || item.converts > 1)) ? "Shares and conversion rates must be between zero and one." : "")
], (data) => `Traffic goes to ${data.variants.map((item) => `${item.label} (${Math.round(item.share * 100)}%)`).join(", ")}.`);

kinds.incident = processKind("Incident timeline", motionIncident, (data) => [
  data.events.some((event, i) => !nonnegative(event.at) || (i && event.at < data.events[i - 1].at)) ? "Incident times must run forward from zero." : "",
  data.events.filter((event) => event.kind === "resolve").length !== 1 ? "An incident needs exactly one resolution." : "",
  data.events.some((event) => !["detect", "page", "mitigate", "resolve"].includes(event.kind)) ? "Use detect, page, mitigate or resolve for each event." : ""
], (data) => data.events.map((event) => `${event.at} minutes: ${event.label} (${event.kind})`).join(". "));

