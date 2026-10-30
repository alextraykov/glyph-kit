# Design system

Document the design system as data: scales, colour, contrast, component states, layers and tokens. Contrast is computed, not eyeballed.

Types: `spacingScale`, `typeScale`, `contrast`, `palette`, `colourRoles`, `stateMatrix`, `layerStack`, `tokenTable`, `table`.

Each type shows its figure and the spec that made it; the spec's `kind` field names the type. `node scripts/glyph-kit.mjs guide <type>` prints one type's section without the figure.

## Spacing scale

`kind: "spacingScale"`

**Use it for** documenting spacing tokens.

```text
space-1  █           4px
space-2  ██          8px
space-3  ████        16px
space-4  ██████      24px
space-5  ██████████  40px

One █ is 4px.

              SAMPLE DATA
```

```json
{
  "kind": "spacingScale",
  "title": "Spacing tokens",
  "data": [
    { "name": "space-1", "value": 4 },
    { "name": "space-2", "value": 8 },
    { "name": "space-3", "value": 16 },
    { "name": "space-4", "value": 24 },
    { "name": "space-5", "value": 40 }
  ]
}
```

**Watch for:** State the unit per cell under the chart.

## Type scale

`kind: "typeScale"`

**Use it for** documenting type sizes and line heights.

```text
display  ████████████████████████████  44/48
heading  ██████████████                22/28
body     ██████████▏                   16/24
caption  ███████                       11/16

                                 SAMPLE DATA
```

```json
{
  "kind": "typeScale",
  "title": "Type scale",
  "data": [
    { "name": "display", "size": 44, "lineHeight": 48 },
    { "name": "heading", "size": 22, "lineHeight": 28 },
    { "name": "body", "size": 16, "lineHeight": 24 },
    { "name": "caption", "size": 11, "lineHeight": 16 }
  ]
}
```

**Watch for:** Sizes in one unit; bars compare size, not weight.

## Contrast check

`kind: "contrast"`

**Use it for** checking colour pairs against WCAG 2 thresholds.

```text
                      3  4.5  7                        21:1
ink on paper    ██████████████████████████████████████▋···  19.3:1  AAA
muted on paper  █████▌┊··┊····┊···························   2.7:1  fails
link on panel   ██████████····┊···························   5.0:1  AA

                                                              SAMPLE DATA
```

```json
{
  "kind": "contrast",
  "title": "Text contrast",
  "data": [
    { "label": "ink on paper", "fg": "#080808", "bg": "#fbfbf8" },
    { "label": "muted on paper", "fg": "#9a9a92", "bg": "#fbfbf8" },
    { "label": "link on panel", "fg": "#04764e", "bg": "#f1f1ec" }
  ]
}
```

**Watch for:** AA needs 4.5:1 for body text and 3:1 for large text and UI parts.

## Palette

`kind: "palette"`

**Use it for** showing a tonal scale: every step of each hue, with its contrast on the page.

```text
        Blue               Red                Green              Grey
50      ██ #eef3ff  1.1    ██ #fff1ee  1.1    ██ #ecf8f1  1.1    ██ #f7f6f1  1.1
100     ██ #dbe6ff  1.3    ██ #ffdfd8  1.3    ██ #d3f0df  1.2    ██ #efede6  1.2
200     ██ #b7ccfb  1.6    ██ #fbbcae  1.6    ██ #a6dfbf  1.5    ██ #dcdad2  1.4
300     ██ #8eaaf2  2.3    ██ #f2917c  2.3    ██ #6fc799  2.0    ██ #c2c0b7  1.8
400     ██ #6487e6  3.4    ██ #e2664c  3.4    ██ #3fa875  3.0    ██ #a3a199  2.6
500   ▲ ██ #4269d6  5.0  ▲ ██ #c94a30  4.7    ██ #24895b  4.4    ██ #85837b  3.8
600     ██ #3152b8  6.9    ██ #a83a24  6.4  ▲ ██ #1b6e49  6.2  ▲ ██ #6b6a64  5.4
700     ██ #263f8f  9.6    ██ #842d1c  8.8    ██ #155538  8.8    ██ #504f4a  8.2
800     ██ #1c2d66 13.0    ██ #5e2014 12.4    ██ #0f3c28 12.4    ██ #33332f 12.7
900     ██ #121c40 16.6    ██ #3b140c 16.3    ██ #092519 16.3    ██ #151513 18.3

Contrast on the page, #ffffff. ▲ first step that reads as words: 4.5 to 1.

                                                                     SAMPLE DATA
```

```json
{
  "kind": "palette",
  "title": "A tonal scale",
  "data": {
    "page": "#ffffff",
    "hues": [
      {
        "name": "Blue",
        "steps": [
          { "name": "50", "value": "#eef3ff" },
          { "name": "100", "value": "#dbe6ff" },
          { "name": "200", "value": "#b7ccfb" },
          { "name": "300", "value": "#8eaaf2" },
          { "name": "400", "value": "#6487e6" },
          { "name": "500", "value": "#4269d6" },
          { "name": "600", "value": "#3152b8" },
          { "name": "700", "value": "#263f8f" },
          { "name": "800", "value": "#1c2d66" },
          { "name": "900", "value": "#121c40" }
        ]
      },
      {
        "name": "Red",
        "steps": [
          { "name": "50", "value": "#fff1ee" },
          { "name": "100", "value": "#ffdfd8" },
          { "name": "200", "value": "#fbbcae" },
          { "name": "300", "value": "#f2917c" },
          { "name": "400", "value": "#e2664c" },
          { "name": "500", "value": "#c94a30" },
          { "name": "600", "value": "#a83a24" },
          { "name": "700", "value": "#842d1c" },
          { "name": "800", "value": "#5e2014" },
          { "name": "900", "value": "#3b140c" }
        ]
      },
      {
        "name": "Green",
        "steps": [
          { "name": "50", "value": "#ecf8f1" },
          { "name": "100", "value": "#d3f0df" },
          { "name": "200", "value": "#a6dfbf" },
          { "name": "300", "value": "#6fc799" },
          { "name": "400", "value": "#3fa875" },
          { "name": "500", "value": "#24895b" },
          { "name": "600", "value": "#1b6e49" },
          { "name": "700", "value": "#155538" },
          { "name": "800", "value": "#0f3c28" },
          { "name": "900", "value": "#092519" }
        ]
      },
      {
        "name": "Grey",
        "steps": [
          { "name": "50", "value": "#f7f6f1" },
          { "name": "100", "value": "#efede6" },
          { "name": "200", "value": "#dcdad2" },
          { "name": "300", "value": "#c2c0b7" },
          { "name": "400", "value": "#a3a199" },
          { "name": "500", "value": "#85837b" },
          { "name": "600", "value": "#6b6a64" },
          { "name": "700", "value": "#504f4a" },
          { "name": "800", "value": "#33332f" },
          { "name": "900", "value": "#151513" }
        ]
      }
    ]
  }
}
```

**Watch for:** Steps must get steadily lighter or darker. Four hues fit in 80 cells; split a bigger palette into figures by family.

## Colour roles

`kind: "colourRoles"`

**Use it for** saying what each colour is for, with its light and dark values and a contrast verdict.

```text
role       token       light #f7f6f1     dark #0d0d0c
words      --gk-ink    ██ #151513 16.9   ██ #f2f0e8 17.0   AAA
secondary  --gk-muted  ██ #6b6a64  5.0   ██ #9a988f  6.7   AA
problems   --gk-flag   ██ #651b13 11.3   ██ #dc7351  6.1   AA
passes     --gk-ok     ██ #2f743e  5.3   ██ #89f1b5 14.2   AA
data       --gk-data   ██ #151513 16.9   ██ #f2f0e8 17.0   ok
lines      --gk-frame  ██ #a3a199  2.4   ██ #5c5b56  2.9   ok

Words need 4.5 to 1 (7 for AAA), marks 3, lines 1.5.
```

```json
{
  "kind": "colourRoles",
  "title": "The kit's own colours",
  "data": {
    "page": { "light": "#f7f6f1", "dark": "#0d0d0c" },
    "roles": [
      {
        "role": "words",
        "token": "--gk-ink",
        "light": "#151513",
        "dark": "#f2f0e8",
        "use": "words"
      },
      {
        "role": "secondary",
        "token": "--gk-muted",
        "light": "#6b6a64",
        "dark": "#9a988f",
        "use": "words"
      },
      {
        "role": "problems",
        "token": "--gk-flag",
        "light": "#651b13",
        "dark": "#dc7351",
        "use": "words"
      },
      {
        "role": "passes",
        "token": "--gk-ok",
        "light": "#2f743e",
        "dark": "#89f1b5",
        "use": "words"
      },
      {
        "role": "data",
        "token": "--gk-data",
        "light": "#151513",
        "dark": "#f2f0e8",
        "use": "marks"
      },
      {
        "role": "lines",
        "token": "--gk-frame",
        "light": "#a3a199",
        "dark": "#5c5b56",
        "use": "lines"
      }
    ]
  }
}
```

**Watch for:** Say the use: words need 4.5 to 1, marks 3, lines 1.5. A colour that passes on light can fail on dark.

## Component states

`kind: "stateMatrix"`

**Use it for** which component states exist, are in progress or missing.

```text
           rest      hover     focus     pressed   disabled  loading
primary    ██        ██        ██        ██        ▒▒        ░░
secondary  ██        ██        ▒▒        ░░        ░░
text       ██        ██        ██                  ██

█ done   ▒ in progress   ░ missing   blank: doesn't apply

                                                         SAMPLE DATA
```

```json
{
  "kind": "stateMatrix",
  "title": "Button states",
  "data": {
    "variants": ["primary", "secondary", "text"],
    "states": ["rest", "hover", "focus", "pressed", "disabled", "loading"],
    "cells": {
      "primary": {
        "rest": "done",
        "hover": "done",
        "focus": "done",
        "pressed": "done",
        "disabled": "progress",
        "loading": "missing"
      },
      "secondary": {
        "rest": "done",
        "hover": "done",
        "focus": "progress",
        "pressed": "missing",
        "disabled": "missing",
        "loading": "na"
      },
      "text": {
        "rest": "done",
        "hover": "done",
        "focus": "done",
        "pressed": "na",
        "disabled": "done",
        "loading": "na"
      }
    }
  }
}
```

**Watch for:** Blank means the state doesn't apply; missing is ░.

## Layer stack

`kind: "layerStack"`

**Use it for** z-index and surface order.

```text
dialog  z 400         ████████████
dimmer  z 300       ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
card    z 100     ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
page    z 0     ────────────────────────

                             SAMPLE DATA
```

```json
{
  "kind": "layerStack",
  "title": "Layers",
  "data": [
    { "name": "page", "z": 0 },
    { "name": "card", "z": 100 },
    { "name": "dimmer", "z": 300 },
    { "name": "dialog", "z": 400 }
  ]
}
```

**Watch for:** Name what each layer is for, not just its number.

## Token table

`kind: "tokenTable"`

**Use it for** listing tokens with their values and uses.

```text
┌─────────────┬─────────┬────────────────────────────────┐
│ Token       │ Value   │ Use                            │
├─────────────┼─────────┼────────────────────────────────┤
│ ink         │ #080808 │ text, borders, primary buttons │
│ paper       │ #fbfbf8 │ page background                │
│ signal-fail │ #b8421f │ errors only                    │
└─────────────┴─────────┴────────────────────────────────┘

                                               SAMPLE DATA
```

```json
{
  "kind": "tokenTable",
  "title": "Colour roles",
  "data": [
    {
      "name": "ink",
      "value": "#080808",
      "use": "text, borders, primary buttons"
    },
    { "name": "paper", "value": "#fbfbf8", "use": "page background" },
    { "name": "signal-fail", "value": "#b8421f", "use": "errors only" }
  ]
}
```

**Watch for:** Inside Markdown, a Markdown table is easier to edit.

## Table

`kind: "table"`

**Use it for** tables in places without Markdown: terminals, code comments.

```text
┌─────────┬───────────┬─────────┐
│ Name    │ Min width │ Columns │
├─────────┼───────────┼─────────┤
│ phone   │ 0         │ 4       │
│ tablet  │ 700       │ 8       │
│ desktop │ 1180      │ 12      │
└─────────┴───────────┴─────────┘

                      SAMPLE DATA
```

```json
{
  "kind": "table",
  "title": "Breakpoints",
  "data": [
    ["Name", "Min width", "Columns"],
    ["phone", "0", "4"],
    ["tablet", "700", "8"],
    ["desktop", "1180", "12"]
  ]
}
```

**Watch for:** In Markdown, use a Markdown table.
