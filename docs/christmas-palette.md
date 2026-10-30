# A Christmas palette: plan

Not built. This is the plan for a `christmas` palette after `halloween` (0.3.0), with values that already pass the kit's checks, so building it is mostly copying.

## Proposed values

Dark, like `halloween`: a near-black pine page, snow text, gold data, holly lines, and a ramp from pine to gold.

| role | paints | value | on the page | on the panel |
|---|---|---|---|---|
| `bg` | the page | `#0d1611` near-black pine | | |
| `panel` | the surface behind figures | `#142019` | | |
| `ink` | text | `#f4f1ea` snow | 16.3 | 14.9 |
| `muted` | secondary text | `#a9b5ad` frost | 8.7 | 7.9 |
| `data` (`d`) | `█▓▒`, eighths, `■` | `#f6d466` gold | 12.7 | 11.6 |
| `e` | `░`, the rest of a scale | data at 45% in HTML and decks, a dither in SVG | | |
| `m` | a measure outside the focus | data at 28% in HTML and decks, `muted` in SVG | | |
| `frame` (`f`) | box drawing, rulers, `·`, arrows | `#3e5c4a` holly | 2.5 | 2.3 |
| `flag` (`x`) | problems | `#ff6490` cranberry | 6.6 | 6.0 |
| `ok` | passes | `#daf0ff` ice | 15.7 | 14.3 |
| `r1` | `░` in heatmap, cohort, calendar strip | `#1f3b2c` pine | 1.5 | 1.4 |
| `r2` | `▒` | `#33704a` holly | 3.1 | 2.8 |
| `r3` | `▓` | `#94a940` moss | 7.0 | 6.4 |
| `r4` | `█` | `#f6d466` gold, the same as data | 12.7 | 11.6 |

Words need 4.5 to 1, marks 3, lines 1.5. Every value passes on both grounds, and the ramp passes the kit's ramp check: each step 2.1, 2.3 and 1.8 to 1 on from the last.

## The hard part: red and green

Christmas is red and green. In the kit, red already means a problem and green means a pass, and red against green is the pair most colour-blind readers can't tell apart. Three things follow.

**Red gets one job.** If red were also decoration (lines, the ramp, data), a red cell could be a problem or a bauble. So red appears only on problems, and the season's red is the problem colour. The rest of the palette is pine, holly, moss, gold and snow.

**"Good" stops being green.** Holly-green passes beside a holly-red problem is the textbook pair to avoid. The naive pair, `#e0383e` and `#3fae5a`, is 1.5 to 1 apart in lightness, 1.2 to 1 seen with weak green, and the red fails 4.5 to 1 on the panel before anyone's eyes come into it. So passes go to ice, `#daf0ff`: pale, blue-white and wintry, 2.4 to 1 lighter than the problem colour as drawn and 2.0 to 1 seen with weak green. Ice against cranberry splits on blue and yellow, which weak red and weak green leave intact.

**The red leans pink.** Weak red cones see red as darker. A true scarlet that passes 4.5 to 1 for everyone else drops under it for those readers. `#ff6490` is a cranberry with enough blue in it to hold 4.6 to 1 on the panel seen with weak red. The same thing happened to `halloween`: its first red fell to 3.7 to 1 that way and moved to `#ff5a8a`.

Colour is never the only signal. Problems still say `fails`, `blocked`, `x missing` or `▼▼ bad`, and passes say `ok`, `done` or `AA`, so the words carry the meaning even with no colour at all.

## Contrast, drawn with the kit

Every colour on the panel, faintest to strongest. `palette` marks the first step that reads as words with ▲: everything under it is a mark or a line, everything above it is safe for words. Moss (`r3`) sits above the line but only colours `▓`.

```text
Christmas, proposed, on its panel

                  On the panel
ramp 1            ██ #1f3b2c  1.4
lines             ██ #3e5c4a  2.3
ramp 2            ██ #33704a  2.8
problem         ▲ ██ #ff6490  6.0
ramp 3            ██ #94a940  6.4
secondary text    ██ #a9b5ad  7.9
data, ramp 4      ██ #f6d466 11.6
good              ██ #daf0ff 14.3
text              ██ #f4f1ea 14.9

Contrast on the page, #142019. ▲ first step that reads as words: 4.5 to 1.

Source: Proposed values in docs/christmas-palette.md
```

The problem and good colours on the panel, as drawn and seen with weak red or weak green cones (simulated, Machado 2009 at full strength):

```text
Christmas problems and passes, colour-blind

                           3  4.5  7                        21:1
problem, as drawn    ████████████··┊···························   6.0:1  AA
problem, weak red    █████████▎····┊···························   4.6:1  AA
problem, weak green  █████████████▊┊···························   6.9:1  AA
good, as drawn       ████████████████████████████▋·············  14.3:1  AAA
good, weak red       █████████████████████████████·············  14.5:1  AAA
good, weak green     ████████████████████████████▍·············  14.2:1  AAA

Source: Proposed values; weak views simulated (Machado 2009)
```

Both figures come from `node tools/palette-figures.mjs`, which writes `docs/palettes/christmas.json` and `docs/palettes/christmas-colour-blind.json` from the values in that file.

## Building it

The same steps `halloween` took:

1. Move the values from `CHRISTMAS` in `tools/palette-figures.mjs` into `PALETTES` and `RAMPS` in `skills/glyph-kit/scripts/render/themes.mjs`. HTML, SVG, PNG, PDF, decks, reports and 24-bit terminals pick it up from there.
2. Add `christmas: "Christmas"` to `PALETTE_NAMES` in `site/src/try.js`. Nothing else in the builder changes.
3. Copy `tests/halloween.test.mjs` for christmas: every role defined, ramp in order, contrast on both grounds, problems and passes apart as drawn and in each weak view, every form, and the Colours menu.
4. Add `christmas` to the palette lists in the CLI usage, `reference/colour.md`, `reference/spec.md`, `reference/export.md`, the type comments in `deck.mjs`, `report.mjs`, `svg.mjs` and `Glyph.astro`, and the README count. A line in the changelog.
5. Look at it in the site at desktop and phone width, and at a heatmap deck slide for the ramp.

## Left to decide

- **Ice for good, or a pale mint?** Ice (`#daf0ff`) is the safest. A pale mint (`#c8f5d0`) keeps green for passes and still passes the checks, but sits closer to the holly in the rest of the palette and drops to 2.0 to 1 from the problem colour seen with weak green.
- **Gold data or cranberry data?** Gold keeps red for problems only. Cranberry bars would look more like Christmas, but then a red bar and a red problem mean different things.
- **Dark only, or a light version too?** Every built-in palette is one page colour. A light Christmas (snow page, pine text) would be the first palette with two, and the theme format has no pairing for that yet.
- **How long it stays.** Seasonal palettes could ship and stay, like `halloween`, or the site's Colours menu could show them only near the date. Specs that name `christmas` must keep working either way.
- **Should the kit check colour-blind contrast for everyone's themes?** Only the seasonal palettes are tested in the weak views today. `paper`'s problem and pass colours are 1.1 to 1 apart in lightness, so they differ by hue alone.
