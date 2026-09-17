---
name: LCP dated to the bundle by re-inserting prerender
description: Why moving crawler prerender nodes after the JS bundle runs pushes Lighthouse LCP from FCP to bundle time, and the pre-boot fix.
---

Rule: any DOM move/re-insertion of the prerender's largest text block after
the JS bundle executes re-registers it as a NEW LCP candidate. Because the web
font has swapped in by then, the new measurement is a few percent larger than
the fallback-font paint, so Chrome promotes it and Lighthouse's Lantern dates
LCP to the bundle's execution graph (3.3–3.6 s) instead of the document's
first paint (2.1–2.9 s). Observed LCP looked fine (~360 ms), only the
simulated score showed it.

**Why:** the category route sat at 0.78 with FCP fine and LCP = FCP + bundle;
a PerformanceObserver probe showed two LCP entries for the same paragraph,
the second slightly larger and inside the hold overlay.

**How to apply:** do overlay/hold moves in the inline pre-boot script right
after `#root` (before first paint), keep the moved content semantic and
interactive until the app adopts it (a bundle that never runs must still
leave a usable page), and let the app only add attributes/removal. Attribute
changes (aria-hidden, inert) do not create paint candidates; node moves do.
Probe with `new PerformanceObserver(...).observe({type:"largest-contentful-paint",buffered:true})`
and look for >1 entry for the same text.
