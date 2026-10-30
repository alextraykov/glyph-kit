#!/usr/bin/env node
// The link preview (Open Graph image) for the Glyph kit site: the logo ░▒▓█ and the name, in
// Departure Mono on the site's paper. 1200 × 630 at 2×. Sizes are multiples of 11 px, the font's own
// size, so every pixel of the glyphs is whole and the four glyphs meet without a seam (docs/brand.md).
// Writes site/public/og.png. Needs Chrome, Chromium or Edge, like the kit's PNG export.
// Run after changing the figure or the words: node tools/og.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "../skills/glyph-kit/scripts/render/export.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = (f) => readFileSync(join(root, "site/src/fonts", f)).toString("base64");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Departure Mono"; src: url(data:font/woff2;base64,${font("DepartureMono-Regular.woff2")}) format("woff2"); }
@font-face { font-family: "Geist Sans"; src: url(data:font/woff2;base64,${font("geist-sans-latin-500-normal.woff2")}) format("woff2"); font-weight: 500; }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #fbfbf8; color: #080808; }
body { box-sizing: border-box; display: grid; place-content: center; justify-items: center; gap: 44px; }
.glyphs { font: 400 220px/1 "Departure Mono"; letter-spacing: 0; white-space: pre; }
h1 { margin: 0; font: 400 88px/1 "Departure Mono"; letter-spacing: 0; }
.url { position: absolute; right: 56px; bottom: 44px; color: rgba(8,8,8,.55); font: 500 22px/1 "Geist Sans"; }
</style></head><body>
<div class="glyphs">░▒▓█</div>
<h1>Glyph kit</h1>
<span class="url">glyph-kit.traykov.cc</span>
</body></html>`;

const chrome = findChrome();
if (!chrome) throw new Error("The preview needs Chrome, Chromium or Edge; set CHROME_PATH.");
const dir = mkdtempSync(join(tmpdir(), "glyph-kit-og-"));
const page = join(dir, "og.html");
const out = join(root, "site/public/og.png");
writeFileSync(page, html);
try {
  execFileSync(chrome, ["--headless", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${join(dir, "profile")}`, "--window-size=1200,630", "--force-device-scale-factor=2", "--virtual-time-budget=3000", `--screenshot=${out}`, pathToFileURL(page).href], { stdio: "pipe", timeout: 30_000 });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
if (!existsSync(out)) throw new Error("No preview was written.");
console.log("site/public/og.png");
