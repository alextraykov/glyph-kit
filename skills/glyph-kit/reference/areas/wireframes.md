# Wireframes

Pages built from named pieces: you pick and fill them, the kit places every cell. Never count cells or draw frames. The names map to real components in `design-system.map.json`.

Types: `page`; `screen` and `responsive` for one panel; `appShell`, `cardGrid`, `listDetail`, `modal` as before.

## Start from a pattern

Copy a pattern and edit its words: `node scripts/glyph-kit.mjs pattern <name>` prints one.

| the ask sounds like | pattern |
|---|---|
| pricing, plans, a marketing page | `pricing` |
| settings, preferences, a profile form | `settings` |
| a table with filters, an admin list, "a drawer over a table" | `list-filters` |
| inbox, messages, list and detail | `inbox` |
| dashboard, overview, KPIs | `dashboard` |
| sign in, sign up, reset password | `sign-in` |

Words that name a layer ("opening over", "drawer", "popover", "menu", "toast", "confirm") add one to `layers`. Nothing fits: an app page starts from `dashboard`, a public page from `pricing`. Two states are two specs, the second with the layer. Numbers the user didn't give need an "Illustrative" source. `glyph-kit.mjs check spec.json` lists every problem at once.

## Page

`kind: "page"`

```text
╔═ Acme ═══════════════════════════════════════╗
║ ACME    Projects                  [ Filter ] ║
║         ━━━━━━━━                             ║
╠═════════════════════╦════════════════════════╣
║ NAME               ░║ FILTER               × ║
║ ───────────────────░╠════════════════════════╣
║ Checkout           ░║ [x] Live               ║
║ Billing            ░║ [[ Apply ]]            ║
║ Search             ░║                        ║
╚═════════════════════╩════════════════════════╝
```

```json
{
  "kind": "page",
  "title": "Projects, filtered",
  "data": {
    "title": "Acme",
    "width": 48,
    "sections": [
      { "rows": [{ "type": "nav", "brand": "Acme", "items": ["Projects"], "selected": "Projects", "actions": [{ "label": "Filter" }] }] },
      { "rows": [{ "type": "dataTable", "columns": ["name", "owner"], "rows": [["Checkout", "Mia"], ["Billing", "Ana"], ["Search", "Lee"]] }] }
    ],
    "layers": [{ "type": "drawer", "size": "s", "title": "Filter", "rows": [{ "type": "checkbox", "label": "Live", "checked": true }, { "type": "buttons", "items": [{ "label": "Apply", "primary": true }] }] }]
  }
}
```

A page is `sections`, top to bottom. A section holds `rows` (pieces), `columns` (2 to 4 lists of pieces) or `cards` (2 or 3 cards). Nothing nests further; a card holds primitives.

| field | values |
|---|---|
| page `width`, `url` | 40 to 80 (80); a browser bar |
| `split` | `1:1`, `1:2`, `1:3`, `1:4`, `2:1`, `1:1:1`, `1:2:1`, `1:1:2`, `1:1:1:1` |
| `above` | `double` (default), `line`, `space`, `none` |
| `rule`, `align`, `measure`, `pad` | `false`; `center`; `narrow` (40 cells, centred); 0 to 2 rows |
| piece `id`, `note` | a name to anchor to; a note marker |

## Pieces

Primitives: `heading` `text` `muted` `input` `search` `buttons` `checkbox` `radio` `toggle` `select` `tabs` `list` `table` `image` `skeleton` `empty` `bar` (`left`, `right`) `space` `divider` (`label`).

| component | fields |
|---|---|
| `nav` | `brand`, `items`, `selected`, `actions` |
| `tabsBar` | `items` (text or `{ text, count }`), `selected`, `actions` |
| `fieldGroup` | `title`, `help`, `fields` (input, select, toggle, checkbox, radio) |
| `dataTable` | `columns`, `rows`, `search`, `actions`, `selectable`, `checked`, `total` |
| `card` | `title`, `meta`, `rows`, `footer` |
| `stats` | `items`: up to 4 `{ label, value, change }` |
| `emptyState` | `title`, `text`, `action`, `secondary` |

## Layers

Up to 2 in `layers`, drawn in order; the page stays in view.

| layer | placed | fields |
|---|---|---|
| `drawer` | at the `side`, under the first section | `side`, `size`, `title`, `rows`, `footer` |
| `sheet` | across the bottom | `title`, `rows` |
| `popover` | under its `anchor` | `anchor`, `size`, `rows` |
| `menu` | under its `anchor` | `anchor`, `items` (text, `{ text, meta }`, `"-"`) |
| `toast` | bottom right | `text`, `action` |
| `dialog` | centred, page dimmed | `size`, `title`, `rows`, `footer` |

`size` is `s`, `m` or `l`, never cells. An `anchor` is a button label, a nav, tab or list item, or an `id`. A layer's rows hold primitives and `fieldGroup`; a menu from a drawer is the second layer. The page grows to fit a layer.

**Limits:** 8 sections, 4 columns of 12 cells or more, 3 cards, 4 stats, 12 table rows (then `… and 6 more rows`), 80 rows. Past one, the kit refuses with the fix.

**Watch for:** One state per figure. Unknown names are refused with the closest valid one.

## Old names

`screen` is one frame of rows with notes beside it, and `responsive` two screens side by side; use `page` for navigation, columns or layers. `appShell` is a header, then `columns` split `1:3`; `cardGrid` a `cards` section; `listDetail` a `list` column and the detail; `modal` a `dialog` layer. `guide <name>` prints a spec.
