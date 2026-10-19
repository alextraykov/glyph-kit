# Pave motion audit

Every place in the front end where something moves, read and scored against one motion language.

*Alexander Traykov · 2026*

## In short

1. About 750 transitions and animations across about 350 stylesheets became 47 proposed fixes.
2. The same spinner ran at four different speeds, because its keyframes were copied from file to file.
3. The browser default `ease` speeds up before it slows down, so entrances feel late.
4. The marketing hero moved all the time; the product grid moves about a quarter of the time.

## How it was read

**Every stylesheet was read, not sampled.**

Each place where something moves was scored on four things: duration, easing, the property animated and what happens under reduced motion. Findings that broke the motion language became proposed fixes.

**Figure 1. Every stylesheet read, not sampled**

```text
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────┐
│ 350 stylesheets │ ──► │ 8 auditor shards │ ──► │ 750 motion sites │ ──► │ 47 fixes │
└─────────────────┘     └──────────────────┘     └──────────────────┘     └──────────┘
```

*Every stylesheet read, not sampled. 350 stylesheets, then 8 auditor shards, then 750 motion sites, then 47 fixes*

Source: Pave motion audit, Quickbase, 2026. Figures as published in the write-up; internal names removed.

## One spinner, four speeds

**A slow spinner makes the app feel slow at the same load time.**

The keyframes had been copied from file to file, and each copy drifted. The fix was one shared keyframe at 0.8 seconds.

**Figure 2. One spinner, four speeds**

One rotation, measured in each copy of the keyframes.

```text
copy 1  ██████████████████████████████  1.2 s
copy 2  █████████████████████████       1.0 s
copy 3  ████████████████████            0.8 s
copy 4  ███████████████                 0.6 s
```

*One spinner, four speeds. copy 1: 1.2 s. copy 2: 1.0 s. copy 3: 0.8 s. copy 4: 0.6 s*

Source: Pave motion audit, Quickbase, 2026. Figures as published in the write-up; internal names removed.

> Whatever a spinner is made of, define its speed once.

## What a finding looks like

**Each finding shows how long the motion takes and how its speed changes, today against proposed.**

The duration ruler is 20 cells of 25 ms on a fixed 500 ms scale, so every finding in the report compares with every other one. The speed glyph shows how much progress happens in each eighth of the time.

**Figure 3. Toast enter: today and proposed**

```text
today    ▕████████············▏  200ms  ease         ▅█▇▅▄▃▂▁
proposed ▕██████··············▏  150ms  reveal-ease  █▆▅▄▃▂▁▁
         0·········250········500ms
```

*Toast enter: today and proposed. today: 200ms. proposed: 150ms*

Source: Pave motion audit, Quickbase, 2026. Figures as published in the write-up; internal names removed.

**Figure 4. Eight characters per curve**

Speed over time for each easing in the audit.

```text
linear      ████████  linear                            progress only
ease        ▅█▇▅▄▃▂▁  ease                              the browser default
ease-out    █▇▇▆▅▄▃▂  ease-out
decelerate  █▅▄▃▂▂▂▁  cubic-bezier(0, 0, 0.2, 1)        most UI
reveal      █▆▅▄▃▂▁▁  cubic-bezier(0.33, 1, 0.68, 1)    entrances
spring      ██▅▁▁▁▁▁↺  cubic-bezier(0.44, 1.3, 0.15, 1)  overshoots, then settles
```

*Eight characters per curve. linear, ease, ease-out, decelerate, reveal, spring*

Source: Pave motion audit, Quickbase, 2026. Figures as published in the write-up; internal names removed.

## Overlaps nobody saw in review

**Two animations on one element overlapped by 40 ms, and a pulse never stopped.**

**Figure 5. Overlaps nobody saw in review**

```text
.toast slide-in ██████████······························  0ms–240ms
.dot pulse      ████████████████████████████████████████→ 0ms, repeats
.icon pop       ·····██████████·························  120ms–370ms
.toast fade     ········██████··························  200ms–360ms
                0ms                 500ms              1s
```

*Overlaps nobody saw in review. .toast slide-in 0 to 240. .dot pulse 0 to 1000. .icon pop 120 to 370. .toast fade 200 to 360*

Source: Pave motion audit, Quickbase, 2026. Figures as published in the write-up; internal names removed.

## Handing off the hero

**The marketing hero drifted all the time; the product grid mostly holds still.**

Both versions were recorded for 60 seconds at the same size, and every line position was logged on every frame.

**Figure 6. The hero cut against the product**

The marketing hero drifted all the time; the product grid mostly holds still.

```text
MEASURE                HERO CUT          PRODUCT
vertical lines moving  ██████████ 100%   ██░░░░░░░░ 23%, in 17 pushes
row lines moving       ░░░░░░░░░░ 0%     █░░░░░░░░░ 11%
a drawing's build      ███░░░░░░░ 2.7 s  ████████░░ 7.7 s
a drawing's exit       █░░░░░░░░░ 0.8 s  █████░░░░░ 4.6 s
```

*The hero cut against the product. vertical lines moving: 100% against 23%, in 17 pushes. row lines moving: 0% against 11%. a drawing's build: 2.7 s against 7.7 s. a drawing's exit: 0.8 s against 4.6 s*

Source: Hero animation handoff, 60-second recordings of both versions, every line position logged per frame.

## What it cost to get right

**The glyph code had two bugs that reached the published audit.**

25 of the 47 findings showed the wrong easing name next to a correct glyph: the parser took the first CSS variable it found, which was a speed multiplier. And a value of 57 out of 100 drew one cell short, because a rounding remainder of 8/8 had no glyph. Both are covered by tests now.
