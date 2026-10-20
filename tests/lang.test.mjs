import test from "node:test";
import assert from "node:assert/strict";
import { body, label } from "../skills/glyph-kit/scripts/render/text.mjs";
import { renderHtml } from "../skills/glyph-kit/scripts/render/html.mjs";
import { renderLiveHtml } from "../skills/glyph-kit/scripts/live/html.mjs";
import { renderDeck } from "../skills/glyph-kit/scripts/render/deck.mjs";
import { renderReport } from "../skills/glyph-kit/scripts/render/report.mjs";
import { renderMdx } from "../skills/glyph-kit/scripts/render/mdx.mjs";
import { figureSvg } from "../skills/glyph-kit/scripts/render/svg.mjs";
import { palette } from "../skills/glyph-kit/scripts/render/themes.mjs";
import { stillText } from "../skills/glyph-kit/scripts/motion.mjs";
import { lintBlock } from "../skills/glyph-kit/scripts/lint.mjs";
import { width } from "../skills/glyph-kit/scripts/text.mjs";

const spec = { kind: "funnel", lang: "de", title: "Besuche", source: "Sample data", data: [{ label: "Besuche", value: 12400 }, { label: "Käufe", value: 610 }] };
test("language reaches number formatting, summaries and moving stills", () => {
  for (const text of [body(spec), label(spec), stillText(spec)]) assert.match(text, /12\.400/);
  assert.match(body({ ...spec, kind: "barChart" }), /12\.400/);
});
test("Turkish uppercase reaches layouts and motion", () => {
  const board = { kind: "board", lang: "tr", data: { ilk: ["bir"], sonra: ["iki"] } };
  assert.match(body(board), /İLK/);
  const loop = { kind: "loop", lang: "tr", source: "Sample data", data: { stages: ["ilk", "sonra"] } };
  assert.match(stillText(loop), /İLK/);
  assert.match(body({ kind: "screen", lang: "tr", data: { rows: [{ type: "heading", text: "isim" }] } }), /İSİM/);
});
test("HTML exporters and MDX declare language", () => {
  const report = { title: "Bericht", lang: "de", sections: [{ title: "Zahlen", figures: [spec] }] };
  for (const html of [renderHtml(spec), renderLiveHtml(spec), renderDeck({ title: "Zahlen", lang: "de", slides: [spec] }), renderReport(report)]) assert.match(html, /<html lang="de">/);
  assert.match(renderMdx(spec), /lang: "de"/);
  assert.match(renderMdx(report), /lang: "de"/);
  assert.match(renderHtml([spec, { ...spec, lang: "tr" }]), /<pre lang="tr"/);
});
test("Cyrillic and CJK labels fit, lint clean, and SVG preserves wide cells", () => {
  for (const name of ["Посещения", "訪問者"]) {
    const text = body({ ...spec, data: [{ label: name, value: 12400 }] });
    assert.ok(text.split("\n").every(line => width(line) <= 80));
    assert.deepEqual(lintBlock(text).filter(p => p.level === "error"), []);
  }
  assert.match(figureSvg("訪問", { colors: palette("paper"), cell: 10 }).svg, /textLength="40"/);
  assert.ok(lintBlock("مرحبا").some(p => p.level === "info" && /RTL/.test(p.message)));
});
