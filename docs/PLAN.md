# Plan

## Done

- 45 kinds in 8 areas: research data, experiments and metrics, UX flows, planning, wireframes, design system, handoff and QA, motion.
- The spec format, and renderers for text, Markdown, HTML prototypes and decks.
- The design-system map (template plus this portfolio's own as a worked example), and the spec-to-production guide with a worked Astro component.
- `lint.mjs` (frames and measured glyphs), `measure.mjs` (timings, sizes, image tokens), tests across every kind and renderer.
- Area guides generated from docs and examples, so they always show real output.
- Exports to Markdown, MDX (static, or components for Astro and React), HTML, SVG, PNG and PDF; a report format; four palettes and shared spacing tokens.
- Moving diagrams: a character grid that animates (six kinds from a spec, plus the five hand-drawn diagrams from The price of pace), as a standalone HTML page or a still frame.

- Guardrails: no source, no numbers; SAMPLE DATA stamped on made-up data in every format; data from CSV and JSON files; per-kind data checks; compact ASCII; a token estimate and budget warning; real token counts in measure.mjs when an API key is set.
- Layout rules (padding, gaps, line height, density) with a checker.

## Next

1. **Measure text tokens.** Run `ANTHROPIC_API_KEY=… node scripts/measure.mjs --write` and publish the numbers, whichever way they fall.
2. **Read-back.** Parse a drawn figure back into numbers and compare them with its spec.
3. **Parse text back into a spec.** Read a hand-edited wireframe or table back into JSON, so designers can edit the text and keep the spec in sync.
4. **More wireframe primitives:** navigation bar, sidebar, card grid, toast, form validation states, pagination.
5. **Component state pages.** Render a stateMatrix and the wireframe primitives into a page of real components through the map.
6. **npm package** of the scripts (ESM, no dependencies, typed with JSDoc).
7. **Figma bridge.** Export a screen spec to a Figma frame of auto-layout rows, and back.
8. **Terminal colour.** Optional ANSI colour that keeps meaning when colour is stripped.

## Out of scope

- Charts that need colour or smooth curves to be read correctly.
- Image export beyond what a browser screenshot of the HTML gives.
