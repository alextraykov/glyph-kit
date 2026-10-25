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
