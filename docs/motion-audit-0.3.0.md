# Motion audit, 0.3.0: one language for the kit, its website and the Labs page

Three read-only audits on 2026-10-29, one per surface, each checked against `reference/live.md` and the animations.dev course: the kit's rendered outputs, the kit's website and the portfolio's Labs page. Nothing was changed while auditing. Timings were stepped in code, because the browser pane couldn't run frames; reduced motion was read from code.

The kit's outputs mostly keep the language. The two pages around it mostly don't: each grew its own timing, its own scramble and its own loops.

### Motion rules by surface

Where each shared motion rule holds today. █ holds, ▒ holds in part, ░ broken.

```text
                       Kit outputs  Website      Labs page
120ms clock            ██           ▒▒           ██
40ms arrival steps     ██           ░░           ░░
░▒▓ in, never back     ▒▒           ░░           ░░
One landing flash      ▒▒           ░░           ░░
▓▒░ chase waiting      ▒▒           ░░           ░░
Scramble changes only  ░░           ░░           ░░
Settle in 600ms        ▒▒           ░░           ▒▒
One moving per view    ██           ▒▒           ░░
Designed stills        ░░           ▒▒           ░░
Loop: hold, then cut   ░░           ░░           ░░
Camera curve shared    ██           ██           ░░
No fades or slides     ██           ▒▒           ▒▒

█ done   ▒ in progress   ░ missing   blank: doesn't apply
```

*Twelve motion rules on three surfaces: the kit outputs keep most, the website and the Labs page break most.*

Source: Three read-only motion audits, 2026-10-29, on release-0.3.0

<details><summary>Spec</summary>

```json
{
  "kind": "stateMatrix",
  "title": "Motion rules by surface",
  "source": "Three read-only motion audits, 2026-10-29, on release-0.3.0",
  "data": {
    "variants": [
      "120ms clock",
      "40ms arrival steps",
      "░▒▓ in, never back",
      "One landing flash",
      "▓▒░ chase waiting",
      "Scramble changes only",
      "Settle in 600ms",
      "One moving per view",
      "Designed stills",
      "Loop: hold, then cut",
      "Camera curve shared",
      "No fades or slides"
    ],
    "states": [
      "Kit outputs",
      "Website",
      "Labs page"
    ],
    "cells": {
      "120ms clock": {
        "Kit outputs": "done",
        "Website": "progress",
        "Labs page": "done"
      },
      "40ms arrival steps": {
        "Kit outputs": "done",
        "Website": "missing",
        "Labs page": "missing"
      },
      "░▒▓ in, never back": {
        "Kit outputs": "progress",
        "Website": "missing",
        "Labs page": "missing"
      },
      "One landing flash": {
        "Kit outputs": "progress",
        "Website": "missing",
        "Labs page": "missing"
      },
      "▓▒░ chase waiting": {
        "Kit outputs": "progress",
        "Website": "missing",
        "Labs page": "missing"
      },
      "Scramble changes only": {
        "Kit outputs": "missing",
        "Website": "missing",
        "Labs page": "missing"
      },
      "Settle in 600ms": {
        "Kit outputs": "progress",
        "Website": "missing",
        "Labs page": "progress"
      },
      "One moving per view": {
        "Kit outputs": "done",
        "Website": "progress",
        "Labs page": "missing"
      },
      "Designed stills": {
        "Kit outputs": "missing",
        "Website": "progress",
        "Labs page": "missing"
      },
      "Loop: hold, then cut": {
        "Kit outputs": "missing",
        "Website": "missing",
        "Labs page": "missing"
      },
      "Camera curve shared": {
        "Kit outputs": "done",
        "Website": "done",
        "Labs page": "missing"
      },
      "No fades or slides": {
        "Kit outputs": "done",
        "Website": "progress",
        "Labs page": "progress"
      }
    }
  },
  "label": "Twelve motion rules on three surfaces: the kit outputs keep most, the website and the Labs page break most.",
  "intent": "Where each shared motion rule holds today. █ holds, ▒ holds in part, ░ broken."
}
```

</details>


## The motion spec, once

Written into `reference/live.md` and mirrored as tokens in the portfolio's `global.css`, so every surface reads the same values.

1. **Clocks.** Moving types step every 120ms; arrivals step every 40ms. Nothing draws between steps.
2. **Building up.** Block cells arrive ░ → ▒ → final, one 40ms step each. Text and numbers snap in at their final value. Nothing runs that ladder backwards.
3. **Landing.** Anything that lands (a card, a token, a verdict, a breach, a focus, a flagged line) inverts for one 120ms step, once.
4. **Waiting.** Waiting work chases ▓▒░, 3 cells, whole cells, on the 120ms clock.
5. **Scramble.** Only the characters of a value that changed scramble, and they settle within 4 steps. Labels never scramble.
6. **Budgets.** An arrival settles within 600ms; an order that tells a sequence (a diagram growing, a journey) within 1.1s.
7. **One per view.** Only the figure nearest the centre of the screen moves. Every other figure shows its still.
8. **Stills are drawn, not paused.** No travelling marks, settled counts, and the moment that carries the point.
9. **Loops.** A moving type ends on its still, holds 2.4s, then cuts to the start without scrambling.
10. **Camera and dim.** 450ms on `cubic-bezier(0.32, 0.72, 0, 1)`; dimming the rest is one 120ms step. Under reduced motion the camera cuts.
11. **Start.** Everything starts once it is 25% in view.
12. **No fades or slides.** The one allowed dissolve is people leaving a funnel (▓▒░·).

Shared tokens: `--gk-step` 40ms, `--gk-clock` 120ms, `--gk-flash` 120ms `steps(1)`, `--gk-settle` 600ms, `--gk-camera` 450ms `cubic-bezier(0.32, 0.72, 0, 1)`, `--gk-hold` 2.4s for loops.

## What to fix, by rule

| Rule | Kit outputs | Website | Labs page |
|---|---|---|---|
| 2 Building up | Queue cards run ░▒▓ backwards | Builder and showcase scramble every word and count numbers up from 0, finishing at about 1.4s | Coverage figures pop in on a 70ms stagger instead of arriving; stats count up for 960ms |
| 3 Landing | Four ways to say "landed"; token, breach and verdict don't flash | No landing flash | Deck flashes 260ms twice |
| 4 Waiting | Chase jumps 2 or 3 cells unevenly; waiting queue cards don't chase | Builder shimmer moves every 40ms, and off screen | "Drawing…" text only; Listen loader runs a lap in 160ms with no trail |
| 5 Scramble | Whole labels scramble: "shipped" is unreadable 54% of the time | Every word scrambles on build | "All labs" scrambles on hover |
| 7 One per view | Holds | Hero showcase plays beside the builder example; losing players freeze mid-frame | Every visible player runs; motion plays off-frame on phones |
| 8 Stills | Rollout's still misses the breach; loop, funnel and states stills are paused frames | Hero first paint is an empty box | Uses the kit's paused stills; the pace figure jumps a line on first draw |
| 9 Loops | Loop, queue and funnel cut mid-motion; holds differ (0, 2.4s, 3.6s) | Diagrams loop with no pause or Still button | Banner slides text endlessly |
| 10 Camera | Holds | Holds | Deck has no camera and dims over two 80ms steps |
| 1 Clock | Holds | Hero showcase draws between steps | Holds |
| 12 No fades | Holds | Dither field breathes forever; two hover fades | Banner slides |

The worst seven, in order: the paused stills (kit), whole-label scramble (kit), one landing flash (kit), one-per-view on both pages, the site's own build-in, the Labs coverage grid that never arrives, and motion playing off-frame on phones. The full tables, with exact values, are in the three audit notes.

## Looping on the website

All three audits came to the same answer: don't loop every figure. On the Types page 8 figures share a screen, and on the Labs page about 25 would loop, 3–4 in each view. Figures would redraw while being read, still types would look like live data, the one-per-view rule would break, and motion that runs past 5 seconds with no pause fails WCAG 2.2.2. When everything moves, nothing reads as the point.

The version they agree on: **one stage per screen, which replays.**

- The figure nearest the centre of the screen, at least 60% in view, is the stage: the same leader the moving types already use, with the hero joining it.
- A still type on stage: arrive (≤600ms, 40ms steps, one 120ms flash), hold about 4.8s, step out ░ in 240ms, rest one tick, and arrive again. It plays 3 times (about 17s), then rests on its still. Hover or focus pauses it; ↺ replays it.
- A moving type on stage keeps its own loop, ending on its still with the 2.4s hold.
- Every other figure shows its designed still. A figure that leaves the view and comes back arrives again.
- Reduced motion: no replays and no loops, only stills.
