// node --test skills/glyph-kit/scripts/*.test.mjs
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { AREAS } from "./registry.mjs";
import { findChrome, htmlToPdf, svgToPng } from "./render/export.mjs";
import { renderMdx } from "./render/mdx.mjs";
import { classify } from "./render/paint.mjs";
import { renderReport, reportMarkdown } from "./render/report.mjs";
import { figureSvg, renderSvg } from "./render/svg.mjs";
import { PALETTES } from "./render/themes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const report = json("examples/reports/motion-audit.json");
const all = Object.keys(AREAS).flatMap((a) => json(`examples/${a}.json`));

test("svg: every example draws, in every theme, with no broken numbers", () => {
  for (const theme of Object.keys(PALETTES)) {
    for (const spec of all) {
      const svg = renderSvg(spec, { theme });
      assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="\d+" height="\d+"/, spec.kind);
      assert.ok(!/NaN|undefined|Infinity/.test(svg), `${theme} ${spec.kind}`);
      assert.match(svg, /aria-label="[^"]{10,}"/, spec.kind);
    }
  }
});

test("svg: glyphs become shapes, text keeps its cells", () => {
  const { svg, defs } = figureSvg("ab █░ ┌─┐ ►", { colors: PALETTES.paper, cell: 10, row: 20 });
  assert.match(svg, /<text x="0" [^>]*textLength="20"[^>]*>ab<\/text>/);
  assert.match(svg, /<rect x="30" [^>]*fill="#151513"\/>/); // █ at column 3
  assert.match(svg, /fill="url\(#gk-p0-/); // ░ as a dither pattern
  assert.match(defs, /<pattern id="gk-p0-/);
  assert.match(svg, /<path d="M/); // box drawing
  assert.match(svg, /<polygon /); // ►
  assert.ok(!/<text[^>]*> <\/text>/.test(svg), "no text element holds only a space");
});

test("svg: double-line corners close", () => {
  const { svg } = figureSvg("╔═╗\n╚═╝", { colors: PALETTES.paper, cell: 10, row: 20 });
  // ╔ at (0,0): the outer line turns at (5 - 1.9, 10 - 1.9).
  assert.match(svg, /M3.1 20V8.1H10|M10 8.1H3.1|M3.1 20V8.1/);
});

test("roles: problems and passes are classed per character", () => {
  assert.deepEqual(classify("█ ok"), ["d", "", "ok", "ok"]);
  assert.deepEqual(classify("2.7 fails").slice(-5), ["x", "x", "x", "x", "x"]);
});

test("report: cover, summary, contents, numbered figures, print rules", () => {
  const html = renderReport(report);
  const figures = report.sections.flatMap((s) => s.figures ?? []);
  assert.equal((html.match(/class="r-fig"/g) ?? []).length, figures.length);
  assert.match(html, new RegExp(`Figure ${figures.length}</span>`));
  assert.equal((html.match(/<section class="r-sec"/g) ?? []).length, report.sections.length);
  assert.match(html, /<li><span>The browser default <code>ease<\/code>/);
  assert.match(html, /@page\{size:A4;margin:18mm 18mm 20mm;background:#f7f6f1/);
  assert.match(renderReport(report, { theme: "phosphor" }), /--data:#58d68d/);
  assert.ok(!/undefined|NaN/.test(html));
});

test("markdown: the report keeps headings, figures as text, descriptions and sources", () => {
  const md = reportMarkdown(report);
  assert.match(md, /^# Pave motion audit\n/);
  assert.match(md, /## In short\n\n1\. About 750/);
  assert.match(md, /\*\*Figure 1\. Every stylesheet read, not sampled\*\*\n\n```text\n/);
  assert.equal((md.match(/```text/g) ?? []).length, report.sections.flatMap((s) => s.figures ?? []).length);
});

test("mdx: static escapes JSX characters; component mode passes the spec as a prop", () => {
  const spec = { kind: "barChart", title: "Use {braces} <here>", source: "Test data", data: [{ label: "a", value: 1 }] };
  const plain = renderMdx(spec);
  assert.match(plain, /\*\*Use \\\{braces\\\} \\<here\\>\*\*/);
  assert.match(plain, /```text\na  /);
  const comp = renderMdx(report, { mode: "component", importPath: "./Glyph.astro" });
  assert.match(comp, /^---\ntitle: "Pave motion audit"/);
  assert.match(comp, /import Glyph from "\.\/Glyph\.astro";/);
  assert.match(comp, /<Glyph theme="paper" spec=\{\{\n  "kind": "flow"/);
});

test("pdf and png: a real round trip through a headless browser, when one is installed", { skip: !findChrome() && "no Chromium browser on this machine" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "gk-test-"));
  try {
    const pdf = htmlToPdf(renderReport(report), join(dir, "r.pdf"));
    assert.ok(statSync(pdf).size > 10_000);
    assert.equal(readFileSync(pdf).subarray(0, 5).toString(), "%PDF-");
    const png = svgToPng(renderSvg(all[0]), join(dir, "f.png"));
    assert.ok(existsSync(png));
    assert.equal(readFileSync(png).subarray(1, 4).toString(), "PNG");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
