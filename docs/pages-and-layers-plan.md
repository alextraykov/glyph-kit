# Pages and layers: plan (for approval, nothing built)

Two additions to wireframes: **pages** that read as whole pages, and **layers** (drawer, sheet, popover, menu, toast, dialog) that sit over a page without hiding it. No new dependencies, same output for the same spec, every figure within 80 cells, placement by code with no measuring in the browser.

Every mock-up below was drawn by a scratch prototype built on the kit's own primitives (`PRIMITIVES` from `areas/wireframes.mjs`, `text.mjs` widths) and passes `scripts/lint.mjs`: measured characters only, closed frames, at most 80 cells. The prototype is not part of this change.

## What's there today (shapes the plan)

- **Document layouts** (`readout`, `dashboard`, `prSummary`, `designReview`, `statusUpdate`, in `areas/layouts.mjs`) place *figures* in fixed slots. They are not UI and this plan leaves them alone.
- **Screens** (`areas/wireframes.mjs`): `screen` is one double frame with rows of primitives; `appShell`, `cardGrid` and `listDetail` are fixed regions in one frame; `modal` is `screen` with `overlay`, which replaces every page cell with ░ and centres a light-framed dialog.
- **Joints:** the double set `═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬` and the light set are measured (`lint.mjs` `MEASURED`). `╤ │ ╧` and the mixed `╟ ╢` are not, so a light line can never touch a double one. Everything below joins double to double, or stays a cell clear.
- **Colour** is by character (`render/paint.mjs` classes each cell as data, empty, frame, problem or ok). There is no way yet to colour the same character two ways depending on where it sits.
- **Arrival** gives each cell one delay (`arrive.mjs`, 40 ms steps, settled within 600 ms); cells snap in and stay. `render/arrive.mjs` already stacks short-lived aria-hidden layers (`gk-s1`, `gk-s2`) over the final cells while a figure arrives.
- **Prototype HTML** (`render/html.mjs`) turns the same rows into real controls; `modal` becomes a `<section role="dialog">` over a dimmer.

## 1. Pages

### One general shape: sections, then columns

A new kind, `page`. A page is a list of **sections** from top to bottom. A section holds either `rows` (today's screen primitives) or `columns` (two to four lists of rows, side by side). That's the whole tree: two levels, no nesting past columns. It covers nav bars, heroes, feature rows, pricing tiers, settings with a side list, FAQs and footers without a new kind for each.

| field | on | meaning |
|---|---|---|
| `frame` | page | `window` (default: a double frame, the title in its top edge), `browser` (adds a bar with `◄ ►` and `url`), `none` (no outer frame; sections split by full-width ─ rules) |
| `width` | page | 40 to 80 cells, default 80 |
| `sections` | page | the list, top to bottom (required) |
| `layers` | page | see part 2 |
| `rows` / `columns` | section | one or the other |
| `above` | section | the separator above it: `double` (default, `╠═╣`), `line` (an inset `─` rule, a cell clear of both sides), `space` (a blank row) or `none` |
| `rule` | section with columns | `true` (default) puts `║` between columns, with `╦` and `╩` where it meets a double separator; `false` leaves a gap |
| `boxed` | section with columns | each column drawn as a light card (`┌─┐`), wrapping 2 or 3 to a row: today's card grid |
| `widths` | section with columns | cells for every column but the last, which takes the rest; otherwise equal shares, the spare cell to the last |
| `align` | section | `center` centres each line (a hero) |
| `pad` | section | blank rows above and below its content, 0 to 2 |

Two new primitives, usable in any screen as well:

- `nav`: brand on the left, then items, then `actions` (buttons) pushed right; the `selected` item is underlined with `━`, the same mark tabs use.
- `id` on any row: a name a layer can anchor to (part 2). Not a primitive, a field.

Joints are worked out by code: a column rule takes `╦` on the separator above, `╩` on the one below, `╬` where two column sections meet at the same column, and the bottom frame takes `╩` too. Column rules only ever meet double separators; with `above: "line"`, `space` or `none`, columns are separated by a gap instead, since `┬ ┴` on an inset light rule would leave the `║` floating.

Limits: up to 8 sections, 4 columns, 12 cells per column at least, 80 rows (the same cap as document layouts). Anything past is left out and said, like `… and 2 more sections`. A section too narrow for its columns is refused in one sentence: "Three columns need 40 cells at least; this page has 36 inside its frame."

### What it replaces or wraps

| today | becomes | output |
|---|---|---|
| `appShell` | a page: header section, then `columns: [sidebar, content]` with `widths: [sidebarWidth]` | same bytes (snapshot test) |
| `listDetail` | `appShell` with a `list` column, as now | same bytes |
| `cardGrid` | a page with one `boxed` columns section | same bytes |
| `modal` | `screen` (or a page) with a `dialog` layer | same bytes |
| `screen` | stays: one section, the building block `responsive` uses | unchanged; `overlay` becomes an alias for a `dialog` layer |
| document layouts | untouched | unchanged |

The four names stay as presets so old specs, tests and the guide keep working. Each preset is a few lines that build the page tree; all drawing moves to one place.

### Mock-up: a marketing page (browser frame, 80 cells, 34 rows)

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║ ◄ ►  [acme.com/pricing_____________________________________________________] ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ ACME      Product   Pricing   Docs   Blog          [ Log in ]  [[ Sign up ]] ║
║                     ━━━━━━━                                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║                      PRICING THAT GROWS WITH YOUR TEAM                       ║
║           Start free. Pay per seat when you need more than three.            ║
║                                                                              ║
║                     [[ Start free ]]  [ Talk to sales ]                      ║
║                                                                              ║
╠═════════════════════════╦═════════════════════════╦══════════════════════════╣
║                         ║                         ║                          ║
║ FREE                    ║ TEAM                    ║ ENTERPRISE               ║
║ $0                      ║ $12 a seat / month      ║ Talk to us               ║
║ 3 seats, 5 projects     ║ Unlimited projects      ║ SSO, audit log, SLA      ║
║                         ║                         ║                          ║
║ [ Start ]               ║ [[ Try 14 days ]]       ║ [ Contact ]              ║
║                         ║                         ║                          ║
╠═════════════════════════╩═════════════════════════╩══════════════════════════╣
║                                                                              ║
║ QUESTIONS                                                                    ║
║                                                                              ║
║ Can I change plans later?                                                    ║
║ Yes. Seats are prorated to the day.                                          ║
║ ──────────────────────────────────────────────────────────────────────────── ║
║ Do you offer discounts for schools?                                          ║
║ Half price for schools and non-profits.                                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ ACME               Product            Docs               Privacy             ║
║ Since 2019         Pricing            Status             Terms               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```json
{ "kind": "page", "title": "Pricing",
  "data": { "frame": "browser", "url": "acme.com/pricing",
    "sections": [
      { "rows": [{ "type": "nav", "brand": "Acme", "items": ["Product", "Pricing", "Docs", "Blog"], "selected": "Pricing",
                   "actions": [{ "label": "Log in" }, { "label": "Sign up", "primary": true }] }] },
      { "align": "center", "pad": 1, "rows": [
          { "type": "heading", "text": "Pricing that grows with your team" },
          { "type": "muted", "text": "Start free. Pay per seat when you need more than three." },
          { "type": "space" },
          { "type": "buttons", "items": [{ "label": "Start free", "primary": true }, { "label": "Talk to sales" }] }] },
      { "pad": 1, "columns": [ [ …Free… ], [ …Team… ], [ …Enterprise… ] ] },
      { "pad": 1, "rows": [ { "type": "heading", "text": "Questions" }, …, { "type": "divider" }, … ] },
      { "rule": false, "columns": [ [ …ACME… ], [ …Product… ], [ …Docs… ], [ …Privacy… ] ] } ] } }
```

### Mock-up: a settings page (window frame, 72 cells, 17 rows)

```text
╔═ Acme · Settings ════════════════════════════════════════════════════╗
║ ACME      Projects   Reports   Settings                       [ AT ] ║
║                                ━━━━━━━━                              ║
╠══════════════════════════════════════════════════════════════════════╣
║ SETTINGS                                                             ║
║ Changes save when you press Save.                                    ║
╠════════════════════╦═════════════════════════════════════════════════╣
║   Profile          ║ EMAIL                                           ║
║ █ Notifications    ║ Report is ready                        [ ■] on  ║
║   Billing          ║ Weekly summary                         [■ ] off ║
║   Members          ║ ─────────────────────────────────────────────── ║
║                    ║ DIGEST                                          ║
║                    ║ Day  [ Monday                                ▼] ║
║                    ║ Send to  [team@acme.com_______________________] ║
╠════════════════════╩═════════════════════════════════════════════════╣
║                                               [ Cancel ]  [[ Save ]] ║
╚══════════════════════════════════════════════════════════════════════╝
```

The side list and the form are one columns section with `widths: [20]`; the separator above it takes `╦`, the one below `╩`.

## 2. Layers

### Spec shape: a base page and layers over it

Any `page` or `screen` can carry `layers`, drawn in order over it (at most 2: say a drawer and a toast, or a drawer and a menu opened from a button inside it).

```json
"layers": [
  { "type": "drawer", "side": "right", "width": 30, "title": "Filter", "rows": [ … ] },
  { "type": "popover", "anchor": "Filter", "side": "below", "rows": [ … ] }
]
```

| type | where code puts it | fields |
|---|---|---|
| `drawer` | against the `left` or `right` frame edge, from the separator under the first section down to the bottom frame (`"over": "all"` covers the first section too) | `side`, `width` (16 to page width − 20), `title`, `rows` |
| `sheet` | against the bottom frame, full width | `height` (rows), `title`, `rows` |
| `popover` | next to its anchor: `below` (default), `above`, `left`, `right`; `align` `start` (default) or `end` | `anchor`, `rows`, `width` (default 26) |
| `menu` | a popover of `items` (strings or `{ text, meta, disabled }`), drawn with the `list` primitive | `anchor`, `items` |
| `toast` | a corner inside the frame, `bottom-right` by default, one cell clear of the frame | `text`, optional `action` |
| `dialog` | centred, the page dimmed with ░ (today's overlay, unchanged) | `title`, `rows` |

**Anchors.** While drawing, every primitive reports the cells it used: each button by its label, each tab, nav item and list item by its text, and any row by its `id`. `anchor: "Filter"` takes the first match, searching the page and then earlier layers. No match is refused with the names that exist: "There is no Filter to anchor to. This page has: Projects, Reports, New."

### How code places and clips (on the 80-cell grid)

1. Draw the page to lines, as today, and keep the anchor map.
2. Turn the lines into a grid of cells (`cells()` from `text.mjs`, so wide characters keep both cells), and a mask of the same size, every cell `page`.
3. Place each layer in order. Its rectangle comes only from the spec and the anchor map: a drawer's edge column is `width − 1 − drawerWidth − 1` from the left; a popover starts on the anchor's row + 1 at the anchor's left column, moves left until box and shadow fit inside the frame, and flips to the other side when the rows run out. If it fits on neither side, it is refused, never cut.
4. Write the layer's cells over the grid and mark them `layer` in the mask; write the shadow cells and mark them `shadow`.
5. **Clean cuts.** Page cells under a layer are simply replaced. A page word split at the layer's edge keeps its visible part only when that is 3 cells or more; a shorter stub becomes spaces, so no stray `o` or `M` sits against the shadow.
6. Joints: a drawer's edge is `║`, joining the double rules it crosses with `╦` (top) and `╩` (bottom frame); its title row ends at `╠═══╣`. A sheet's top edge is `╠═══╣` across the frame. Popovers, menus and toasts are light boxes that touch nothing, a cell clear of the frame.
7. **Edge and shadow.** One column (or row) of `░` on the side facing the page: left of a right drawer, right of a left drawer, above a sheet, right and below a popover, menu or toast (the DOS convention). A popover also gets `▲` (or `▼`, `◄`, `►`) in its edge, pointing at the middle of its anchor.

All of this is integer arithmetic on the spec. No layout engine, no measuring.

### Mock-up: an app shell with a right drawer over a table (80 cells, 15 rows)

The page under it:

```text
╔═ Acme ═══════════════════════════════════════════════════════════════════════╗
║ ACME      Projects   Reports                           [ Filter ]  [[ New ]] ║
║           ━━━━━━━━                                                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ name               owner              status             updated             ║
║ ──────────────────────────────────────────────────────────────────────────── ║
║ Checkout           Mia                live               2 h ago             ║
║ Onboarding         Sam                draft              1 d ago             ║
║ Billing            Ana                live               3 d ago             ║
║ Search             Lee                paused             1 w ago             ║
║ Invoices           Kai                draft              2 w ago             ║
║ Exports            Mia                live               3 w ago             ║
║                                                                              ║
║ … and 12 more projects                                                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

With `{ "type": "drawer", "side": "right", "width": 30, "title": "Filter", "rows": [ …select, three checkboxes, buttons… ] }`:

```text
╔═ Acme ═══════════════════════════════════════════════════════════════════════╗
║ ACME      Projects   Reports                           [ Filter ]  [[ New ]] ║
║           ━━━━━━━━                                                           ║
╠═══════════════════════════════════════════════╦══════════════════════════════╣
║ name               owner              status ░║ FILTER                     × ║
║ ─────────────────────────────────────────────░╠══════════════════════════════╣
║ Checkout           Mia                live   ░║ Owner  [ Anyone           ▼] ║
║ Onboarding         Sam                draft  ░║ [x] Live                     ║
║ Billing            Ana                live   ░║ [x] Draft                    ║
║ Search             Lee                paused ░║ [ ] Paused                   ║
║ Invoices           Kai                draft  ░║                              ║
║ Exports            Mia                live   ░║ [ Reset ]  [[ Apply ]]       ║
║                                              ░║                              ║
║ … and 12 more projects                       ░║                              ║
╚═══════════════════════════════════════════════╩══════════════════════════════╝
```

The table is still there up to `status`; the `updated` column is under the drawer, and the cut falls between words.

### Mock-up: a popover anchored to a button (80 cells, 12 rows)

`{ "type": "popover", "anchor": "Filter", "rows": [ …two checkboxes, Apply… ] }`. The popover would start at the button's left edge, but box and shadow wouldn't fit, so it moves left by four cells; `▲` stays over the button's middle.

```text
╔═ Acme ═══════════════════════════════════════════════════════════════════════╗
║ ACME      Projects   Reports                           [ Filter ]  [[ New ]] ║
║           ━━━━━━━━                               ┌──────────▲─────────────┐  ║
╠══════════════════════════════════════════════════│ [x] Live               │░═╣
║ name               owner              status     │ [ ] Draft              │░ ║
║ ─────────────────────────────────────────────────│ [[ Apply ]]            │░ ║
║ Checkout           Mia                live       └────────────────────────┘░ ║
║ Onboarding         Sam                draft       ░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
║ Billing            Ana                live               3 d ago             ║
║ Search             Lee                paused             1 w ago             ║
║ Invoices           Kai                draft              2 w ago             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Mock-up: a bottom sheet and a toast (64 cells)

```text
╔═ Acme ═══════════════════════════════════════════════════════╗
║ ACME      Projects                                 [[ New ]] ║
║           ━━━━━━━━                                           ║
╠══════════════════════════════════════════════════════════════╣
║ name                owner               updated              ║
║ ──────────────────────────────────────────────────────────── ║
║ Checkout            Mia                 2 h ago              ║
║ Onboarding          Sam                 1 d ago              ║
║░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░║
╠══════════════════════════════════════════════════════════════╣
║                             ━━━━                             ║
║ SHARE CHECKOUT                                               ║
║ Invite  [name@acme.com_____________________________________] ║
║                                    [ Copy link ]  [[ Send ]] ║
╚══════════════════════════════════════════════════════════════╝
```

```text
╔═ Acme ═══════════════════════════════════════════════════════╗
║ ACME      Projects                                 [[ New ]] ║
║           ━━━━━━━━                                           ║
╠══════════════════════════════════════════════════════════════╣
║ name                owner               updated              ║
║ ──────────────────────────────────────────────────────────── ║
║ Checkout            Mia                 2 h ago              ║
║ Onboarding          Sam                 1 d ago              ║
║ Billing             Ana                 3 d ago              ║
║ Search              Lee                 1 w ago              ║
║ Invoices            Kai    ┌──────────────────────────────┐  ║
║ Exports             Mia    │ Billing archived. [ Undo ]   │░ ║
║                            └──────────────────────────────┘░ ║
║ … and 12 more projects      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
╚══════════════════════════════════════════════════════════════╝
```

### HTML: the uncovered page in the muted colour

The text form is the grid above, plain: the edge, the shadow and the joints are what separate the layer from the page, so it reads the same pasted into a chat.

For the painted forms (HTML `<pre>`, SVG, PNG, PDF, decks, reports), the page kind also returns its **mask**: one letter per cell, `p` page, `l` layer, `s` shadow. For the drawer above:

```text
pppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp
pppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp
pppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp
pppppppppppppppppppppppppppppppppppppppppppppppplppppppppppppppppppppppppppppppp
pppppppppppppppppppppppppppppppppppppppppppppppslllllllllllllllllllllllllllllllp
pppppppppppppppppppppppppppppppppppppppppppppppsllllllllllllllllllllllllllllllll
pppppppppppppppppppppppppppppppppppppppppppppppslllllllllllllllllllllllllllllllp
pppppppppppppppppppppppppppppppppppppppppppppppslllllllllllllllllllllllllllllllp
pppppppppppppppppppppppppppppppppppppppppppppppslllllllllllllllllllllllllllllllp
pppppppppppppppppppppppppppppppppppppppppppppppslllllllllllllllllllllllllllllllp
pppppppppppppppppppppppppppppppppppppppppppppppslllllllllllllllllllllllllllllllp
pppppppppppppppppppppppppppppppppppppppppppppppslllllllllllllllllllllllllllllllp
pppppppppppppppppppppppppppppppppppppppppppppppslllllllllllllllllllllllllllllllp
pppppppppppppppppppppppppppppppppppppppppppppppslllllllllllllllllllllllllllllllp
pppppppppppppppppppppppppppppppppppppppppppppppplppppppppppppppppppppppppppppppp
```

`paintLine(line, maskRow)` takes it as an optional second argument. Page cells get a new class, `gk-u` (under), coloured with the theme's `muted` role, overriding data, problem and ok colours, so a red word under a drawer doesn't compete with the drawer. Layer cells keep their usual roles; shadow cells take the `frame` role. `muted` passes 4.5 to 1 in all four palettes (paper only just: 4.50 on its panel colour, 4.87 on the page), so the page stays readable. Without a mask (every other kind) painting is byte-for-byte what it is today. A `dialog` keeps today's ░ page, since a modal makes the page unusable.

The **prototype** HTML (`render/html.mjs`) uses real elements: a drawer is an `<aside>` in the same CSS grid as the page, spanning the content rows, with a shadow; a popover or menu is placed right after its anchor inside a relative wrapper, `position: absolute; top: 100%`; a sheet and a toast are absolutely placed in the screen. The page under a drawer, sheet, popover or toast stays interactive and is not dimmed (the dialog keeps its dimmer and `aria-modal`). Esc and a click outside close popovers and menus; the anchor button gets `aria-expanded` and `aria-controls`.

### Motion: a layer arrives once, after its page

The page arrives first in reading order (frame, then each section top to bottom), within 360 ms, so the whole figure still settles within the kit's 600 ms. Then each layer, once:

| type | arrival | time |
|---|---|---|
| drawer | slides in from its edge in whole cells, ease-out: 19, 9, 4, 1, 0 cells from home (for a 32-cell drawer and shadow) | 5 steps, 200 ms |
| sheet | rises from the bottom frame the same way, in rows | 3 to 4 steps |
| popover, menu | no travel: the edge with its pointer lands, then the body | 2 steps, 80 ms |
| toast | rises one row from its corner, then stays | 2 steps, 80 ms |
| dialog | as today | |

The drawer, cropped to rows 4 to 9, at three of its steps:

At 40 ms, the edge 19 cells from home:

```text
╠══════════════════════════════════════════════════════════════════╦═══════════╣
║ name               owner              status             updated░║ FILTER    ║
║ ────────────────────────────────────────────────────────────────░╠═══════════╣
║ Checkout           Mia                live               2 h ago░║ Owner  [ A║
║ Onboarding         Sam                draft              1 d ago░║ [x] Live  ║
║ Billing            Ana                live               3 d ago░║ [x] Draft ║
```

At 80 ms, 9 cells from home:

```text
╠════════════════════════════════════════════════════════╦═════════════════════╣
║ name               owner              status          ░║ FILTER              ║
║ ──────────────────────────────────────────────────────░╠═════════════════════╣
║ Checkout           Mia                live            ░║ Owner  [ Anyone     ║
║ Onboarding         Sam                draft           ░║ [x] Live            ║
║ Billing            Ana                live            ░║ [x] Draft           ║
```

At 200 ms, home, and still from then on:

```text
╠═══════════════════════════════════════════════╦══════════════════════════════╣
║ name               owner              status ░║ FILTER                     × ║
║ ─────────────────────────────────────────────░╠══════════════════════════════╣
║ Checkout           Mia                live   ░║ Owner  [ Anyone           ▼] ║
║ Onboarding         Sam                draft  ░║ [x] Live                     ║
║ Billing            Ana                live   ░║ [x] Draft                    ║
```

While it travels the page shows where the drawer hasn't reached yet; the drawer is clipped at the frame. Since a slide changes what a cell shows more than once, the one-delay-per-cell model can't carry it alone. The arrival order for a layer returns a short list of frames (at most 5) for the layer's rectangle only; `render/arrive.mjs` draws each as an aria-hidden overlay, visible for one step, the way `gk-s1` and `gk-s2` work today, and the real cells (the ones copied and read aloud) appear at the end. Under reduced motion, in print and without JavaScript the overlays never show: the drawer is simply open.

## Reading cost

Estimated with the kit's own `estimateTextTokens` on a drafted guide section (a 48-cell page and drawer figure, their specs, the two tables above in short form):

| file | today | added | after |
|---|---|---|---|
| `reference/areas/wireframes.md` | ~3,700 tokens | page ~990 + layers ~790 = **~1,780** | ~5,500 |
| … if the four preset sections shrink to a table of their page equivalents (they are ~1,900 today) | | ~1,780 − ~1,750 | **~3,750 (about even)** |
| `reference/areas/layouts.md` | ~4,000 | one line pointing to pages: **~30** | ~4,030 |
| `SKILL.md` | | two rows in the "the ask sounds like" table: **~40** | |

I'd shrink the presets: `guide appShell` would still print a short section, and the page figure is a better model to copy than four separate ones.

## Code that changes

| file | change | rough size |
|---|---|---|
| `areas/wireframes.mjs` | `page()`: sections, columns, separators, joints, frames; `nav` primitive; anchor map; presets rebuilt on it | ~5 KB |
| `areas/layers.mjs` (new) | placement, flip, clip, stub rule, shadow, mask; `overlay` moves here | ~4 KB |
| `render/paint.mjs` | optional mask, `gk-u` class | <1 KB |
| `arrive-orders.mjs`, `render/arrive.mjs` | page order; layer frames as stepped overlays | ~2 KB |
| `render/html.mjs` | prototype: page sections, drawer, sheet, popover, menu, toast | ~3 KB |
| `render/svg.mjs`, `report.mjs`, `deck.mjs` | pass the mask through | <1 KB |
| `registry.mjs`, `guard.mjs` | `page` kind; layer, anchor and count checks with one-sentence refusals | ~1 KB |
| `reference/areas/wireframes.md`, `SKILL.md`, an example spec | as above | ~4 KB |

About 16 KB of code. Nothing new on the page: no scripts, fonts or measuring.

## Tests

- **Presets:** `appShell`, `listDetail`, `cardGrid`, `modal` and `screen` with `overlay` give the same bytes as 0.2.0 for every guide and example spec.
- **Pages:** fit 80 with the awkward inputs from `tests/gen.mjs` (long, empty, CJK, de/tr); closed frames and measured joints only (lint); every joint correct where column rules meet separators; spare cells go to the last column; limits and refusals in plain words.
- **Layers:** each type at every side and corner; popover shift and flip; refusal when it fits nowhere; anchors found in the page and in earlier layers, missing anchors listing the real names; stub rule; mask the same size as the grid; text form identical with and without the mask; same bytes twice.
- **Paint:** `gk-u` only on page cells; no mask, no change.
- **Arrival:** frames clipped to the frame; the last frame equals the final figure; nothing extra under reduced motion; whole figure within 600 ms.

## Left out

- No free placement (`x`, `y`) and no nesting past columns.
- No figures inside a page section (a chart in an app shell). Asked below.
- No layer over a document layout; layers are for screens.
- No more than 2 layers.

## Questions for the owner

1. **Shadow:** one column of `░` reads well in plain text, but ░ also means "empty" or "projected" in the density ladder. Keep it, use `▒`, or no shadow (edge only)?
2. **Drawer height:** default from below the first section (the nav stays readable, as in most apps), or the full height of the frame?
3. **Presets:** keep `appShell`, `cardGrid`, `listDetail` as names that build pages (what this plan does), or deprecate them in favour of `page` in the next minor release?
4. **Figures in pages:** should a section be able to hold a figure spec (a dashboard tile in an app shell)? It would reuse the layout packer, but pages would then have two kinds of content.
5. **Muting:** page cells under any non-modal layer go to the muted colour in HTML. Should the page also mute with a popover or toast, or only with a drawer or sheet?
