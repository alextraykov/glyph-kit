# Handoff and QA

Measurements and checklists for handing work to engineering and checking what came back.

Types: `redline`, `qaChecklist`, `anatomy`, `compare`.

Each type shows its figure and the spec that made it; the spec's `kind` field names the type. `node scripts/glyph-kit.mjs guide <type>` prints one type's section without the figure.

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

## Component anatomy

`kind: "anatomy"`

**Use it for** the parts of a component for a spec page or handoff: what each numbered part is, its token or rule, and which parts are optional.

```text
┌ 1 ───────────────────────────────────────────────────────┐
│  ┌ 2 ┄┄┄┄┄┐  ┌ 3 ────────────────────────┐  ┌ 4 ┄┄┄┄┄┄┐  │
│  ┆  Icon  ┆  │  Input text               │  ┆  Clear  ┆  │
│  └┄┄┄┄┄┄┄┄┘  └───────────────────────────┘  └┄┄┄┄┄┄┄┄┄┘  │
└──────────────────────────────────────────────────────────┘

1  Container   radius 8, border 1, padding 12
2  Icon        icon 20                         optional
3  Input text  body 16, 1 line
4  Clear       icon 20, when filled            optional

┄ dashed edge: an optional part

                                                 SAMPLE DATA
```

```json
{
  "kind": "anatomy",
  "title": "Text field anatomy",
  "data": {
    "direction": "row",
    "container": { "label": "Container", "spec": "radius 8, border 1, padding 12" },
    "parts": [
      {
        "label": "Icon",
        "size": 4,
        "spec": "icon 20",
        "optional": true
      },
      { "label": "Input text", "size": 16, "spec": "body 16, 1 line" },
      {
        "label": "Clear",
        "size": 4,
        "spec": "icon 20, when filled",
        "optional": true
      }
    ]
  }
}
```

**Motion:** The container stands first with its legend line, then each part lands in number order on the same step as its legend line, so the eye ties the number, its place on the component and its rule together; the dashed-edge key lands last.

**Watch for:** Name parts as the design system does and put the rule in spec, not the look. Up to 8 parts; parts side by side take a row, stacked parts (a card) take direction column. Sizes are proportions, so real measurements belong in a redline.

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
