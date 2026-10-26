import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inline, markdownToHtml, parseChangelog, releaseId, longDate } from "../site/src/changelog.mjs";

test("inline Markdown: bold, code, links, and escaping", () => {
  assert.equal(inline("**Motion** moves"), "<strong>Motion</strong> moves");
  assert.equal(inline("run `guide <type>`"), "run <code>guide &lt;type&gt;</code>");
  assert.equal(inline("`**not bold**`"), "<code>**not bold**</code>");
  assert.equal(inline("[semver](https://semver.org)"), '<a href="https://semver.org" target="_blank" rel="noopener">semver</a>');
  assert.equal(inline("[guide](/how-to-use/)"), '<a href="/how-to-use/">guide</a>');
  assert.equal(inline("a < b & \"c\""), "a &lt; b &amp; &quot;c&quot;");
  assert.equal(inline("**`lang`.**"), "<strong><code>lang</code>.</strong>");
});

test("block Markdown: headings, paragraphs, lists and group headings", () => {
  const html = markdownToHtml(["# Title", "", "One line", "and its wrap.", "", "**Motion**", "", "- first", "  carried on", "- second", "", "After."].join("\n"));
  assert.equal(html, [
    "<h1>Title</h1>",
    "<p>One line and its wrap.</p>",
    "<h3>Motion</h3>",
    "<ul><li>first carried on</li><li>second</li></ul>",
    "<p>After.</p>"
  ].join("\n"));
  assert.equal(markdownToHtml("## Sub", { shift: 1 }), "<h3>Sub</h3>");
  assert.equal(markdownToHtml("Lead in\n- item"), "<p>Lead in</p>\n<ul><li>item</li></ul>");
  assert.equal(markdownToHtml("**Bold** start of a sentence."), "<p><strong>Bold</strong> start of a sentence.</p>");
});

test("the changelog splits into releases, newest first, each with an anchor", () => {
  const { intro, releases } = parseChangelog("# Changelog\n\nIntro.\n\n## 0.1.0 — 2026-10-19\n\nFirst.\n\n## 0.10.0 — 2027-01-02\n\nTenth.\n\n## 0.2.0\n\nSecond.\n");
  assert.equal(intro, "Intro.");
  assert.deepEqual(releases.map((r) => [r.version, r.date, r.id, r.body]), [
    ["0.10.0", "2027-01-02", "v0-10-0", "Tenth."],
    ["0.2.0", null, "v0-2-0", "Second."],
    ["0.1.0", "2026-10-19", "v0-1-0", "First."]
  ]);
  assert.throws(() => parseChangelog("## Unreleased\n"), /not a version heading/);
  assert.equal(releaseId("1.0.0-beta.1"), "v1-0-0-beta-1");
  assert.equal(longDate("2026-10-20"), "20 October 2026");
});

test("CHANGELOG.md parses: every release, and nothing left as raw Markdown", () => {
  const { releases } = parseChangelog(readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8"));
  assert.deepEqual(releases.slice(-2).map((r) => r.version), ["0.2.0", "0.1.0"]);
  for (const r of releases) {
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/, `${r.version} has a date`);
    const html = markdownToHtml(r.body);
    assert.doesNotMatch(html.replace(/<code>.*?<\/code>/g, ""), /\*\*|`|\]\(|^- /m, `${r.version} has no Markdown left over`);
    assert.match(html, /<li>/);
  }
});
