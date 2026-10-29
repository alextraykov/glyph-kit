// Colour by role in the terminal: the 16 standard colours, a theme's own colours in 24-bit terminals,
// and the rule that every role still reads with the colour stripped.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ansi, ansiCodes, wantsColour } from "../skills/glyph-kit/scripts/render/ansi.mjs";
import { renderText } from "../skills/glyph-kit/scripts/render/text.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "../skills/glyph-kit/scripts/glyph-kit.mjs");
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
const contrast = {
  kind: "contrast",
  source: "Sample data, made up for this test",
  data: [
    { label: "ink on paper", fg: "#151513", bg: "#f7f6f1" },
    { label: "muted on paper", fg: "#b9b7ae", bg: "#f7f6f1" }
  ]
};

test("problems are red, passes green, lines dim, data in the terminal's own colour", () => {
  const out = ansi(renderText(contrast), { spec: contrast, env: {} });
  assert.match(out, /\x1b\[31mfails\x1b\[0m/);
  assert.match(out, /\x1b\[32mAAA\x1b\[0m/);
  assert.match(out, /\x1b\[2m[·┊]/);
  assert.doesNotMatch(out, /\x1b\[[0-9;]*m█/);
});

test("stripped of colour, the text is exactly the plain figure", () => {
  const dir = join(here, "../tools/examples");
  const specs = readdirSync(dir).flatMap((f) => [JSON.parse(readFileSync(join(dir, f), "utf8"))].flat(2)).filter((s) => s?.kind);
  assert.ok(specs.length > 50);
  for (const spec of specs) {
    const plain = renderText(spec);
    assert.equal(strip(ansi(plain, { spec, env: {} })), plain, spec.kind);
  }
  const plain = renderText(contrast);
  assert.equal(strip(ansi(plain, { spec: contrast, env: {} })), plain);
});

test("a theme's colours are used only where the terminal takes 24-bit colour", () => {
  assert.equal(ansiCodes("ink", {}).x, "\x1b[31m");
  assert.equal(ansiCodes("ink", { COLORTERM: "truecolor" }).x, "\x1b[38;2;239;124;86m");
  assert.equal(ansiCodes({ base: "paper", flag: "#9e2a12" }, { COLORTERM: "24bit" }).x, "\x1b[38;2;158;42;18m");
  assert.equal(ansiCodes(undefined, { COLORTERM: "truecolor" }).x, "\x1b[31m");
});

test("colour is on in a terminal, off with NO_COLOR, and the flags win", () => {
  assert.equal(wantsColour({ stream: { isTTY: true }, env: {} }), true);
  assert.equal(wantsColour({ stream: { isTTY: false }, env: {} }), false);
  assert.equal(wantsColour({ stream: { isTTY: true }, env: { NO_COLOR: "1" } }), false);
  assert.equal(wantsColour({ force: true, stream: { isTTY: false }, env: { NO_COLOR: "1" } }), true);
  assert.equal(wantsColour({ force: false, stream: { isTTY: true }, env: {} }), false);
});

test("the command line colours text with --color and leaves files and Markdown plain", () => {
  const dir = mkdtempSync(join(tmpdir(), "gk-ansi-"));
  try {
    const file = join(dir, "spec.json");
    writeFileSync(file, JSON.stringify(contrast));
    const run = (...args) => execFileSync("node", [cli, "render", file, ...args], { encoding: "utf8", env: { ...process.env, NO_COLOR: "" } });
    assert.match(run("--color"), /\x1b\[31mfails/);
    assert.doesNotMatch(run(), /\x1b\[/);
    assert.doesNotMatch(run("--to", "markdown", "--color"), /\x1b\[/);
    assert.doesNotMatch(run("--color", "--no-color"), /\x1b\[/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
