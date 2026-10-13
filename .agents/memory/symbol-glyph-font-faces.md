---
name: Symbol glyph fallback faces
description: How category glyphs stay visible without system symbol fonts — Chrome unicode-range family augmentation rules and Vite asset gotchas.
---

Category marks (⟁ etc.) are in no web font; ⟁ tofus where no system font has U+27C1.
Fix = extend each loaded family with same-named @font-face rules restricted by unicode-range,
generated from the css2 URLs by the glyph-font build script (its unit test catches drift).

**Rule:** a glyph face must mirror EVERY exact (weight, style) the family declares.
**Why:** Chromium only consults faces in the matched weight/style group — a single 400 face
worked for regular/italic text but bold 700 text still painted tofu (verified empirically).
**How to apply:** new family/weight in index.html or FONT_STYLESHEETS → rerun the script with --css.

- Verify which font actually painted a node with CDP `CSS.getPlatformFontsForNode`, not screenshots alone.
  It reports per-file names like "AV Category Glyphs Sans (Fontations)" / "… Mono" — not the bare
  "AV Category Glyphs". Confirmed live on awesome.video 2026-10-13 (Editorial + Geist).
- First cookie-less edge GET of the .otf says `private`; with the GAESA cookie it is `public, immutable` (platform rewrite, not app).
- Tailwind v4's @import inlining does not rebase relative url(); use the `@/` alias in CSS urls.
- Vite inlines assets <4 KB as base64 — a font referenced by 47 rules pasted 230 KB into entry CSS;
  vite.config assetsInlineLimit excludes fonts. Always grep dist CSS after adding url() assets.
- palette-drift flags @font-face `font-family:` lines unless a reasoned DS-OK sits within 5 lines.
