# Wireframes

Screens built from a small set of primitives. The same primitive names map to real components in the design-system map, which is what lets a text wireframe become a prototype and then production code without reinterpretation.

Examples: `examples/wireframes.json`. Render any of them with `node scripts/glyph-kit.mjs render examples/wireframes.json --to markdown` (or `--to html`).

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
