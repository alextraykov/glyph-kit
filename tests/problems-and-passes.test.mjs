// Problems and passes in every palette: the problem is the darker colour, the two stay apart in
// lightness, and both read as words, as drawn and as seen with weak red or weak green cones.
import assert from "node:assert/strict";
import { test } from "node:test";
import { PALETTES, contrastRatio, luminance } from "../skills/glyph-kit/scripts/render/themes.mjs";
import { seenWith } from "../tools/palette-figures.mjs";

const VIEWS = { "as drawn": (c) => c, "weak red": (c) => seenWith(c, "weak red"), "weak green": (c) => seenWith(c, "weak green") };
// On a light page both colours must be dark enough for words, so paper has less room.
const APART = { paper: 1.85 };

for (const [name, p] of Object.entries(PALETTES)) {
  test(`${name}: problems are darker than passes, and apart in lightness, in every view`, () => {
    for (const [view, seen] of Object.entries(VIEWS)) {
      const [flag, ok] = [seen(p.flag), seen(p.ok)];
      assert.ok(luminance(flag) < luminance(ok), `${view}: the problem colour is the darker one`);
      const apart = contrastRatio(flag, ok);
      assert.ok(apart >= (APART[name] ?? 2), `${view}: ${apart.toFixed(2)} to 1`);
    }
  });

  test(`${name}: problems and passes read as words on the page and the panel in every view`, () => {
    for (const [view, seen] of Object.entries(VIEWS)) {
      for (const role of ["flag", "ok"]) {
        for (const ground of ["bg", "panel"]) {
          const ratio = contrastRatio(seen(p[role]), seen(p[ground]));
          assert.ok(ratio >= 4.5, `${role} on ${ground}, ${view}: ${ratio.toFixed(2)} to 1`);
        }
      }
    }
  });
}
