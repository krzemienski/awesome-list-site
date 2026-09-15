---
name: LCP text candidate size is fixed at first paint
description: Why a prerendered paragraph loses the LCP race to a client re-render of the same text, and how to make the shell paint win legitimately.
---

Chrome records a text block's LCP size when the block first paints and never updates it — a later reflow (web-font swap, width change) does not change the recorded size, and a later candidate only replaces it when strictly larger.

**Why:** the crawler prerender painted the taxonomy intro at 1rem/1.5 (six Inter lines, ~56.9k px²), the client re-rendered the identical sentence at 16px/1.6 (~57.3k px²) ~4s later behind ~40 route chunks, so Lighthouse's LCP was the re-render (category score 62). Bumping the shell paragraph to a lead scale that is larger in BOTH the fallback font and Inter (1.1rem/1.6 → ~67k px²) made the first paint the LCP (76).

**How to apply:** when Lighthouse names a client-rendered text block as the LCP element on a route that already prerenders the same text, compare the two blocks' painted text-union sizes with a `largest-contentful-paint` PerformanceObserver (also delay the entry script via `page.route` to see the pre-swap size); don't reason from CSS alone — a 1% margin flips between runs. Merging the route's small chunks via `experimentalMinChunkSize` merges dynamic route entries and breaks bundle-budget manifest keys; prefer explicit `manualChunks`.

Loopback Lighthouse artefact seen alongside: on 127.0.0.1 all `VeryHigh` fonts finish before the observed FCP, so Lantern puts them in the pessimistic FCP graph (Home −5 vs same-day prod); nothing in app code fixes that honestly.
