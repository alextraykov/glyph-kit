# Wireframes

Screens built from a small set of primitives. The same primitive names map to real components in the design-system map, which is what lets a text wireframe become a prototype and then production code without reinterpretation.

Types: `screen`, `responsive`, `appShell`, `cardGrid`, `listDetail`, `modal`.

Each type shows its figure and the spec that made it; the spec's `kind` field names the type. `node scripts/glyph-kit.mjs guide <type>` prints one type's section without the figure.

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

```json
{
  "kind": "screen",
  "title": "Notification settings",
  "data": {
    "title": "Settings",
    "rows": [
      {
        "type": "tabs",
        "items": ["Profile", "Notifications", "Billing"],
        "selected": "Notifications"
      },
      { "type": "space" },
      {
        "type": "toggle",
        "label": "Email me when a report is ready",
        "on": true,
        "note": "1"
      },
      { "type": "toggle", "label": "Weekly summary", "on": false },
      {
        "type": "select",
        "label": "Digest day",
        "value": "Monday",
        "options": ["Monday", "Wednesday", "Friday"]
      },
      {
        "type": "input",
        "label": "Send to",
        "value": "team@example.com"
      },
      { "type": "divider" },
      {
        "type": "buttons",
        "items": [
          { "label": "Cancel" },
          { "label": "Save", "primary": true, "untilChange": true }
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

```json
{
  "kind": "responsive",
  "title": "Report, desktop and mobile",
  "data": [
    {
      "label": "Desktop",
      "spec": {
        "title": "Report",
        "width": 40,
        "rows": [
          { "type": "image", "label": "chart", "height": 3 },
          {
            "type": "text",
            "text": "Revenue by month, last 12 months."
          },
          {
            "type": "buttons",
            "items": [
              { "label": "Export", "primary": true },
              { "label": "Share" }
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
          { "type": "image", "label": "chart", "height": 3 },
          {
            "type": "buttons",
            "items": [{ "label": "Export", "primary": true }]
          }
        ]
      }
    }
  ]
}
```

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

```json
{
  "kind": "appShell",
  "title": "Projects",
  "data": {
    "title": "Acme",
    "header": [{ "type": "search", "placeholder": "Search" }],
    "sidebar": [
      {
        "type": "list",
        "items": [{ "text": "Projects", "selected": true }, "Reports"]
      }
    ],
    "content": [
      { "type": "heading", "text": "Projects" },
      {
        "type": "table",
        "columns": ["name", "owner"],
        "rows": [["Checkout", "Mia"], ["Billing", "Ana"]]
      }
    ],
    "width": 48,
    "sidebarWidth": 14
  }
}
```

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

```json
{
  "kind": "cardGrid",
  "title": "Templates",
  "data": {
    "title": "Templates",
    "cards": [
      { "title": "Readout", "rows": [{ "type": "image", "height": 1 }] },
      { "title": "Status", "rows": [{ "type": "image", "height": 1 }] }
    ],
    "width": 48
  }
}
```

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

```json
{
  "kind": "listDetail",
  "title": "Inbox",
  "data": {
    "title": "Inbox",
    "list": ["Mia", "Sam", "Ana"],
    "selected": 0,
    "detail": [
      { "type": "text", "text": "Ship the new copy Monday?" },
      {
        "type": "buttons",
        "items": [{ "label": "Reply", "primary": true }]
      }
    ],
    "width": 48,
    "listWidth": 16
  }
}
```

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

```json
{
  "kind": "modal",
  "title": "Delete a project",
  "data": {
    "title": "Projects",
    "page": [{ "type": "skeleton", "lines": 4 }],
    "dialog": {
      "title": "Delete project?",
      "rows": [
        {
          "type": "buttons",
          "items": [
            { "label": "Cancel" },
            { "label": "Delete", "primary": true }
          ]
        }
      ]
    },
    "width": 44
  }
}
```

**Watch for:** The page shows dimmed behind it; make the page tall enough for the dialog.
