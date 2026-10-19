# Planning

Roadmaps, priorities, ownership and decisions in a form that lives next to the work and diffs when plans change.

Each kind below shows the spec that made its figure. Save one as spec.json and render it with `node scripts/glyph-kit.mjs render spec.json --to markdown` (or `--to html`).

## Now, next, later

`kind: "board"`

**Use it for** now, next, later, or any set of columns.

```text
┌─ NOW ──────────────┬─ NEXT ─────────────┬─ LATER ────────────┐
│ · Export to CSV    │ · Saved views      │ · Scheduled        │
│ · Fix date parsing │ · Keyboard         │   reports          │
│   on import        │   shortcuts for    │                    │
│                    │   tables           │                    │
└────────────────────┴────────────────────┴────────────────────┘

                                                     SAMPLE DATA
```

*Roadmap. now: Export to CSV, Fix date parsing on import. next: Saved views, Keyboard shortcuts for tables. later: Scheduled reports*

<details><summary>Spec</summary>

```json
{
  "kind": "board",
  "data": {
    "now": [
      "Export to CSV",
      "Fix date parsing on import"
    ],
    "next": [
      "Saved views",
      "Keyboard shortcuts for tables"
    ],
    "later": [
      "Scheduled reports"
    ]
  }
}
```

</details>

**Watch for:** Keep items short enough to fit two lines.

## Impact and effort

`kind: "impactEffort"`

**Use it for** choosing what to do first.

```text
impact
high │ quick wins         │ big bets
     │        [1]         │
     │                    │               [3]
     │                    │   [2]
     │                    │
     │                    │
     │────────────────────┼────────────────────
     │                    │
     │                    │[4]
     │    [5]             │
     │                    │
 low │ fill-ins           │ money pits
     └─────────────────────────────────────────
      low                           high effort

[1] Fix date parsing
[2] Saved views
[3] New onboarding
[4] Dark mode
[5] Rename tabs

                                    SAMPLE DATA
```

*What to fix first. Fix date parsing: impact 0.9, effort 0.2. Saved views: impact 0.7, effort 0.6. New onboarding: impact 0.8, effort 0.9. Dark mode: impact 0.3, effort 0.5. Rename tabs: impact 0.2, effort 0.1*

<details><summary>Spec</summary>

```json
{
  "kind": "impactEffort",
  "data": [
    {
      "label": "Fix date parsing",
      "impact": 0.9,
      "effort": 0.2
    },
    {
      "label": "Saved views",
      "impact": 0.7,
      "effort": 0.6
    },
    {
      "label": "New onboarding",
      "impact": 0.8,
      "effort": 0.9
    },
    {
      "label": "Dark mode",
      "impact": 0.3,
      "effort": 0.5
    },
    {
      "label": "Rename tabs",
      "impact": 0.2,
      "effort": 0.1
    }
  ]
}
```

</details>

**Watch for:** Scores are estimates; write who scored them.

## Swimlane

`kind: "swimlane"`

**Use it for** who does what, in what order, across roles.

```text
DESIGNER          ENGINEER          REVIEWER
────────          ────────          ────────
prototype ──────► read spec
                  build ──────────► review
                                    x missing states
revise ◄────────────────────────────┘
spec v2 ────────► build ──────────► ok, approve

                                         SAMPLE DATA
```

*Handoff for one feature. Lanes: Designer, Engineer, Reviewer.*

<details><summary>Spec</summary>

```json
{
  "kind": "swimlane",
  "data": {
    "lanes": [
      "Designer",
      "Engineer",
      "Reviewer"
    ],
    "rows": [
      [
        {
          "lane": 0,
          "text": "prototype"
        },
        {
          "lane": 1,
          "text": "read spec"
        }
      ],
      [
        {
          "lane": 1,
          "text": "build"
        },
        {
          "lane": 2,
          "text": "review"
        }
      ],
      [
        {
          "lane": 2,
          "text": "x missing states"
        }
      ],
      {
        "back": {
          "from": 2,
          "to": 0,
          "text": "revise"
        }
      },
      [
        {
          "lane": 0,
          "text": "spec v2"
        },
        {
          "lane": 1,
          "text": "build"
        },
        {
          "lane": 2,
          "text": "ok, approve"
        }
      ]
    ]
  }
}
```

</details>

**Watch for:** One action per row; returns go left once.

## Timeline

`kind: "gantt"`

**Use it for** release plans, animation tracks, anything over time.

```text
research ████████································  0 wk–2 wk
design   ····████████████························  1 wk–4 wk
build    ············████████████████████········  3 wk–8 wk
beta     ····························████████····  7 wk–9 wk
         0 wk                5 wk            10 wk

                                                 SAMPLE DATA
```

*Release plan, in weeks. research 0 to 2. design 1 to 4. build 3 to 8. beta 7 to 9*

<details><summary>Spec</summary>

```json
{
  "kind": "gantt",
  "data": [
    {
      "label": "research",
      "start": 0,
      "end": 2
    },
    {
      "label": "design",
      "start": 1,
      "end": 4
    },
    {
      "label": "build",
      "start": 3,
      "end": 8
    },
    {
      "label": "beta",
      "start": 7,
      "end": 9
    }
  ],
  "options": {
    "scale": 10,
    "width": 40,
    "unit": " wk"
  }
}
```

</details>

**Watch for:** One scale for all rows; print start and end as text.

## Status key

`kind: "statusKey"`

**Use it for** a legend for status across documents.

```text
████████████  shipped
▓▓▓▓▓▓▓▓▓▓▓▓  in review
▒▒▒▒▒▒▒▒▒▒▒▒  in progress
░░░░░░░░░░░░  supporting
              not yet

              SAMPLE DATA
```

*Status ladder. shipped, in review, in progress, supporting, not yet*

<details><summary>Spec</summary>

```json
{
  "kind": "statusKey",
  "data": [
    {
      "level": 4,
      "label": "shipped"
    },
    {
      "level": 3,
      "label": "in review"
    },
    {
      "level": 2,
      "label": "in progress"
    },
    {
      "level": 1,
      "label": "supporting"
    },
    {
      "level": 0,
      "label": "not yet"
    }
  ]
}
```

</details>

**Watch for:** Keep the same mapping in every document of a project.

## Decision log

`kind: "decisionLog"`

**Use it for** recording what was decided and why.

```text
┌───────┬────────────────────────────┬────────────────────────────┬────────┐
│ Date  │ Decision                   │ Why                        │ Owner  │
├───────┼────────────────────────────┼────────────────────────────┼────────┤
│ Oct 2 │ CSV first, not PDF         │ 8 of 10 asks were CSV      │ Design │
│ Oct 9 │ Parse dates in the browser │ Server change is 3 sprints │ Eng    │
└───────┴────────────────────────────┴────────────────────────────┴────────┘

                                                                 SAMPLE DATA
```

*Decisions. Oct 2: CSV first, not PDF. Oct 9: Parse dates in the browser*

<details><summary>Spec</summary>

```json
{
  "kind": "decisionLog",
  "data": [
    {
      "date": "Oct 2",
      "decision": "CSV first, not PDF",
      "why": "8 of 10 asks were CSV",
      "owner": "Design"
    },
    {
      "date": "Oct 9",
      "decision": "Parse dates in the browser",
      "why": "Server change is 3 sprints",
      "owner": "Eng"
    }
  ]
}
```

</details>

**Watch for:** Write the why as evidence, not opinion.
