# Moving diagrams

A moving diagram is a spec like any other, drawn on a character grid that animates. Structure (boxes, lines, labels) changes in steps; work, people and cursors glide between cells as `▓▒░`. Every kind has a still frame that makes the same point, used for reduced motion, print, Markdown and tickets.

```bash
node scripts/glyph-kit.mjs live spec.json --to html       # one page that plays
node scripts/glyph-kit.mjs live spec.json --to markdown   # the still, with a description
```

Colour has three roles: `ok` (done, shipped, the good path), `fail` (blocked, sent back, a breach) and `mute` (structure and waiting). The still reads without colour.

## Kinds

| Kind | Use it for | Data |
|---|---|---|
| `loop` | Work through stages, with rework sent back | `stages: [names]`, `back: { from, to, share, label? }` |
| `funnel` | Where people leave, shown as people | `steps: [{ label, value }]`, largest first |
| `states` | A state machine, with one path played through it | `states: [names]`, `transitions: [{ from, to, label? }]`, `path: [names]` |
| `queue` | Work-in-progress limits and the bottleneck | `columns: [{ label, limit?, pace? }]`; first is the backlog, last is done; `pace` is how long a card stays |
| `rollout` | A staged release, its guard metric and a rollback | `stages: [percent]`, `metric`, `limit`, `breachAt?` |
| `loading` | What someone sees in the first seconds | `duration` (ms), `phases: [{ at, show }]` with `show` one of `tap`, `skeleton`, `text`, `image` |

Examples for each are in `examples/live/`, with the HTML they make.

## Watch for

- The motion is an illustration of the data, not a measurement. Seeded randomness keeps every run the same, but say "sample data" unless the numbers are real.
- Keep it under 80 columns; the kinds size themselves from their labels, so long labels widen the grid.
- One moving diagram per screen. Several at once compete for attention; the Labs page plays only what's on screen.
- Hand-drawn compositions (`scripts/live/pace.mjs`) show what the grid can do for an argument. Build new ones on `scripts/live/grid.mjs` the same way: a function from (step, fraction) to a grid.
