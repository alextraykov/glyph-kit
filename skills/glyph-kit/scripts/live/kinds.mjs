// Compatibility for callers using the original moving registry.
import { KINDS } from "../registry.mjs";
import { animate } from "../motion.mjs";
export { stillGrid, stillText } from "../motion.mjs";
export const LIVE = Object.fromEntries(Object.entries(KINDS).filter(([, def]) => def.motion));
export function live(spec) {
  if (!LIVE[spec.kind]) throw new Error(`Unknown moving diagram "${spec.kind}". Known: ${Object.keys(LIVE).join(", ")}.`);
  return animate(spec);
}
