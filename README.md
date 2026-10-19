<p align="center"><img src="skills/glyph-kit/assets/icon.svg" width="72" height="72" alt=""></p>

# Glyph kit

**Get the point across clearly, cheaply, in an aesthetic that doesn't date.**

A skill for Claude Code and Codex that draws product-design work in four shades and a few lines: research results, funnels and tests, flows, roadmaps, wireframes, design-system docs, handoff checklists, motion specs and moving diagrams. The agent writes a small spec, and code draws the figure, so the bars always match their numbers. The same spec becomes Markdown for a PR, a deck you present, a report as a PDF, an SVG for a slide, or a prototype built with your design system.

```text
┌─────────────────┐
│   open export   │
└────────┬────────┘
         │
         ▼
┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐           ┌─────────────────┐
┆    has data?    ├─── no ───►│   empty state   │
└┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┘           │  → import data  │
         │ yes                └─────────────────┘
         ▼
╔═════════════════╗
║    download     ║
╚═════════════════╝
```

## Install

**Any agent** (Claude Code, Codex, Cursor and others):

```bash
npx skills add alextraykov/glyph-kit
```

**Claude Code**, as a plugin that updates:

```text
/plugin marketplace add alextraykov/glyph-kit
/plugin install glyph-kit@traykov
```

**By hand:** download the zip from the [latest release](https://github.com/alextraykov/glyph-kit/releases/latest) and unzip it into `~/.claude/skills/` (Claude Code) or `~/.agents/skills/` (Codex).

Then ask for what you need, the way you'd ask a colleague: "chart these usability results for the PR", "a wireframe for the notification settings", "a motion spec for the toast, including reduced motion".

## What it draws

| Area | Kinds |
|---|---|
| Research data | Likert answers, themes by participant, affinity counts, quote card, task results, journey feeling |
| Experiments and metrics | Funnel, retention cohorts, test result, metric panel, bar chart, comparison, forecast, meter, sparkline, heatmap, calendar strip |
| UX flows | Flow with decisions, linear flow, state machine, journey map, tree or sitemap |
| Planning | Now/next/later, impact and effort, swimlane, timeline, status key, decision log |
| Wireframes | Screen, responsive pair |
| Design system | Spacing scale, type scale, contrast check, component states, layer stack, token table, table |
| Handoff and QA | Spacing redline, QA checklist, before and after |
| Motion | Motion timing, motion intent, transition spec, stagger, frame strip, easing tokens |
| Moving diagrams | Rework loop, funnel, state machine, work queue, staged rollout, loading sequence |

See every one at **[traykov.cc/glyph-kit](https://traykov.cc/glyph-kit)**.

## Why text

- **Cheap to make.** A figure takes microseconds to draw and is a few hundred bytes, about 65× smaller than a screenshot of it.
- **Exact.** Code draws from the numbers, so a bar can't disagree with its value, and the same spec always gives the same figure.
- **Works anywhere text does.** PRs, tickets, READMEs, Slack, terminals, a model's context, print.
- **A baseline, not a dead end.** Agree the structure in text, then raise the same spec to a prototype, a deck, a report or production code.

What's measured and what isn't: [benefits](skills/glyph-kit/reference/benefits.md). Text tokens aren't measured yet, and the kit says so.

## Guardrails

- **No source, no numbers.** A figure with numbers needs a source.
- **Made-up data is stamped** SAMPLE DATA in every format.
- **Data from your files:** `"data": "@results.csv"`.
- **Each kind refuses data that can't be true**, in plain words.
- **Pass specs, not drawings,** between agents; `--compact` for plain ASCII when a drawing must go into a model's context.

## Without an agent

Node 18 or later, nothing to install:

```bash
node skills/glyph-kit/scripts/glyph-kit.mjs kinds
node skills/glyph-kit/scripts/glyph-kit.mjs render skills/glyph-kit/examples/research.json --to markdown
node skills/glyph-kit/scripts/glyph-kit.mjs export skills/glyph-kit/examples/reports/motion-audit.json --to pdf
```

## Contributing

Issues and ideas are welcome. Run `node --test skills/glyph-kit/scripts/*.test.mjs` before a pull request. The kit has no dependencies and keeps it that way.

## License

MIT. Made by [Alexander Traykov](https://traykov.cc). The story behind it: [Four characters](https://traykov.cc/notes/four-characters/).
