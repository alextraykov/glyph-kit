# Characters

The working set. Everything here is one cell wide in a font that covers it.

## Shades and blocks

| Glyph | Code point | Name | Use |
|---|---|---|---|
| (space) | U+0020 | | level 0: nothing, not yet |
| `░` | U+2591 | light shade | level 1: texture, projected, the empty part of a scale |
| `▒` | U+2592 | medium shade | level 2: in progress, scroll track |
| `▓` | U+2593 | dark shade | level 3: in review, nearly full |
| `█` | U+2588 | full block | level 4: measured, done, selected |
| `▀ ▄` | U+2580, U+2584 | upper and lower half | two pixels per cell vertically |
| `▌ ▐` | U+258C, U+2590 | left and right half | half-cell bar ends, rulers |

In the classic VGA font the three shades are literal ordered dither: 2 of every 8 pixels lit, a checkerboard, 6 of every 8 (see `history.md`). In modern fonts the coverage varies, so if tone matters, measure it.

## Eighth blocks

| Set | Glyphs | Code points | Use |
|---|---|---|---|
| Left eighths | `▏ ▎ ▍ ▌ ▋ ▊ ▉ █` | U+258F to U+2589, U+2588 | horizontal bars with 1/8-cell precision |
| Lower eighths | `▁ ▂ ▃ ▄ ▅ ▆ ▇ █` | U+2581 to U+2588 | sparklines, speed glyphs |
| Thin edges | `▕ ▏` | U+2595, U+258F | the walls of a ruler: `▕████····▏` |

## Marks

| Glyph | Use |
|---|---|
| `·` U+00B7 | an empty cell that still shows the scale |
| `■ □` U+25A0, U+25A1 | on/off, hit/miss per day |
| `▲ ▼ ◄ ►` | scroll arrows, direction, arrowheads on flows |
| `→ ►` | flow, "continues", loops (`→` at the end of a timeline row) |
| `↺` | overshoot (a spring) |
| `✓ ✗` | pass, fail (missing from Departure Mono; `ok` and `x` are safe) |
| `+` | value past the end of a fixed scale |

## Box drawing

| Style | Glyphs | Use |
|---|---|---|
| Light | `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼` | default frames, tables, trees |
| Heavy | `━ ┃ ┏ ┓ ┗ ┛ ┣ ┫ ┳ ┻ ╋` | emphasis, the active item, a packet on a line |
| Double | `═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬` | windows and dialogs (the DOS convention) |
| Rounded | `╭ ╮ ╰ ╯` | softer frames; check the font, coverage is weaker |
| Dashed | `┄ ┆ ╎ ┊ ╷ ╵` | a question (a decision in a flow), something not yet there, a gate that has opened. One cell in Departure Mono and Menlo |

Don't mix light and heavy in one junction unless the font has the mixed glyph (`┝`, `┿` and so on), and most don't.

## Avoid, or test first

- **Braille** (U+2800–28FF): great 2 × 4 bitmaps for spinners, but most monospace fonts don't include them, so they come from a fallback with a different width.
- **Sextants and legacy computing** (U+1FB00–1FBFF): teletext mosaics, very poor font coverage.
- **Emoji-capable symbols** (`✳ ❇ ⚠`): can render as colour emoji. Add U+FE0E or pick another glyph.
- **East Asian wide characters** in labels: two cells each, which breaks every column after them.

## Fonts

Measured in Chrome on macOS, as a multiple of the width of `0`:

| Glyph | Departure Mono | Menlo | Geist Mono (Fontsource Latin subset) | SF Mono |
|---|---|---|---|---|
| `█` | 1.00 | 1.00 | 1.80 | 1.42 |
| `░` | 1.00 | 1.00 | 1.56 | — |
| `─` | 1.00 | 1.00 | 1.80 | 1.42 |
| `▁` | 1.00 | 1.00 | 1.80 | 2.00 |
| `·` | 1.00 | 1.00 | 0.50 | 0.50 |

— means not measured. Anything other than 1.00 means the browser borrowed the glyph from another font, and the grid won't line up.

Across the whole set in this file (blocks, eighths, marks, light, heavy, double and rounded box drawing), measured at 13 px:

- **Menlo:** every glyph at exactly one cell.
- **Departure Mono:** every block, eighth and box glyph at one cell; `▶ ↺ ✓ ✗ ≡` are missing and fall back at 0.95 of a cell. Use `►`, `ok` and `x` instead, or accept a slight drift after those marks.
- **Monaco:** `▒` at 0.83 of a cell.

A stack to start from (only Menlo and Departure Mono were measured here, so run the width check):

```css
font-family: Menlo, "DejaVu Sans Mono", Consolas, "Departure Mono", monospace;
```

## The width check

Paste into the browser console on the page that renders the diagram:

```js
const el = document.querySelector("pre"); // the diagram
const ctx = document.createElement("canvas").getContext("2d");
ctx.font = getComputedStyle(el).font;
const cell = ctx.measureText("0").width;
const glyphs = [...new Set(el.textContent.replace(/\s/g, ""))];
console.table(glyphs.map((g) => ({ g, cells: +(ctx.measureText(g).width / cell).toFixed(2) })).filter((r) => r.cells !== 1));
```

An empty table means every glyph is one cell.

## Line height

- Blocks that should touch vertically (heatmaps, filled shapes): `line-height: 1` or the font's exact cell height.
- Box diagrams with words inside: about 1.3–1.4, and accept tiny gaps in the vertical lines.
