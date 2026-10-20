# Benefits, measured

What the kit is good for, measured on its own 57 example specs, and what it isn't good for. Re-run `node scripts/measure.mjs` after changing anything. The numbers below were measured on 2026-10-20 with that script on a laptop, in Node and in Chromium through Playwright.

## Measured

| Claim | Result |
|---|---|
| Fast to compute | Median **7.1 μs** to generate a figure in Node; the slowest type took 178.8 μs. Nothing runs on a GPU and nothing is drawn to pixels. |
| Small | Median **478 bytes** as text. The same figure as a PNG screenshot (2× density, cropped to the figure) has a median of **19.2 KB**, about 41× larger. As a self-contained HTML page: median 46.8 KB, most of it the shared stylesheet. |
| Image tokens | Those PNGs cost **204–1295 image tokens** each (median 608) by Anthropic's formula, ⌈width ÷ 28⌉ × ⌈height ÷ 28⌉, whatever the figure says. |
| Text tokens | **Not measured yet**: counting needs an API key (`ANTHROPIC_API_KEY`), which this run didn't have. A rough estimate (`scripts/tokens.mjs`: one token per block or box character, one per run of spaces, one per four other characters) puts these figures at a median of about **145** tokens, and **89** in compact form. That's a guess, not a claim: block characters are rare and three bytes each, so a dense figure can cost more as text than as an image. |

Selected rows:

| Type | Generate | Text | HTML page | PNG | Image tokens |
|---|---|---|---|---|---|
| sparkline | 0.9 μs | 88 B | 46.6 KB | 6.2 KB (664×236) | 216 |
| funnel | 6.3 μs | 440 B | 45.5 KB | 19.9 KB (1300×336) | 564 |
| likert | 7.1 μs | 589 B | 51.6 KB | 44.1 KB (1404×404) | 765 |
| stateMachine | 79.5 μs | 983 B | 50.9 KB | 19.9 KB (1420×504) | 918 |
| screen | 13.1 μs | 985 B | 47.8 KB | 53.7 KB (1060×836) | 1140 |
| branchFlow | 68.8 μs | 1330 B | 53.7 KB | 32.9 KB (1028×978) | 1295 |
| impactEffort | 28.3 μs | 853 B | 46.7 KB | 29.3 KB (956×910) | 1155 |
| intentCard | 5.2 μs | 905 B | 47.4 KB | 29.5 KB (1112×540) | 800 |

## True by construction

- **Reviewable.** A changed figure shows up in a diff as the changed line. A changed image is two thumbnails.
- **Deterministic.** The same spec always gives the same characters, so figures can be tested like code (`scripts/*.test.mjs`).
- **Works anywhere text does.** README, ticket, PR comment, terminal, chat code block, an email inside a code block, print.
- **Readable and editable by a model.** The value next to a bar is text, so it's read exactly rather than estimated from pixels, and an agent changes the spec and regenerates instead of redrawing.
- **Structure before style.** A text wireframe can only say what's there and in what order, so hierarchy and content get decided before colour and type can distract from them.
- **A baseline for higher fidelity.** The same spec becomes an HTML prototype, a deck and, through the design-system map, production code (`reference/fidelity.md`).
- **No tool lock-in.** Specs are JSON, figures are text, the generator has no dependencies.
- **Accessible from the start.** Every figure gets a generated description, and the HTML form uses real elements.

## Guardrails

Made-up numbers must never look real, and drawings shouldn't fill a model's context.

- **No source, no numbers.** A spec whose data holds numbers is refused without a `source`.
- **Sample data is stamped.** A source that starts with "Illustrative" or "Sample" puts SAMPLE DATA on the figure in every format: text, Markdown, MDX, SVG, PNG, PDF, decks, prototypes and moving diagrams.
- **Data from files.** `"data": "@results.csv"` reads the numbers from your file, not from a model's memory, and the source line names the file.
- **Each type checks its data.** A funnel that grows, a value outside its range, a timeline that ends before it starts or dates out of order are refused with a sentence that says what's wrong.
- **Ask, don't invent.** The skill tells the agent to ask for missing data, or to mark it illustrative.
- **Agents pass specs, people see drawings.** A spec is a few hundred bytes of plain JSON. Drawings are made when a person needs one; `--compact` gives plain ASCII for the times a drawing has to go into a model's context, and the checker warns when a figure likely costs more as text than as an image.

## Limits

- **No colour nuance.** Anything whose meaning depends on hue, gradients or fine spatial detail needs a real chart or a real mockup.
- **Font coverage.** Many code fonts lack block and box characters, and the grid breaks when the browser substitutes them (`reference/characters.md`).
- **Width.** Past about 80 columns a figure stops fitting a code block, a phone or a PR comment.
- **Polish.** It's the wrong artefact for someone who needs to see the finished look; move up a fidelity instead.
- **Screen readers** read raw glyphs aloud unless the figure has a label. The HTML and Markdown forms add one; bare text can't.
