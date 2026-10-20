# Experiments and metrics

Funnels, cohorts, test results and the everyday charts. Numbers are always printed next to the bars, so a reader or a model reads them instead of estimating lengths.

Types: `barChart`, `compare`, `forecast`, `meter`, `sparkline`, `heatmap`, `calendarStrip`, `funnel`, `cohort`, `abResult`, `metricPanel`.

Each type shows its figure and the spec that made it; the spec's `kind` field names the type. `node scripts/glyph-kit.mjs guide <type>` prints one type's section without the figure.

## Bar chart

`kind: "barChart"`

**Use it for** ranked quantities.

```text
Design QA  ████████████████████████  42
Handoff    █████████▊                17
Research   █▊                        3
Copy       ▎                         <1

                            SAMPLE DATA
```

```json
{
  "kind": "barChart",
  "title": "Design QA issues by area",
  "data": [
    { "label": "Design QA", "value": 42, "text": "42" },
    { "label": "Handoff", "value": 17, "text": "17" },
    { "label": "Research", "value": 3, "text": "3" },
    { "label": "Copy", "value": 0.4, "text": "<1" }
  ],
  "options": { "width": 24 }
}
```

**Watch for:** Sort first; one scale per document; value as text on every row.

## Comparison

`kind: "compare"`

**Use it for** two versions of the same measures, side by side.

```text
MEASURE       BEFORE            AFTER
lines moving  ██████████ 100%   ██░░░░░░░░ 23%
build time    ███░░░░░░░ 2.7 s  ████████░░ 7.7 s

                                     SAMPLE DATA
```

```json
{
  "kind": "compare",
  "title": "Hero animation, before and after",
  "data": [
    {
      "label": "lines moving",
      "a": 1,
      "aText": "100%",
      "b": 0.23,
      "bText": "23%"
    },
    {
      "label": "build time",
      "a": 0.27,
      "aText": "2.7 s",
      "b": 0.77,
      "bText": "7.7 s"
    }
  ],
  "options": { "headers": ["MEASURE", "BEFORE", "AFTER"] }
}
```

**Watch for:** Every row needs its own unit in the text; ten cells is enough.

## Forecast

`kind: "forecast"`

**Use it for** measured values with a projection in the same bar.

```text
Jul ███████                               1.0×
Aug █████████████████                     2.3×
Sep ██████████████████████████████        4.1×
Oct ██████████████████░░░░░░░░░░░░░░░░░░  on pace for ~5×
░ = projected at the current pace

                                              SAMPLE DATA
```

```json
{
  "kind": "forecast",
  "title": "Usage against July",
  "data": [
    { "label": "Jul", "measured": 1, "text": "1.0×" },
    { "label": "Aug", "measured": 2.3, "text": "2.3×" },
    { "label": "Sep", "measured": 4.1, "text": "4.1×" },
    {
      "label": "Oct",
      "measured": 2.5,
      "projected": 2.5,
      "text": "on pace for ~5×"
    }
  ],
  "options": { "width": 36, "max": 5 }
}
```

**Watch for:** Say how the projection was made in the legend line.

## Meter

`kind: "meter"`

**Use it for** usage against a cap or quota.

```text
[ █████████████████████████░░░░░ ] 84% of the cap

                                      SAMPLE DATA
```

```json
{
  "kind": "meter",
  "title": "Seats used",
  "data": { "value": 84, "cap": 100 },
  "options": { "width": 30 }
}
```

**Watch for:** Over 100%, the bar stays full and the word over says the rest.

## Sparkline

`kind: "sparkline"`

**Use it for** a trend inside a sentence or a table cell.

```text
requests  ▁▁▁▂▃▃▃▅▆▅▇█  3 → 21

                   SAMPLE DATA
```

```json
{
  "kind": "sparkline",
  "title": "Requests a day",
  "data": {
    "label": "requests",
    "values": [3, 4, 4, 6, 9, 7, 8, 12, 15, 14, 18, 21]
  }
}
```

**Watch for:** Print the first and last values; a sparkline has no axis.

## Heatmap

`kind: "heatmap"`

**Use it for** density over a grid, such as activity by weekday.

```text
     M T W T F S S
wk 1   ░░▒▒████▓▓
wk 2 ░░▒▒▒▒████▒▒
wk 3     ░░▓▓▓▓▒▒░░

        SAMPLE DATA
```

```json
{
  "kind": "heatmap",
  "title": "Activity by weekday",
  "data": [
    [0, 0.2, 0.4, 0.9, 1, 0.6, 0],
    [0.1, 0.3, 0.5, 1, 0.8, 0.4, 0],
    [0, 0, 0.2, 0.6, 0.7, 0.3, 0.1]
  ],
  "options": {
    "rowLabels": ["wk 1", "wk 2", "wk 3"],
    "colLabels": "M T W T F S S "
  }
}
```

**Watch for:** Five levels is the limit people can tell apart.

## Calendar strip

`kind: "calendarStrip"`

**Use it for** yes or no per day.

```text
· · · · · ■ ■ ■ · · · · ■ ■ ·

                  SAMPLE DATA
```

```json
{
  "kind": "calendarStrip",
  "title": "Days the limit was hit",
  "data": [
    false,
    false,
    false,
    false,
    false,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    true,
    true,
    false
  ],
  "options": { "gap": " " }
}
```

**Watch for:** Put date labels over the exact columns they name.

## Funnel

`kind: "funnel"`

**Use it for** steps people drop out of.

```text
visited    ██████████████████████████████  12,400  100%
signed up  ██████████████▊                  6,100   49%  ▼ 49% kept
activated  █████▋                           2,300   19%  ▼ 38% kept
paid       █▌                                 610    5%  ▼ 27% kept

                                                        SAMPLE DATA
```

```json
{
  "kind": "funnel",
  "title": "Signup to paid, last 30 days",
  "data": [
    { "label": "visited", "value": 12400 },
    { "label": "signed up", "value": 6100 },
    { "label": "activated", "value": 2300 },
    { "label": "paid", "value": 610 }
  ]
}
```

**Motion:** People fall through the steps and departures drift out to the side.

**Watch for:** Use the same time window for every step.

## Retention cohorts

`kind: "cohort"`

**Use it for** retention by start month or week.

```text
         M0  M1  M2  M3
Jan 120  ██  ▓▓  ▒▒  ▒▒
Feb 140  ██  ▓▓  ▒▒
Mar 98   ██  ▒▒

█ 80%+   ▓ 60%+   ▒ 40%+   ░ under 40%

                           SAMPLE DATA
```

```json
{
  "kind": "cohort",
  "title": "Monthly retention",
  "data": [
    { "label": "Jan", "size": 120, "values": [1, 0.62, 0.48, 0.41] },
    { "label": "Feb", "size": 140, "values": [1, 0.7, 0.55] },
    { "label": "Mar", "size": 98, "values": [1, 0.58] }
  ]
}
```

**Watch for:** Newer cohorts have fewer periods; blank is not zero.

## Test result

`kind: "abResult"`

**Use it for** a test result with confidence intervals.

```text
control               ├────█───┤                        4.1% (3.6%–4.6%)
new empty state                  ├────█────┤            5.3% (4.8%–5.9%)
                 3.0%             5.0%            7.0%

The intervals don't overlap.

                                                             SAMPLE DATA
```

```json
{
  "kind": "abResult",
  "title": "New empty state, conversion to first chart",
  "data": [
    { "label": "control", "value": 4.1, "low": 3.6, "high": 4.6 },
    {
      "label": "new empty state",
      "value": 5.3,
      "low": 4.8,
      "high": 5.9
    }
  ],
  "options": { "min": 3, "max": 7 }
}
```

**Motion:** Only with readings over time: give `data` as `{ days, readings: [{ day, people, variants }] }`. The intervals narrow reading by reading, numbers change in place and the verdict switches when the intervals part. The still is the last reading, with a line saying how long they overlapped.

**Watch for:** Overlapping intervals mean no clear difference yet; don't round that into a win.

## Metric panel

`kind: "metricPanel"`

**Use it for** a few metrics at a glance with their trend and change.

```text
metric                trend      now   change

weekly active         ▁▂▄▃▅█    1010   ▲ 23%

time to first chart   █▇▃▁     6 min   ▼ 30%

support tickets       ▃▁▄█        45   ▲ 13%

                                  SAMPLE DATA
```

```json
{
  "kind": "metricPanel",
  "title": "Weekly health",
  "data": [
    {
      "label": "weekly active",
      "values": [820, 860, 900, 880, 940, 1010]
    },
    {
      "label": "time to first chart",
      "values": [9.2, 8.8, 7.1, 6.4],
      "unit": " min"
    },
    { "label": "support tickets", "values": [40, 38, 41, 45] }
  ]
}
```

**Watch for:** Up isn't always good: time and tickets should go down. Say which way is better.
