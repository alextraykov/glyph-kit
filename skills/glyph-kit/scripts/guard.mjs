// Data guardrails. Made-up numbers must never look real:
//   1. No source, no numbers. A spec whose data holds numbers must say where they came from.
//   2. A source that starts with "Illustrative" or "Sample" stamps SAMPLE DATA on the figure itself.
//   3. Each kind can check its own data (a funnel never grows, a range holds its value…) and
//      explains a failure in a sentence a designer understands.
// No DOM and no file access, so it runs in Node and in a browser.

export const SAMPLE = "SAMPLE DATA";

/** True when the source says the numbers are made up. */
export const isSample = (source) => /^\s*(illustrative|sample)/i.test(source ?? "");

/** True when a value holds a number anywhere inside it. */
export function hasNumbers(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasNumbers);
  if (value && typeof value === "object") return Object.values(value).some(hasNumbers);
  return false;
}

const name = (spec, fallback) => (spec.title ? `"${spec.title}"` : `This ${fallback ?? spec.kind}`);

/**
 * Throw a plain-language error when a spec breaks a data rule. `check` is the kind's own
 * check: data → list of problem sentences.
 */
export function guard(spec, { check, label } = {}) {
  if (typeof spec.data === "string" && spec.data.startsWith("@"))
    throw new Error(`${name(spec, label)} reads its data from ${spec.data.slice(1)}, which hasn't been loaded. Render it with the command line (scripts/glyph-kit.mjs), which reads the file.`);
  if (hasNumbers(spec.data) && !String(spec.source ?? "").trim())
    throw new Error(`${name(spec, label)} has numbers but no source. Say where they came from in "source", or start it with "Illustrative" if they're made up.`);
  const problems = check ? check(spec.data).filter(Boolean) : [];
  if (problems.length) throw new Error(`${name(spec, label)}: ${problems.join(" ")}`);
}

/** Add the SAMPLE DATA stamp under a text figure, right-aligned to its width. Line numbers above
 *  it don't move, so deck steps that point at lines still land. */
export function stamp(text) {
  const width = Math.max(SAMPLE.length, ...text.split("\n").map((l) => [...l].length));
  return `${text}\n\n${" ".repeat(width - SAMPLE.length)}${SAMPLE}`;
}

// Checks shared by the kinds. Each returns a sentence, or nothing when the data is fine.
const rows = (data) => (Array.isArray(data) ? data : []);
const what = (row, i) => (row && (row.label ?? row.name ?? row.text)) || `row ${i + 1}`;

export const checks = {
  /** Every row's field is a number at or above zero. */
  notNegative: (data, field, noun = field) => {
    const bad = rows(data).filter((r) => typeof r?.[field] === "number" && r[field] < 0);
    return bad.length ? `${what(bad[0], rows(data).indexOf(bad[0]))} has a negative ${noun} (${bad[0][field]}).` : "";
  },
  /** Every row's field sits between lo and hi. */
  within: (data, field, lo, hi, noun = field) => {
    const list = rows(data);
    const i = list.findIndex((r) => typeof r?.[field] === "number" && (r[field] < lo || r[field] > hi));
    return i < 0 ? "" : `${what(list[i], i)} has a ${noun} of ${list[i][field]}, outside ${lo} to ${hi}.`;
  },
  /** A field never grows from one row to the next. */
  neverGrows: (data, field, noun = "step") => {
    const list = rows(data);
    const i = list.findIndex((r, k) => k > 0 && r[field] > list[k - 1][field]);
    return i < 0 ? "" : `${what(list[i], i)} (${list[i][field]}) is larger than the ${noun} before it (${list[i - 1][field]}); a funnel only loses people.`;
  },
  /** Fields are in order inside each row, e.g. low ≤ value ≤ high. */
  ordered: (data, fields, noun) => {
    const list = rows(data);
    const i = list.findIndex((r) => fields.some((f, k) => k > 0 && typeof r[f] === "number" && typeof r[fields[k - 1]] === "number" && r[f] < r[fields[k - 1]]));
    return i < 0 ? "" : `${what(list[i], i)} has ${fields.map((f) => `${f} ${list[i][f]}`).join(", ")}; ${noun ?? `they should run from ${fields[0]} to ${fields.at(-1)}`}.`;
  },
  /** Shares (0–1 or 0–100) add up to the whole, within a point. */
  sumsToWhole: (values, noun = "shares") => {
    const nums = values.filter((v) => typeof v === "number");
    if (!nums.length) return "";
    const total = nums.reduce((a, b) => a + b, 0);
    const whole = nums.every((v) => v <= 1) ? 1 : 100;
    return Math.abs(total - whole) <= whole / 100 ? "" : `The ${noun} add up to ${+total.toFixed(2)}, not ${whole}.`;
  },
  /** Dates (or numbers) never go backwards. */
  inTimeOrder: (data, field, noun = "date") => {
    const list = rows(data);
    const time = (v) => (typeof v === "number" ? v : Date.parse(/\d{4}/.test(v) ? v : `${v} 2000`));
    const i = list.findIndex((r, k) => k > 0 && time(r[field]) < time(list[k - 1][field]));
    return i < 0 || Number.isNaN(time(list[i][field])) ? "" : `${what(list[i], i)} (${list[i][field]}) comes before the ${noun} above it (${list[i - 1][field]}); keep them in time order.`;
  }
};
