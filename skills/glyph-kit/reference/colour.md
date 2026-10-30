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

In every palette, problems are the darker of `flag` and `ok`, about 2 to 1 apart, and both keep 4.5 to 1 when red or green is seen weakly. So the two differ in lightness as well as hue, and a colour-blind reader can tell them apart: the darker one is the problem. A theme of your own is checked for contrast, not for this; follow it when you choose `flag` and `ok`.

## In the terminal

`render --to text` and `live --to text` colour by role when the output is a terminal: problems red, passes green, lines and empty cells dim, data and words in the terminal's own colour. The 16 standard colours are used, so the terminal's palette decides the shade. A terminal that takes 24-bit colour (`COLORTERM=truecolor`) uses a theme's own colours when you pass one.

`NO_COLOR` turns it off, `--no-color` turns it off for one call, and `--color` turns it on when writing to a file or a pipe. Markdown is never coloured. Every role also has a word or a glyph, so a figure reads the same without colour.

## Focus: colour on what matters

A theme colours roles. To colour one thing in a figure, the cohort column where people drop off or the step that fails, give the spec a `focus` (`reference/spec.md`): it names the thing as drawn and a tone. The focus takes the tone's colour, the rest of its block recedes, and a `►` line under the figure says what to look at, so the point holds without colour. In HTML and decks the focus also arrives last, with the inverted flash. Colour on one row by hand (`"color"`) is still refused: focus is how a figure says "look here".

## A theme

A palette name (`paper`, `ink`, `phosphor`, `gilt`, `halloween`), or a base and the roles you change:

```json
{ "base": "paper", "data": "#1f4fd6", "flag": "#b8421f",
  "ramp": ["#e8eefb", "#b9c8f0", "#6f8fe0", "#1f4fd6"] }
```

Put it on a spec, report or deck as `theme`, or pass `--theme name` or `--theme theme.json` to `render`, `export`, `deck` and `live`.

`halloween` is pumpkin data, bruise-purple lines and bone text on near-black. It is the one palette with its own ramp, bruise purple to pumpkin (`#3b2a4c` `#6b3f78` `#b8572f` `#f2801f`).

## How a theme's colours relate

Contrast says each colour reads on the page. These four rules say the colours belong together, measured in OKLCH: lightness, chroma (how colourful) and hue.

1. **Data sets the hue.** The ramp is the data hue getting stronger, each step further from the page, and its last step `█` is the data colour.
2. **Problems are opposite data and loudest.** `flag` sits 150° to 210° from the data hue and is the most colourful role. Only problems may out-shout data.
3. **Passes read apart from problems without colour.** `ok` is at least 0.15 lighter or darker than `flag`, a different hue, and less colourful.
4. **Neutrals belong to the theme.** `bg`, `panel`, `frame` and `muted` are the data hue at low chroma.

Rules 1 and 4 need a hue to follow: with grey data, as in `paper` and `ink`, only 2 and 3 apply. A theme that breaks a rule still draws; `render`, `export`, `deck`, `live` and `check` add a note that names the pair and a nearby colour that fits:

> Problems (#b8391a) and passes (#0a7a50) are 0.02 apart in lightness, so they read the same without colour. A flag of #651300 fits.

`check theme.json` checks a theme file on its own; `check spec.json --theme theme.json` checks a figure with a theme. A palette name on its own is never checked: `phosphor` and `gilt` copy other products' colours, so they don't follow every rule (`docs/theme-rules.md` has each palette against the rules).

## A theme from one hue

Give `mixed` a hue in degrees or a colour, and every role is derived from it so that all four rules and every contrast check hold. `base` says light (`paper`) or dark (`ink`):

```json
{ "base": "ink", "mixed": "#7a5cff" }
```

Or on the command line: `--theme mixed:#7a5cff:dark`, `--theme mixed:285` (light unless `:dark`). Roles you name beside `mixed` replace the derived ones, and are checked like any other. A grey colour has no hue and is refused.

Problems are opposite data, nudged toward red, so warm data hues push them round the wheel: orange data gets blue problems, red data gets green ones. Pick a cool data hue (180 to 300) to keep problems red or amber.

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
