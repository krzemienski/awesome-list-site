---
name: FontFaceSet rebuild on stylesheet insertion + cold system switch
description: Chromium drops warmed-but-unused faces when ANY stylesheet joins the document (Clerk/emotion), not only on resize/capture; a same-tick check after a system switch races the first fetch; how the app keeps every face resident.
---

`document.fonts.check('16px "<display family>"')` can be true right after
boot and flip false ~1 s later on routes where no text shapes the 400 face
(e.g. `/sign-in`, whose only display text is a 700-weight h1). The trigger is
a stylesheet insertion after boot — Clerk's `data-emotion=cl-internal`
`<style>` — which makes Chromium recreate every CSS-connected FontFace; the
rebuild lands at the NEXT frame's style recalc, not at node insertion, so a
`setTimeout(0)` re-warm still runs too early.

**Why:** a blind auditor panel failed stage 9 only on `/sign-in` for
Editorial/Fraunces at both widths, while the resize/capture re-warm already
existed. Probe: patch `document.fonts.load` + a MutationObserver on
`<style>/<link rel=stylesheet>` + a 100 ms `check()` poll, log timestamps.

**How to apply:** the app re-warms on stylesheet insertions on a timer
ladder (0/50/100/200/400/800/1600 ms) AND on FontFaceSet `loadingdone`.
A single rAF-then-timeout re-warm was NOT enough: two of three concurrent
auditors still saw false — rAF is starved/delayed in background or
throttled documents and under multi-browser load. `loadingdone` is the
rebuild's own signal (visible text's faces reload and fire it), independent
of timing. When a font-readiness gate fails on one route only, suspect a
late sheet (auth widget, CSS-in-JS, lazy chunk CSS) before suspecting the
font link; prove with the timestamp probe. The extra `fonts.load()` calls
are cache hits — cheap.

**Cold system switch (second failure mode):** an auditor that calls
`applyDesignSystem(other)` and checks in the very next evaluate sees false
~1/20 times on heavy pages in a fresh context — the switched-to family was
never shaped, so its face fetch starts at switch time and the check races
the network (Google Fonts CSS is resident, the woff2 is not). Fix in the
app: once per document, after `load` + `requestIdleCallback`, warm the 400
face of EVERY family in the canonical Google Fonts `<link>` (parse the href's
`family=` params — single source of truth, no hard-coded list). Verify with
a fresh-context probe: pre-switch `check()` for the other systems' families
must already be true ~1.3 s after navigation, then N×5 immediate
post-switch checks all true.
