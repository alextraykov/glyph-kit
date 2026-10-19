#!/usr/bin/env node
// The version lives in four places. They must agree, and the changelog must describe it.
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const plugin = JSON.parse(read(".claude-plugin/plugin.json")).version;
const market = JSON.parse(read(".claude-plugin/marketplace.json")).plugins.find((p) => p.name === "glyph-kit")?.version;
const skill = read("skills/glyph-kit/SKILL.md").match(/^\s+version:\s*"?([^"\n]+)"?/m)?.[1];
const logged = read("CHANGELOG.md").match(/^## (\d+\.\d+\.\d+)/m)?.[1];
const all = { "plugin.json": plugin, "marketplace.json": market, "SKILL.md": skill, "CHANGELOG.md (latest)": logged };
const distinct = new Set(Object.values(all));
if (distinct.size !== 1 || distinct.has(undefined)) {
  console.error("Versions disagree:", all);
  process.exit(1);
}
console.log(`glyph-kit ${plugin}`);
