#!/usr/bin/env node
// glyph-kit command line.
//
//   node glyph-kit.mjs render <spec.json | -> [--to text|markdown|html] [--compact] [--map design-system.map.json]
//                         (the file may hold one spec or a list of them)
//   node glyph-kit.mjs deck <deck.json | a.json b.json …> [--title "Name"] [--map …]   (HTML to stdout)
//   node glyph-kit.mjs kinds                                                  (lists every kind by area)
//   node glyph-kit.mjs live <spec.json> [--to html|text|markdown] [--theme name]   (a moving diagram)
//
//   node glyph-kit.mjs export <file> --to md|mdx|html|svg|png|pdf [--out path] [--theme name] [--map map.json]
//                         [--mdx component]   (the file may be a spec, a list of specs, a deck or a report)
//
// A spec is { "kind", "title"?, "intent"?, "source"?, "data", "options"? }. See reference/spec.md.
// "data" can be "@file.csv" or "@file.json", read from next to the spec. Numbers need a "source".
// --compact swaps shades and box characters for plain ASCII (for figures going into model context).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { htmlToPdf, svgToPng } from "./render/export.mjs";
import { renderMdx } from "./render/mdx.mjs";
import { renderReport, reportMarkdown } from "./render/report.mjs";
import { renderSvg } from "./render/svg.mjs";
import { AREAS } from "./registry.mjs";
import { renderDeck } from "./render/deck.mjs";
import { renderHtml } from "./render/html.mjs";
import { renderMarkdown, renderText } from "./render/text.mjs";
import { loadData } from "./data.mjs";
import { compact } from "./tokens.mjs";
import { renderLiveHtml } from "./live/html.mjs";
import { LIVE, live, stillText } from "./live/kinds.mjs";

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
  const to = flag("--to") ?? "text";
  const out = flag("--out");
  const theme = flag("--theme");
  const mdxMode = flag("--mdx") ?? "static";
  const mapFile = flag("--map");
  const title = flag("--title");
  const map = mapFile ? read(mapFile) : undefined;
  const [command, ...files] = args;

  if (command === "kinds") {
    for (const [area, { label, kinds }] of Object.entries(AREAS)) {
      console.log(`${label} (${area})`);
      for (const [kind, def] of Object.entries(kinds)) console.log(`  ${kind.padEnd(16)} ${def.label}`);
    }
    console.log("Moving diagrams (live)");
    for (const [kind, def] of Object.entries(LIVE)) console.log(`  ${kind.padEnd(16)} ${def.label}`);
  } else if (command === "live" && files.length === 1) {
    // Moving diagrams: an HTML page that plays, or the still frame as text for docs and tickets.
    const spec = read(files[0]);
    const text = () => (compactText ? compact(stillText(spec)) : stillText(spec));
    const outs = {
      html: () => renderLiveHtml(spec, { theme }),
      text,
      markdown: () => `**${spec.title ?? live(spec).label}**\n\n\`\`\`text\n${text()}\n\`\`\`\n\n${live(spec).summary}${spec.source ? ` Source: ${spec.source}` : ""}`
    };
    const render = outs[to === "md" ? "markdown" : to];
    if (!render) throw new Error(`--to must be html, text or markdown, not "${to}".`);
    process.stdout.write(render() + "\n");
  } else if (command === "render" && files.length === 1) {
    const spec = read(files[0]);
    const each = (fn) => (s) => (Array.isArray(s) ? s.map(fn).join("\n\n") : fn(s));
    const out = { text: each((s) => renderText(s, { compact: compactText })), markdown: each((s) => renderMarkdown(s, { compact: compactText })), html: (s) => renderHtml(s, { map, title }) }[to];
    if (!out) throw new Error(`--to must be text, markdown or html, not "${to}".`);
    process.stdout.write(out(spec) + (to === "html" ? "" : "\n"));
  } else if (command === "export" && files.length === 1) {
    const doc = read(files[0]);
    const kind = doc.sections ? "report" : doc.slides ? "deck" : "figures";
    const specs = kind === "report" ? doc.sections.flatMap((s) => s.figures ?? []) : kind === "deck" ? doc.slides.filter((s) => s.kind) : [doc].flat();
    const stem = out ? out.replace(extname(out), "") : join(dirname(files[0]), basename(files[0], extname(files[0])));
    const write = (path, content) => (mkdirSync(dirname(path), { recursive: true }), writeFileSync(path, content), path);
    // Anything that isn't a report becomes one for PDF, so a single chart still prints as a page.
    const asReport = () => (kind === "report" ? doc : { title: doc.title ?? specs[0]?.title ?? "Figures", theme: theme ?? doc.theme, sections: [{ title: doc.title ?? "Figures", figures: specs }] });
    const written = [];
    if (to === "md") written.push(write(`${stem}.md`, kind === "report" ? reportMarkdown(doc) : specs.map((s) => renderMarkdown(s)).join("\n\n")));
    else if (to === "mdx") written.push(write(`${stem}.mdx`, renderMdx(kind === "report" ? doc : specs, { mode: mdxMode, theme: theme ?? doc.theme ?? "paper" })));
    else if (to === "html") written.push(write(`${stem}.html`, kind === "report" ? renderReport(doc, { theme }) : kind === "deck" ? renderDeck(doc, { map }) : renderHtml(doc, { map, title })));
    else if (to === "svg" || to === "png") {
      specs.forEach((spec, i) => {
        const svg = renderSvg(spec, { theme: theme ?? doc.theme ?? "paper" });
        const path = specs.length === 1 ? `${stem}.${to}` : `${stem}-${String(i + 1).padStart(2, "0")}.${to}`;
        if (to === "svg") written.push(write(path, svg));
        else (mkdirSync(dirname(path), { recursive: true }), written.push(svgToPng(svg, path)));
      });
    } else if (to === "pdf") {
      mkdirSync(dirname(`${stem}.pdf`), { recursive: true });
      written.push(htmlToPdf(kind === "deck" ? renderDeck(doc, { map }) : renderReport(asReport(), { theme }), `${stem}.pdf`));
    } else throw new Error(`--to must be md, mdx, html, svg, png or pdf, not "${to}".`);
    console.log(written.join("\n"));
  } else if (command === "deck" && files.length) {
    // One deck file ({ title, slides }), or any number of spec files whose specs become slides.
    const loaded = files.map(read);
    const deck = loaded.length === 1 && !Array.isArray(loaded[0]) && loaded[0].slides ? loaded[0] : loaded.flat();
    process.stdout.write(renderDeck(deck, { title, map }));
  } else {
    console.error("Usage:\n  glyph-kit.mjs render <spec.json | -> [--to text|markdown|html] [--compact] [--map map.json]\n  glyph-kit.mjs export <file> --to md|mdx|html|svg|png|pdf [--out path] [--theme paper|ink|phosphor|gilt]\n  glyph-kit.mjs deck <deck.json | spec.json…> [--title name] [--map map.json]\n  glyph-kit.mjs live <spec.json> [--to html|text|markdown] [--theme paper|ink|phosphor|gilt]\n  glyph-kit.mjs kinds");
    process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
