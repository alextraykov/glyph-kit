# Handoff and QA

Measurements and checklists for handing work to engineering and checking what came back.

Kinds: `redline`, `qaChecklist`, `compare`.

Each kind shows its figure and the spec that made it. `node scripts/glyph-kit.mjs guide <kind>` prints one kind's section without the figure.

## Spacing redline

`kind: "redline"`

**Use it for** spacing and widths for handoff.

```text
│◄ 16 ►│◄────────────── content 320 ───────────────►│◄ 16 ►│

                                                 SAMPLE DATA
```

```json
{
  "kind": "redline",
  "title": "Content width",
  "data": [
    { "label": "16", "size": 16 },
    { "label": "content 320", "size": 320 },
    { "label": "16", "size": 16 }
  ]
}
```

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

```json
{
  "kind": "qaChecklist",
  "title": "Design QA",
  "data": [
    { "text": "Spacing matches the 8px scale", "status": "done" },
    { "text": "Focus states on every button", "status": "progress" },
    { "text": "Empty state copy", "status": "todo" },
    {
      "text": "Icon set",
      "status": "blocked",
      "note": "waiting on brand"
    },
    { "text": "Dark theme contrast", "status": "done" }
  ]
}
```

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

```json
{
  "kind": "compare",
  "title": "Before and after the spacing pass",
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
  "options": { "headers": ["MEASURE", "BEFORE", "AFTER"] }
}
```

**Watch for:** Every row needs its own unit in the text; ten cells is enough.
