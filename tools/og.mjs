#!/usr/bin/env node
// The link preview (Open Graph image) for the Glyph kit site, drawn by the kit itself: the rework
// loop's still frame, in the site's paper and ink, with the name in Departure Mono. 1200 × 630 at 2×.
// Writes site/public/og.png. Needs Chrome, Chromium or Edge, like the kit's PNG export.
// Run after changing the figure or the words: node tools/og.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "../skills/glyph-kit/scripts/render/export.mjs";
import { live, stillGrid, LIVE } from "../skills/glyph-kit/scripts/live/kinds.mjs";
import { KINDS } from "../skills/glyph-kit/scripts/registry.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = (f) => readFileSync(join(root, "site/src/fonts", f)).toString("base64");
const spec = JSON.parse(readFileSync(join(root, "skills/glyph-kit/examples/live/rework-loop.json"), "utf8"));
const { make, still } = live(spec);
const figure = stillGrid(make, still).toHtml();
const kinds = Object.keys(KINDS).length + Object.keys(LIVE).length;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Departure Mono"; src: url(data:font/woff2;base64,${font("DepartureMono-Regular.woff2")}) format("woff2"); }
@font-face { font-family: "Geist Sans"; src: url(data:font/woff2;base64,${font("geist-sans-latin-400-normal.woff2")}) format("woff2"); font-weight: 400; }
@font-face { font-family: "Geist Sans"; src: url(data:font/woff2;base64,${font("geist-sans-latin-500-normal.woff2")}) format("woff2"); font-weight: 500; }
:root { --ink: #080808; --paper: #fbfbf8; --line: rgba(8,8,8,.16); --panel: rgba(8,8,8,.035); --caption: rgba(8,8,8,.62); --ok: #04764e; --fail: #b8421f; }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: var(--paper); color: var(--ink); }
body { box-sizing: border-box; display: grid; grid-template-rows: auto auto 1fr auto; gap: 20px; padding: 44px 64px 40px; }
.top { display: flex; justify-content: space-between; align-items: baseline; font: 400 18px/1 "Departure Mono"; color: var(--caption); text-transform: uppercase; }
.ramp { color: var(--ink); letter-spacing: 0; }
h1 { margin: 0; font: 400 118px/.9 "Departure Mono"; letter-spacing: 0; white-space: nowrap; }
p { margin: 0; font: 400 32px/1.2 "Geist Sans"; letter-spacing: -.01em; white-space: nowrap; }
.lede { display: grid; gap: 16px; }
.panel { display: grid; place-items: center; border: 1px solid rgba(8,8,8,.28); background: var(--panel); }
pre { margin: 0; font: 400 14px/1.2 "Departure Mono"; letter-spacing: 0; white-space: pre; font-variant-ligatures: none; }
.gl-ok { color: var(--ok); } .gl-fail { color: var(--fail); } .gl-mute { color: var(--caption); }
.foot { display: flex; justify-content: space-between; font: 500 20px/1 "Geist Sans"; }
.foot span:last-child { color: var(--caption); font: 400 18px/1 "Departure Mono"; text-transform: uppercase; }
</style></head><body>
<div class="top"><span class="ramp">░▒▓█</span><span>Skill for Claude Code and Codex</span></div>
<div class="lede"><h1>Glyph kit.</h1><p>Docs and diagrams as text, for people and AI.</p></div>
<div class="panel"><pre>${figure}</pre></div>
<div class="foot"><span>glyph-kit.traykov.cc</span><span>Free · MIT · ${kinds} kinds</span></div>
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
