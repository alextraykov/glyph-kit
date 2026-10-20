# Wireframes

Screens built from a small set of primitives. The same primitive names map to real components in the design-system map, which is what lets a text wireframe become a prototype and then production code without reinterpretation.

Each kind below shows the spec that made its figure. Save one as spec.json and render it with `node scripts/glyph-kit.mjs render spec.json --to markdown` (or `--to html`).

## Screen wireframe

`kind: "screen"`

**Use it for** a layout proposal: content, order and controls before visuals.

```text
╔═ Settings ═════════════════════════════════╗
║  Profile │ Notifications │ Billing         ║
║           ━━━━━━━━━━━━━━━                  ║
║                                            ║
║ Email me when a report is ready   [ ■] on  ║ [1]
║ Weekly summary                    [■ ] off ║
║ Digest day  [ Monday                    ▼] ║
║ Send to  [team@example.com_______________] ║
╠════════════════════════════════════════════╣
║                     [ Cancel ]  [[ Save ]] ║ [2]
╚════════════════════════════════════════════╝

[1] Off by default for new teams.
[2] Save is disabled until something changes.

                                       SAMPLE DATA
```

*Notification settings. Settings: tabs, space, toggle, toggle, select, input, divider, buttons.*

<details><summary>Spec</summary>

```json
{
  "kind": "screen",
  "data": {
    "title": "Settings",
    "rows": [
      {
        "type": "tabs",
        "items": [
          "Profile",
          "Notifications",
          "Billing"
        ],
        "selected": "Notifications"
      },
      {
        "type": "space"
      },
      {
        "type": "toggle",
        "label": "Email me when a report is ready",
        "on": true,
        "note": "1"
      },
      {
        "type": "toggle",
        "label": "Weekly summary",
        "on": false
      },
      {
        "type": "select",
        "label": "Digest day",
        "value": "Monday",
        "options": [
          "Monday",
          "Wednesday",
          "Friday"
        ]
      },
      {
        "type": "input",
        "label": "Send to",
        "value": "team@example.com"
      },
      {
        "type": "divider"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "Cancel"
          },
          {
            "label": "Save",
            "primary": true,
            "untilChange": true
          }
        ],
        "align": "right",
        "note": "2"
      }
    ],
    "notes": {
      "1": "Off by default for new teams.",
      "2": "Save is disabled until something changes."
    }
  }
}
```

</details>

**Watch for:** One screen per sketch; notes go outside the frame; use only the primitives so the map can translate them.

## Responsive pair

`kind: "responsive"`

**Use it for** the same screen at two widths.

```text
Desktop                                     Mobile
╔═ Report ═════════════════════════════╗    ╔═ Report ═════════════╗
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║    ║ ░░░░░░░░░░░░░░░░░░░░ ║
║ ░░░░░░░░░░░░░[ chart ]░░░░░░░░░░░░░░ ║    ║ ░░░░░[ chart ]░░░░░░ ║
║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║    ║ ░░░░░░░░░░░░░░░░░░░░ ║
║ Revenue by month, last 12 months.    ║    ║ [[ Export ]]         ║
║ [[ Export ]]  [ Share ]              ║    ╚══════════════════════╝
╚══════════════════════════════════════╝

                                                         SAMPLE DATA
```

*Report, desktop and mobile. Desktop: image, text, buttons. Mobile: image, buttons*

<details><summary>Spec</summary>

```json
{
  "kind": "responsive",
  "data": [
    {
      "label": "Desktop",
      "spec": {
        "title": "Report",
        "width": 40,
        "rows": [
          {
            "type": "image",
            "label": "chart",
            "height": 3
          },
          {
            "type": "text",
            "text": "Revenue by month, last 12 months."
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "Export",
                "primary": true
              },
              {
                "label": "Share"
              }
            ]
          }
        ]
      }
    },
    {
      "label": "Mobile",
      "spec": {
        "title": "Report",
        "width": 24,
        "rows": [
          {
            "type": "image",
            "label": "chart",
            "height": 3
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "Export",
                "primary": true
              }
            ]
          }
        ]
      }
    }
  ]
}
```

</details>

**Watch for:** Show what moves or disappears, not just a narrower copy.

## App shell

`kind: "appShell"`

**Use it for** an app page with a header, a sidebar and content: admin pages, settings apps, anything with navigation. The default for a screen.

```text
╔═ Acme ═══════════════════════════════════════╗
║ > Search                                     ║
╠══════════════╦═══════════════════════════════╣
║ █ Projects   ║ PROJECTS                      ║
║   Reports    ║ name           owner          ║
║              ║ ───────────────────────────── ║
║              ║ Checkout       Mia            ║
║              ║ Billing        Ana            ║
╚══════════════╩═══════════════════════════════╝

                                     SAMPLE DATA
```

*Projects. Acme: header (search), sidebar (list), content (heading, table).*

<details><summary>Spec</summary>

```json
{
  "kind": "appShell",
  "data": {
    "title": "Acme",
    "header": [{"type":"search","placeholder":"Search"}],
    "sidebar": [{"type":"list","items":[{"text":"Projects","selected":true},"Reports"]}],
    "content": [{"type":"heading","text":"Projects"},{"type":"table","columns":["name","owner"],"rows":[["Checkout","Mia"],["Billing","Ana"]]}],
    "width": 48,
    "sidebarWidth": 14
  }
}
```

</details>

**Watch for:** Sidebar 10 to width − 24 cells (18 by default); regions take the screen primitives.

## Card grid

`kind: "cardGrid"`

**Use it for** galleries, template pickers, grids of projects.

```text
╔═ Templates ══════════════════════════════════╗
║ ┌─ Readout ─────────┐  ┌─ Status ──────────┐ ║
║ │ ░░░░[ image ]░░░░ │  │ ░░░░[ image ]░░░░ │ ║
║ └───────────────────┘  └───────────────────┘ ║
╚══════════════════════════════════════════════╝

                                     SAMPLE DATA
```

*Templates. Templates: 2 cards: Readout, Status.*

<details><summary>Spec</summary>

```json
{
  "kind": "cardGrid",
  "data": {
    "title": "Templates",
    "cards": [{"title":"Readout","rows":[{"type":"image","height":1}]},{"title":"Status","rows":[{"type":"image","height":1}]}],
    "width": 48
  }
}
```

</details>

**Watch for:** Up to 6 cards, 2 or 3 to a row by width; keep each card to a few rows.

## List and detail

`kind: "listDetail"`

**Use it for** inboxes, master and detail, anything where picking an item shows it.

```text
╔═ Inbox ════════╦═════════════════════════════╗
║ █ Mia          ║ Ship the new copy Monday?   ║
║   Sam          ║ [[ Reply ]]                 ║
║   Ana          ║                             ║
╚════════════════╩═════════════════════════════╝

                                     SAMPLE DATA
```

*Inbox. Inbox: a list of 3 with Mia selected, and its detail (text, buttons).*

<details><summary>Spec</summary>

```json
{
  "kind": "listDetail",
  "data": {
    "title": "Inbox",
    "list": ["Mia","Sam","Ana"],
    "selected": 0,
    "detail": [{"type":"text","text":"Ship the new copy Monday?"},{"type":"buttons","items":[{"label":"Reply","primary":true}]}],
    "width": 48,
    "listWidth": 16
  }
}
```

</details>

**Watch for:** Mark the picked item with selected (its index or text).

## Modal over a page

`kind: "modal"`

**Use it for** a dialog over a page: confirm, delete, a short form.

```text
╔═ Projects ═══════════════════════════════╗
║░░░░░░┌─ Delete project? ──────────┐░░░░░░║
║░░░░░░│ [ Cancel ]  [[ Delete ]]   │░░░░░░║
║░░░░░░└────────────────────────────┘░░░░░░║
║░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░║
╚══════════════════════════════════════════╝

                                 SAMPLE DATA
```

*Delete a project. Projects, with a Delete project? dialog over it.*

<details><summary>Spec</summary>

```json
{
  "kind": "modal",
  "data": {
    "title": "Projects",
    "page": [{"type":"skeleton","lines":4}],
    "dialog": {"title":"Delete project?","rows":[{"type":"buttons","items":[{"label":"Cancel"},{"label":"Delete","primary":true}]}]},
    "width": 44
  }
}
```

</details>

**Watch for:** The page shows dimmed behind it; make the page tall enough for the dialog.
