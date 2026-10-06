---
name: Font loading and parity
description: How web fonts load, how to prove they loaded, and what font parity checks actually compare.
---

Consolidated index for font behaviour in this app. Detail lives in the linked files.

- Download coverage: [webfont-download-coverage.md](webfont-download-coverage.md) — the shell ships ONE canonical css2 link matching the design byte-for-byte. A token naming a family the link lacks is token drift. **Never widen the URL** to make a check pass: axis subsets change outlines.
- Declared vs rendered: [font-declaration-vs-render-parity.md](font-declaration-vs-render-parity.md) — identical heading files can still fail whole-document face parity when the canonical request adds a body family.
- Proving a family loaded: [fonts-check-vs-load.md](fonts-check-vs-load.md) and [fonts-check-capture-rebuild.md](fonts-check-capture-rebuild.md) — fonts.check() returns false for loaded families whose weight/subset is unused, and stays false until the 400 face loads. Prove with a non-empty fonts.load().
- FontFaceSet rebuilds: [fontfaceset-rebuild-on-stylesheet-insert.md](fontfaceset-rebuild-on-stylesheet-insert.md) — late stylesheets and Playwright fullPage captures drop warmed unused faces. Re-warm on apply AND on resize with a timer ladder plus loadingdone; a rAF-only re-warm starves.

**Why:** each of these produced a false "font is broken" or false-green reading at least once.
**How to apply:** when a font check disagrees with what the page visibly renders, suspect the probe before the app.