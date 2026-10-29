# Adding a type

This walks through adding one type end to end, using `palette` (a tonal scale) as the example. It's real: every step below is what that type's code does.

Before you start, open an issue with the "New type" template and a sketch drawn by hand. Agreeing on the shape first saves rewriting the code.

## 1. Sketch it at 80 cells

Draw the figure by hand in a text file, at the widest it will get, with the longest labels it should take. Decide what each glyph means and what the text says without colour. For `palette`:

```text
        Blue               Red
50      ██ #eef3ff  1.1    ██ #fff1ee  1.1
500   ▲ ██ #4269d6  5.0  ▲ ██ #c94a30  4.7
900     ██ #121c40 16.6    ██ #3b140c 16.3

Contrast on the page, #ffffff. ▲ first step that reads as words: 4.5 to 1.
```

- `██` is the swatch, and the value after it says the colour in words, so the text keeps its meaning without colour.
- The number is the contrast on the page, so the figure answers a question rather than only showing colours.
- `▲` marks the first step that's dark enough for words.

Then work out the limits: four hues fit in 80 cells, so a fifth is refused with a sentence that says what to do.

## 2. Write the render function

A type is a function from data to text. Put it in its area's file, `skills/glyph-kit/scripts/areas/<area>.mjs`; `palette` lives in `systems.mjs`.

- Measure in cells with `len`, `padEnd` and `padStart` from `core.mjs`, never with `.length`: wide characters take two cells.
- Cut long labels with `fitLabels` or `cut`, so the cut is recorded and `check` can report it.
- Cap long lists with `capRows`, which adds "… and N more" for you.
- Respect `maxWidth` from the options, and throw a plain sentence when the data can't fit.
- Return the lines with `join` from `core.mjs`.

```js
export function palette({ hues, page = "#ffffff" }, { maxWidth = LAYOUT.maxWidth } = {}) {
  const stepNames = [...new Set(hues.flatMap((h) => h.steps.map((s) => String(s.name))))];
  const capped = capRows(stepNames, LAYOUT.rowsMax, "steps");
  …
  if (hues.length > fits) throw new Error(`A palette fits ${fits} hues at ${maxWidth} cells; this one has ${hues.length}. Split it into two figures.`);
  …
  return join([head, ...rows, ...(capped.note ? [capped.note] : []), "", `Contrast on the page, …`]);
}
```

## 3. Register it

Add it to the area's `kinds` at the bottom of the same file:

```js
palette: {
  label: "Palette",                 // the type's name in lists and in the figure's label
  check: colourChecks.palette,      // data → a list of problems, in plain sentences
  render: palette,
  arrive: readingOrder,             // how it arrives in HTML and decks
  summary: (d) => …                 // the sentence screen readers and Markdown use
}
```

- **`check`** returns every problem it finds, not just the first. `check` on the command line shows them all at once. Name the row and say what to change: "Blue 300 is lighter than 200; a scale's steps get steadily darker."
- **`arrive`** picks an order from `scripts/arrive.mjs` (`readingOrder`, `barsFill`, `timeline`, …). If none fits, write one in `scripts/arrive-orders.mjs`. A figure settles within 600ms, on 40ms steps.
- **`summary`** says what the figure shows, not what it looks like: "Blue: 10 steps, words from 500."

## 4. Give it an example and a guide entry

- Add an example spec to `tools/examples/<area>.json`. Its data is made up, so its source starts with "Sample data".
- Add a line to `KIND_DOCS` in `tools/docs.mjs`: `when` (what it's for) and `traps` (what to watch for).
- Run `node tools/build-reference.mjs`. It writes the type's section in `skills/glyph-kit/reference/areas/<area>.md`, with the example drawn by the kit, so the guide can't drift from the code.
- Add the type to the area's row in `skills/glyph-kit/SKILL.md` and in the README's table.

## 5. Test it

Some checks run on every type for free, in `tests/kit.test.mjs` and `tests/contract.test.mjs`:

- every type has docs and an example;
- every example draws, lints clean and has a label;
- text in boxes keeps its padding.

Add your own file, `tests/<type>.test.mjs`, for the edges. `tests/colour-types.test.mjs` is the one for `palette`:

- no data, one row, and more rows than fit (cut with a note);
- data that can't be true, refused with a sentence that names the row;
- every line within 80 cells;
- anything the type promises, such as ▲ landing on the right step.

## 6. Write it up

Add a line to `CHANGELOG.md` under the coming version: what the type shows and when to reach for it. Then run the checks in [CONTRIBUTING.md](../CONTRIBUTING.md#before-a-pull-request) and open the pull request.
