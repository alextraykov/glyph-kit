# Processes over time

Processes over time: work moving between stages, waiting, returning and finishing.

Types: `loop`, `states`, `queue`, `rollout`, `loading`.

Each type shows its figure and the spec that made it; the spec's `kind` field names the type. `node scripts/glyph-kit.mjs guide <type>` prints one type's section without the figure.

## Rework loop

`kind: "loop"`

**Use it for** work that returns to an earlier stage.

```text
                                       8 came back       29 shipped

▓────────┐         ┌─────·░▒▓         ┌────────┐         ░░░░░░░░░░
▒ DESIGN │░▒▓─────►│ BUILD  │░▒▓─░▒▓─►│   QA   │░▒▓─────►░  SHIP  ░
░·───────┘         └────────┘         └─▓▒░·───┘         ░░░░░░░░░░
                        ▲                  │
                        │                  │
                        │                  │
                        └─────▓▒░──────────┘
                   about 1 in 3 comes back from QA

                                                        SAMPLE DATA
```

```json
{
  "kind": "loop",
  "title": "Where the week goes",
  "data": {
    "stages": ["Design", "Build", "QA", "Ship"],
    "back": {
      "from": "QA",
      "to": "Build",
      "share": 0.3,
      "label": "about 1 in 3 comes back from QA"
    }
  }
}
```

**Motion:** Work travels forward; a share returns for another pass.

**Watch for:** Keep the return share grounded in a source.

## State machine

`kind: "states"`

**Use it for** a state machine with a path to play.

```text
Editing

                            ┌───────────── no network ────────────┐
                            │                                     ▼
┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│ EDITING │── save ─►│ SAVING  │─── ok ──►│  SAVED  │          │ FAILED  │
└─·▓▒░·───┘          └─────────┘          └─────────┘          └─────────┘
       ▲                    ▲                │                    │
       │                    └─────────────── retry ───────────────┘
       │                                     │
       └──────────────── type ───────────────┘

                                                               SAMPLE DATA
```

```json
{
  "kind": "states",
  "title": "Saving a draft",
  "data": {
    "states": ["Editing", "Saving", "Saved", "Failed"],
    "transitions": [
      { "from": "Editing", "to": "Saving", "label": "save" },
      { "from": "Saving", "to": "Saved", "label": "ok" },
      { "from": "Saving", "to": "Failed", "label": "no network" },
      { "from": "Failed", "to": "Saving", "label": "retry" },
      { "from": "Saved", "to": "Editing", "label": "type" }
    ],
    "path": ["Editing", "Saving", "Failed", "Saving", "Saved", "Editing"]
  }
}
```

**Motion:** A token follows the played path.

**Watch for:** Every step in the path needs a transition.

## Work queue

`kind: "queue"`

**Use it for** work waiting between limited columns.

```text
READY      7   DESIGN   4/4   REVIEW   2/2   BUILD    0/4   DONE      12
────────────   ────────────   ────────────   ────────────   ────────────
▒▒▒▒▒ ▒▒▒▒▒    ▒▒▒▒▒ ▒▒▒▒▒    ▓▓▓▓▓ ▓▓▓▓▓                   ▓▓▓▓▓ ▓▓▓▓▓
▒▒▒▒▒ ▒▒▒▒▒    ▒▒▒▒▒ ▒▒▒▒▒                                  ▓▓▓▓▓ ▓▓▓▓▓
▒▒▒▒▒ ▒▒▒▒▒                                                 ▓▓▓▓▓ ▓▓▓▓▓
▒▒▒▒▒                                                       ▓▓▓▓▓ ▓▓▓▓▓
                                                            ▓▓▓▓▓ ▓▓▓▓▓
                                                            ▓▓▓▓▓ ▒▒▒▒▒


                              ▲ Review holds everything up

                                                             SAMPLE DATA
```

```json
{
  "kind": "queue",
  "title": "Review is the bottleneck",
  "data": {
    "columns": [
      { "label": "Ready", "pace": 0 },
      { "label": "Design", "limit": 4, "pace": 14 },
      { "label": "Review", "limit": 2, "pace": 30 },
      { "label": "Build", "limit": 4, "pace": 16 },
      { "label": "Done" }
    ]
  }
}
```

**Motion:** Cards wait when the next column is full.

**Watch for:** State each column's limit and time per card.

## Staged rollout

`kind: "rollout"`

**Use it for** a staged release with a guard metric.

```text
                    1%         5%           25%         50%       100%
ROLLOUT             ▓━━━━━━━━━━━▓────────────┼───────────┼───────────┼

PEOPLE              ··············▓······················▓············
5% on               ·········▓··········▓·····························
                    ··················································
                    ········▓·················▓···▓▓········▓·▓·······


ERROR RATE
limit 2%            ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
                    ▒▒▒ ▒▒▒ ▒▒▒ ▒▒ ▒▒▒▒▒▒▒▒ ▒▒  ▒▒▒▒▒   ▒▒▒▒▒▒▒ ▒▒▒▒▒▒

                    holding at 5%, watching

                                                           SAMPLE DATA
```

```json
{
  "kind": "rollout",
  "title": "Rolling out the new editor",
  "data": {
    "stages": [1, 5, 25, 50, 100],
    "metric": "Error rate",
    "limit": 2,
    "breachAt": 25
  }
}
```

**Motion:** Stages advance, pause and roll back at a breach.

**Watch for:** A breach must name one of the stages.

## Loading sequence

`kind: "loading"`

**Use it for** what appears while a request finishes.

```text
┌────────────────────────────────┐      TIME
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │      ╷        ╷        ╷         ╷
│ ░░▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░░ │      ═════════════════════════════════▓
│ ▒▒▓▓▓▓▓▓▓▒▒▒▒░░░░░░░░░░░░░▒▒▒▒ │      0        500      1000      1500
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒░░░░░░▒▒▒▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▓▓▓▓▓▓▓ │
│                                │      ▓ 0ms tap
│ Weekly report                  │
│                                │        ▓ 100ms skeleton
│ Signups up 12% on last week,   │
│ most of it from the new invite │                   ▓ 700ms text
│ flow. Activation is flat.      │
│                                │                          ▓ 1100ms image
└────────────────────────────────┘      showing: image

                                                               SAMPLE DATA
```

```json
{
  "kind": "loading",
  "title": "Opening a report",
  "data": {
    "duration": 1800,
    "phases": [
      { "at": 0, "show": "tap" },
      { "at": 100, "show": "skeleton" },
      { "at": 700, "show": "text" },
      { "at": 1100, "show": "image" }
    ]
  }
}
```

**Motion:** The card develops beside a time ruler.

**Watch for:** Keep phases in time order.
