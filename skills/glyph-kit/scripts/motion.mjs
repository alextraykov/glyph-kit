import { KINDS, resolve } from "./registry.mjs";
import { isSample, stamp } from "./guard.mjs";
import { stillGrid } from "./motion/shared.mjs";
export { stillGrid } from "./motion/shared.mjs";

export const moves = (kind) => typeof KINDS[kind]?.motion === "function";

export function animate(spec, resolved) {
  const def = typeof resolved?.render === "function" ? resolved : resolve(spec);
  if (!def.motion) throw new Error(`The ${spec.kind} type does not move.`);
  const options = { ...spec.options, ...(spec.lang ? { lang: spec.lang } : {}) };
  return { ...def.motion(def.data, options), label: def.label, summary: spec.summary ?? def.summary?.(def.data, options) ?? def.label };
}

export function stillText(spec, def) {
  const { make, still } = animate(spec, def);
  const text = stillGrid(make, still).toText();
  return isSample(spec.source) ? stamp(text) : text;
}
