# How a theme's colours relate: the built-in palettes

The kit now checks four rules on every theme you give it, measured in OKLCH, and says in plain words what breaks one and which nearby colour fits. They are notes, not refusals: a theme that breaks them still draws. Guide: `skills/glyph-kit/reference/colour.md`, "How a theme's colours relate". Redraw this page after changing a palette or a rule with `node tools/theme-rules.mjs`, then `glyph-kit redraw docs/theme-rules.md`.

1. **Data sets the hue.** The ramp is the data hue getting stronger, and its last step █ is the data colour.
2. **Problems are opposite data and loudest.** `flag` sits 150° to 210° from the data hue and is the most colourful role.
3. **Passes read apart from problems without colour.** `ok` is at least 0.15 lighter or darker than `flag`, a different hue, and less colourful.
4. **Neutrals belong to the theme.** The page, panel, lines and secondary text are the data hue at low chroma.

## The palettes against the rules

`paper` and `ink` have grey data, so rules 1 and 4 have no hue to follow; none of the four built-ins has its own ramp (the kit draws grids with `░▒▓█` in the data colour).

<!-- glyph-kit: theme-rules/palettes.json -->
```text
┌───────────┬───────────────┬────────────────┬────────────────┬────────────────┐
│ PALETTE   │ RAMP          │ PROBLEMS       │ PASSES         │ NEUTRALS       │
├───────────┼───────────────┼────────────────┼────────────────┼────────────────┤
│ paper     │ no ramp       │ ok             │ fails (louder) │ grey data      │
│ ink       │ no ramp       │ ok             │ ok             │ grey data      │
│ phosphor  │ no ramp       │ fails (106°    │ fails (louder) │ fails (off the │
│           │               │ from data,     │                │ data hue)      │
│           │               │ data louder)   │                │                │
│ gilt      │ no ramp       │ fails (64°     │ fails (louder) │ ok             │
│           │               │ from data,     │                │                │
│           │               │ data louder)   │                │                │
│ halloween │ fails (hue    │ fails (48°     │ ok             │ fails (off the │
│           │ drifts)       │ from data)     │                │ data hue)      │
└───────────┴───────────────┴────────────────┴────────────────┴────────────────┘
```

What each one would take:

- **`paper`: rule 3, by a little.** Since the lightness change (`docs/palette-lightness.md`), problems are the darker colour and well apart from passes, but its green passes are a touch more colourful than its oxblood problems. `ink` passes every rule.
- **`phosphor`: rules 2, 3 and 4.** Orange problems are 102° from green data, the green data is more colourful than the problems, the passes are the data colour, and the page and lines are GitHub's blue-grey. Fixing all three would make it a different palette: pink problems, green-grey neutrals.
- **`gilt`: rules 2 and 3.** Gold data and peach problems are 48° apart, and passes are the data colour. Problems opposite gold are violet (`#bd97ff`), which changes what the palette is.
- **Halloween: rules 1, 2 and 4.** The ramp starts purple and ends orange (108° and 96° off the data hue), pink problems are 48° from orange data, and the purple page and lines are 100° off. That purple is the point of the palette.

No built-in palette changes here. `phosphor` and `gilt` copy other products and Halloween's clash is its look, so the rules report them and leave them; `paper` and `ink` took the lightness proposal's values.

## Cut D's mixed theme, before and after

Before, the mixed theme in the 0.3.0 film (`film/030/specs/theme-mixed.json`) broke all four rules, with six notes: the ramp drifted from indigo to pink (66°, 57° and 31° off the data hue in its first three steps, and its last step was not the data colour), amber problems were 85° from the pink data and less colourful than it, passes were cyan and as light as the problems, and the plum neutrals were 30° off. After, every role is derived from one hue, `{ "base": "ink", "mixed": 285 }`, and no rule or contrast check fires.

Hue 285 is violet. It keeps the old ramp's indigo start (284°) and the amber problems (75° before, 80° after). The hot pink goes: opposite pink is green, and green problems read as passes, so no theme can keep pink data with the rules. The nearest alternative is 240, blue data with red-orange problems.

<!-- glyph-kit: theme-rules/mixed.json -->
```text
+-----------+---------+------+------+------+---------+------+------+------+
| ROLE      | BEFORE  | L    | C    | h    | AFTER   | L    | C    | h    |
+-----------+---------+------+------+------+---------+------+------+------+
| page      | #16051a | 0.16 | 0.05 | 320  | #0e0d1e | 0.17 | 0.03 | 285  |
| panel     | #240d29 | 0.21 | 0.06 | 320  | #18162b | 0.21 | 0.04 | 287  |
| text      | #f9ece1 | 0.95 | 0.02 | 63   | #ededf8 | 0.95 | 0.01 | 286  |
| secondary | #bfa2c6 | 0.75 | 0.06 | 320  | #83849b | 0.62 | 0.03 | 283  |
| data      | #fb40ad | 0.68 | 0.24 | 350  | #7c76cf | 0.61 | 0.13 | 285  |
| lines     | #603e68 | 0.42 | 0.08 | 320  | #3f3e56 | 0.38 | 0.04 | 286  |
| problems  | #ffb330 | 0.82 | 0.16 | 75   | #d39700 | 0.72 | 0.15 | 80   |
| passes    | #37ebda | 0.85 | 0.14 | 185  | #b1efb2 | 0.89 | 0.10 | 145  |
| ramp 1    | #2c2463 | 0.31 | 0.11 | 284  | #302e51 | 0.32 | 0.06 | 285  |
| ramp 2    | #5b3aa6 | 0.45 | 0.16 | 293  | #4a477b | 0.43 | 0.08 | 285  |
| ramp 3    | #b64fd0 | 0.61 | 0.21 | 319  | #625da3 | 0.52 | 0.11 | 285  |
| ramp 4    | #f59ad8 | 0.80 | 0.13 | 340  | #7c76cf | 0.61 | 0.13 | 285  |
+-----------+---------+------+------+------+---------+------+------+------+
```
