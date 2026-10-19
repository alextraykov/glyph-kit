# Motion

Write motion down as a decision before anyone animates it: why it moves, what starts it, how long, which curve, and what reduced motion shows instead. The HTML form plays it.

Each kind below shows the spec that made its figure. Save one as spec.json and render it with `node scripts/glyph-kit.mjs render spec.json --to markdown` (or `--to html`).

## Motion timing

`kind: "motionTiming"`

**Use it for** comparing durations and easing, today against proposed.

```text
today    ▕████████············▏  200ms  ease    ▅█▇▅▄▃▂▁
proposed ▕██████··············▏  150ms  reveal  █▆▅▄▃▂▁▁
         0·········250········500ms

                                             SAMPLE DATA
```

*Toast, today and proposed. today: 200ms. proposed: 150ms*

<details><summary>Spec</summary>

```json
{
  "kind": "motionTiming",
  "data": [
    {
      "label": "today",
      "ms": 200,
      "easing": "ease",
      "easingName": "ease"
    },
    {
      "label": "proposed",
      "ms": 150,
      "easing": [
        0.33,
        1,
        0.68,
        1
      ],
      "easingName": "reveal"
    }
  ]
}
```

</details>

**Watch for:** Keep the 500ms scale fixed across a report; a + is usually the finding.

## Motion intent

`kind: "intentCard"`

**Use it for** deciding a single motion before building it.

```text
┌─ Toast enters ───────────────────────────────────────┐
│ why       Confirm the save without taking focus      │
│ when      Save succeeds                              │
│ change    below the edge, transparent → in place,    │
│           opaque                                     │
│ timing    ▕████████············▏ 200ms               │
│ easing    █▆▅▄▃▂▁▁  reveal                           │
│ reduced   Appears in place, no movement; stays for   │
│           the same time                              │
└──────────────────────────────────────────────────────┘

                                             SAMPLE DATA
```

*Toast enters. Confirm the save without taking focus. Save succeeds. 200ms. Reduced motion: Appears in place, no movement; stays for the same time*

<details><summary>Spec</summary>

```json
{
  "kind": "intentCard",
  "data": {
    "name": "Toast enters",
    "purpose": "Confirm the save without taking focus",
    "trigger": "Save succeeds",
    "from": "below the edge, transparent",
    "to": "in place, opaque",
    "ms": 200,
    "easing": [
      0.33,
      1,
      0.68,
      1
    ],
    "easingName": "reveal",
    "reduced": "Appears in place, no movement; stays for the same time"
  }
}
```

</details>

**Watch for:** No intent, no animation: if 'why' is empty, cut it. Reduced motion is designed, not 'none'.

## Transition spec

`kind: "transitionSpec"`

**Use it for** one transition, property by property.

```text
opacity   ███████████████████████·······  0ms–150ms     0 → 1
transform ██████████████████████████████  0ms–200ms     y 8px → y 0
shadow    ···············███████████████  100ms–200ms   none → md
          0ms            100ms      200ms

                                                        SAMPLE DATA
```

*Card lifts. opacity 0 to 1, 0 to 150ms. transform y 8px to y 0, 0 to 200ms. shadow none to md, 100 to 200ms*

<details><summary>Spec</summary>

```json
{
  "kind": "transitionSpec",
  "data": [
    {
      "property": "opacity",
      "from": "0",
      "to": "1",
      "start": 0,
      "end": 150
    },
    {
      "property": "transform",
      "from": "y 8px",
      "to": "y 0",
      "start": 0,
      "end": 200
    },
    {
      "property": "shadow",
      "from": "none",
      "to": "md",
      "start": 100,
      "end": 200
    }
  ]
}
```

</details>

**Watch for:** Animate transform and opacity; anything else needs a measured reason.

## Stagger

`kind: "stagger"`

**Use it for** several elements entering in sequence.

```text
card 1 ██████████████████······················  0ms–200ms
card 2 ········██████████████████··············  91ms–291ms
card 3 ···············██████████████████·······  164ms–364ms
card 4 ····················██████████████████··  218ms–418ms
card 5 ······················██████████████████  240ms–440ms
       0ms                 220ms           440ms

5 × 200ms, delays follow ease-out. Done at 440ms.

                                                 SAMPLE DATA
```

*Cards enter. 5 items, 200ms each.*

<details><summary>Spec</summary>

```json
{
  "kind": "stagger",
  "data": {
    "count": 5,
    "duration": 200,
    "delay": 60,
    "curve": "ease-out",
    "label": "card"
  }
}
```

</details>

**Watch for:** Cap the total: past about 400ms the last item feels late.

## Frame strip

`kind: "filmstrip"`

**Use it for** seeing an easing curve frame by frame.

```text
   0ms  █·······························
  30ms  ······█·························
  60ms  ············█···················
  90ms  ·················█··············
 120ms  ·····················█··········
 150ms  ·························█······
 180ms  ····························█···
 210ms  ······························█·
 240ms  ·······························█
        start                        end

                             SAMPLE DATA
```

*Ease-out, frame by frame. Position on each of 8 frames with ease-out.*

<details><summary>Spec</summary>

```json
{
  "kind": "filmstrip",
  "data": {
    "frames": 8,
    "easing": "ease-out",
    "ms": 240
  }
}
```

</details>

**Watch for:** Rows are equal slices of time, so bunched marks mean slow movement.

## Easing tokens

`kind: "easingTable"`

**Use it for** documenting easing tokens.

```text
ease-standard  ▆█▄▃▂▂▁▁  cubic-bezier(0.2, 0, 0, 1)      most UI
ease-reveal    █▆▅▄▃▂▁▁  cubic-bezier(0.33, 1, 0.68, 1)  entrances
ease-exit      ▂▄▅▆▆▇▇█  cubic-bezier(0.4, 0, 1, 1)      leaving the screen

                                                                SAMPLE DATA
```

*Easing tokens. ease-standard, ease-reveal, ease-exit*

<details><summary>Spec</summary>

```json
{
  "kind": "easingTable",
  "data": [
    {
      "name": "ease-standard",
      "curve": [
        0.2,
        0,
        0,
        1
      ],
      "use": "most UI"
    },
    {
      "name": "ease-reveal",
      "curve": [
        0.33,
        1,
        0.68,
        1
      ],
      "use": "entrances"
    },
    {
      "name": "ease-exit",
      "curve": [
        0.4,
        0,
        1,
        1
      ],
      "use": "leaving the screen"
    }
  ]
}
```

</details>

**Watch for:** Three or four curves cover most products.
