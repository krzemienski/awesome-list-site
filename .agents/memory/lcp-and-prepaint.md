---
name: LCP and pre-paint ordering
description: Why the largest-paint candidate lands where it does, and how prerender/bundle ordering changes it.
---

Consolidated index for paint timing in this app.

- Text candidate sizing: [lcp-text-candidate-size.md](lcp-text-candidate-size.md) — Chrome fixes the size at first paint; a font swap never updates it.
- Re-inserted prerender nodes: [lcp-reinserted-prerender.md](lcp-reinserted-prerender.md) — moving them after the bundle re-registers a larger web-font candidate.
- Head module ordering: [paint-before-hydrate.md](paint-before-hydrate.md) — defer via modulepreload plus a body-end double-rAF loader.
- Page atmosphere raster cost: [page-atmosphere-raster-clip.md](page-atmosphere-raster-clip.md).
- Loopback score artifact: [lantern-loopback-artifact.md](lantern-loopback-artifact.md).

**Why:** each of these shifted LCP without any visible change to the page.
**How to apply:** probe with a PerformanceObserver before concluding a regression is real.