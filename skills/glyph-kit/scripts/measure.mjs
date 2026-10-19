#!/usr/bin/env node
// Measures the claims in reference/benefits.md, for every example spec:
//   - generator time (median of many runs, in microseconds);
//   - size as text, as an HTML page, and as a PNG screenshot of that page's figure (needs Playwright);
//   - image tokens for that PNG by Anthropic's published formula, ceil(w/28) × ceil(h/28);
//   - an estimate of text tokens (see tokens.mjs), always;
//   - real token counts for the text, its compact form and the PNG with the Messages count_tokens
//     endpoint, only when ANTHROPIC_API_KEY is set. Otherwise they're reported as not measured.
// Usage: node scripts/measure.mjs [--json | --write]   --write saves reference/measurements.json.
// Optional tools are loaded only if present.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS } from "./registry.mjs";
import { renderHtml } from "./render/html.mjs";
import { body } from "./render/text.mjs";
import { compact, countTokens, estimateTextTokens } from "./tokens.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const specs = Object.keys(AREAS).flatMap((a) => JSON.parse(readFileSync(join(root, "examples", `${a}.json`), "utf8")).map((s) => ({ area: a, ...s })));
const bytes = (s) => Buffer.byteLength(s, "utf8");
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const rows = specs.map((spec) => {
  const runs = [];
  for (let k = 0; k < 7; k++) {
    const n = 200;
    const t = process.hrtime.bigint();
    for (let i = 0; i < n; i++) body(spec);
    runs.push(Number(process.hrtime.bigint() - t) / 1000 / n);
  }
  const text = body(spec);
  return { area: spec.area, kind: spec.kind, title: spec.title, us: median(runs), textBytes: bytes(text), htmlBytes: bytes(renderHtml(spec)), textTokensEstimate: estimateTextTokens(text), text };
});

// PNG of the figure as a browser draws it at 2× density, the way a screenshot in a doc is usually made.
let pngNote = "PNG not measured: Playwright isn't installed.";
try {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1200, height: 900 } });
  for (const [i, row] of rows.entries()) {
    await page.setContent(renderHtml(specs[i]));
    await page.addStyleTag({ content: "pre.gk-figure,.gk-pair{width:max-content}" }); // crop to the figure, not the page width
    const el = page.locator("pre.gk-figure, .gk-screen, .gk-pair").first();
    const png = await el.screenshot();
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    row.pngBytes = png.length;
    row.pngSize = `${w}×${h}`;
    row.imageTokens = Math.ceil(w / 28) * Math.ceil(h / 28);
    row.png = png.toString("base64");
  }
  await browser.close();
  pngNote = "PNG: the figure screenshotted at 2× density in Chromium, so the size a screenshot in a doc usually has. Image tokens by the published formula, before any downscaling to the model's limit.";
} catch {}

// Real counts: each figure in a fenced block, minus the count for an empty fenced block, so the
// number is the figure's own cost. The image is counted the same way, minus an empty message.
let tokenNote = "Text tokens not measured: set ANTHROPIC_API_KEY to count them. textTokensEstimate is the rough heuristic in tokens.mjs.";
try {
  const fenced = (t) => "```text\n" + t + "\n```";
  const base = await countTokens(fenced(""));
  if (base !== null) {
    const imageBase = await countTokens([{ type: "text", text: "." }]);
    for (const row of rows) {
      row.textTokens = (await countTokens(fenced(row.text))) - base;
      row.compactTokens = (await countTokens(fenced(compact(row.text)))) - base;
      if (row.png) row.imageTokensCounted = (await countTokens([{ type: "image", source: { type: "base64", media_type: "image/png", data: row.png } }, { type: "text", text: "." }])) - imageBase;
    }
    tokenNote = "Text, compact and image tokens: the Messages count_tokens endpoint on claude-opus-5-5, minus the cost of an empty block or message.";
  }
} catch (error) {
  tokenNote = `Token counting failed: ${error.message}`;
}

const result = { measured: new Date().toISOString().slice(0, 10), rows: rows.map(({ text, png, ...r }) => ({ ...r, us: +r.us.toFixed(2) })), pngNote, tokenNote };
if (process.argv.includes("--write")) {
  writeFileSync(join(root, "reference/measurements.json"), JSON.stringify(result, null, 2) + "\n");
  console.log("reference/measurements.json");
} else if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("area        kind             gen μs   text B   html B   png B     png size     img tokens  text tokens");
  for (const r of rows)
    console.log(
      `${r.area.padEnd(11)} ${r.kind.padEnd(16)} ${r.us.toFixed(1).padStart(6)}  ${String(r.textBytes).padStart(7)}  ${String(r.htmlBytes).padStart(7)}  ${String(r.pngBytes ?? "—").padStart(7)}  ${String(r.pngSize ?? "—").padStart(11)}  ${String(r.imageTokens ?? "—").padStart(10)}  ${String(r.textTokens ?? "—").padStart(11)}`
    );
  console.log(`\n${pngNote}\n${tokenNote}`);
}
