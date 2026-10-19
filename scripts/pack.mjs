#!/usr/bin/env node
// Zips the skill for a release: dist/glyph-kit-<version>.zip with a glyph-kit/ root folder, the
// same folder Claude Code and Codex expect in their skills directory. Needs the `zip` command.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const { version } = JSON.parse(readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8"));
const out = join(root, "dist");
const zip = join(out, `glyph-kit-${version}.zip`);
mkdirSync(out, { recursive: true });
const stage = mkdtempSync(join(tmpdir(), "glyph-kit-"));
cpSync(join(root, "skills/glyph-kit"), join(stage, "glyph-kit"), { recursive: true });
rmSync(zip, { force: true });
execFileSync("zip", ["-qrX", zip, "glyph-kit", "-x", "*.DS_Store"], { cwd: stage });
rmSync(stage, { recursive: true, force: true });
console.log(zip.replace(root, ""));
