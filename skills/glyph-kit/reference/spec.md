# The spec and the design-system map

## A spec

Every artifact the kit makes is described by one JSON object:

```json
{
  "kind": "funnel",
  "title": "Signup to paid, last 30 days",
  "intent": "Find the step where most people leave.",
  "source": "Product analytics export, 2026-10-15",
  "data": [{ "label": "visited", "value": 12400 }, { "label": "signed up", "value": 6100 }],
  "options": { "width": 30 }
}
```

| Field | Required | What it is |
|---|---|---|
| `kind` | yes | One of the kinds listed by `node scripts/glyph-kit.mjs kinds`. |
| `data` | yes | The shape each kind expects. Every area guide shows a full spec per kind. Or `"@file.csv"` / `"@file.json"`, read from next to the spec by the command line: CSV becomes a list of rows keyed by the header, with numbers as numbers. |
| `title` | no | A short name. Shown above the figure, used as the slide title. |
| `intent` | no | Why this artifact exists, in one sentence. Goes into Markdown, HTML and decks; not into the bare text figure. |
| `source` | when there are numbers | Where the data came from, printed under the figure in every form. A spec whose data holds numbers is refused without one. Starting it with "Illustrative" or "Sample" stamps SAMPLE DATA on the figure. With `"@file"` data and no source, the source names the file. |
| `label` | no | The sentence screen readers get. Generated from the data when absent. |
| `options` | no | Layout settings: widths, scales, column labels. |

Each kind also checks its own data and refuses what can't be true, in plain words: a funnel that grows, a value outside its range, a test result outside its interval, a timeline that ends before it starts, dates out of order, a moving state machine whose path skips a transition.

A file may hold one spec or a list of them. Keep specs next to the document that uses them (`docs/specs/*.json`), so the figure, its data and its text change in one commit.

## Rendering

```bash
node scripts/glyph-kit.mjs render spec.json                     # the text figure, with title and source
node scripts/glyph-kit.mjs render spec.json --to markdown       # heading, intent, figure, description, source
node scripts/glyph-kit.mjs render spec.json --compact           # plain ASCII (# = : . - | +), for a model's context
node scripts/glyph-kit.mjs render spec.json --to html --map design-system.map.json
node scripts/glyph-kit.mjs deck a.json b.json --title "Review"  # one HTML deck, a slide per spec
```

Or import the renderers (`render/text.mjs`, `render/html.mjs`, `render/deck.mjs`) in a build step or an MDX component and render at build time.

## Presenting: decks

A deck file is `{ "title", "subtitle"?, "byline"?, "theme"?: "paper" | "ink", "slides": [...] }`. A slide is any spec, or a `{ "type": "title" | "section" | "statement" }` slide. Any spec can carry a `present` block:

```json
"present": {
  "command": "glyph-kit render funnel.json",
  "steps": [{ "lines": [2, 2], "say": "Activation is where we lose the most people." }],
  "flag": "no ──►",
  "notes": "Same 30-day window for every step.",
  "kicker": "What the numbers say"
}
```

| Field | What it does |
|---|---|
| `command` | Types in as a terminal command before the figure prints. Use it to show where a chart came from. |
| `steps` | Camera stops. Each zooms to a range of figure lines (0-based, from the text output), dims the rest, and shows `say` under the figure. |
| `flag` | A pattern; matching lines flash twice after printing. For failure paths and problem rows. |
| `notes` | Presenter notes, shown with N. |
| `kicker` | The small label above the slide title. Defaults to the latest section title. |

Render with `node scripts/glyph-kit.mjs deck deck.json > deck.html`. In the deck: → or space steps forward, ← back, N notes, F full screen; the address keeps the slide and step (`#7.2`). Under reduced motion nothing types or prints and the camera cuts. Printing gives one page per slide in its final state. `examples/decks/export-review.json` is a full sixteen-slide example.

To find line numbers for `steps`, render the spec with `--to text` and count from 0.

**Themes and colour.** `theme` picks a palette: `paper` (light, the default), `ink` (dark), `phosphor` (Synapse's green on near-black) or `gilt` (Our Saints' gold on black). In decks and HTML prototypes, figures are coloured by role, never for decoration: data glyphs (`█▓▒`, eighths, `■`) in the data colour, the empty part of a scale (`░`) dimmed, frames and rulers muted, problems (`fails`, `blocked`, `x missing`, `over`) in the warning colour, passes (`AA`, `AAA`, `done`, `ok`) in the success colour. In prototypes the roles come from the map's `accent`, `muted`, `danger` and `ok` tokens. The text form stays plain.

Three decks ship as examples: `export-review.json` (fictional, every kind of slide), `motion-audit.json` and `usage-case.json` (real work, with the figures already published).

## The design-system map

`design-system.map.json` lives in your project and tells the kit, and any agent using it, what your design system calls things. Start from `templates/design-system.map.example.json`.

| Section | Used by | What it maps |
|---|---|---|
| `tokens` | HTML prototypes and decks | Roles (`ink`, `surface`, `panel`, `muted`, `line`, `accent`, `onAccent`, `danger`, `space`, `radius`, `font`, `mono`, `durationBase`, `easingBase`) to your tokens. |
| `components` | HTML (as `data-component`) and the product step | Wireframe primitives (`button`, `input`, `search`, `select`, `checkbox`, `radio`, `toggle`, `tabs`, `list`, `table`, `dialog`, `skeleton`, `emptyState`, `image`, `heading`, `text`) to your component names, imports and props. |
| `motion` | Motion demos and the product step | Duration and easing tokens, and how your project handles reduced motion. |
| `stylesheet` | HTML and decks | Optional URL of your design system's CSS, loaded before the kit's own styles. |

Give every token a fallback, `var(--color-text, #111110)`, so a prototype renders correctly both inside your project and as a standalone file.

The map is the contract that keeps fidelity honest: a wireframe says `toggle`, the map says your project's toggle is `Switch` from `@your/ui`, and the agent builds with `Switch` instead of inventing one.
