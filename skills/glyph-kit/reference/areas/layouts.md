# Document layouts

Whole deliverables on one page: a readout, a dashboard, a PR summary, a design review or a status update. Fill the slots with a sentence, short lists and ordinary specs; code places everything within 80 cells, putting narrow figures side by side and stacking the rest. Figures without their own source use the layout's. Export to HTML or PDF for a finished page in the kit's type. Pick by the ask: a write-up or one-pager is a readout; weekly numbers a dashboard; what a PR changed a prSummary; choosing between options a designReview; where work stands a statusUpdate. When unsure, use a readout.

Each kind below shows the spec that made its figure. Save one as spec.json and render it with `node scripts/glyph-kit.mjs render spec.json --to markdown` (or `--to html`).

## Readout

`kind: "readout"`

**Use it for** a one-pager on a test or a study: headline, up to 3 summary lines, up to 4 figures of evidence, next steps.

```text
The new empty state lifts first-chart conversion from 4.1% to 5.3%.

SUMMARY ────────────────────────────────────────────────────────────────────────

1  The intervals no longer overlap.
2  Rollout is at 62% of accounts.

EVIDENCE ───────────────────────────────────────────────────────────────────────

Conversion to first chart

control       ├────█───┤                        4.1% (3.6%–4.6%)
new                      ├────█────┤            5.3% (4.8%–5.9%)
         3.0%             5.0%            7.0%

The intervals don't overlap.

Rollout

[ ████████████░░░░░░░░ ] 62% of the cap

NEXT ───────────────────────────────────────────────────────────────────────────

→  Ship to all accounts on 28 Oct.

                                                                     SAMPLE DATA
```

*Empty state test, week 3. The new empty state lifts first-chart conversion from 4.1% to 5.3%. 2 figures: Conversion to first chart, Rollout.*

<details><summary>Spec</summary>

```json
{
  "kind": "readout",
  "source": "Illustrative: made up for this example",
  "data": {
    "headline": "The new empty state lifts first-chart conversion from 4.1% to 5.3%.",
    "summary": ["The intervals no longer overlap.","Rollout is at 62% of accounts."],
    "evidence": [{"kind":"abResult","title":"Conversion to first chart","data":[{"label":"control","value":4.1,"low":3.6,"high":4.6},{"label":"new","value":5.3,"low":4.8,"high":5.9}],"options":{"min":3,"max":7}},{"kind":"meter","title":"Rollout","data":{"value":62,"cap":100},"options":{"width":20}}],
    "next": ["Ship to all accounts on 28 Oct."]
  }
}
```

</details>

**Watch for:** The headline is the finding in one sentence, not a topic.

## Dashboard

`kind: "dashboard"`

**Use it for** weekly numbers at a glance: 2 to 6 tiles and a note.

```text
Weekly active                 Seats used

active  ▁▂▄▃▅█  820 → 1010    [ █████████████░░░ ] 84% of the cap

Open tickets

tickets  █▇█▄▃▁  61 → 45

Tickets fell after the onboarding fix.

                                                      SAMPLE DATA
```

*Week 42. Tickets fell after the onboarding fix. 3 figures: Weekly active, Seats used, Open tickets.*

<details><summary>Spec</summary>

```json
{
  "kind": "dashboard",
  "source": "Illustrative: made up for this example",
  "data": {
    "tiles": [{"kind":"sparkline","title":"Weekly active","data":{"label":"active","values":[820,860,900,880,940,1010]}},{"kind":"meter","title":"Seats used","data":{"value":84,"cap":100},"options":{"width":16}},{"kind":"sparkline","title":"Open tickets","data":{"label":"tickets","values":[61,58,60,52,49,45]}}],
    "note": "Tickets fell after the onboarding fix."
  }
}
```

</details>

**Watch for:** Tiles keep their natural width and share a row when they fit in 80 cells: narrow kinds (meter, sparkline) pack two or three to a row.

## PR summary

`kind: "prSummary"`

**Use it for** what a pull request changed: one line, before and after side by side, checks, risks.

```text
Signup drops from five steps to three.

BEFORE AND AFTER ───────────────────────────────────────────────────────────────

Before

┌───────┐     ┌──────────┐     ┌──────┐     ┌──────┐
│ Email │ ──► │ Password │ ──► │ Name │ ──► │ Team │
└───────┘     └──────────┘     └──────┘     └──────┘
│
▼
┌──────┐
│ Done │
└──────┘

After

┌───────┐     ┌──────┐     ┌──────┐
│ Email │ ──► │ Team │ ──► │ Done │
└───────┘     └──────┘     └──────┘

RISKS ──────────────────────────────────────────────────────────────────────────

·  Team invites now happen after signup.

                                                                     SAMPLE DATA
```

*Shorter signup. Signup drops from five steps to three. 2 figures: flow, flow.*

<details><summary>Spec</summary>

```json
{
  "kind": "prSummary",
  "source": "Illustrative: made up for this example",
  "data": {
    "change": "Signup drops from five steps to three.",
    "before": {"kind":"flow","data":["Email","Password","Name","Team","Done"]},
    "after": {"kind":"flow","data":["Email","Team","Done"]},
    "risks": ["Team invites now happen after signup."]
  }
}
```

</details>

**Watch for:** Before and after use the same kind and scale; each up to 38 cells wide sits side by side.

## Design review

`kind: "designReview"`

**Use it for** choosing between 2 or 3 options: the question, the options, a recommendation, open questions.

```text
Should filters sit in a sidebar or above the table?

OPTIONS ────────────────────────────────────────────────────────────────────────

Sidebar: tasks done              Above: tasks done

[ ███████████░ ] 88% of tasks    [ ████████░░░░ ] 63% of tasks

RECOMMENDATION ─────────────────────────────────────────────────────────────────

Use the sidebar: more people finished every task.

OPEN QUESTIONS ─────────────────────────────────────────────────────────────────

·  Does the sidebar fit at tablet width?

                                                                     SAMPLE DATA
```

*Where filters live. Should filters sit in a sidebar or above the table? 2 figures: Sidebar: tasks done, Above: tasks done.*

<details><summary>Spec</summary>

```json
{
  "kind": "designReview",
  "source": "Illustrative: made up for this example",
  "data": {
    "question": "Should filters sit in a sidebar or above the table?",
    "options": [{"kind":"meter","title":"Sidebar: tasks done","data":{"value":7,"cap":8},"options":{"width":12,"label":"of tasks"}},{"kind":"meter","title":"Above: tasks done","data":{"value":5,"cap":8},"options":{"width":12,"label":"of tasks"}}],
    "recommendation": "Use the sidebar: more people finished every task.",
    "open": ["Does the sidebar fit at tablet width?"]
  }
}
```

</details>

**Watch for:** Give each option a title; draw them with the same kind. Options up to 38 cells wide sit side by side.

## Status update

`kind: "statusUpdate"`

**Use it for** where work stands: the period, progress figures, done, next and blocked lists.

```text
13 to 24 October.

PROGRESS ───────────────────────────────────────────────────────────────────────

Stories done

[ ███████████████░░░░░ ] 75% of 12

DONE ───────────────────────────────────────────────────────────────────────────

·  Empty state shipped to 62%.

NEXT ───────────────────────────────────────────────────────────────────────────

→  Full rollout on 28 Oct.

BLOCKED ────────────────────────────────────────────────────────────────────────

x  Dark mode contrast: waiting on new tokens.

                                                                     SAMPLE DATA
```

*Checkout, sprint 14. 13 to 24 October. 1 figure: Stories done.*

<details><summary>Spec</summary>

```json
{
  "kind": "statusUpdate",
  "source": "Illustrative: made up for this example",
  "data": {
    "period": "13 to 24 October.",
    "progress": [{"kind":"meter","title":"Stories done","data":{"value":9,"cap":12},"options":{"width":20,"label":"of 12"}}],
    "done": ["Empty state shipped to 62%."],
    "next": ["Full rollout on 28 Oct."],
    "blocked": ["Dark mode contrast: waiting on new tokens."]
  }
}
```

</details>

**Watch for:** Each blocked item says why in words.
