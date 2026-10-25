# Changelog

Glyph kit follows [semantic versioning](https://semver.org). Before 1.0, a minor version may change the spec format; the change is listed here with what to update.

## 0.3.0 — 2026-10-29

**Colour by role**

- **Your colours.** A theme is a palette name or a base plus the roles you change: `{ "base": "paper", "data": "#1f4fd6", "flag": "#b8421f" }`. Put it on a spec, report or deck as `theme`, or pass `--theme theme.json` to `render`, `export`, `deck` and `live`. Guide: `reference/colour.md`.
- **From your design system.** A `roles` block in `design-system.map.json` points roles at your tokens. HTML and decks write the token's `var(--…)` so your CSS wins; SVG, PNG and PDF use its fallback colour. A token with no fallback is refused.
- **Contrast is checked.** Every colour you supply is checked against the page and the panel: 4.5 to 1 for words, 3 for marks, 1.5 for lines. A refusal names the pair and a nearby colour that passes.
- **A ramp for density grids.** Four colours for `░ ▒ ▓ █` in `heatmap`, `cohort` and `calendarStrip`, drawn solid in SVG. Elsewhere shades keep the data colour, so the density ladder means the same thing.
- **Colour follows meaning.** `color` on a node, bar or row is refused.
- **Paper passes its own rule.** Its problem colour is darker (`#c4401c` to `#b8391a`) and its secondary text a touch darker (`#6d6c66` to `#6b6a64`), so both reach 4.5 to 1 on the panel.
- Existing specs need no changes. The text form is unchanged.

## 0.2.1 — 2026-10-26

**Fixes**

- **Long flow labels wrap instead of being cut.** A flow box no longer cuts a label over 24 cells; it wraps it onto more lines. Agents were spending turns shortening labels and drawing again: with this fix, a flow costs a third less to make in Claude Code.
- **A meter below its cap never draws as full.** 64 of 65 used to fill every cell.
- **Layout pages and reports embed Departure Mono again,** so they line up offline.
- **A comparison arrives as one move.** The before column steps in, and the after column starts as soon as it has settled, instead of 600ms later. A journey map's stages follow each other within 240ms.
- **"over" in a label stays plain.** "over" and "fails" are painted as problems only as the verdict at the end of a line, so a label such as "Processes over time" is no longer red.
- **Contrast thresholds on a narrow scale.** The 3, 4.5 and 7 labels keep a space between them; one that would touch its neighbour is dropped and its ┊ still marks the place.

**Site**

- **A Changelog page** at /changelog/, every release newest first.
- **The kit against HTML/JS, measured again** on the current kit: cheaper, faster and fewer tokens written on every run, for all five deliverables tested in Claude Code.

Existing specs need no changes.

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
- **Smaller install.** The skill holds only what an agent needs; the zip is 205 KB with 60 types, down from 495 KB, and the plugin installs only `skills/glyph-kit`.

**Handoff**

- **Component anatomy.** A new type, `anatomy`, draws a component's container with its parts inside, numbered on their edges, and a legend of each part's name and rule; optional parts have dashed edges. Parts sit in a row (a text field) or a column (a card). It arrives part by part in number order, each part with its legend line.

**Language**

- **Labels in any script.** Widths count display cells, so Chinese, Japanese and Korean take two and graphemes stay whole. The lint flags mixed right-to-left text.
- **`lang`.** An optional language tag, like `"de"` or `"tr"`: numbers get local separators, uppercase follows the language, and HTML, decks, reports and MDX declare it.

60 types in ten areas. Existing specs need no changes; regenerate standalone pages to get the new player and the font.

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
