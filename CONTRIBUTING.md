# Contributing to Glyph kit

Thanks for helping. This file says what's welcome, the rules every change keeps, and how to check your work before a pull request.

## What's welcome

- **A new type.** A figure product designers draw often that no type covers yet. Open an issue with the "New type" template first, with a sketch drawn by hand, so we can agree on its shape before you build it. [Adding a type](docs/adding-a-type.md) walks through one end to end.
- **Fixes.** A figure that draws wrong, a check that refuses good data or lets bad data through, a guide that says something the kit doesn't do. Use the "Something's wrong" template.
- **Ports and integrations.** Editors, players, tools that read the kit's specs or text. Tell us in an issue; once it works, we'll list it in the README.
- **Guides.** Clearer words in `SKILL.md` and `reference/`. Plain words a designer would use, short sentences, no slogans.

## The rules every change keeps

1. **No dependencies.** Node 18 or later and the files in this repository, nothing else. A change that needs a package won't be merged.
2. **The same spec always draws the same figure.** No randomness without a fixed seed, no dates from the clock, no output that depends on the machine.
3. **80 cells wide at most.** Every type fits in 80 columns, and says in plain words when data won't fit.
4. **Only measured glyphs.** Drawing characters come from `MEASURED` in `scripts/lint.mjs`: each one is exactly one cell in Departure Mono and Menlo. A new glyph needs measuring in both first.
5. **Colour is never the only signal.** Every role also has a word or a glyph (`fails`, `x`, `ok`, `AA`, `▲`), so a figure reads the same without colour. Colour comes from roles, never from one bar or row.
6. **Every figure has a label.** `summary` gives the sentence screen readers and Markdown use.
7. **Every type has a still for reduced motion.** Arrival orders and processes end on a figure that makes the same point standing still.
8. **No source, no numbers.** A figure with numbers needs a source, and made-up data is stamped SAMPLE DATA.
9. **Existing specs keep working.** Before 1.0, a minor version may change the spec format, and the change goes in `CHANGELOG.md` with what to update.

## Before a pull request

Run these from the repository root. They're the same checks CI runs.

```bash
node --test tests/*.test.mjs
node skills/glyph-kit/scripts/lint.mjs skills/glyph-kit/SKILL.md skills/glyph-kit/README.md skills/glyph-kit/reference/*.md skills/glyph-kit/reference/areas/*.md
node scripts/check-version.mjs
node tools/build-reference.mjs
git diff --exit-code skills/glyph-kit/reference
node site/build.mjs
```

The fifth line is the reference gate. The area guides are generated from `tools/docs.mjs` and `tools/examples/`, so a change that moves a single cell of a shipped example shows up as a diff here. If the change is intended, commit the regenerated guides with your change and say why in the pull request.

## Writing the change up

- **One change per pull request,** with one line in `CHANGELOG.md` under the coming version, written for the people who use the kit: what they can do now, or what changed for them.
- **Copy:** plain words, sentence case, no taglines. Say "types", not "kinds". Name things by what a designer sees, not by the code.
- **The logo** is ░▒▓█ side by side in Departure Mono, in one colour. [The logo](docs/brand.md) gives its sizes and what not to do with it.
- **Commits** say what changed in a short first line, then why if it isn't obvious.

## How a change is reviewed

Every pull request gets a reply. Small fixes are usually merged as they are. A new type is reviewed for three things: whether designers would reach for it, whether its text form reads without colour or HTML, and whether it keeps the rules above. A change may be asked to wait for a release that fits it.

## Licence

By contributing you agree that your work is released under the repository's MIT licence.
