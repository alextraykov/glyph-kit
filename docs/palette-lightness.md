# Problems and passes apart in lightness: proposal

Not built. In `paper`, `ink`, `phosphor` and `gilt`, problems (`flag`, `x`) and passes (`ok`) differ by hue alone: as drawn they are only 1.1 to 1 to 1.4 to 1 apart in lightness. A reader who sees red or green weakly gets two colours of the same lightness, and the figure's words (`fails`, `done`, `▼`) carry the meaning by themselves. `halloween` already keeps them apart: its problems are the darker colour, 2.4 to 1 from its passes. This proposes the same for the other four, changing only `flag` and `ok`.

## The rule

1. **Problems are the darker of the two, in every palette.** Red is darker than green at the same strength, so this moves each colour least, and a colour-blind reader learns one rule: the darker one is the problem. On `paper` that makes problems the strongest colour on the page; on the dark palettes, passes are.
2. **About 2 to 1 apart**, as drawn and with weak red or weak green. `paper` stops at 1.7 (see below).
3. **Both still read as words**: 4.5 to 1 on the page and the panel in all three views, with a little to spare (4.6 or more).
4. **Hue stays close** to today's, so each palette keeps its look. The values were found by searching near each colour for the smallest change that meets 1 to 3.

## Proposed values

| palette | problem now | problem proposed | pass now | pass proposed |
|---|---|---|---|---|
| `paper` | `#b8391a` | `#6e2218` oxblood | `#0a7a50` | `#2f743e` |
| `ink` | `#ef7c56` | `#dc7351` | `#4cc58f` | `#89f1b5` mint |
| `phosphor` | `#f0883e` | `#d47b47` | `#58d68d` | `#7df4ab` pale green |
| `gilt` | `#e49a7d` | `#cb6d65` | `#c9a227` | `#edc23e` bright gold |

## Before and after, drawn with the kit

The gap between problem and pass, as drawn and in each weak view. Empty is 1 to 1, full is 3 to 1, and the goal is about 2. Spec: `docs/palettes/lightness-gap.json`.

```text
Problems against passes, in lightness

PALETTE, VIEW         NOW                  PROPOSED
paper, as drawn       █░░░░░░░░░ 1.1 to 1  █████░░░░░ 1.9 to 1
paper, weak red       ███░░░░░░░ 1.5 to 1  ███████░░░ 2.4 to 1
paper, weak green     █░░░░░░░░░ 1.1 to 1  ████░░░░░░ 1.7 to 1
ink, as drawn         █░░░░░░░░░ 1.3 to 1  ███████░░░ 2.3 to 1
ink, weak red         ███░░░░░░░ 1.7 to 1  ██████████ 3.0 to 1
ink, weak green       █░░░░░░░░░ 1.1 to 1  █████░░░░░ 2.0 to 1
phosphor, as drawn    ██░░░░░░░░ 1.4 to 1  ██████░░░░ 2.3 to 1
phosphor, weak red    ████░░░░░░ 1.8 to 1  █████████░ 2.9 to 1
phosphor, weak green  █░░░░░░░░░ 1.2 to 1  █████░░░░░ 2.0 to 1
gilt, as drawn        █░░░░░░░░░ 1.1 to 1  █████░░░░░ 2.1 to 1
gilt, weak red        █░░░░░░░░░ 1.0 to 1  ██████░░░░ 2.3 to 1
gilt, weak green      █░░░░░░░░░ 1.1 to 1  █████░░░░░ 2.0 to 1

Source: Kit palettes, now and proposed; weak views simulated (Machado 2009)
```

Each colour as words on its panel, in the view where it reads worst. Today `paper` already falls under 4.5 to 1 for colour-blind readers: its problems with weak green (4.3) and its passes with weak red (4.2). The proposal fixes that too. Specs: `docs/palettes/lightness-words-now.json` and `lightness-words-proposed.json`.

```text
Problems and passes as words, now

                       3 4.5 7                   21:1
paper problem     ██████▉┊···┊······················   4.3:1  AA large text only
paper good        ██████▉┊···┊······················   4.2:1  AA large text only
ink problem       ████████▊··┊······················   5.4:1  AA
ink good          ████████████▋·····················   7.8:1  AAA
phosphor problem  █████████▏·┊······················   5.7:1  AA
phosphor good     ██████████████▌···················   8.9:1  AAA
gilt problem      ████████████▍·····················   7.6:1  AAA
gilt good         ████████████······················   7.4:1  AAA

Source: Glyph kit's palettes; weak views simulated (Machado 2009)

Problems and passes as words, proposed

                        3  4.5  7                        21:1
paper problem     █████████████████▎························   8.6:1  AAA
paper good        █████████▎····┊···························   4.6:1  AA
ink problem       █████████▍····┊···························   4.7:1  AA
ink good          █████████████████████████▏················  12.6:1  AAA
phosphor problem  █████████▍····┊···························   4.7:1  AA
phosphor good     ████████████████████████▎·················  12.1:1  AAA
gilt problem      █████████▍····┊···························   4.7:1  AA
gilt good         █████████████████████▎····················  10.6:1  AAA

Source: Proposed values; weak views simulated (Machado 2009)
```

Remake all three with `node tools/palette-figures.mjs` after changing a value in `LIGHTNESS` there.

## What it costs

- **`paper` problems move toward the text.** On a light page both colours must be dark enough for words, so the room is small. Reaching 2 to 1 in every view would turn problems nearly black. At `#6e2218` they are 1.7 to 1 from body text, down from 3.2, and still clearly red to most readers.
- **Passes on the dark palettes move toward the text.** Mint, pale green and bright gold sit only 1.1 to 1 to 1.4 to 1 from the text colour, as `halloween`'s pale green does. They differ from text by hue, and every pass also has a word.
- **`phosphor` and `gilt` passes stop matching the data.** Today a pass is the data colour (`#58d68d`, `#c9a227`). Proposed, passes are lighter than data, 1.3 and 1.4 to 1 apart. That is a gain for meaning (a pass no longer looks like a bar), but it loosens the one-colour look of those two palettes.

## Building it

1. Change `flag` and `ok` in `PALETTES` (`skills/glyph-kit/scripts/render/themes.mjs`). Decks, reports, SVG, PNG, PDF and 24-bit terminals follow from there.
2. Update the copies of today's values: `html.mjs` (paper's `ok` as a fallback), `templates/design-system.map.example.json`, `tools/examples/systems.json` and `reference/areas/systems.md` (the "kit's own colours" figure), and the site's dark mode in `site/src/style.css`.
3. Fix the tests that name today's values (`focus`, `theme`, `export`), and add one per palette like `tests/halloween.test.mjs`: problems darker, about 2 to 1 apart in every view, words at 4.5 in every view.
4. Rebuild the generated docs and the site examples under `site/public/examples/` that carry the colours inline.
5. A CHANGELOG line, and a sentence in `reference/colour.md`: problems are the darker colour in every palette.

## Left to decide

- **Darker or stronger?** This makes problems the darker colour everywhere. The other rule, problems always the stronger one (furthest from the page), would mean pale pinks for problems on the dark palettes and dark greens for passes. It matches "look here" better, but moves every colour further, and `halloween` would flip.
- **Is `paper`'s 1.7 enough**, or should its problems go darker still, closer to the text?
- **Should `phosphor` and `gilt` passes keep the data colour**, and get their gap only from a darker problem? The search found no problem colour near today's that is 2 to 1 from the data colour and still 4.5 to 1 for weak-red readers. `phosphor` reaches 1.8 only with a grey-brown problem; `gilt` not even that.
- **Should the kit check this for every theme**, including a user's own: warn when problems and passes are under about 2 to 1 apart, or fall under 4.5 to 1 in a weak view?
- **The site's own colours** ("This site" in the Colours menu, `site/src/style.css`) have the same hue-only pair and would need the same look.
