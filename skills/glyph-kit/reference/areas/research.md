# Research data

Turn interviews, surveys and usability tests into evidence a team can read in a PR or a ticket. Every figure keeps who said it and where it came from.

Examples: `examples/research.json`. Render any of them with `node scripts/glyph-kit.mjs render examples/research.json --to markdown` (or `--to html`).

## Likert answers

`kind: "likert"`

**Use it for** a survey question answered on a five-point scale, compared across questions.

```text
                                 disagree│agree
Easy to find export          ████▒▒▒▒▒▒░░│░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒██  65% agree
Trust the numbers    ██████▒▒▒▒▒▒▒▒▒▒░░░░│░░░░▒▒▒▒▒▒████        25% agree
Would use it weekly           ██▒▒▒▒░░░░░│░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒█  60% agree

█ strongly   ▒ somewhat   ░ neutral

                                                              SAMPLE DATA
```

*How people rated the export flow. Easy to find export: 2, 3, 2, 8, 5 from strongly disagree to strongly agree. Trust the numbers: 6, 5, 4, 3, 2 from strongly disagree to strongly agree. Would use it weekly: 1, 2, 5, 7, 5 from strongly disagree to strongly agree*

<details><summary>Spec</summary>

```json
{
  "kind": "likert",
  "data": [
    {
      "label": "Easy to find export",
      "counts": [
        2,
        3,
        2,
        8,
        5
      ]
    },
    {
      "label": "Trust the numbers",
      "counts": [
        6,
        5,
        4,
        3,
        2
      ]
    },
    {
      "label": "Would use it weekly",
      "counts": [
        1,
        2,
        5,
        7,
        5
      ]
    }
  ]
}
```

</details>

**Watch for:** Show the counts or percentages; never hide neutral answers, they change the story.

## Themes by participant

`kind: "themeMatrix"`

**Use it for** synthesis after interviews: which themes came from how many people.

```text
                   P1 P2 P3 P4 P5 P6   n
can't find export  ■  ■  ·  ■  ■  ■    5
distrusts totals   ■  ·  ■  ·  ■  ·    3
wants keyboard     ·  ■  ■  ·  ·  ·    2

                             SAMPLE DATA
```

*Themes across six interviews. can't find export: 5 participants. distrusts totals: 3 participants. wants keyboard: 2 participants*

<details><summary>Spec</summary>

```json
{
  "kind": "themeMatrix",
  "data": [
    {
      "label": "can't find export",
      "by": [
        "P1",
        "P2",
        "P4",
        "P5",
        "P6"
      ]
    },
    {
      "label": "distrusts totals",
      "by": [
        "P1",
        "P3",
        "P5"
      ]
    },
    {
      "label": "wants keyboard",
      "by": [
        "P2",
        "P3"
      ]
    }
  ]
}
```

</details>

**Watch for:** A theme from one loud participant looks small here, which is the point. Keep participant codes, never names.

## Affinity counts

`kind: "affinity"`

**Use it for** counting notes per cluster after an affinity session.

```text
export       ■■■■■·  5 of 6
permissions  ■■■···  3 of 6
search       ■■····  2 of 6

                SAMPLE DATA
```

*Notes per cluster. export: 5. permissions: 3. search: 2*

<details><summary>Spec</summary>

```json
{
  "kind": "affinity",
  "data": [
    {
      "label": "export",
      "count": 5
    },
    {
      "label": "permissions",
      "count": 3
    },
    {
      "label": "search",
      "count": 2
    }
  ],
  "options": {
    "total": 6
  }
}
```

</details>

**Watch for:** State what was counted (notes, people, sessions) in the title.

## Quote card

`kind: "quoteCard"`

**Use it for** evidence for a finding, quoted exactly.

```text
┌─ can't find export ──────────────────────┐
│ “I looked for export in settings, then   │
│ gave up and screenshotted the table.”    │
│                                          │
│ P4, operations lead · interview 3, 12:40 │
└──────────────────────────────────────────┘

                                 SAMPLE DATA
```

*Evidence for 'can't find export'. P4, operations lead said: I looked for export in settings, then gave up and screenshotted the table.*

<details><summary>Spec</summary>

```json
{
  "kind": "quoteCard",
  "data": {
    "quote": "I looked for export in settings, then gave up and screenshotted the table.",
    "who": "P4, operations lead",
    "source": "interview 3, 12:40",
    "theme": "can't find export"
  }
}
```

</details>

**Watch for:** Quote verbatim, cite the session and time, and never attach a real name without consent.

## Task results

`kind: "taskStats"`

**Use it for** usability test timings and completion.

```text
find export             ├██│█████─────┤        median 52s · 5/8 done
share a view     ├─│███─┤                      median 21s · 8/8 done
              0s            60s          120s

├─ fastest   █ middle half   │ median   ─┤ slowest

                                                         SAMPLE DATA
```

*Usability test, eight people. find export: median 52 seconds, 5 of 8 finished. share a view: median 21 seconds, 8 of 8 finished*

<details><summary>Spec</summary>

```json
{
  "kind": "taskStats",
  "data": [
    {
      "label": "find export",
      "min": 38,
      "q1": 44,
      "median": 52,
      "q3": 70,
      "max": 95,
      "done": 5,
      "of": 8
    },
    {
      "label": "share a view",
      "min": 12,
      "q1": 18,
      "median": 21,
      "q3": 30,
      "max": 41,
      "done": 8,
      "of": 8
    }
  ],
  "options": {
    "scale": 120
  }
}
```

</details>

**Watch for:** With fewer than about eight people, report the range and the completions, not a confident median.

## Journey feeling

`kind: "emotionCurve"`

**Use it for** how a journey felt, stage by stage.

```text
+2                                           █
+1       █                                               █
 0 ··················█·········································
-1
-2                               █
   discover    sign up     import      first chart share

                                                    SAMPLE DATA
```

*How the first week felt. discover +1, sign up 0, import -2, first chart +2, share +1*

<details><summary>Spec</summary>

```json
{
  "kind": "emotionCurve",
  "data": [
    {
      "label": "discover",
      "score": 1
    },
    {
      "label": "sign up",
      "score": 0
    },
    {
      "label": "import",
      "score": -2
    },
    {
      "label": "first chart",
      "score": 2
    },
    {
      "label": "share",
      "score": 1
    }
  ]
}
```

</details>

**Watch for:** The score is a judgement from research, say whose and from what.
