// The command line: guide prints a usable spec for every kind, cut labels are listed on stderr.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { KINDS } from "../skills/glyph-kit/scripts/registry.mjs";

const cli = join(dirname(fileURLToPath(import.meta.url)), "../skills/glyph-kit/scripts/glyph-kit.mjs");
const run = (args, input) => spawnSync("node", [cli, ...args], { encoding: "utf8", input });

test("guide prints each kind's spec, which renders", () => {
  for (const kind of Object.keys(KINDS)) {
    const r = run(["guide", kind]);
    assert.equal(r.status, 0, `${kind}: ${r.stderr}`);
    assert.doesNotMatch(r.stdout, /```text/, `${kind} guide carries no drawing`);
    const spec = JSON.parse(r.stdout.match(/```json\n([\s\S]*?)```/)[1]);
    assert.equal(spec.kind, kind);
    const drawn = run(["render", "-"], JSON.stringify({ ...spec, source: "Illustrative" }));
    assert.equal(drawn.status, 0, `${kind}: ${drawn.stderr}`);
  }
});

test("guide covers decks, reports and the spec, and names the kinds when it doesn't know one", () => {
  for (const topic of ["deck", "report", "spec"]) assert.match(run(["guide", topic]).stdout, /^## /);
  const r = run(["guide", "pie"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Unknown kind "pie"\. Known kinds: .*branchFlow/);
});

test("labels cut to fit are listed on stderr with their limit; stdout is unchanged", () => {
  const spec = { kind: "branchFlow", data: [{ label: "Start" }, { label: "Link opened within 1 hour", type: "decision", no: { label: "Link expired", to: "Start" } }, { label: "Done" }] };
  const r = run(["render", "-"], JSON.stringify(spec));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /…/);
  assert.match(r.stderr, /24 cells: "Link opened within 1 hour\?"/);
  const short = run(["render", "-"], JSON.stringify({ ...spec, data: [spec.data[0], { ...spec.data[1], label: "Opened within 1 hour" }, spec.data[2]] }));
  assert.equal(short.stderr, "");
  assert.doesNotMatch(short.stdout, /…/);
});
