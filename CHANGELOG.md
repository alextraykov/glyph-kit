# Changelog

Glyph kit follows [semantic versioning](https://semver.org). Before 1.0, a minor version may change the spec format; the change is listed here with what to update.

## 0.2.0 — 2026-10-19

- Optional `motion` and `lang` fields; locale-aware numbers, casing and export language tags.
- 55 kinds in nine areas. 34 kinds move: 24 existing chart/flow/plan kinds, five legacy processes and five new processes.
- The process area adds handoff, retry, cache, split and incident. `states` remains a legacy alias.
- `funnel` accepts both a step list and `{steps: [...]}`; legacy object specs keep moving by default in the builder.
- `len` counts display cells, including two-cell CJK and whole grapheme clusters. Lint accepts letters from any script and reports mixed RTL text.
- Bounded layouts: 80 cells, explicit cuts and omitted-row counts, stable moving grids.
- Existing Departure Mono reused in standalone HTML and decks; chart timing follows the kit clock and curved row delays; Play/Still controls.
- Site and portfolio builders preserve motion through edits. No dependencies or additional fonts.
- Existing specs require no changes. Regenerate standalone pages to receive the new player, styling and language handling.

## 0.1.0 — 2026-10-19

First public release.

- **45 kinds of figure in 8 areas:** research data, experiments and metrics, UX flows, planning, wireframes, design system, handoff and QA, motion. Drawn by code from a small JSON spec, not by the model.
- **6 moving diagrams:** rework loop, funnel, state machine, work queue, staged rollout and loading sequence, as one HTML page that plays, or a still for docs.
- **Exports:** text, Markdown, MDX (static, or components for Astro and React), HTML prototypes, presentable decks, A4 reports as PDF, SVG and PNG. Four palettes.
- **Design-system map:** the agent builds screens with your real components and tokens.
- **Data guardrails:** no source, no numbers; made-up data is stamped SAMPLE DATA in every format; data read from CSV or JSON files; each kind refuses data that can't be true.
- **Token guardrails:** pass specs, not drawings; `--compact` plain ASCII for model context; a token estimate and a warning when text likely costs more than an image.
- **Layout rules and a checker:** measured characters, closed frames, padding inside boxes, one line height, a density scale.
- **Install** as a Claude Code plugin, with `npx skills add`, or by copying the folder for Claude Code or Codex.
