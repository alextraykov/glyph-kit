**What changes**
One or two sentences, for the people who use the kit.

**Checks** (from [CONTRIBUTING.md](../CONTRIBUTING.md#before-a-pull-request))

- [ ] `node --test tests/*.test.mjs` passes
- [ ] The guides lint clean
- [ ] `node tools/build-reference.mjs` leaves `skills/glyph-kit/reference` unchanged, or the change is intended and committed
- [ ] `node site/build.mjs` builds
- [ ] One line in `CHANGELOG.md`
- [ ] No dependencies, 80 cells at most, only measured glyphs, nothing that relies on colour alone
