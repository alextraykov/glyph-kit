// Writes reference/areas/<area>.md from docs.mjs and examples/<area>.json, so the guides always show
// real output, and reference/benefits.md from reference/measurements.json (scripts/measure.mjs --write).
// Run after changing a generator, a doc or an example: node scripts/build-reference.mjs
import { compact, estimateTextTokens } from "./tokens.mjs";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AREA_DOCS, KIND_DOCS } from "./docs.mjs";
import { AREAS } from "./registry.mjs";
import { body, label } from "./render/text.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "reference/areas"), { recursive: true });

for (const [area, { label: areaLabel, kinds }] of Object.entries(AREAS)) {
  const examples = JSON.parse(readFileSync(join(root, "examples", `${area}.json`), "utf8"));
  const out = [
    `# ${areaLabel}`,
    "",
    AREA_DOCS[area],
    "",
    `Examples: \`examples/${area}.json\`. Render any of them with \`node scripts/glyph-kit.mjs render examples/${area}.json --to markdown\` (or \`--to html\`).`,
    ""
  ];
  for (const [kind, def] of Object.entries(kinds)) {
    const doc = KIND_DOCS[kind] ?? {};
    const spec = examples.find((s) => s.kind === kind);
    out.push(`## ${def.label}`, "", `\`kind: "${kind}"\``, "");
    if (doc.when) out.push(`**Use it for** ${doc.when.charAt(0).toLowerCase()}${doc.when.slice(1)}`, "");
    if (spec) {
      out.push("```text", body(spec), "```", "", `*${label(spec)}*`, "");
      out.push("<details><summary>Spec</summary>", "", "```json", JSON.stringify({ kind: spec.kind, data: spec.data, ...(spec.options ? { options: spec.options } : {}) }, null, 2), "```", "", "</details>", "");
    }
    if (doc.traps) out.push(`**Watch for:** ${doc.traps}`, "");
  }
  writeFileSync(join(root, "reference/areas", `${area}.md`), out.join("\n"));
  console.log(`reference/areas/${area}.md`);
}

// Benefits, from the saved measurements.
const measurements = join(root, "reference/measurements.json");
if (existsSync(measurements)) {
  const d = JSON.parse(readFileSync(measurements, "utf8"));
  const r = d.rows;
  const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const kb = (b) => (b / 1024).toFixed(1) + " KB";
  const pick = ["sparkline", "funnel", "likert", "stateMachine", "screen", "branchFlow", "impactEffort", "intentCard"];
  const rows = pick.map((k) => r.find((x) => x.kind === k)).filter(Boolean);
  const tbl = rows.map((x) => `| ${x.kind} | ${x.us.toFixed(1)} μs | ${x.textBytes} B | ${kb(x.htmlBytes)} | ${kb(x.pngBytes)} (${x.pngSize}) | ${x.imageTokens} |`).join("\n");
  // Text tokens: the real count when measure.mjs had an API key, otherwise the estimate, labelled as one.
  const figures = Object.keys(AREAS).flatMap((a) => JSON.parse(readFileSync(join(root, "examples", `${a}.json`), "utf8"))).map((s) => body(s));
  const tokenRow = r.every((x) => typeof x.textTokens === "number")
    ? `| Text tokens | Median **${med(r.map((x) => x.textTokens))}** tokens as text and **${med(r.map((x) => x.compactTokens))}** in compact form, against ${med(r.map((x) => x.imageTokens))} for the image, counted with Anthropic's token-counting endpoint. ${r.filter((x) => x.textTokens > x.imageTokens).length} of ${r.length} figures cost more as text than as an image. |`
    : `| Text tokens | **Not measured yet**: counting needs an API key (\`ANTHROPIC_API_KEY\`), which this run didn't have. A rough estimate (\`scripts/tokens.mjs\`: one token per block or box character, one per run of spaces, one per four other characters) puts these figures at a median of about **${med(figures.map(estimateTextTokens))}** tokens, and **${med(figures.map((f) => estimateTextTokens(compact(f))))}** in compact form. That's a guess, not a claim: block characters are rare and three bytes each, so a dense figure can cost more as text than as an image. |`;
  const md = `# Benefits, measured

What the kit is good for, measured on its own ${r.length} example specs, and what it isn't good for. Re-run \`node scripts/measure.mjs\` after changing anything. The numbers below were measured on ${d.measured} with that script on a laptop, in Node and in Chromium through Playwright.

## Measured

| Claim | Result |
|---|---|
| Fast to compute | Median **${med(r.map((x) => x.us)).toFixed(1)} μs** to generate a figure in Node; the slowest kind took ${Math.max(...r.map((x) => x.us)).toFixed(1)} μs. Nothing runs on a GPU and nothing is drawn to pixels. |
| Small | Median **${med(r.map((x) => x.textBytes))} bytes** as text. The same figure as a PNG screenshot (2× density, cropped to the figure) has a median of **${kb(med(r.map((x) => x.pngBytes)))}**, about ${med(r.map((x) => x.pngBytes / x.textBytes)).toFixed(0)}× larger. As a self-contained HTML page: median ${kb(med(r.map((x) => x.htmlBytes)))}, most of it the shared stylesheet. |
| Image tokens | Those PNGs cost **${Math.min(...r.map((x) => x.imageTokens))}–${Math.max(...r.map((x) => x.imageTokens))} image tokens** each (median ${med(r.map((x) => x.imageTokens))}) by Anthropic's formula, ⌈width ÷ 28⌉ × ⌈height ÷ 28⌉, whatever the figure says. |
${tokenRow}

Selected rows:

| Kind | Generate | Text | HTML page | PNG | Image tokens |
|---|---|---|---|---|---|
${tbl}

## True by construction

- **Reviewable.** A changed figure shows up in a diff as the changed line. A changed image is two thumbnails.
- **Deterministic.** The same spec always gives the same characters, so figures can be tested like code (\`scripts/*.test.mjs\`).
- **Works anywhere text does.** README, ticket, PR comment, terminal, chat code block, an email inside a code block, print.
- **Readable and editable by a model.** The value next to a bar is text, so it's read exactly rather than estimated from pixels, and an agent changes the spec and regenerates instead of redrawing.
- **Structure before style.** A text wireframe can only say what's there and in what order, so hierarchy and content get decided before colour and type can distract from them.
- **A baseline for higher fidelity.** The same spec becomes an HTML prototype, a deck and, through the design-system map, production code (\`reference/fidelity.md\`).
- **No tool lock-in.** Specs are JSON, figures are text, the generator has no dependencies.
- **Accessible from the start.** Every figure gets a generated description, and the HTML form uses real elements.

## Guardrails

Made-up numbers must never look real, and drawings shouldn't fill a model's context.

- **No source, no numbers.** A spec whose data holds numbers is refused without a \`source\`.
- **Sample data is stamped.** A source that starts with "Illustrative" or "Sample" puts SAMPLE DATA on the figure in every format: text, Markdown, MDX, SVG, PNG, PDF, decks, prototypes and moving diagrams.
- **Data from files.** \`"data": "@results.csv"\` reads the numbers from your file, not from a model's memory, and the source line names the file.
- **Each kind checks its data.** A funnel that grows, a value outside its range, a timeline that ends before it starts or dates out of order are refused with a sentence that says what's wrong.
- **Ask, don't invent.** The skill tells the agent to ask for missing data, or to mark it illustrative.
- **Agents pass specs, people see drawings.** A spec is a few hundred bytes of plain JSON. Drawings are made when a person needs one; \`--compact\` gives plain ASCII for the times a drawing has to go into a model's context, and the checker warns when a figure likely costs more as text than as an image.

## Limits

- **No colour nuance.** Anything whose meaning depends on hue, gradients or fine spatial detail needs a real chart or a real mockup.
- **Font coverage.** Many code fonts lack block and box characters, and the grid breaks when the browser substitutes them (\`reference/characters.md\`).
- **Width.** Past about 80 columns a figure stops fitting a code block, a phone or a PR comment.
- **Polish.** It's the wrong artefact for someone who needs to see the finished look; move up a fidelity instead.
- **Screen readers** read raw glyphs aloud unless the figure has a label. The HTML and Markdown forms add one; bare text can't.
`;
  writeFileSync(join(root, "reference/benefits.md"), md);
  console.log("reference/benefits.md");
}
