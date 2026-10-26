// Formats the page patterns in skills/glyph-kit/templates/patterns as a model reads them best: one piece
// a line, everything else as flat as it fits. Run after editing a pattern: node tools/patterns.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { estimateTextTokens } from "../skills/glyph-kit/scripts/tokens.mjs";
import { format } from "./format.mjs";

const dir = new URL("../skills/glyph-kit/templates/patterns/", import.meta.url);
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const spec = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
  const text = format(spec) + "\n";
  writeFileSync(new URL(file, dir), text);
  console.log(`${file.padEnd(18)} ${estimateTextTokens(text)} tokens`);
}
