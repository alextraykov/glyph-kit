# Colour

Figures are coloured by role, never for decoration, in HTML, decks, reports, SVG, PNG and PDF. The text form stays plain.

| role | colours | needs, on the page and the panel |
|---|---|---|
| `ink` | text | 4.5 to 1 |
| `muted` | secondary text | 4.5 to 1 |
| `flag` | problems: `fails`, `blocked`, `x missing`, `over` | 4.5 to 1 |
| `ok` | passes: `AA`, `AAA`, `done`, `ok` | 4.5 to 1 |
| `data` | the measured thing: `█▓▒`, eighths, `■` | 3 to 1 |
| `frame` | box drawing, rulers, `·`, arrows | 1.5 to 1 |
| `bg`, `panel` | the page and the surface behind figures | |
| `ramp` | four colours for `░ ▒ ▓ █` in `heatmap`, `cohort` and `calendarStrip` only | each step further from the page; the last 3 to 1 |

## In the terminal

`render --to text` and `live --to text` colour by role when the output is a terminal: problems red, passes green, lines and empty cells dim, data and words in the terminal's own colour. The 16 standard colours are used, so the terminal's palette decides the shade. A terminal that takes 24-bit colour (`COLORTERM=truecolor`) uses a theme's own colours when you pass one.

`NO_COLOR` turns it off, `--no-color` turns it off for one call, and `--color` turns it on when writing to a file or a pipe. Markdown is never coloured. Every role also has a word or a glyph, so a figure reads the same without colour.

## Focus: colour on what matters

A theme colours roles. To colour one thing in a figure, the cohort column where people drop off or the step that fails, give the spec a `focus` (`reference/spec.md`): it names the thing as drawn and a tone. The focus takes the tone's colour, the rest of its block recedes, and a `►` line under the figure says what to look at, so the point holds without colour. In HTML and decks the focus also arrives last, with the inverted flash. Colour on one row by hand (`"color"`) is still refused: focus is how a figure says "look here".

## A theme

A palette name (`paper`, `ink`, `phosphor`, `gilt`), or a base and the roles you change:

```json
{ "base": "paper", "data": "#1f4fd6", "flag": "#b8421f",
  "ramp": ["#e8eefb", "#b9c8f0", "#6f8fe0", "#1f4fd6"] }
```

Put it on a spec, report or deck as `theme`, or pass `--theme name` or `--theme theme.json` to `render`, `export`, `deck` and `live`.

## From your design system

Point roles at your tokens in `design-system.map.json`, and pass it with `--map`:

```json
"roles": { "data": "accent", "flag": "danger", "ok": "ok" }
```

HTML and decks write the token's `var(--…)`, so your own CSS wins. SVG, PNG and PDF use its fallback colour, so every token needs one: `var(--color-primary, #1f4fd6)`.

## Refusals

Every colour you supply is checked against the page and the panel. A refusal names the pair and a nearby colour that passes:

> The flag colour #f08080 on the page colour #f7f6f1 is 2.4 to 1. Words in this colour need 4.5 to 1. #a15656 passes.

A colour on one node, bar or row (`"color": "#f00"`) is refused: colour follows meaning. A light design system's tokens fail on a dark palette; give the theme a `base` that matches them.
