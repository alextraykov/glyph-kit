# Design system

Document the design system as data: scales, contrast, component states, layers and tokens. Contrast is computed, not eyeballed.

Types: `spacingScale`, `typeScale`, `contrast`, `stateMatrix`, `layerStack`, `tokenTable`, `table`.

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
