# Moving diagrams

Motion is a capability of a kind. Keep the kind the content calls for and add `"motion": true`; a moving chart stays a chart, and a moving roadmap stays a board. Use `node scripts/glyph-kit.mjs live spec.json --to html` for a standalone page, or `--to markdown` for its still.

The still makes the same point and is used for reduced motion, print and no-JavaScript output. The Play/Still control stops playback without changing the data. Processes use the data shapes in `reference/areas/process.md`. A funnel accepts either a list of steps or `{steps: [...]}`; `states` remains the legacy state-machine alias.

Structure changes in steps. Travelling marks use the kit’s `▓▒░` trail, arrivals flash, waiting work chases, and only changing values scramble. Chart row delays follow a curve; the shared clock stays at 120ms. New chart sequences settle within 3.6 seconds and hold for 2.4 seconds. Process timelines keep their semantic pacing. No blur, sliding text or springs.

Cell-grid playback necessarily repaints text rather than using compositor transforms. Layout and routes are precomputed, unchanged HTML is not replaced, and off-screen players stop. Keep simultaneous playback bounded and profile the rendered page.

## Kinds that move

| Kind | Motion |
|---|---|
| `likert` | Bars grow out from the centre while agreement counts up. |
| `taskStats` | Box plots draw from minimum to maximum and values count up. |
| `emotionCurve` | The feeling curve traces with a head and trail. |
| `barChart` | Bars grow in order while values count up; an overflow marker flashes. |
| `forecast` | Measured values fill first, then the projection extends them. |
| `meter` | The meter fills with a blinking lead and marks overflow. |
| `sparkline` | The line draws from left to right with a leading marker. |
| `heatmap` | A diagonal sweep develops cells to their final levels. |
| `calendarStrip` | Days fill from left to right. |
| `funnel` | People fall through the steps and departures drift out to the side. |
| `cohort` | Rows appear in turn and their retention develops from left to right. |
| `metricPanel` | Trends draw in a stagger while their values count up. |
| `flow` | A packet walks between boxes and each arrival flashes. |
| `branchFlow` | A packet follows the spine, visits a failure branch and returns. |
| `stateMachine` | A token plays the chosen path and rests at its last state. |
| `journeyMap` | A cursor visits each stage and reveals its thinking and feeling. |
| `board` | One card travels from later through next to now. |
| `swimlane` | A packet follows each row; returns use the failure signal. |
| `gantt` | A time cursor sweeps the tracks as they fill. |
| `qaChecklist` | Done items tick in order while blocked items flash. |
| `motionTiming` | Rulers fill at speeds proportional to their durations. |
| `transitionSpec` | Property tracks fill along a time cursor. |
| `stagger` | A time cursor crosses each item's start delay. |
| `filmstrip` | Frames play down the rows in time. |
| `loop` | Work travels forward; a share returns for another pass. |
| `states` | A token follows the played path. |
| `queue` | Cards wait when the next column is full. |
| `rollout` | Stages advance, pause and roll back at a breach. |
| `loading` | The card develops beside a time ruler. |
| `handoff` | Pieces queue at lane boundaries; the lane with most waiting is named. |
| `retry` | Failures flash and the next gap grows until an attempt succeeds. |
| `cache` | Hits bounce from the cache; misses visit the origin and both counters advance. |
| `split` | Seeded packets route by share while arrivals and conversions count up. |
| `incident` | A clock sweeps the incident; the detection window signals failure and resolution signals success. |
