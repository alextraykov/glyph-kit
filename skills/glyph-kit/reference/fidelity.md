# From text to production

One spec, four fidelities. Each step adds detail; none of them redraws what the step before decided.

```text
spec ──► text      review structure, content and numbers in a PR or a ticket
     ──► html      click through it, check states and motion, show it to a stakeholder
     ──► deck      walk a room through several artifacts in order
     ──► product   build it with the design system's real components and tokens
```

## When to move up

| Move | When |
|---|---|
| text → html | The structure is agreed and someone needs to try it: tap targets, focus order, how a dialog sits over a list, how a transition feels. |
| html → deck | Several artifacts tell one argument: research, then the flow, then the screen, then the motion. |
| html → product | The prototype has been reviewed and the design-system map exists. Not before: production code from an unreviewed sketch is the expensive way to find out it was wrong. |

## The product step, for an agent

1. Read the spec and `design-system.map.json`. If the map is missing, stop and ask for it, or write one with the user from their design system before building.
2. For every wireframe primitive, use the component the map names. If the map has no entry for a primitive, ask; don't invent a component.
3. Use only tokens from the map for colour, space, radius, type, duration and easing.
4. Carry the notes (`[1]`, `[2]`) into behaviour, not comments: "Save is disabled until something changes" is logic.
5. Motion: implement the intent card's duration and easing tokens, and its reduced-motion still.
6. Keep the spec's `source` and `intent` in the pull request description, and link the text figure, so review compares the build to what was agreed.
7. Check: every primitive in the spec has a counterpart, no off-map tokens, the reduced-motion state matches the card, keyboard focus reaches every control.

## Worked example

`examples/product/` takes one spec through every step, using this portfolio's own design system as the map:

| File | Fidelity |
|---|---|
| `settings.spec.json` | the spec |
| `settings.txt` | text, from `render --to text` |
| `settings.html` | HTML prototype, from `render --to html --map design-system.map.json` |
| `settings-deck.html` | a deck: the settings screen followed by the motion examples |
| `NotificationSettings.astro` | production, built by hand from the spec and the map, with every primitive's origin marked |
| `design-system.map.json` | the map: this site's tokens with fallbacks, and its component conventions |

The production file follows the map, not the prototype: tabs become the site's segmented control, toggles become pressed-state buttons, and the one primary action uses the site's primary button role. Note 2 ("Save is disabled until something changes") became code.
