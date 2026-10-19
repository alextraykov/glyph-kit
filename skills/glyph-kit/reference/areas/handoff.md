# Handoff and QA

Measurements and checklists for handing work to engineering and checking what came back.

Examples: `examples/handoff.json`. Render any of them with `node scripts/glyph-kit.mjs render examples/handoff.json --to markdown` (or `--to html`).

## Spacing redline

`kind: "redline"`

**Use it for** spacing and widths for handoff.

```text
│◄ 16 ►│◄────────────── content 320 ───────────────►│◄ 16 ►│

                                                 SAMPLE DATA
```

*Content width. 16, then content 320, then 16*

<details><summary>Spec</summary>

```json
{
  "kind": "redline",
  "data": [
    {
      "label": "16",
      "size": 16
    },
    {
      "label": "content 320",
      "size": 320
    },
    {
      "label": "16",
      "size": 16
    }
  ]
}
```

</details>

**Watch for:** Widths are proportional but labels carry the real numbers.

## QA checklist

`kind: "qaChecklist"`

**Use it for** design QA before release.

```text
2 of 5 done  [ ██░░░ ]

█ done         Spacing matches the 8px scale
▒ in progress  Focus states on every button
  to do        Empty state copy
x blocked      Icon set (waiting on brand)
█ done         Dark theme contrast

                                 SAMPLE DATA
```

*Design QA. 2 of 5 done.*

<details><summary>Spec</summary>

```json
{
  "kind": "qaChecklist",
  "data": [
    {
      "text": "Spacing matches the 8px scale",
      "status": "done"
    },
    {
      "text": "Focus states on every button",
      "status": "progress"
    },
    {
      "text": "Empty state copy",
      "status": "todo"
    },
    {
      "text": "Icon set",
      "status": "blocked",
      "note": "waiting on brand"
    },
    {
      "text": "Dark theme contrast",
      "status": "done"
    }
  ]
}
```

</details>

**Watch for:** Blocked items need a reason in words.

## Before and after

`kind: "compare"`

**Use it for** two versions of the same measures, side by side.

```text
MEASURE         BEFORE         AFTER
off-scale gaps  ██████░░░░ 31  █░░░░░░░░░ 2
custom colours  ████░░░░░░ 18  ░░░░░░░░░░ 0

                                SAMPLE DATA
```

*Before and after the spacing pass. off-scale gaps: 31 against 2. custom colours: 18 against 0*

<details><summary>Spec</summary>

```json
{
  "kind": "compare",
  "data": [
    {
      "label": "off-scale gaps",
      "a": 0.6,
      "aText": "31",
      "b": 0.04,
      "bText": "2"
    },
    {
      "label": "custom colours",
      "a": 0.4,
      "aText": "18",
      "b": 0,
      "bText": "0"
    }
  ],
  "options": {
    "headers": [
      "MEASURE",
      "BEFORE",
      "AFTER"
    ]
  }
}
```

</details>

**Watch for:** Every row needs its own unit in the text; ten cells is enough.
