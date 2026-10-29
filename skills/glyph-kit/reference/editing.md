# Editing figures

A figure drawn by the kit stays editable in two ways: change its spec and draw it again, or change the drawing and read it back into the spec. Both need the spec kept beside the figure.

## Keep the spec beside the figure

`render spec.json --to markdown --with-spec` and `export spec.json --to md --with-spec` write the spec after the figure, folded away:

````markdown
```text
┌───────┬────────────────────┐
…
```

*Decisions. Oct 2: CSV first, not PDF*

<details><summary>Spec</summary>

```json
{ "kind": "decisionLog", … }
```

</details>
````

Or keep the spec in its own file and name it on the line above the figure:

````markdown
<!-- glyph-kit: specs/decisions.json -->
```text
…
```
````

## Change the spec, then redraw

`redraw notes.md` draws every figure that has a spec again. Only each figure's text block and its description line change. Notes, comments and everything else in the file stay exactly as they were. A spec that can't be drawn leaves its figure alone and is listed with its line.

`redraw notes.md --check` changes nothing. It lists figures that no longer match their spec and exits 1, so a pull request or a pre-commit hook can catch a stale figure.

## Change the drawing, then read it back

`read notes.md` reads each edited drawing back into its spec, writes the spec, and tidies the drawing to how the kit draws it. Columns don't have to line up after an edit: the kit reads the words, not the spacing.

These types can be read back, because their text holds everything their data does:

| type | edit |
|---|---|
| `table`, `tokenTable`, `decisionLog` | the words in any cell; add or remove a row |
| `qaChecklist` | a row's status (`█ done`, `▒ in progress`, `to do`, `x blocked`), its text, its note in brackets |
| `board` | the cards under now, next and later (`· ` starts a card) |
| `colourRoles` | a role's name, token or colour values; its use stays as it was |

Charts and diagrams aren't read back: their drawing is computed from numbers, so change the numbers in the spec. A compact figure (`--compact`) can't be read back either. When an edit can't be read exactly, nothing is written and the row that didn't read is named.

## Every problem at once

`check spec.json` (or `check notes.md`) lists every problem in one go instead of stopping at the first: a missing source, a colour on one row, the type's own data checks, labels that will be cut, and frames that don't close. Problems exit 1; notes, such as a cut label, don't. In a Markdown file it also lists figures that don't match their spec.
