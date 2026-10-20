# Changelog

Glyph kit follows [semantic versioning](https://semver.org). Before 1.0, a minor version may change the spec format; the change is listed here with what to update.

## 0.2.0 — 2026-10-20

**Motion**

- **Every type moves.** In HTML pages and decks, each type arrives once in the order that carries its point, then stays still: bars at one speed so the longest lands last, diagrams growing from their start along their lines, tables in reading order, journeys stage by stage, a before and after changing into its after. A small ↺ plays a figure again. Steps are 40ms and a figure settles within about 600ms. Reduced motion, print, Markdown and text show the figure as it is.
- **Six processes keep moving:** loop, funnel, states, queue, rollout and loading, in a Processes area with their own guide. They move exactly as in 0.1.0 and start from their still. A funnel accepts a list of steps or `{steps: [...]}`.
- **A test result can move.** Give `abResult` readings over time (`{ days, readings: [{ day, people, variants }] }`) and it steps through them: the intervals narrow, numbers change in place, and the verdict switches when the intervals part. Without readings it is drawn as before.
- **Motion timing and easing play at real speed.** Each row gets its own box, all starting together, so 150ms against 200ms, or one curve against another, can be felt.
- **Steadier playback.** Moving diagrams redraw once per 120ms step, and only the one most in view plays. Deck titles appear whole; prototype buttons answer a press; hover only fires where hover exists.
- **Standalone moving pages** embed Departure Mono (with its SIL OFL notice) so they line up offline, have a Still button to pause them, and carry only the code their types need: the loop page drops from 206 KB to 110 KB.

**Layouts**

- **Document layouts.** Five new types put a whole deliverable on one page: `readout`, `dashboard`, `prSummary`, `designReview` and `statusUpdate`. Each has fixed slots: a sentence, short lists and ordinary specs. Code places everything within 80 cells; figures share a row only when they fit with a 4-cell gap. HTML and PDF give one page in Departure Mono and the kit's palette, and a list of layouts exports as one document, a layout to a page. Guide: `reference/areas/layouts.md`.
- **Screen layouts.** `appShell` (header, sidebar, content), `cardGrid`, `listDetail` and `modal` place the screen primitives in regions inside one frame.
- **Bounded layouts.** Every figure fits in 80 cells. Long labels are cut at 24 cells with `…`; more than 16 rows end with "… and N more rows"; a layout that can't fit says so in plain words.
- **Stacked marks get room.** Rows of bars, tracks and curves have a blank row between them; the state machine draws its transitions in lanes.

**A cheaper skill**

- **Less to read.** SKILL.md has the types picker inline and one render-and-fix loop (7.9 KB to 6.6 KB); area guides use tighter JSON (75 KB to 65 KB). `glyph-kit.mjs guide <type>` prints one type's spec and notes without reading a whole guide.
- **Right first time.** Labels cut with `…` are listed on stderr with their limit, so the agent can shorten them. The agent works in the user's folder, not the skill's.
- **Faster.** The command line loads only what a command needs; text that is only ASCII, box drawing and blocks skips Unicode segmentation, so figures draw about 4× faster.
- **Reports show the figure as text** in Departure Mono, coloured by role, so the page copies as text. The example report goes from 73 KB to 46 KB.
- **Smaller install.** The skill holds only what an agent needs; the zip goes from 495 KB to 136 KB, and the plugin installs only `skills/glyph-kit`.

**Language**

- **Labels in any script.** Widths count display cells, so Chinese, Japanese and Korean take two and graphemes stay whole. The lint flags mixed right-to-left text.
- **`lang`.** An optional language tag, like `"de"` or `"tr"`: numbers get local separators, uppercase follows the language, and HTML, decks, reports and MDX declare it.

59 types in ten areas. Existing specs need no changes; regenerate standalone pages to get the new player and the font.

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
