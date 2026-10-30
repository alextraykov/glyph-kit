# The logo

The Glyph kit logo is the four shades side by side, light to full:

```text
░▒▓█
```

It is set in Departure Mono, as the font draws them. Where a page can show text, the logo is those four characters. Where it can't, as in a favicon, a link preview or a video frame, it's a picture made from the font's own pixels.

## Sizes

Each glyph is 7 × 14 of the font's pixels, so the logo is 28 × 14. Departure Mono is drawn for 11 px. Set the logo at a multiple of 11 px and every pixel is whole, and the four glyphs meet without a seam.

| Where | Size |
|---|---|
| Smallest as text | 11 px, 28 × 14 screen pixels |
| Site header, film footer | 22 px |
| Film corner | 33 px |
| Report cover, deck title slide | 55 px, 66 px |
| End cards | 132 px |
| Link preview (`site/public/og.png`, 1200 × 630) | 220 px |
| Favicon and skill icon (`skills/glyph-kit/assets/icon.svg`) | 32 × 32, one screen pixel to a font pixel |
| Home-screen icon (`site/public/apple-touch-icon.png`) | 180 × 180, six screen pixels to a font pixel |
| README (`docs/readme/mark.svg`) | 28 × 14, shown at 112 × 56 |

`node tools/mark.mjs` makes the icon, the home-screen icon and the README picture by reading the pixels from the font. `node tools/og.mjs` makes the link preview. Run them again rather than editing the files.

In a 16 px browser tab the icon is scaled down by half and the shades read as four greys. That's expected, so don't draw a separate small version.

## Allowed

- The four characters `░▒▓█` in Departure Mono, with no letter spacing, next to the name or near it. Mark the characters `aria-hidden`; the name says it.
- One colour: the page's ink on its paper, in light or dark. In a themed deck or report, the theme's data colour.
- Arriving in the kit's motion (typed, rastered or one glyph at a time), as long as it ends as the logo.

## Not allowed

- Redrawn shapes: traced, smoothed, rounded or re-dithered glyphs, or another font's shades.
- A colour per glyph, a gradient, a shadow, a glow or an outline.
- Another order, space between the glyphs, a stack, or more or fewer than four.
- Any other mark in its place, such as an illustration in a corner.

In figures the shades are data, and the kit may draw them as dot patterns. The logo is always the font's own glyphs.
