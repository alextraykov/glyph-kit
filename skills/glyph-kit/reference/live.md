# Moving diagrams

Every type moves, in one of two ways. Seven keep moving, because change over time is what they show: six processes (a rework loop, a funnel of people, a state machine, a work queue, a staged rollout and a loading sequence) and a test result given readings over time. Every other type arrives once, in the order that carries its point, then stays still. Use `node scripts/glyph-kit.mjs live spec.json --to html` for a standalone page, or `--to markdown` for its still.

The still makes the same point and is used for reduced motion, print and no-JavaScript output. Playback starts from the still, so nothing jumps. A standalone page has a Still button that pauses it without changing the data. Processes use the data shapes in `reference/areas/process.md`. A funnel accepts either a list of steps or `{steps: [...]}`.

Structure changes in steps. Travelling marks use the kit’s `▓▒░` trail, arrivals flash, waiting work chases, and only changing values scramble. The clock is 120ms a step. No blur, sliding text or springs.

Arrivals play in HTML pages and decks, once, when a figure comes into view; a small ↺ in the corner plays one again. They step on 40ms and settle within about 600ms; diagrams grow along their lines in about 1.1s, and the motion types play their own timing at real speed. Reduced motion, print, Markdown and text show the figure as it is.

Cell-grid playback repaints text rather than using compositor transforms. Layout and routes are precomputed, the page is redrawn only when the step changes, and off-screen players stop. When a page has several moving diagrams, only the one most in view plays.

## Types that keep moving

| Type | Motion |
|---|---|
| `funnel` | People fall through the steps and departures drift out to the side. |
| `abResult` | Only with readings over time: give `data` as `{ days, readings: [{ day, people, variants }] }`. The intervals narrow reading by reading, numbers change in place and the verdict switches when the intervals part. The still is the last reading, with a line saying how long they overlapped. |
| `loop` | Work travels forward; a share returns for another pass. |
| `states` | A token follows the played path. |
| `queue` | Cards wait when the next column is full. |
| `rollout` | Stages advance, pause and roll back at a breach. |
| `loading` | The card develops beside a time ruler. |
