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

export const AREAS = {
  research: { label: "Research data", kinds: research },
  metrics: { label: "Experiments and metrics", kinds: metrics },
  flows: { label: "UX flows", kinds: flows },
  planning: { label: "Planning", kinds: planning },
  wireframes: { label: "Wireframes", kinds: wireframes },
  systems: { label: "Design system", kinds: systems },
  handoff: { label: "Handoff and QA", kinds: handoff },
  motion: { label: "Motion", kinds: motion }
};

/** kind → { area, label, render, summary }. A kind listed in two areas keeps its first area. */
export const KINDS = {};
for (const [area, { kinds }] of Object.entries(AREAS)) {
  for (const [kind, def] of Object.entries(kinds)) KINDS[kind] ??= { area, ...def };
}

/** Check a spec and return its kind definition, or throw a plain-language error. */
export function resolve(spec) {
  if (!spec || typeof spec !== "object") throw new Error("A spec must be an object with a kind and data.");
  const def = KINDS[spec.kind];
  if (!def) throw new Error(`Unknown kind "${spec.kind}". Known kinds: ${Object.keys(KINDS).join(", ")}.`);
  if (spec.data === undefined) throw new Error(`The ${spec.kind} spec has no data.`);
  guard(spec, def);
  return def;
}
