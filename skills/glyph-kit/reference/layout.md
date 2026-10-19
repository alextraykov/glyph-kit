# Layout

The rules for the inside of a figure: how much room text gets, how far apart things sit, and how much of it is solid. They exist so every figure the kit or an agent draws looks like it came from one hand. The numbers live in `scripts/layout.mjs`; the generators read them, and `scripts/lint.mjs` checks the result.

Spacing around a figure (padding on a page, line height, the gap between report sections) is set separately, in `scripts/render/themes.mjs`.

## Sizes, in cells

| Rule | Value | Why |
|---|---|---|
| Padding inside a box | 2 each side, never under 1; the sides differ by at most 1 | Text that touches a frame reads as a mistake |
| Gap between boxes on one line | 4 | Room for an arrow with a head: `──►` |
| Label to what it names | 2 | `TRUST  ▓▓▓░░░`, not `TRUST▓▓▓░░░` |
| Between two bands | 1 blank row | Two lanes, two teams, two halves of a comparison |
| Line height | 1.25 | Tall enough to read, short enough that `│` meets the next row. Get vertical air from blank rows and padding, never from line height |
| Widest figure | 80 columns | Wider scrolls in its own box |

```text
┌──────────────┐
│  SHIPPED 49  │   right
└──────────────┘
```

```plain
┌──────────────┐
│SHIPPED 49    │   wrong: nothing on the left, four on the right (the checker rejects this)
└──────────────┘
```

Size a box from its longest text: `fit(text)` returns the width with the standard padding. A box whose text changes (a counter) is sized for the longest value it will show, with the text centred: `SHIPPED  9` and `SHIPPED 26` sit in the same box.

A column of boxes (the steps of a flow) shares one width, so the spine is straight. Text in them is centred.

## Density: what solid means

The same ladder as the site's dithered cells. Use the heaviest shade for the fewest things.

| Shade | Means |
|---|---|
| `▓` `█` | current, measured, done or shipped: where the eye should land |
| `▒` | in progress, waiting or blocked |
| `░` | supporting: a trail, a projection, the empty part of a scale |
| `·` | not yet, or an empty cell |

Structure is lines, never solid. A row of nine closed gates drawn as `▓` bars makes the resting state as loud as the one gate that matters; draw the closed gates as `┃` and keep `▓` for the gate someone is waiting at.

In a chart, the bars are the data, so solid is right. In a diagram, if more than a few marks are solid at once, ask which one the reader should look at first.

## Frames

| Frame | Means |
|---|---|
| `┌─┐` solid | a step, a screen, a thing that exists |
| `┌┄┐` dashed | a question (a decision in a flow), or something not there yet |
| `╔═╗` double | the end of a flow, or a window or dialog |
| `┏━┓` heavy | the active one, used once |

Lines join the frames they connect: a connector leaves from `┬` in the bottom edge, arrives as `▼` above the next box, and a branch leaves a side through `├`. A loose arrow floating between boxes looks unfinished.

## The check

`node scripts/lint.mjs file.md` fails when text touches a box, as well as on unmeasured characters and broken frames. Run it on anything drawn by hand.
