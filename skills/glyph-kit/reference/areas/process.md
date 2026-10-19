# Processes over time

Processes over time: work moving between stages, waiting, returning and finishing.

Each kind below shows the spec that made its figure. Save one as spec.json and render it with `node scripts/glyph-kit.mjs render spec.json --to markdown` (or `--to html`).

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

*Where the week goes. Work moves through Design, Build, QA, Ship; about 30% is sent back from QA to Build.*

<details><summary>Spec</summary>

```json
{
  "kind": "loop",
  "data": {
    "stages": [
      "Design",
      "Build",
      "QA",
      "Ship"
    ],
    "back": {
      "from": "QA",
      "to": "Build",
      "share": 0.3,
      "label": "about 1 in 3 comes back from QA"
    }
  }
}
```

</details>

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

*Saving a draft. States Editing, Saving, Saved, Failed; the token plays the path Editing → Saving → Failed → Saving → Saved → Editing.*

<details><summary>Spec</summary>

```json
{
  "kind": "states",
  "data": {
    "states": [
      "Editing",
      "Saving",
      "Saved",
      "Failed"
    ],
    "transitions": [
      {
        "from": "Editing",
        "to": "Saving",
        "label": "save"
      },
      {
        "from": "Saving",
        "to": "Saved",
        "label": "ok"
      },
      {
        "from": "Saving",
        "to": "Failed",
        "label": "no network"
      },
      {
        "from": "Failed",
        "to": "Saving",
        "label": "retry"
      },
      {
        "from": "Saved",
        "to": "Editing",
        "label": "type"
      }
    ],
    "path": [
      "Editing",
      "Saving",
      "Failed",
      "Saving",
      "Saved",
      "Editing"
    ]
  }
}
```

</details>

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

*Review is the bottleneck. Columns Ready, Design (limit 4), Review (limit 2), Build (limit 4), Done. Work piles up before the slowest column.*

<details><summary>Spec</summary>

```json
{
  "kind": "queue",
  "data": {
    "columns": [
      {
        "label": "Ready",
        "pace": 0
      },
      {
        "label": "Design",
        "limit": 4,
        "pace": 14
      },
      {
        "label": "Review",
        "limit": 2,
        "pace": 30
      },
      {
        "label": "Build",
        "limit": 4,
        "pace": 16
      },
      {
        "label": "Done"
      }
    ]
  }
}
```

</details>

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

*Rolling out the new editor. Rollout to 1%, 5%, 25%, 50%, 100%, guarded by Error rate at 2%; it trips at 25% and rolls back.*

<details><summary>Spec</summary>

```json
{
  "kind": "rollout",
  "data": {
    "stages": [
      1,
      5,
      25,
      50,
      100
    ],
    "metric": "Error rate",
    "limit": 2,
    "breachAt": 25
  }
}
```

</details>

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

*Opening a report. In 1800ms: tap at 0ms, skeleton at 100ms, text at 700ms, image at 1100ms.*

<details><summary>Spec</summary>

```json
{
  "kind": "loading",
  "data": {
    "duration": 1800,
    "phases": [
      {
        "at": 0,
        "show": "tap"
      },
      {
        "at": 100,
        "show": "skeleton"
      },
      {
        "at": 700,
        "show": "text"
      },
      {
        "at": 1100,
        "show": "image"
      }
    ]
  }
}
```

</details>

**Motion:** The card develops beside a time ruler.

**Watch for:** Keep phases in time order.

## Handoff between teams

`kind: "handoff"`

**Use it for** work passing between teams, including time spent waiting.

```text
Design                    Engineering               Review

█ Prepare

                          █ Build

                                                    █ Check


Most waiting: Engineering (2)

                                                SAMPLE DATA
```

*Design to release. Work follows Prepare in Design, then Build in Engineering, then Check in Review.*

<details><summary>Spec</summary>

```json
{
  "kind": "handoff",
  "data": {
    "lanes": [
      "Design",
      "Engineering",
      "Review"
    ],
    "steps": [
      {
        "lane": "Design",
        "label": "Prepare"
      },
      {
        "lane": "Engineering",
        "label": "Build",
        "wait": 2
      },
      {
        "lane": "Review",
        "label": "Check",
        "wait": 1
      }
    ]
  }
}
```

</details>

**Motion:** Pieces queue at lane boundaries; the lane with most waiting is named.

**Watch for:** Every step must name a listed lane; waiting time cannot be negative.

## Retry with backoff

`kind: "retry"`

**Use it for** a request retried with increasing backoff.

```text
Attempt     Backoff                              Result
1                                         0ms                 x retry
2           ·······                       200ms               x retry
3           ··············                400ms               x retry
4           ····························  800ms               █ done

1400ms elapsed

                                                          SAMPLE DATA
```

*Request retries. Up to 4 attempts, starting at 200ms with a factor of 2; attempt 4 succeeds.*

<details><summary>Spec</summary>

```json
{
  "kind": "retry",
  "data": {
    "attempts": 4,
    "base": 200,
    "factor": 2,
    "succeedOn": 4,
    "unit": "ms"
  }
}
```

</details>

**Motion:** Failures flash and the next gap grows until an attempt succeeds.

**Watch for:** Keep the successful attempt within the attempt count.

## Cache hit or miss

`kind: "cache"`

**Use it for** requests served by a cache or sent to an origin.

```text
Hits 31   Misses 9

┌──────────┐             ┌──────────┐             ┌──────────────────────────┐
│ REQUEST  │────────────►│  CACHE   │────────────►│          Origin          │
└──────────┘             └──────────┘             └──────────────────────────┘


Hit rate 75%   TTL 60

                                                                   SAMPLE DATA
```

*Requests and cache. 75% of requests hit the cache; misses go to Origin.*

<details><summary>Spec</summary>

```json
{
  "kind": "cache",
  "data": {
    "hitRate": 0.75,
    "origin": "Origin",
    "ttl": 60
  }
}
```

</details>

**Motion:** Hits bounce from the cache; misses visit the origin and both counters advance.

**Watch for:** Write the hit rate as a share from zero to one.

## Traffic split

`kind: "split"`

**Use it for** traffic divided between variants with different conversion rates.

```text
Traffic                         Arrivals   Conversions
 │
 │────────────► Control               50%       29             13
 │
 │
 └────────────► Variant               50%       31             12

                                                      SAMPLE DATA
```

*Traffic and conversion. Traffic goes to Control (50%), Variant (50%).*

<details><summary>Spec</summary>

```json
{
  "kind": "split",
  "data": {
    "variants": [
      {
        "label": "Control",
        "share": 0.5,
        "converts": 0.2
      },
      {
        "label": "Variant",
        "share": 0.5,
        "converts": 0.3
      }
    ]
  }
}
```

</details>

**Motion:** Seeded packets route by share while arrivals and conversions count up.

**Watch for:** Shares must add up to one; conversions are shares too.

## Incident timeline

`kind: "incident"`

**Use it for** detection, paging, mitigation and resolution over time.

```text
20 minutes elapsed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▓

█ 0m detect  Alert received
█ 3m page  On-call paged
█ 12m mitigate  Traffic moved
█ 20m resolve  Service restored

                                                                 SAMPLE DATA
```

*Detection to recovery. 0 minutes: Alert received (detect). 3 minutes: On-call paged (page). 12 minutes: Traffic moved (mitigate). 20 minutes: Service restored (resolve)*

<details><summary>Spec</summary>

```json
{
  "kind": "incident",
  "data": {
    "events": [
      {
        "at": 0,
        "label": "Alert received",
        "kind": "detect"
      },
      {
        "at": 3,
        "label": "On-call paged",
        "kind": "page"
      },
      {
        "at": 12,
        "label": "Traffic moved",
        "kind": "mitigate"
      },
      {
        "at": 20,
        "label": "Service restored",
        "kind": "resolve"
      }
    ]
  }
}
```

</details>

**Motion:** A clock sweeps the incident; the detection window signals failure and resolution signals success.

**Watch for:** Keep events in time order and include exactly one resolution.
