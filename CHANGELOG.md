# Changelog

Glyph kit follows [semantic versioning](https://semver.org). Before 1.0, a minor version may change the spec format; the change is listed here with what to update.

## Unreleased

- **A test result can move.** Give `abResult` readings over time (`{ days, readings: [{ day, people, variants }] }`) and it steps through them: the intervals narrow, numbers change in place, and the verdict switches when the intervals part. Its still is the last reading, with a line saying how long they overlapped or that an early gap closed. Without readings it stays exactly as before.
- **Every type moves.** In HTML pages and decks, each type arrives once in the order that carries its point, then stays still: bars at one speed so the longest lands last, diagrams growing from their start along their lines, tables in reading order, journeys stage by stage, a before and after changing into its after, and the motion types playing their own timing at real speed. A small ↺ plays a figure again. Steps are 40ms and a figure settles within about 600ms. Reduced motion, print, Markdown and text are unchanged.
- **Motion timing and easing tokens play in HTML.** Each row gets its own box, all starting together, so 150ms against 200ms, or one curve against another, can be felt. Easing tokens play over 500ms.
- **Motion checked against animations.dev.** Moving diagrams redraw once per 120ms step instead of between cells, and only the one most in view plays. Deck titles and commands appear whole; the deck camera and its dimming share 450ms on one steep curve. Prototype buttons answer a press, hover is shorter and only fires where hover exists, reduced motion keeps colour fades, and motion demos move with transform and play when scrolled into view.
- Existing specs need no changes.

## 0.2.0 — 2026-10-19

- **Smaller install.** The skill holds only what an agent needs; pre-rendered pages, screenshots, tests and build tools moved out of it. The zip goes from 495 KB to 136 KB, and the plugin installs only `skills/glyph-kit`.
- **Labels in any script.** Widths count display cells, so Chinese, Japanese and Korean take two and graphemes stay whole. The lint accepts letters from any script and flags mixed right-to-left text.
- **`lang`.** An optional language tag, like `"de"` or `"tr"`: numbers get local separators, uppercase follows the language, and HTML, decks, reports and MDX declare it.
- **Bounded layouts.** Every figure fits in 80 cells. Long labels are cut at 24 cells with `…`; more than 16 rows end with "… and N more rows"; a layout that can't fit says so in plain words.
- **Moving diagrams.** The six processes (loop, funnel, states, queue, rollout, loading) sit in a Processes area with their own guide, 50 kinds in nine areas in all. They move exactly as before and start from their still. A funnel accepts a list of steps or `{steps: [...]}`. Everything else stays still.
- **Standalone moving pages** embed Departure Mono (with its SIL OFL notice) so they line up offline, and have a Still button to pause them.
- **Tests** generate awkward inputs for every kind (very long, empty, wide) and check each fits, lints clean and keeps its labels; language tests cover German, Turkish, Cyrillic and CJK.
- Existing specs need no changes. Regenerate standalone pages to get the pause button and the font.

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
