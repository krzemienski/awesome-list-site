---
name: document.fonts.check semantics + capture rebuild
description: Why fonts.check() reads false for a family that is visibly rendering, and why full-page Playwright captures reset it.
---

**Rule 1:** `document.fonts.check('16px "Family"')` probes the **400/normal** face only. A family that only ever renders at 500 (Editorial's Fraunces headings) is "loaded" on screen yet `check` is false, because the 400 face was never fetched. Warm the regular face of every family the active system names (`fonts.load('16px "<first family of --font-display/--font-body/--font-mono>"')`) on every design-system apply.

**Rule 2:** Chromium rebuilds every CSS-connected FontFace on device-metrics changes — Playwright `fullPage` screenshots do this (plain `setViewportSize` does not). The new objects start `unloaded`; only faces that text re-shapes reload, and on long pages even heading faces can stay `unloaded` (text runs are cached). A warmed-but-unused face therefore drops out after the first full-page capture, and `fonts.ready` will not bring it back. Re-warm on `window` `resize` (the capture fires it); the memory-cache load completes before the auditor's next evaluate.

**Why:** three independent auditors disagreed on Stage 9 for the same build — the ones that checked before/without full-page captures saw true, the one that captured first saw false on every desktop screen. Reproduction probes live under `.cache/probe/fonts-check-*.mjs` (gitignored).

**How to apply:** when a font-readiness gate flakes per auditor rather than per build, check the harness's capture order before touching fonts URLs (the Google Fonts request must stay byte-identical to the design).
