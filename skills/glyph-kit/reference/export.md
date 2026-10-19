# Export

One command writes any form. The input can be a spec, a list of specs, a deck or a report; the command works out which.

```bash
node scripts/glyph-kit.mjs export <file> --to md|mdx|html|svg|png|pdf [--out path] [--theme paper|ink|phosphor|gilt]
```

| `--to` | Spec or list | Deck | Report | Needs |
|---|---|---|---|---|
| `md` | Each figure in a text block, with description and source | Not used: export the deck's specs | Headings, takeaways, numbered figures, notes | Nothing |
| `mdx` | Static MDX, or `--mdx component` for `<Glyph spec={…} />` | — | The whole report as MDX with frontmatter | Nothing (component mode uses `templates/mdx`) |
| `html` | A page; wireframes become a working prototype | The presentation | The finished report | Nothing |
| `svg` | One SVG per figure | The deck's figures | Every figure, numbered | Nothing |
| `png` | One PNG per figure, at 2× | The deck's figures | Every figure, numbered | A Chromium browser |
| `pdf` | The figures as a short report | One page per slide, 16:9 | A4 pages, cover first | A Chromium browser |

## Reports

A report is the format to use when the output has to read like a finished document: a research readout, an audit, a design review, a quarterly summary.

```json
{
  "title": "Pave motion audit",
  "subtitle": "Every place in the front end where something moves, read and scored.",
  "author": "Alexander Traykov",
  "date": "2026",
  "theme": "paper",
  "summary": ["One finding per line, in plain words."],
  "sections": [
    {
      "title": "One spinner, four speeds",
      "takeaway": "A slow spinner makes the app feel slow at the same load time.",
      "text": ["Paragraphs. **Bold** and `code` work."],
      "figures": [{ "kind": "barChart", "title": "…", "data": [] }],
      "note": "An aside, shown as a callout."
    }
  ]
}
```

- **Cover:** the shade ramp, title, subtitle, author and date, the summary in a panel, and a numbered contents list.
- **Sections:** numbered, with the takeaway set large. Write the takeaway as the conclusion, not the topic.
- **Figures:** numbered, drawn as inline SVG, with intent, source and the text form one click away.
- **Print:** A4 with a full-bleed background, the cover on its own page, and figures never split across pages.

`examples/reports/motion-audit.json` is a full example. Run the commands above on it to make each format; a copy of every export is at https://traykov.cc/glyph-kit/examples/motion-audit/.

## SVG and PNG

SVGs need no font for the graphics:

- **Block characters** become rectangles, drawn at 72% of the row height so rows have air between them.
- **Shades** `░▒▓` become 25%, 50% and 75% ordered-dither patterns.
- **Box drawing** becomes vector lines: light, heavy and double.
- **Arrows** become shapes.
- **Text** is placed word by word on its exact cells.

The result lines up in any viewer and scales cleanly. PNG is the same SVG rasterised at 2× through a headless browser.

## MDX

Two modes:

- **Static** (default): plain MDX that works in any setup. Each figure is a text block with its description. Braces and angle brackets in prose are escaped.
- **Component** (`--mdx component`): each figure becomes `<Glyph theme="…" spec={…} />`, rendered to SVG at build time. Copy `templates/mdx/Glyph.astro` (Astro) or `templates/mdx/Glyph.jsx` (React, Next.js, Docusaurus) next to your MDX and point its import at your copy of `scripts/render/svg.mjs`.

## The browser for PDF and PNG

Nothing is installed. The exporter tries, in order:

1. `CHROME_PATH`;
2. Chrome, Chromium or Edge;
3. a headless shell that Playwright or Puppeteer has already downloaded;
4. Brave.

A browser that fails or hangs is skipped after 30 seconds. If none works, the error names each one tried; export HTML and print it from any browser instead.

## Themes and spacing

- **Themes:** `paper`, `ink`, `phosphor` and `gilt` are defined once in `scripts/render/themes.mjs`, as roles rather than colours: background, panel, ink, muted, data, frame, flag (problems) and ok (passes).
- **Spacing:** figure padding, row gap, section gap and text measure are tokens in the same file. Change them there and every form follows.
