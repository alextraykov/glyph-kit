---
name: glyph-kit
description: Draws product-design figures as text with block (░▒▓█) and box-drawing characters - research and survey results, funnels and A/B tests, UX flows and state machines, roadmaps, screen wireframes, design-system docs, handoff and QA checklists, motion specs and moving diagrams. Use for an ASCII or Unicode diagram, text wireframe, sparkline or bar chart in Markdown, a PR, a ticket or a doc; a design review deck; a report or audit as a PDF; or turning a text wireframe into an HTML prototype or components from the project's design system. Draws from a small JSON spec with real, sourced data and exports Markdown, MDX, HTML, SVG, PNG and PDF.
license: MIT
metadata:
  version: "0.1.0"
  author: Alexander Traykov
  homepage: https://traykov.cc/glyph-kit
---

# Glyph kit

Every artifact is a **spec** (`{ kind, title, intent, source, data, options }`) rendered by a generator with no dependencies. Text is the first fidelity; the same spec becomes an HTML prototype, a deck, and through the project's design-system map, production code.

## Pick the area, read only its guide

| The task is about | Read |
|---|---|
| Interviews, surveys, usability tests, quotes, journeys | `reference/areas/research.md` |
| Funnels, retention, A/B results, metrics, everyday charts | `reference/areas/metrics.md` |
| User flows with decisions, state machines, journey maps, sitemaps | `reference/areas/flows.md` |
| Roadmaps, priorities, ownership, timelines, decisions | `reference/areas/planning.md` |
| Screens and layouts | `reference/areas/wireframes.md` |
| Tokens, scales, contrast, component states, layers | `reference/areas/systems.md` |
| Redlines, QA checklists, before and after | `reference/areas/handoff.md` |
| Motion intent, timing, transitions, stagger, easing | `reference/areas/motion.md` |

Each guide lists its kinds with when to use them, a real example, the spec that made it, and what to watch for. `node scripts/glyph-kit.mjs kinds` lists them all.

## Make one

1. Pick the kind from the area guide. Don't invent a new visual vocabulary per document.
2. Write the spec as JSON, next to the document that uses it. Put real data in `data`, say where it came from in `source`, and say why the artifact exists in `intent`. When the data is in a file, point at it (`"data": "@results.csv"`) instead of copying numbers. **Never invent data.** If numbers are missing, ask for them. Only if the user wants a sketch anyway, start `source` with "Illustrative": the figure is then stamped SAMPLE DATA in every format. A spec with numbers and no source is refused.
3. Render:

   ```bash
   node scripts/glyph-kit.mjs render spec.json --to markdown          # for docs, PRs, tickets
   node scripts/glyph-kit.mjs render spec.json --to html --map design-system.map.json
   node scripts/glyph-kit.mjs deck a.json b.json --title "Review"      # one HTML deck
   ```

   Or import `scripts/render/*.mjs` in a build step or an MDX component and render at build time.
   For a presentation, write a deck file (title, sections, specs with `present` steps) and run `node scripts/glyph-kit.mjs deck deck.json > deck.html`. See "Presenting: decks" in `reference/spec.md` and `examples/decks/export-review.json`.
4. Put the conclusion in the sentence around the figure. The figure supports it; it doesn't replace it.
5. Run the checks below.

For layout-only figures that no kind covers (a one-off diagram), draw by hand with the glyphs in `reference/characters.md` and run `scripts/lint.mjs` on the file.

## Export

`node scripts/glyph-kit.mjs export <file> --to md|mdx|html|svg|png|pdf [--theme paper|ink|phosphor|gilt]` writes any form from a spec, a list, a deck or a report. When the output has to read like a finished document (a research readout, an audit, a design review), write a report file: a cover, a summary, numbered sections with a takeaway each, and figures. PDF and PNG use a Chromium browser already on the machine; the rest need nothing. Read `reference/export.md` before exporting.

## Moving diagrams

When the point is a process over time (work flowing and coming back, people leaving a funnel, a queue backing up, a rollout and its guard, a state machine, a loading sequence), use a moving diagram: `node scripts/glyph-kit.mjs live spec.json --to html` writes one page that plays, with a still frame for reduced motion; `--to markdown` gives the still for docs and tickets. Kinds: `loop`, `funnel`, `states`, `queue`, `rollout`, `loading`. Read `reference/live.md` for each kind's data. Say what the motion shows in the sentence next to it; the still must make the same point.

## Going up in fidelity

Read `reference/fidelity.md` before building a prototype or code from a spec, and `reference/spec.md` for the spec fields and the design-system map. The short version for production: use only components and tokens the map names, ask when the map has no entry, turn wireframe notes into behaviour, and implement the motion card's reduced-motion still.

## Rules

0. **Ask, don't invent; pass specs, not drawings.** Data comes from the user or their files, never from you. Between steps, and when another agent or a later turn needs the figure, pass the spec (a few hundred bytes of JSON), not the drawing. Render only when a person will look at it. If a drawing must go into a model's context, use `--compact` (plain ASCII, same layout).
1. **Every glyph has a referent**: a number, a state or a structure. Decoration goes.
2. **One meaning per glyph per document.** `█` measured or done, `░` projected, empty scale or missing, `·` empty cell. Legends say so when it isn't obvious.
3. **Numbers come from data** and are printed as text next to the glyphs.
4. **A positive value never draws as empty**, and the empty part of a scale stays visible.
5. **Show the source** under every figure with numbers.
6. **No costume.** No green-on-black, glyph rain or scrambled headlines unless the product is a terminal.
7. **Stay in the measured glyph set** (`reference/characters.md`); `scripts/lint.mjs` enforces it.
8. **Follow the layout rules** (`reference/layout.md`) for anything drawn by hand: two cells of padding inside a box, text centred in a box that shares a column's width, four cells between boxes, and `▓` only for what is current, measured or done. Structure is lines.

## Checks before handing over

- [ ] `node scripts/lint.mjs <file.md>` passes: frames close, every glyph is one cell wide, no text touches its box. Read its token warnings.
- [ ] Every figure with numbers has a real `source`, or says it is illustrative and carries the SAMPLE DATA stamp.
- [ ] Every figure has a description: the Markdown and HTML renderers add one; plain text needs a sentence next to it.
- [ ] Values appear as text, not only as lengths.
- [ ] The font renders every glyph at one cell (width check in `reference/characters.md`). If figures look misaligned where the user reads them, suggest Departure Mono (free, departuremono.com); never require a font.
- [ ] Nothing wider than about 80 columns unless it scrolls in its own box.
- [ ] Motion specs say what reduced motion shows.

## Files

- `reference/areas/*.md`: one guide per area (generated by `scripts/build-reference.mjs` from `scripts/docs.mjs` and `examples/`).
- `reference/layout.md`, `reference/spec.md`, `reference/export.md`, `reference/live.md`, `reference/fidelity.md`, `reference/characters.md`.
- `scripts/glyph-kit.mjs`: the command line. `scripts/core.mjs` and `scripts/areas/*.mjs`: the generators. `scripts/render/`: text, HTML, deck.
- `scripts/lint.mjs`.
- `templates/design-system.map.example.json`, `examples/` (moving diagrams, decks, a report, and `examples/product/` taken from spec to code). Each area guide carries the spec behind every figure it shows.
