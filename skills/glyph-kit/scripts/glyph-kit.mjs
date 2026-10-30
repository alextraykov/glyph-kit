#!/usr/bin/env node
// glyph-kit command line.
//
//   node glyph-kit.mjs render <spec.json | -> [--to text|markdown|html] [--compact] [--map design-system.map.json] [--theme name|mixed:#hex|theme.json] [--color | --no-color]
//                         (the file may hold one spec or a list of them)
//   node glyph-kit.mjs deck <deck.json | a.json b.json …> [--title "Name"] [--map …]   (HTML to stdout)
//   node glyph-kit.mjs types                                                  (lists every type by area; `kinds` works too)
//   node glyph-kit.mjs guide <kind | deck | report | spec>                    (one kind's example spec and notes)
//   node glyph-kit.mjs live <spec.json> [--to html|text|markdown] [--theme name|mixed:#hex|theme.json]   (a moving diagram)
//
//   node glyph-kit.mjs say "An email field. A Send button." [--to json]       (plain words to a screen spec)
//   node glyph-kit.mjs check <spec.json | deck.json | theme.json | file.md> [--theme …]   (every problem at once; exits 1 on a problem)
//   node glyph-kit.mjs redraw <file.md> [--check]                             (draw figures again from the specs kept beside them)
//   node glyph-kit.mjs read <file.md> [--check]                               (read edited drawings back into their specs)
//
//   node glyph-kit.mjs export <file> --to md|mdx|html|svg|png|pdf [--out path] [--theme name|mixed:#hex|theme.json] [--map map.json]
//                         [--mdx component]   (the file may be a spec, a list of specs, a deck or a report)
//
// A spec is { "kind", "title"?, "intent"?, "source"?, "data", "options"? }. See reference/spec.md.
// "data" can be "@file.csv" or "@file.json", read from next to the spec. Numbers need a "source".
// --compact swaps shades and box characters for plain ASCII (for figures going into model context).
// Labels cut to fit are listed on stderr, with the cells they had, so they can be shortened.
// Each command loads only the modules it needs, so a call starts quickly.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadData } from "./data.mjs";
import { cutLog } from "./text.mjs";
import { themeLog } from "./render/themes.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
// Specs may point at their data: "data": "@results.csv" is read from next to the spec file.
const bool = (name) => {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};
const read = (file) => loadData(JSON.parse(readFileSync(file === "-" ? 0 : file, "utf8")), file === "-" ? process.cwd() : dirname(file));

try {
  const compactText = bool("--compact");
  const withSpec = bool("--with-spec");
  const checkOnly = bool("--check");
  // Colour in the terminal: on when the output is a terminal and NO_COLOR isn't set; --color and --no-color win.
  const [colourOn, colourOff] = [bool("--color"), bool("--no-color")];
  const colourFlag = colourOff ? false : colourOn || undefined;
  const to = flag("--to") ?? "text";
  const out = flag("--out");
  const themeArg = flag("--theme");
  // A palette name, "mixed:#7a5cff" or "mixed:#7a5cff:dark", or a theme file: { base?, mixed?, <role>: "#hex", ramp? } (reference/colour.md).
  const theme = themeArg?.endsWith(".json") ? read(themeArg) : themeArg;
  const mdxMode = flag("--mdx") ?? "static";
  const mapFile = flag("--map");
  const title = flag("--title");
  const map = mapFile ? read(mapFile) : undefined;
  const [command, ...files] = args;

  if (command === "say" && files.length) {
    // Plain words to a screen: "An email field. A Send button." The spec, then its drawing.
    const { read: readWords, apply, screenSpec } = await import("./say.mjs");
    const { renderText } = await import("./render/text.mjs");
    const initial = { kind: "screen", data: { title: "", rows: [] } };
    const spec = screenSpec(apply(initial, readWords(files.join(" "), initial)));
    if (to === "json") process.stdout.write(JSON.stringify(spec, null, 2) + "\n");
    else process.stdout.write(renderText(spec) + "\n\n" + JSON.stringify(spec, null, 2) + "\n");
  } else if (command === "types" || command === "kinds") {
    const { AREAS } = await import("./registry.mjs");
    const { moves } = await import("./motion.mjs");
    for (const [area, { label, kinds }] of Object.entries(AREAS)) {
      console.log(`${label} (${area})`);
      for (const [kind, def] of Object.entries(kinds)) console.log(`  ${kind.padEnd(16)} ${def.label}${moves(kind) ? " (moves)" : ""}`);
    }
  } else if (command === "guide" && files.length === 1) {
    // One kind's section of its area guide, without the drawing: what it's for, its spec, what to watch.
    const ref = join(dirname(fileURLToPath(import.meta.url)), "../reference");
    const section = (file, heading) => {
      const lines = readFileSync(join(ref, file), "utf8").split("\n");
      const start = lines.findIndex((l) => l === heading);
      const end = lines.findIndex((l, i) => i > start && /^## /.test(l));
      return lines.slice(start, end < 0 ? undefined : end).join("\n").trim();
    };
    const topics = { spec: ["spec.md", "## A spec"], deck: ["spec.md", "## Presenting: decks"], report: ["export.md", "## Reports"] };
    const name = files[0];
    if (topics[name]) console.log(section(...topics[name]));
    else {
      const { KINDS } = await import("./registry.mjs");
      const def = KINDS[name];
      if (!def) throw new Error(`Unknown type "${name}". Known types: ${Object.keys(KINDS).join(", ")}; or guide deck, report, spec.`);
      const lines = readFileSync(join(ref, "areas", `${def.area}.md`), "utf8").split("\n");
      const at = lines.indexOf(`\`kind: "${name}"\``);
      const start = lines.slice(0, at).findLastIndex((l) => /^## /.test(l));
      const end = lines.findIndex((l, i) => i > at && /^## /.test(l));
      const text = lines.slice(start, end < 0 ? undefined : end).join("\n");
      console.log(text.replace(/```text\n[\s\S]*?```\n\n(\*[^\n]*\*\n\n)?/, "").replace(/<\/?details>(<summary>Spec<\/summary>)?\n\n/g, "").trim());
    }
  } else if (command === "live" && files.length === 1) {
    // Moving diagrams: an HTML page that plays, or the still frame as text for docs and tickets.
    const { compact } = await import("./tokens.mjs");
    const { renderLiveHtml } = await import("./live/html.mjs");
    const { live, stillText } = await import("./live/kinds.mjs");
    const spec = read(files[0]);
    const text = () => (compactText ? compact(stillText(spec)) : stillText(spec));
    const { ansi, wantsColour } = await import("./render/ansi.mjs");
    const outs = {
      html: () => renderLiveHtml(spec, { theme: theme ?? spec.theme, map }),
      text: () => (wantsColour({ force: colourFlag }) ? ansi(text(), { spec, theme }) : text()),
      markdown: () => `**${spec.title ?? live(spec).label}**\n\n\`\`\`text\n${text()}\n\`\`\`\n\n${live(spec).summary}${spec.source ? ` Source: ${spec.source}` : ""}`
    };
    const render = outs[to === "md" ? "markdown" : to];
    if (!render) throw new Error(`--to must be html, text or markdown, not "${to}".`);
    process.stdout.write(render() + "\n");
  } else if (command === "check" && files.length === 1) {
    // Every problem at once: the data, the drawing and the text. Exits 1 when there is a problem.
    const { checkDoc, checkMarkdown, report } = await import("./check.mjs");
    const md = /\.(md|markdown)$/i.test(files[0]);
    const problems = md ? checkMarkdown(readFileSync(files[0], "utf8"), files[0]) : checkDoc(read(files[0]), { theme });
    if (problems.length) console.log(report(problems));
    else console.log("No problems.");
    process.exitCode = problems.some((p) => p.level === "error") ? 1 : 0;
  } else if ((command === "redraw" || command === "read") && files.length === 1) {
    // redraw: draw each figure in a Markdown file again from its spec. read: read edited drawings
    // back into their specs. --check changes nothing and exits 1 when a figure is out of date.
    const { figures, readEdits, redraw } = await import("./markdown.mjs");
    const source = readFileSync(files[0], "utf8");
    const result = command === "redraw" ? redraw(source, files[0]) : readEdits(source, files[0]);
    const done = command === "redraw" ? result.changed : result.read;
    for (const p of result.problems) console.log(`problem  Line ${p.line}: ${p.message}`);
    if (checkOnly) {
      for (const line of done) console.log(`out of date  Line ${line}`);
      const count = figures(source, files[0]).length;
      if (!done.length && !result.problems.length) console.log(count === 1 ? "The figure matches its spec." : `All ${count} figures match their specs.`);
      process.exitCode = done.length || result.problems.length ? 1 : 0;
    } else {
      if (result.source !== source) writeFileSync(files[0], result.source);
      const verb = command === "redraw" ? "Drew again" : "Read back";
      if (done.length) console.log(`${verb}: ${done.map((l) => `line ${l}`).join(", ")}.`);
      else if (!result.problems.length) console.log(command === "redraw" ? "Every figure already matches its spec." : "No drawing was edited.");
      for (const f of result.files ?? []) console.log(`Wrote ${f}`);
      process.exitCode = result.problems.length ? 1 : 0;
    }
  } else if (command === "render" && files.length === 1) {
    const { renderMarkdown, renderText } = await import("./render/text.mjs");
    const { renderHtml } = to === "html" ? await import("./render/html.mjs") : {};
    const spec = read(files[0]);
    const each = (fn) => (s) => (Array.isArray(s) ? s.map(fn).join("\n\n") : fn(s));
    const { ansi, wantsColour } = to === "text" ? await import("./render/ansi.mjs") : {};
    const colour = to === "text" && wantsColour({ force: colourFlag });
    const out = { text: each((s) => (colour ? ansi(renderText(s, { compact: compactText }), { spec: s, theme }) : renderText(s, { compact: compactText }))), markdown: each((s) => renderMarkdown(s, { compact: compactText, withSpec })), html: (s) => renderHtml(s, { map, theme, title }) }[to];
    if (!out) throw new Error(`--to must be text, markdown or html, not "${to}".`);
    process.stdout.write(out(spec) + (to === "html" ? "" : "\n"));
  } else if (command === "export" && files.length === 1) {
    const { renderMarkdown } = await import("./render/text.mjs");
    const { renderReport, reportMarkdown } = await import("./render/report.mjs");
    const { renderMdx } = to === "mdx" ? await import("./render/mdx.mjs") : {};
    const { renderSvg } = to === "svg" || to === "png" ? await import("./render/svg.mjs") : {};
    const { htmlToPdf, svgToPng } = to === "pdf" || to === "png" ? await import("./render/export.mjs") : {};
    const { renderDeck } = to === "html" || to === "pdf" ? await import("./render/deck.mjs") : {};
    const { renderHtml } = to === "html" ? await import("./render/html.mjs") : {};
    const { isLayout } = await import("./areas/layouts.mjs");
    const doc = read(files[0]);
    const kind = doc.sections ? "report" : doc.slides ? "deck" : "figures";
    // One layout, or a list of layouts: one document in the kit's type, a layout to a page.
    const layouts = [doc].flat().length > 0 && [doc].flat().every(isLayout);
    const { renderLayoutPages } = layouts && (to === "html" || to === "pdf") ? await import("./render/page.mjs") : {};
    const specs = kind === "report" ? doc.sections.flatMap((s) => s.figures ?? []) : kind === "deck" ? doc.slides.filter((s) => s.kind) : [doc].flat();
    const stem = out ? out.replace(extname(out), "") : join(dirname(files[0]), basename(files[0], extname(files[0])));
    const write = (path, content) => (mkdirSync(dirname(path), { recursive: true }), writeFileSync(path, content), path);
    // Anything that isn't a report becomes one for PDF, so a single chart still prints as a page.
    const asReport = () => (kind === "report" ? doc : { title: doc.title ?? specs[0]?.title ?? "Figures", theme: theme ?? doc.theme, sections: [{ title: doc.title ?? "Figures", figures: specs }] });
    const written = [];
    if (to === "md") written.push(write(`${stem}.md`, kind === "report" ? reportMarkdown(doc) : specs.map((s) => renderMarkdown(s, { withSpec })).join("\n\n")));
    else if (to === "mdx") written.push(write(`${stem}.mdx`, renderMdx(kind === "report" ? doc : specs, { mode: mdxMode, theme: theme ?? doc.theme ?? "paper" })));
    else if (to === "html" && layouts) written.push(write(`${stem}.html`, renderLayoutPages(doc, { theme, title, map })));
    else if (to === "html") written.push(write(`${stem}.html`, kind === "report" ? renderReport(doc, { theme, map }) : kind === "deck" ? renderDeck(doc, { map, theme }) : renderHtml(doc, { map, theme, title })));
    else if (to === "svg" || to === "png") {
      specs.forEach((spec, i) => {
        const svg = renderSvg(spec, { theme: theme ?? spec.theme ?? doc.theme ?? "paper", map });
        const path = specs.length === 1 ? `${stem}.${to}` : `${stem}-${String(i + 1).padStart(2, "0")}.${to}`;
        if (to === "svg") written.push(write(path, svg));
        else (mkdirSync(dirname(path), { recursive: true }), written.push(svgToPng(svg, path)));
      });
    } else if (to === "pdf") {
      mkdirSync(dirname(`${stem}.pdf`), { recursive: true });
      written.push(htmlToPdf(layouts ? renderLayoutPages(doc, { theme, title, map }) : kind === "deck" ? renderDeck(doc, { map, theme }) : renderReport(asReport(), { theme, map }), `${stem}.pdf`));
    } else throw new Error(`--to must be md, mdx, html, svg, png or pdf, not "${to}".`);
    console.log(written.join("\n"));
  } else if (command === "deck" && files.length) {
    // One deck file ({ title, slides }), or any number of spec files whose specs become slides.
    const { renderDeck } = await import("./render/deck.mjs");
    const loaded = files.map(read);
    const deck = loaded.length === 1 && !Array.isArray(loaded[0]) && loaded[0].slides ? loaded[0] : loaded.flat();
    process.stdout.write(renderDeck(deck, { title, map, theme }));
  } else {
    console.error("Usage:\n  glyph-kit.mjs render <spec.json | -> [--to text|markdown|html] [--compact] [--map map.json] [--theme name|mixed:#hex|theme.json]\n  glyph-kit.mjs export <file> --to md|mdx|html|svg|png|pdf [--out path] [--theme name|mixed:#hex|theme.json] [--map map.json]\n  glyph-kit.mjs deck <deck.json | spec.json…> [--title name] [--map map.json] [--theme name|mixed:#hex|theme.json]\n  glyph-kit.mjs live <spec.json> [--to html|text|markdown] [--theme name|mixed:#hex|theme.json]\n  glyph-kit.mjs say \"An email field. A Send button.\" [--to json]\n  glyph-kit.mjs check <spec.json | deck.json | theme.json | file.md> [--theme …]\n  glyph-kit.mjs redraw <file.md> [--check]\n  glyph-kit.mjs read <file.md> [--check]\n  glyph-kit.mjs kinds\n  glyph-kit.mjs guide <kind | deck | report | spec>");
    process.exit(1);
  }
  if (cutLog.size)
    console.error(`Cut to fit, shown with "…" in the figure. Shorten these to the cells given:\n${[...cutLog].map(([text, cells]) => `  ${cells} cells: ${JSON.stringify(text)}`).join("\n")}`);
  // How the theme's colours relate: notes, not refusals (check lists them itself).
  if (themeLog.size && command !== "check") console.error(`Notes on the theme's colours:\n${[...themeLog].map((w) => `  ${w}`).join("\n")}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
