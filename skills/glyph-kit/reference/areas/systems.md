# Design system

Document the design system as data: scales, contrast, component states, layers and tokens. Contrast is computed, not eyeballed.

Each kind below shows the spec that made its figure. Save one as spec.json and render it with `node scripts/glyph-kit.mjs render spec.json --to markdown` (or `--to html`).

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

*Spacing tokens. space-1 4px, space-2 8px, space-3 16px, space-4 24px, space-5 40px*

<details><summary>Spec</summary>

```json
{
  "kind": "spacingScale",
  "data": [
    {
      "name": "space-1",
      "value": 4
    },
    {
      "name": "space-2",
      "value": 8
    },
    {
      "name": "space-3",
      "value": 16
    },
    {
      "name": "space-4",
      "value": 24
    },
    {
      "name": "space-5",
      "value": 40
    }
  ]
}
```

</details>

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

*Type scale. display 44px, heading 22px, body 16px, caption 11px*

<details><summary>Spec</summary>

```json
{
  "kind": "typeScale",
  "data": [
    {
      "name": "display",
      "size": 44,
      "lineHeight": 48
    },
    {
      "name": "heading",
      "size": 22,
      "lineHeight": 28
    },
    {
      "name": "body",
      "size": 16,
      "lineHeight": 24
    },
    {
      "name": "caption",
      "size": 11,
      "lineHeight": 16
    }
  ]
}
```

</details>

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

*Text contrast. ink on paper: 19.3 to 1. muted on paper: 2.7 to 1. link on panel: 5.0 to 1*

<details><summary>Spec</summary>

```json
{
  "kind": "contrast",
  "data": [
    {
      "label": "ink on paper",
      "fg": "#080808",
      "bg": "#fbfbf8"
    },
    {
      "label": "muted on paper",
      "fg": "#9a9a92",
      "bg": "#fbfbf8"
    },
    {
      "label": "link on panel",
      "fg": "#04764e",
      "bg": "#f1f1ec"
    }
  ]
}
```

</details>

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

*Button states. 3 variants by 6 states.*

<details><summary>Spec</summary>

```json
{
  "kind": "stateMatrix",
  "data": {
    "variants": [
      "primary",
      "secondary",
      "text"
    ],
    "states": [
      "rest",
      "hover",
      "focus",
      "pressed",
      "disabled",
      "loading"
    ],
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

</details>

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

*Layers. page at 0, card at 100, dimmer at 300, dialog at 400*

<details><summary>Spec</summary>

```json
{
  "kind": "layerStack",
  "data": [
    {
      "name": "page",
      "z": 0
    },
    {
      "name": "card",
      "z": 100
    },
    {
      "name": "dimmer",
      "z": 300
    },
    {
      "name": "dialog",
      "z": 400
    }
  ]
}
```

</details>

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

*Colour roles. ink: #080808, paper: #fbfbf8, signal-fail: #b8421f*

<details><summary>Spec</summary>

```json
{
  "kind": "tokenTable",
  "data": [
    {
      "name": "ink",
      "value": "#080808",
      "use": "text, borders, primary buttons"
    },
    {
      "name": "paper",
      "value": "#fbfbf8",
      "use": "page background"
    },
    {
      "name": "signal-fail",
      "value": "#b8421f",
      "use": "errors only"
    }
  ]
}
```

</details>

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

*Breakpoints. Table with 3 rows: Name, Min width, Columns.*

<details><summary>Spec</summary>

```json
{
  "kind": "table",
  "data": [
    [
      "Name",
      "Min width",
      "Columns"
    ],
    [
      "phone",
      "0",
      "4"
    ],
    [
      "tablet",
      "700",
      "8"
    ],
    [
      "desktop",
      "1180",
      "12"
    ]
  ]
}
```

</details>

**Watch for:** In Markdown, use a Markdown table.
