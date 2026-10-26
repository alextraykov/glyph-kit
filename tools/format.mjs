// JSON for specs a model reads: one piece a line, everything else as flat as it fits. Pages and
// their sections and cards open on one line with their plain fields.
const flat = (v) => (v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(flat).join(", ")}]` : `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${flat(x)}`).join(", ")} }`);
const holdsPieces = (v) => v && typeof v === "object" && (Array.isArray(v) ? v.some(holdsPieces) : "type" in v || Object.values(v).some(holdsPieces));
const isPiece = (v) => v && typeof v === "object" && !Array.isArray(v) && "type" in v;
export function format(v, indent = "") {
  if (isPiece(v) || !holdsPieces(v) || (Array.isArray(v) && v.length === 1 && isPiece(v[0]))) return flat(v);
  const inner = indent + "  ";
  if (Array.isArray(v)) return `[\n${v.map((x) => inner + format(x, inner)).join(",\n")}\n${indent}]`;
  // A section or a card: its plain fields on the opening line, then its pieces one a line.
  if (!indent || "sections" in v) return `{\n${Object.entries(v).map(([k, x]) => `${inner}${JSON.stringify(k)}: ${format(x, inner)}`).join(",\n")}\n${indent}}`;
  return `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${format(x, indent)}`).join(", ")} }`;
}
