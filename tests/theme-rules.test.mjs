// How a theme's colours relate: the four rules as notes, the theme derived from one hue, and both in
// check, the command line and every rendered form.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { mixedTheme, relations, resolveTheme } from "../skills/glyph-kit/scripts/render/themes.mjs";
import { hexOf, oklch } from "../skills/glyph-kit/scripts/render/oklch.mjs";
import { checkDoc } from "../skills/glyph-kit/scripts/check.mjs";
import { renderHtml } from "../skills/glyph-kit/scripts/render/html.mjs";
import { renderSvg } from "../skills/glyph-kit/scripts/render/svg.mjs";
import { renderDeck } from "../skills/glyph-kit/scripts/render/deck.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "../skills/glyph-kit/scripts/glyph-kit.mjs");
const metrics = JSON.parse(readFileSync(join(here, "../tools/examples/metrics.json"), "utf8"));
const funnel = metrics.find((s) => s.kind === "funnel");
const heatmap = metrics.find((s) => s.kind === "heatmap");

// A good theme to break one rule at a time: blue data on a light page, derived from one hue.
const good = mixedTheme(240, false);
const shifted = (hex, change) => {
  const o = { ...oklch(hex) };
  Object.assign(o, change(o));
  return hexOf(o.l, o.c, o.h);
};
const notes = (colors, ramp = good.ramp) => relations({ ...good.colors, ...colors }, ramp);

test("a theme that keeps the four rules gets no notes", () => {
  assert.deepEqual(notes({}), []);
});

test("rule 1: a ramp that drifts off the data hue, or ends away from data, gets a note", () => {
  const drift = good.ramp.map((c, i) => (i < 3 ? shifted(c, (o) => ({ h: o.h - 120 })) : c));
  assert.match(notes({}, drift).join("\n"), /^Ramp steps 1, 2 and 3 .* off the data hue, so the grid reads as more than one colour\. #\w+, #\w+ and #\w+ fit\.$/m);
  const end = [...good.ramp.slice(0, 3), shifted(good.colors.data, (o) => ({ l: o.l + 0.2 }))];
  assert.match(notes({}, end).join("\n"), /The ramp's strongest step #\w+ isn't the data colour #\w+, so █ in a grid and █ in a bar mean different things\./);
});

test("rule 2: problems close to data, or quieter than data, get a note", () => {
  const near = shifted(good.colors.flag, (o) => ({ h: oklch(good.colors.data).h + 60 }));
  assert.match(notes({ flag: near }).join("\n"), /^Problems \(#\w+\) are \d+° from data \(#\w+\) round the colour wheel.*Opposite data is 150° to 210° away\. A flag of #\w+ fits\.$/m);
  const loud = shifted(good.colors.data, (o) => ({ c: oklch(good.colors.flag).c + 0.05 }));
  assert.match(notes({ data: loud }).join("\n"), /^Data \(#\w+\) is as colourful as problems \(#\w+\) or more, so it draws the eye first\. Only problems may out-shout data\./m);
});

test("rule 3: passes as light as problems, or as colourful, get a note with an ok or flag that fits", () => {
  const f = oklch(good.colors.flag);
  const same = shifted(good.colors.ok, () => ({ l: f.l + 0.02 }));
  const said = notes({ ok: same }).find((n) => /apart in lightness/.test(n));
  assert.match(said, /^Problems \(#\w+\) and passes \(#\w+\) are 0\.\d\d apart in lightness, so they read the same without colour\. (An ok|A flag) of #\w+ fits\.$/);
  const [, role, fix] = said.match(/(ok|flag) of (#\w+) fits/);
  assert.ok(!notes({ ok: same, [role]: fix }).some((n) => /apart in lightness/.test(n)), "the colour it suggests fits");
  assert.match(notes({ ok: shifted(good.colors.ok, () => ({ c: f.c + 0.03 })) }).join("\n"), /Passes \(#\w+\) are (as colourful as problems|more colourful than data)/);
});

test("rule 4: neutrals off the data hue get one note, with colours that fit", () => {
  const borrowed = shifted(good.colors.panel, (o) => ({ h: o.h + 120, c: 0.03 }));
  assert.match(notes({ panel: borrowed }).join("\n"), /^The panel colour isn't the data hue at low chroma \(#\w+ is \d+° off\), so it looks borrowed from another theme\. #\w+ fits\.$/m);
});

test("grey data leaves the hue rules out", () => {
  const grey = { data: "#5a5a5a", panel: "#f3e9e9" };
  assert.ok(!notes(grey, null).some((n) => /data hue|round the colour wheel/.test(n)));
});

test("a theme from one hue keeps every rule and contrast check, light and dark, round the wheel", () => {
  for (let hue = 0; hue < 360; hue += 30)
    for (const base of ["paper", "ink"]) {
      const t = resolveTheme({ base, mixed: hue });
      assert.deepEqual(t.warnings, [], `${base} ${hue}`);
      assert.equal(t.dark, base === "ink");
      assert.equal(t.ramp.length, 4);
      assert.equal(t.ramp[3], t.colors.data);
    }
});

test("a mixed theme takes a colour or degrees, by name too, and refuses grey", () => {
  assert.deepEqual(resolveTheme("mixed:#7a5cff:dark").colors, resolveTheme({ base: "ink", mixed: "#7a5cff" }).colors);
  assert.equal(resolveTheme("mixed:285").dark, false);
  assert.throws(() => resolveTheme({ mixed: "#808080" }), /#808080 is grey, so it has no hue to build a mixed theme from/);
  assert.throws(() => resolveTheme({ mixed: "violet" }), /A mixed theme starts from one colour/);
  // A role beside mixed replaces the derived one, and is checked like any other.
  assert.equal(resolveTheme({ base: "ink", mixed: 285, flag: "#ff5a3c" }).colors.flag, "#ff5a3c");
  assert.throws(() => resolveTheme({ mixed: 285, flag: "#ffeeee" }), /Words in this colour need 4\.5 to 1/);
});

test("a palette name on its own gets no notes; colours you choose do", () => {
  for (const name of ["paper", "ink", "phosphor", "gilt"]) assert.deepEqual(resolveTheme(name).warnings, []);
  assert.ok(resolveTheme({ base: "paper", flag: "#b8391a" }).warnings.some((n) => /apart in lightness/.test(n)));
});

test("the mixed theme draws in HTML, SVG and decks", () => {
  const t = resolveTheme({ base: "ink", mixed: 285 });
  const theme = { base: "ink", mixed: 285 };
  assert.match(renderHtml(funnel, { theme }), new RegExp(`--gk-data:${t.colors.data}`));
  assert.match(renderSvg(heatmap, { theme }), new RegExp(`fill="${t.ramp[1]}"`));
  assert.match(renderDeck([funnel], { theme }), new RegExp(`--gk-deck-data:${t.colors.data}`));
});

test("check lists a theme's notes, on its own, on a deck and with --theme", () => {
  const bad = { base: "paper", flag: "#b8391a" };
  const own = checkDoc(bad);
  assert.equal(own[0].where, "The theme");
  assert.equal(own[0].level, "warn");
  assert.deepEqual(checkDoc({ base: "ink", mixed: 285 }), []);
  assert.ok(checkDoc({ title: "D", theme: bad, slides: [funnel] }).some((p) => p.where === "The deck's theme"));
  assert.ok(checkDoc(funnel, { theme: bad }).some((p) => p.where === "The theme" && p.level === "warn"));
  assert.equal(checkDoc({ flag: "#ffeeee" })[0].level, "error");
});

test("the command line takes mixed:#hex and lists notes on stderr, and check exits 0 on notes", () => {
  const dir = mkdtempSync(join(tmpdir(), "gk-rules-"));
  try {
    writeFileSync(join(dir, "spec.json"), JSON.stringify(funnel));
    writeFileSync(join(dir, "theme.json"), JSON.stringify({ base: "paper", flag: "#b8391a" }));
    const mixed = spawnSync("node", [cli, "render", join(dir, "spec.json"), "--to", "html", "--theme", "mixed:#7a5cff:dark"], { encoding: "utf8" });
    assert.equal(mixed.status, 0);
    assert.match(mixed.stdout, new RegExp(`--gk-data:${resolveTheme("mixed:#7a5cff:dark").colors.data}`));
    assert.doesNotMatch(mixed.stderr, /Notes on the theme's colours/);
    const noted = spawnSync("node", [cli, "render", join(dir, "spec.json"), "--to", "html", "--theme", join(dir, "theme.json")], { encoding: "utf8" });
    assert.equal(noted.status, 0);
    assert.match(noted.stderr, /Notes on the theme's colours:\n {2}Problems \(#b8391a\)/);
    const check = spawnSync("node", [cli, "check", join(dir, "theme.json")], { encoding: "utf8" });
    assert.equal(check.status, 0);
    assert.match(check.stdout + check.stderr, /apart in lightness/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
