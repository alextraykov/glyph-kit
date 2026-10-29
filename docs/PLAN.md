# Plan

## Done

- 55 kinds in 9 areas: research data, experiments and metrics, UX flows, planning, wireframes, design system, handoff and QA, motion, and processes.
- The spec format, and renderers for text, Markdown, HTML prototypes and decks.
- The design-system map (template plus this portfolio's own as a worked example), and the spec-to-production guide with a worked Astro component.
- `lint.mjs` (frames and measured glyphs), `measure.mjs` (timings, sizes, image tokens), tests across every kind and renderer.
- Area guides generated from docs and examples, so they always show real output.
- Exports to Markdown, MDX (static, or components for Astro and React), HTML, SVG, PNG and PDF; a report format; four palettes and shared spacing tokens.
- Moving diagrams: a character grid that animates (34 kinds from a spec, plus the five hand-drawn diagrams from The price of pace), as a standalone HTML page or a still frame.

- Guardrails: no source, no numbers; SAMPLE DATA stamped on made-up data in every format; data from CSV and JSON files; per-kind data checks; compact ASCII; a token estimate and budget warning; real token counts in measure.mjs when an API key is set.
- Layout rules (padding, gaps, line height, density) with a checker.

- Language-aware formatting and export tags; Unicode cell widths, RTL guidance and bounded adversarial layouts.
- Motion as a kind capability; standalone/deck playback, site Play/Still control and portfolio integration.

## 0.3.0

Colour by role ships, in every form and in the terminal; two colour types, `palette` and `colourRoles`; figures that are easier to edit (`check`, redraw in place, read back); and clear guidelines for open source. Boards and the canvas stay out. Plan: `docs/handover/0.3.0-plan.md`. It takes items 3 and 8 below.

## Next

1. **Measure text tokens.** Run `ANTHROPIC_API_KEY=… node scripts/measure.mjs --write` and publish the numbers, whichever way they fall.
2. **Read-back.** Parse a drawn figure back into numbers and compare them with its spec.
3. **Parse text back into a spec.** Read a hand-edited wireframe or table back into JSON, so designers can edit the text and keep the spec in sync.
4. **More wireframe primitives:** navigation bar, sidebar, card grid, toast, form validation states, pagination.
5. **Component state pages.** Render a stateMatrix and the wireframe primitives into a page of real components through the map.
6. **npm package** of the scripts (ESM, no dependencies, typed with JSDoc).
7. **Figma bridge.** Export a screen spec to a Figma frame of auto-layout rows, and back.
8. **Terminal colour.** Optional ANSI colour that keeps meaning when colour is stripped.

9. **Code syntax (later release, outline only).** First expose a language-neutral CLI: `render - --to json` returns `{ kind, label, text, cols, rows, lang, moves, still? }`; `frames <spec> --steps N` emits JSON lines. Freeze golden per-kind fixtures under `tests/fixtures/` so ports prove byte-for-byte conformance and reuse the layout contract suite. Then consider `ports/python/glyph_kit/`, without packages, using `unicodedata.east_asian_width`: text grid first, motion later.

## Out of scope

- Charts that need colour or smooth curves to be read correctly.
- Image export beyond what a browser screenshot of the HTML gives.
