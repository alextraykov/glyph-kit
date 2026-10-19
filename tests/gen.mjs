// Mutate display text and numeric data while retaining semantic enums and links.
const prose = new Set(["label", "name", "property", "metric", "text", "title", "doing", "thinking", "quote", "who", "source", "theme", "purpose", "trigger", "reduced", "use", "decision", "why", "owner", "placeholder", "hint", "note", "easingName"]);
const references = new Set(["from", "to", "initial", "path", "stages", "lanes", "lane", "variants", "states", "by", "participants", "selected"]);
const enums = new Set(["type", "status", "easing", "curve", "fg", "bg", "date", "unit"]);

function rewrite(value, transform, key = "", mapping = new Map()) {
  if (typeof value === "string") {
    if (enums.has(key) || !(prose.has(key) || references.has(key))) return value;
    if (!mapping.has(value)) mapping.set(value, transform(value, mapping.size));
    return mapping.get(value);
  }
  if (Array.isArray(value)) return value.map((v) => rewrite(v, transform, key, mapping));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v, transform, k, mapping)]));
}

function numbers(value, transform) {
  if (typeof value === "number") return transform(value);
  if (Array.isArray(value)) return value.map((v) => numbers(v, transform));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, numbers(v, transform)]));
}

function rows(data, count) {
  const resize = (list) => list.length ? Array.from({ length: count }, (_, i) => structuredClone(list[i % list.length])) : [];
  if (Array.isArray(data)) return resize(data);
  const copy = structuredClone(data);
  if (copy && typeof copy === "object") {
    for (const key of ["rows", "steps", "events", "items", "children", "columns", "phases", "stages"]) {
      if (Array.isArray(copy[key])) { copy[key] = resize(copy[key]); return copy; }
    }
    if (Object.values(copy).every(Array.isArray)) for (const key of Object.keys(copy)) copy[key] = resize(copy[key]);
  }
  return copy;
}

export function variants(spec) {
  const text = (transform) => {
    const copy = structuredClone(spec);
    const map = new Map();
    copy.data = copy.kind === "board"
      ? Object.fromEntries(Object.entries(copy.data).map(([key, values]) => [rewrite(key, transform, "label", map), rewrite(values, transform, "label", map)]))
      : rewrite(copy.data, transform, ["flow", "table"].includes(copy.kind) ? "label" : "", map);
    if (copy.options) copy.options = rewrite(copy.options, transform, "", map);
    if (copy.kind === "stateMatrix") copy.data.cells = Object.fromEntries(Object.entries(spec.data.cells).map(([variant, states]) => [map.get(variant) ?? variant, Object.fromEntries(Object.entries(states).map(([state, value]) => [map.get(state) ?? state, value]))]));
    return copy;
  };
  return [
    ["example", structuredClone(spec)],
    ...[1, 40].map((n) => [`${n} rows`, { ...structuredClone(spec), data: rows(spec.data, n) }]),
    ["long word", text((_, i) => "x".repeat(58) + String(i).padStart(2, "0"))],
    ["long words", text((_, i) => "long label ".repeat(5) + String(i))],
    ["empty text", text(() => "")],
    ...Object.entries({ Cyrillic: "Живот", Greek: "Ελλάδα", CJK: "漢字日本語", Arabic: "العربية", combining: "áहि", emoji: "👩‍💻🇧🇬", mixed: "A界Жع" }).map(([name, s]) => [name, text((_, i) => s + i)]),
    ...Object.entries({ zero: () => 0, huge: () => 1e12, tiny: () => 1e-9, negative: (n) => -Math.abs(n) }).map(([name, transform]) => [name, { ...structuredClone(spec), data: numbers(spec.data, transform) }])
  ];
}
