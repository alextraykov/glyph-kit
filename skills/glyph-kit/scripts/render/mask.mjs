// The mask of a figure that draws layers over a page: one letter per cell, p page, l layer, s shadow.
// Painted forms pass it to paint.mjs so the page under a drawer, sheet, popover, menu or toast takes
// the muted colour. The text form never changes.
import { resolve } from "../registry.mjs";

/** A spec's mask, one string a line, or undefined when its kind has none or nothing mutes the page. */
export function maskOf(spec) {
  const def = resolve(spec);
  if (!def.mask) return undefined;
  return def.mask(def.data, { ...spec.options, ...(spec.lang ? { lang: spec.lang } : {}) }) ?? undefined;
}
