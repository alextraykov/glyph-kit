#!/usr/bin/env node
// The logo as pictures, for the places that can't set text: ░▒▓█ side by side, read pixel by pixel
// from Departure Mono at its own size (11 px, where each glyph is 7 × 14 pixels), so the pictures are
// the font's drawing, not a redrawing. See docs/brand.md.
// Writes skills/glyph-kit/assets/icon.svg (the favicon and the skill's icon), docs/readme/mark.svg
// (the README) and site/public/apple-touch-icon.png. Needs Chrome, Chromium or Edge, like og.mjs.
// Run after changing the font: node tools/mark.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "../skills/glyph-kit/scripts/render/export.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARK = "░▒▓█";
const W = 7 * MARK.length, H = 14; // the mark's size in font pixels
const INK = "#080808", PAPER = "#fbfbf8", INK_DARK = "#f4f2ea"; // the site's ink and paper
const K = 16; // drawn at 16 screen pixels to a font pixel, then read at each pixel's centre

const chrome = findChrome();
if (!chrome) throw new Error("The mark needs Chrome, Chromium or Edge; set CHROME_PATH.");
const dir = mkdtempSync(join(tmpdir(), "glyph-kit-mark-"));
const run = (args) => execFileSync(chrome, ["--headless", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${join(dir, "profile")}`, "--virtual-time-budget=3000", ...args], { stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).toString();

let bits;
try {
  // 1. The font's pixels: draw the mark on a canvas with the baseline on the pixel grid, read it back.
  const font = readFileSync(join(root, "site/src/fonts/DepartureMono-Regular.woff2")).toString("base64");
  writeFileSync(join(dir, "read.html"), `<!doctype html><meta charset="utf-8"><style>@font-face { font-family: D; src: url(data:font/woff2;base64,${font}); }</style><pre id="out"></pre><script>
document.fonts.load("${11 * K}px D").then(() => {
  const c = document.createElement("canvas"); c.width = ${W * K}; c.height = ${H * K};
  const x = c.getContext("2d"); x.font = "${11 * K}px D"; x.fillText(${JSON.stringify(MARK)}, 0, ${11 * K});
  const d = x.getImageData(0, 0, c.width, c.height).data, rows = [];
  for (let r = 0; r < ${H}; r++) { let s = ""; for (let col = 0; col < ${W}; col++) s += d[(((r * ${K} + ${K / 2}) * c.width) + col * ${K} + ${K / 2}) * 4 + 3] > 127 ? "#" : "."; rows.push(s); }
  document.getElementById("out").textContent = rows.join(" ");
});
</script>`);
  bits = run(["--dump-dom", pathToFileURL(join(dir, "read.html")).href]).match(/<pre id="out">([#. ]+)<\/pre>/)?.[1].split(" ");
  if (bits?.length !== H || bits.some((r) => r.length !== W) || !bits.every((r) => r.endsWith("#######"))) throw new Error("Couldn't read the mark from Departure Mono.");

  // 2. The pixels as one path: a rectangle per run of ink in a row.
  const path = (x0, y0) => bits.flatMap((row, y) => [...row.matchAll(/#+/g)].map((m) => `M${x0 + m.index} ${y0 + y}h${m[0].length}v1h-${m[0].length}z`)).join("");
  const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">${body}</svg>\n`;

  // The icon: the mark on paper, two pixels in from the sides of a 32-pixel square.
  writeFileSync(join(root, "skills/glyph-kit/assets/icon.svg"), svg(32, 32, `<rect width="32" height="32" fill="${PAPER}"/><path fill="${INK}" d="${path(2, 9)}"/>`));
  // The README's mark: no ground, so it follows GitHub's light or dark page.
  writeFileSync(join(root, "docs/readme/mark.svg"), svg(W, H, `<style>path { fill: ${INK}; } @media (prefers-color-scheme: dark) { path { fill: ${INK_DARK}; } }</style><path d="${path(0, 0)}"/>`));

  // 3. The home-screen icon: 180 × 180, six screen pixels to a font pixel, so every pixel stays square.
  writeFileSync(join(dir, "touch.html"), `<!doctype html><style>html, body { margin: 0; width: 180px; height: 180px; overflow: hidden; background: ${PAPER}; }</style><svg viewBox="0 0 30 30" width="180" height="180" shape-rendering="crispEdges" style="display: block"><path fill="${INK}" d="${path(1, 8)}"/></svg>`);
  const touch = join(root, "site/public/apple-touch-icon.png");
  run(["--window-size=180,180", "--force-device-scale-factor=1", `--screenshot=${touch}`, pathToFileURL(join(dir, "touch.html")).href]);
  if (!existsSync(touch)) throw new Error("No home-screen icon was written.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(["skills/glyph-kit/assets/icon.svg", "docs/readme/mark.svg", "site/public/apple-touch-icon.png", ...bits].join("\n"));
