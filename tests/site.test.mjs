import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cellsFromText, planBuild, buildFrame } from "../site/src/showcase-core.mjs";
import { renderLiveHtml } from "../skills/glyph-kit/scripts/live/html.mjs";
import { motionFactory, motionCanvas, staggerDelay } from "../skills/glyph-kit/scripts/motion/shared.mjs";

test("site counters retain locale and wide-label coordinates", () => {
  const box = cellsFromText("訪問 12.400", () => []);
  const plan = planBuild(box, { lang: "de" });
  assert.equal(box.ch[0].length, 11);
  assert.equal(buildFrame(box, plan, plan.total).ch[0].join(""), "訪問 12.400");
});
test("new chart timing uses the shared clock and curved delays", () => {
  let time;
  const { make } = motionFactory(motionCanvas("test"), (_, t) => { time = t; });
  make()(30, 0);
  assert.equal(time, 180);
  assert.ok(staggerDelay(1, 4) > staggerDelay(2, 4) - staggerDelay(1, 4));
});
test("standalone exports reuse Departure Mono and offer a stop control", () => {
  const spec = JSON.parse(readFileSync(new URL("../skills/glyph-kit/examples/live/rework-loop.json", import.meta.url)));
  const html = renderLiveHtml(spec);
  assert.match(html, /font-family:"Departure Mono"/);
  assert.match(html, /data:font\/woff2;base64,/);
  assert.match(html, /data-play aria-pressed="true"/);
  assert.match(html, /stop\(\); stop = null/);
});
test("the site dims every receded role the painter gives, ramp steps included", () => {
  const css = readFileSync(new URL("../site/src/style.css", import.meta.url), "utf8");
  for (const role of ["m", "m1", "m2", "m3", "m4"]) assert.match(css, new RegExp(`\\.gk-${role}[ ,][^}]*opacity: \\.28`), role);
});
