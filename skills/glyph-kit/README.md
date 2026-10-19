# Glyph kit

A text-mode design, report and presentation kit for product designers, and a skill for Claude Code and Codex.

Research findings, metrics, flows, roadmaps, wireframes, design-system docs, handoff checklists and motion specs, drawn as plain text from a small JSON spec. The same spec exports as Markdown, MDX, HTML, SVG, PNG or PDF: a report that reads like a finished document, a deck you can present, a working prototype, or production code built with your design system's real components.

```text
╔═ Settings ═════════════════════════════════╗
║  Profile │ Notifications │ Billing         ║
║           ━━━━━━━━━━━━━━━                  ║
║ Email me when a report is ready   [ ■] on  ║ [1]
║ Weekly summary                    [■ ] off ║
║ Digest day  [ Monday                    ▼] ║
╠════════════════════════════════════════════╣
║                     [ Cancel ]  [[ Save ]] ║ [2]
╚════════════════════════════════════════════╝
```

## Install the skill

```bash
npx skills add alextraykov/glyph-kit                # any agent: Claude Code, Codex, Cursor…
```

In Claude Code, as a plugin: `/plugin marketplace add alextraykov/glyph-kit`, then `/plugin install glyph-kit@traykov`.

**Font, recommended:** [Departure Mono](https://departuremono.com), free under the SIL Open Font License. It draws every block and box character at exactly one cell, so figures line up. Any monospace font that covers ░▒▓█ and box drawing works; the kit doesn't require it.

By hand, copy this folder into a skills directory:

| Tool | For you | For one repository |
|---|---|---|
| Claude Code | `~/.claude/skills/glyph-kit/` | `.claude/skills/glyph-kit/` |
| Codex | `~/.agents/skills/glyph-kit/` | `.agents/skills/glyph-kit/` |

## Use it without an agent

Node 18 or later, nothing to install.

```bash
node scripts/glyph-kit.mjs kinds                                   # 45 kinds in 8 areas
node scripts/glyph-kit.mjs render examples/product/settings.spec.json --to markdown
node scripts/glyph-kit.mjs render examples/product/settings.spec.json --to html > settings.html
node scripts/glyph-kit.mjs deck examples/decks/export-review.json > deck.html   # a 16-slide review
```

Export any form:

```bash
node scripts/glyph-kit.mjs export examples/reports/motion-audit.json --to pdf     # an A4 report
node scripts/glyph-kit.mjs export examples/reports/motion-audit.json --to svg --theme ink   # one SVG per figure
node scripts/glyph-kit.mjs export examples/reports/motion-audit.json --to mdx --mdx component
```

Moving diagrams (work loops, funnels, queues, rollouts, state machines, loading sequences) play as one HTML page, or print their still frame:

```bash
node scripts/glyph-kit.mjs live examples/live/review-queue.json --to html > queue.html
node scripts/glyph-kit.mjs live examples/live/save-states.json --to markdown
```

PDF and PNG use a Chromium browser already on the machine (see `reference/export.md`).

## Guardrails

Made-up numbers can't pass as real: a spec with numbers and no `source` is refused, an "Illustrative" source stamps SAMPLE DATA on the figure in every format, `"data": "@results.csv"` reads numbers from your file, and each kind refuses data that can't be true (a funnel that grows, dates out of order). For model context, pass the spec, or render with `--compact` for plain ASCII. See `reference/benefits.md`.

The generators also import directly, in Node or a browser:

```js
import { funnel } from "./scripts/areas/metrics.mjs";
import { renderMarkdown } from "./scripts/render/text.mjs";
```

## Areas

| Area | Kinds |
|---|---|
| Research data | Likert answers, themes by participant, affinity counts, quote cards, task results, journey feeling |
| Experiments and metrics | funnel, retention cohorts, test result with intervals, metric panel, bar chart, comparison, forecast, meter, sparkline, heatmap, calendar strip |
| UX flows | flow with decisions, state machine, journey map, linear flow, tree or sitemap |
| Planning | now/next/later, impact and effort, swimlane, timeline, status key, decision log |
| Wireframes | screen from 18 primitives (with dialogs and notes), responsive pair |
| Design system | spacing scale, type scale, contrast check, component states, layer stack, token table, table |
| Handoff and QA | spacing redline, QA checklist, before and after |
| Motion | intent card, transition spec, stagger, frame strip, motion timing, easing tokens |

## Checks

```bash
node --test tests/*.test.mjs            # from the repository: generators, renderers, lint
node scripts/lint.mjs reference/areas/*.md
node tools/measure.mjs                  # timings, sizes, image tokens (and text tokens with credentials)
node tools/build-reference.mjs          # regenerate the area guides after a change
```

## Licence

MIT, see `LICENSE`. The history of the characters, with screenshots under their own licences, is in the repository: [docs/history.md](https://github.com/alextraykov/glyph-kit/blob/main/docs/history.md).
