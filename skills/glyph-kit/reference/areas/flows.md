# UX flows

Agree on paths, states and journeys before anyone designs a screen. Text flows are quick to change in review and easy for an agent to turn into routes and state.

Each kind below shows the spec that made its figure. Save one as spec.json and render it with `node scripts/glyph-kit.mjs render spec.json --to markdown` (or `--to html`).

## Linear flow

`kind: "flow"`

**Use it for** a short linear sequence.

```text
┌─────────┐     ┌──────┐     ┌───────┐     ┌─────────┐
│ request │ ──► │ plan │ ──► │ build │ ──► │ preview │
└─────────┘     └──────┘     └───────┘     └─────────┘

                                           SAMPLE DATA
```

*Request to preview. request, then plan, then build, then preview*

<details><summary>Spec</summary>

```json
{
  "kind": "flow",
  "data": [
    "request",
    "plan",
    "build",
    "preview"
  ]
}
```

</details>

**Watch for:** Four or five boxes per row at most.

## Flow with decisions

`kind: "branchFlow"`

**Use it for** a flow with decisions and failure paths.

```text
┌─────────────────┐
│   open export   │
└────────┬────────┘
         │
         ▼
┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐           ┌─────────────────┐
┆    has data?    ├─── no ───►│   empty state   │
└┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┘           │  → import data  │
         │ yes                └─────────────────┘
         ▼
┌─────────────────┐
│  choose format  │
└────────┬────────┘
         │
         ▼
┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐           ┌───────────────────┐
┆   file ready?   ├─── no ───►│    show error     │
└┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┘           │  → choose format  │
         │ yes                └───────────────────┘
         ▼
╔═════════════════╗
║    download     ║
╚═════════════════╝

                                        SAMPLE DATA
```

*Export, with its failure paths. open export, then has data? if not, empty state, then choose format, then file ready? if not, show error, then download*

<details><summary>Spec</summary>

```json
{
  "kind": "branchFlow",
  "data": [
    {
      "label": "open export"
    },
    {
      "label": "has data",
      "type": "decision",
      "no": {
        "label": "empty state",
        "to": "import data"
      }
    },
    {
      "label": "choose format"
    },
    {
      "label": "file ready",
      "type": "decision",
      "no": {
        "label": "show error",
        "to": "choose format"
      }
    },
    {
      "label": "download"
    }
  ]
}
```

</details>

**Watch for:** Every decision's no-branch needs a destination, or it's a dead end nobody designed.

## State machine

`kind: "stateMachine"`

**Use it for** anything with loading, saving, error or retry states.

```text
states  [idle] · saving · saved · failed

idle   ──[ submit ]──► saving
saving ──[ ok     ]──► saved
saving ──[ error  ]──► failed
failed ──[ retry  ]──► saving

[ ] marks the start. Ends: saved.

                             SAMPLE DATA
```

*Saving a report. idle goes to saving on submit. saving goes to saved on ok. saving goes to failed on error. failed goes to saving on retry*

<details><summary>Spec</summary>

```json
{
  "kind": "stateMachine",
  "data": [
    {
      "from": "idle",
      "event": "submit",
      "to": "saving"
    },
    {
      "from": "saving",
      "event": "ok",
      "to": "saved"
    },
    {
      "from": "saving",
      "event": "error",
      "to": "failed"
    },
    {
      "from": "failed",
      "event": "retry",
      "to": "saving"
    }
  ]
}
```

</details>

**Watch for:** Read the footer: it lists ends and unreachable states.

## Journey map

`kind: "journeyMap"`

**Use it for** stages of an experience with what people do, think and feel.

```text
STAGE    DISCOVER          IMPORT            FIRST CHART
         ────────────────  ────────────────  ────────────────
doing    Finds the tool    Uploads a CSV     Picks a template
         through a         with 4,000 rows   and edits labels
         colleague

thinking “Will this        “Why did my       “Oh, that was
         replace my        dates break?”     quick”
         sheet?”

feeling  ▲ good            ▼▼ bad            ▲▲ great

                                                  SAMPLE DATA
```

*First week. Discover: Finds the tool through a colleague. Import: Uploads a CSV with 4,000 rows. First chart: Picks a template and edits labels*

<details><summary>Spec</summary>

```json
{
  "kind": "journeyMap",
  "data": [
    {
      "label": "Discover",
      "doing": "Finds the tool through a colleague",
      "thinking": "Will this replace my sheet?",
      "feeling": 1
    },
    {
      "label": "Import",
      "doing": "Uploads a CSV with 4,000 rows",
      "thinking": "Why did my dates break?",
      "feeling": -2
    },
    {
      "label": "First chart",
      "doing": "Picks a template and edits labels",
      "thinking": "Oh, that was quick",
      "feeling": 2
    }
  ]
}
```

</details>

**Watch for:** Thoughts are quotes or close paraphrases from research, not invented.

## Tree or sitemap

`kind: "tree"`

**Use it for** sitemaps, IA, file layouts, spec folders.

```text
Settings
├── Profile
├── Notifications
│   ├── Email
│   └── Digest
└── Billing
    ├── Plan
    └── Invoices

      SAMPLE DATA
```

*Settings sitemap. Settings, Profile, Notifications, Email, Digest, Billing, Plan, Invoices*

<details><summary>Spec</summary>

```json
{
  "kind": "tree",
  "data": {
    "name": "Settings",
    "children": [
      {
        "name": "Profile"
      },
      {
        "name": "Notifications",
        "children": [
          {
            "name": "Email"
          },
          {
            "name": "Digest"
          }
        ]
      },
      {
        "name": "Billing",
        "children": [
          {
            "name": "Plan"
          },
          {
            "name": "Invoices"
          }
        ]
      }
    ]
  }
}
```

</details>

**Watch for:** Past three levels deep it stops being readable; collapse the rest.
