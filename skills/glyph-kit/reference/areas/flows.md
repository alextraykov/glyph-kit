# UX flows

Agree on paths, states and journeys before anyone designs a screen. Text flows are quick to change in review and easy for an agent to turn into routes and state.

Types: `flow`, `branchFlow`, `stateMachine`, `journeyMap`, `tree`.

Each type shows its figure and the spec that made it; the spec's `kind` field names the type. `node scripts/glyph-kit.mjs guide <type>` prints one type's section without the figure.

## Linear flow

`kind: "flow"`

**Use it for** a short linear sequence.

```text
┌─────────┐     ┌──────┐     ┌───────┐     ┌─────────┐
│ request │ ──► │ plan │ ──► │ build │ ──► │ preview │
└─────────┘     └──────┘     └───────┘     └─────────┘

                                           SAMPLE DATA
```

```json
{
  "kind": "flow",
  "title": "Request to preview",
  "data": ["request", "plan", "build", "preview"]
}
```

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

```json
{
  "kind": "branchFlow",
  "title": "Export, with its failure paths",
  "data": [
    { "label": "open export" },
    {
      "label": "has data",
      "type": "decision",
      "no": { "label": "empty state", "to": "import data" }
    },
    { "label": "choose format" },
    {
      "label": "file ready",
      "type": "decision",
      "no": { "label": "show error", "to": "choose format" }
    },
    { "label": "download" }
  ]
}
```

**Watch for:** Every decision's no-branch needs a destination, or it's a dead end nobody designed: `"to": "Enter email"` loops back, `"to": "end"` ends the flow there. Labels longer than 24 cells wrap onto two lines; write them in full.

## State machine

`kind: "stateMachine"`

**Use it for** anything with loading, saving, error or retry states.

```text

                            ┌─────────────── error ───────────────┐
                            │                                     ▼
┏━━━━━━━━━┓  submit  ┌─────────┐    ok    ╔═════════╗          ┌─────────┐
┃  idle   ┃─────────►│ saving  │─────────►║  saved  ║          │ failed  │
┗━━━━━━━━━┛          └─────────┘          ╚═════════╝          └─────────┘
                            ▲                                     │
                            └─────────────── retry ───────────────┘

The heavy box is the start. Ends: saved.

                                                               SAMPLE DATA
```

```json
{
  "kind": "stateMachine",
  "title": "Saving a report",
  "data": [
    { "from": "idle", "event": "submit", "to": "saving" },
    { "from": "saving", "event": "ok", "to": "saved" },
    { "from": "saving", "event": "error", "to": "failed" },
    { "from": "failed", "event": "retry", "to": "saving" }
  ]
}
```

**Watch for:** Read the footer: it lists ends and unreachable states.

## Journey map

`kind: "journeyMap"`

**Use it for** stages of an experience with what people do, think and feel.

```text
STAGE       DISCOVER          IMPORT            FIRST CHART
            ────────────────  ────────────────  ────────────────
doing       Finds the tool    Uploads a CSV     Picks a template
            through a         with 4,000 rows   and edits labels
            colleague

thinking    “Will this        “Why did my       “Oh, that was
            replace my        dates break?”     quick”
            sheet?”

feeling     ▲ good            ▼▼ bad            ▲▲ great

                                                     SAMPLE DATA
```

```json
{
  "kind": "journeyMap",
  "title": "First week",
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

```json
{
  "kind": "tree",
  "title": "Settings sitemap",
  "data": {
    "name": "Settings",
    "children": [
      { "name": "Profile" },
      {
        "name": "Notifications",
        "children": [{ "name": "Email" }, { "name": "Digest" }]
      },
      {
        "name": "Billing",
        "children": [{ "name": "Plan" }, { "name": "Invoices" }]
      }
    ]
  }
}
```

**Watch for:** Past three levels deep it stops being readable; collapse the rest.
