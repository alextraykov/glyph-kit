// Every kind the kit can draw, grouped by area. A spec names one of these kinds.
import { guard } from "./guard.mjs";
import { kinds as flows } from "./areas/flows.mjs";
import { kinds as handoff } from "./areas/handoff.mjs";
import { kinds as metrics } from "./areas/metrics.mjs";
import { kinds as motion } from "./areas/motion.mjs";
import { kinds as planning } from "./areas/planning.mjs";
import { kinds as research } from "./areas/research.mjs";
import { kinds as systems } from "./areas/systems.mjs";
import { kinds as wireframes } from "./areas/wireframes.mjs";
import { kinds as process } from "./areas/process.mjs";
import { ORDERS } from "./arrive-orders.mjs";
import { kinds as layouts } from "./areas/layouts.mjs";

export const AREAS = {
  research: { label: "Research data", kinds: research },
  metrics: { label: "Experiments and metrics", kinds: metrics },
  flows: { label: "UX flows", kinds: flows },
  planning: { label: "Planning", kinds: planning },
  wireframes: { label: "Wireframes", kinds: wireframes },
  systems: { label: "Design system", kinds: systems },
  handoff: { label: "Handoff and QA", kinds: handoff },
  motion: { label: "Motion", kinds: motion },
  process: { label: "Processes over time", kinds: process },
  layouts: { label: "Document layouts", kinds: layouts }
};

/** kind → { area, label, render, summary }. A kind listed in two areas keeps its first area. */
export const KINDS = {};
for (const [area, { kinds }] of Object.entries(AREAS)) {
  // Every type arrives in an order; a renderer's own order wins over the shared one.
  for (const [kind, def] of Object.entries(kinds)) KINDS[kind] ??= { area, ...(ORDERS[kind] ? { arrive: ORDERS[kind] } : {}), ...def };
}

/** Check a spec and return its kind definition, or throw a plain-language error. */
export function resolve(spec) {
  if (!spec || typeof spec !== "object") throw new Error("A spec must be an object with a kind and data.");
  const def = KINDS[spec.kind];
  if (!def) throw new Error(`Unknown type "${spec.kind}". Known types: ${Object.keys(KINDS).join(", ")}.`);
  if (spec.data === undefined) throw new Error(`The ${spec.kind} spec has no data.`);
  if (typeof spec.data === "string" && spec.data.startsWith("@")) guard(spec, { label: def.label });
  const data = def.normalize ? def.normalize(spec.data) : spec.data;
  guard({ ...spec, data }, def);
  return { ...def, data };
}
