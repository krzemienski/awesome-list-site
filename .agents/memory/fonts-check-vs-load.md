---
name: document.fonts.check() vs load() as a font-loaded proof
description: Why "is this web font loaded?" gates must use fonts.load(), not fonts.check(), and how prod prerender breaks "wait for .page" readiness.
---

Rule: prove a family is loaded with `document.fonts.load('1em "<family>"')` resolving to a
non-empty FontFace list. Never gate on `document.fonts.check()`.

**Why:** `check()` answers "can this exact font string render without loading anything" —
it returns false for a fully loaded family whenever the requested weight/style/subset
has no matching *loaded* face (unused weights, unicode-range subsets). It produced false
FIX findings for Fraunces/Inter that were verified loaded in the same page.

**How to apply:** any font-readiness stage in an audit skill or harness; run it after
`document.fonts.ready` and after the DS module has set the active system.

Related readiness trap: the production build prerenders `.page` server-side and defers
the module bundle until after first paint, so "wait for `.page`" is satisfied before
`window.applyDesignSystem` / `SYSTEM_DEFAULT_ACCENT` exist. Wait for the global with
`page.waitForFunction` too, or prod evaluates read `undefined` while dev works.
