# Problems and passes apart in lightness

Built in 0.3.0. In `paper`, `ink`, `phosphor` and `gilt`, problems (`flag`, `x`) and passes (`ok`) used to differ by hue alone: as drawn they were only 1.1 to 1 to 1.4 to 1 apart in lightness. A reader who sees red or green weakly got two colours of the same lightness, and only the figure's words (`fails`, `done`, `▼`) told them apart. `paper`'s pair also fell under 4.5 to 1 for those readers. `halloween` already kept them apart, and now every palette does.

## The rule

1. **Problems are the darker of the two, in every palette.** Red is darker than green at the same strength, so this moved each colour least, and a colour-blind reader learns one rule: the darker one is the problem. On `paper` that makes problems the strongest colour on the page; on the dark palettes, passes are.
2. **About 2 to 1 apart**, as drawn and with weak red or weak green. `paper` stops at 1.7 (see below).
3. **Both still read as words**: 4.5 to 1 on the page and the panel in all three views, with a little to spare (4.6 or more).
4. **Hue stays close** to what it was, so each palette keeps its look. The values were found by searching near each colour for the smallest change that meets 1 to 3.

`tests/problems-and-passes.test.mjs` holds every palette to 1 to 3, so a new palette has to follow them too.

## The values

| palette | problem before | problem after | pass before | pass after |
|---|---|---|---|---|
| `paper` | `#b8391a` | `#6e2218` oxblood | `#0a7a50` | `#2f743e` |
| `ink` | `#ef7c56` | `#dc7351` | `#4cc58f` | `#89f1b5` mint |
| `phosphor` | `#f0883e` | `#d47b47` | `#58d68d` | `#7df4ab` pale green |
| `gilt` | `#e49a7d` | `#cb6d65` | `#c9a227` | `#edc23e` bright gold |

## Before and after, drawn with the kit

The gap between problem and pass, as drawn and in each weak view. Empty is 1 to 1, full is 3 to 1, and the goal is about 2. Spec: `docs/palettes/lightness-gap.json`.

```text
Problems against passes, in lightness

PALETTE, VIEW         BEFORE               AFTER
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

Source: Kit palettes before and after 0.3.0; weak views simulated (Machado 2009)
```

Each colour as words on its panel, in the view where it reads worst. Specs: `docs/palettes/lightness-words-before.json` and `lightness-words-after.json`.

```text
Problems and passes as words, before

                       3 4.5 7                   21:1
paper problem     ██████▉┊···┊······················   4.3:1  AA large text only
paper good        ██████▉┊···┊······················   4.2:1  AA large text only
ink problem       ████████▊··┊······················   5.4:1  AA
ink good          ████████████▋·····················   7.8:1  AAA
phosphor problem  █████████▏·┊······················   5.7:1  AA
phosphor good     ██████████████▌···················   8.9:1  AAA
gilt problem      ████████████▍·····················   7.6:1  AAA
gilt good         ████████████······················   7.4:1  AAA

Source: Kit palettes before 0.3.0; weak views simulated (Machado 2009)

Problems and passes as words, after

                        3  4.5  7                        21:1
paper problem     █████████████████▎························   8.6:1  AAA
paper good        █████████▎····┊···························   4.6:1  AA
ink problem       █████████▍····┊···························   4.7:1  AA
ink good          █████████████████████████▏················  12.6:1  AAA
phosphor problem  █████████▍····┊···························   4.7:1  AA
phosphor good     ████████████████████████▎·················  12.1:1  AAA
gilt problem      █████████▍····┊···························   4.7:1  AA
gilt good         █████████████████████▎····················  10.6:1  AAA

Source: Glyph kit's palettes; weak views simulated (Machado 2009)
```

Remake all three with `node tools/palette-figures.mjs`. The old values are kept there as `BEFORE`.

## What it cost

- **`paper` problems moved toward the text.** On a light page both colours must be dark enough for words, so the room is small. Reaching 2 to 1 in every view would have turned problems nearly black. At `#6e2218` they are 1.7 to 1 from body text, down from 3.2, and still clearly red to most readers.
- **Passes on the dark palettes moved toward the text.** Mint, pale green and bright gold sit only 1.1 to 1 to 1.4 to 1 from the text colour, as `halloween`'s pale green does. They differ from text by hue, and every pass also has a word.
- **`phosphor` and `gilt` passes no longer match the data.** A pass used to be the data colour (`#58d68d`, `#c9a227`); now it is lighter, 1.3 and 1.4 to 1 apart, so a pass no longer looks like a bar. Keeping the data colour was not possible: no problem colour near the old one is 2 to 1 from it and still 4.5 to 1 for weak-red readers.

## What changed with it

- The "kit's own colours" figure (`tools/examples/systems.json`, drawn in `reference/areas/systems.md`) shows the new `paper` and `ink` pairs.
- The site's dark mode (`site/src/style.css`) takes `ink`'s new pair.
- Left as they were: the neutral tokens a prototype uses without a design-system map (`DEFAULT_TOKENS` in `html.mjs`, with `danger` and `ok`), and the example map's `--color-success` fallback. They stand for a user's design system, not a palette.

## Still open

- **Is `paper`'s 1.7 enough**, or should its problems go darker still, closer to the text?
- **Should the kit check this for every theme**, including a user's own: warn when problems and passes are under about 2 to 1 apart, or fall under 4.5 to 1 in a weak view?
- **The site's light colours** (`--signal-fail` `#b8421f` and `--signal-ok` `#04764e` in `site/src/style.css`) still differ by hue alone.
