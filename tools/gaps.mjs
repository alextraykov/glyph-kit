// The longest still moment in each example's arrival. `gap` counts every cell at its delay, its two
// stepping layers (+40, +80) and its landing (+200); `still` counts only what really changes on
// screen: block cells step at +0, +40 and +80, text snaps at its delay, and the figure starts at 0.
// Either is how long the figure sits still before it has settled. Run: node tools/gaps.mjs [kind…]
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "../skills/glyph-kit/scripts/registry.mjs";
import { cellsOf } from "../skills/glyph-kit/scripts/arrive.mjs";
import { body } from "../skills/glyph-kit/scripts/render/text.mjs";

const STAMP = /^\s*SAMPLE DATA\s*$/;
const STEPS = /[█▓▒■▁▂▃▄▅▆▇▏▎▍▌▋▊▉]/u;
const largest = (set) => {
  const sorted = [...set].sort((a, b) => a - b);
  let gap = 0, at = 0;
  for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] > gap) { gap = sorted[i] - sorted[i - 1]; at = sorted[i - 1]; }
  return { gap, at, end: sorted.at(-1) };
};

/** The largest gap between consecutive moments of a spec's arrival, or null when it has no order. */
export function arrivalGap(spec) {
  const def = resolve(spec);
  if (!def.arrive) return null;
  const lines = body(spec).split("\n");
  const end = STAMP.test(lines.at(-1) ?? "") ? lines.length - 2 : lines.length;
  const options = { ...spec.options, ...(spec.lang ? { lang: spec.lang } : {}) };
  const delay = def.arrive(lines.slice(0, end), def.data, options);
  const times = new Set();
  const seen = new Set([0]);
  cellsOf(lines.slice(0, end)).forEach((row, r) => row.forEach(({ ch, col }) => {
    if (ch === " ") return;
    const d = Math.max(0, Math.round(delay(r, col, ch) ?? 0));
    for (const t of [d, d + 40, d + 80, d + 200]) times.add(t);
    for (const t of !delay.exact && d && STEPS.test(ch) ? [d, d + 40, d + 80] : [d]) seen.add(t);
  }));
  const { gap, at, end: settles } = largest(times);
  return { gap, at, end: settles, still: largest(seen).gap };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "examples");
  const only = process.argv.slice(2);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    for (const spec of JSON.parse(readFileSync(join(dir, file), "utf8"))) {
      if (only.length && !only.includes(spec.kind)) continue;
      const g = arrivalGap(spec);
      if (g) console.log(`gap ${String(g.gap).padStart(4)}ms from ${String(g.at).padStart(4)}ms  still ${String(g.still).padStart(4)}ms  settles ${String(g.end).padStart(4)}ms  ${file.replace(".json", "")}/${spec.kind}`);
    }
  }
}
