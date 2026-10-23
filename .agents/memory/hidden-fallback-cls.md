---
name: CLS hidden under the prerender hold
description: Why resource deep links scored ~0.4 CLS though nothing visibly moved, and the boot pattern that fixed it.
---
CLS ignores occlusion: layout under the fixed prerender hold overlay still counts. A route Suspense fallback swapped for the real page (scrollbar appears, content recentres, footer jumps) scored ~0.33 on prod while the user saw a static prerender.

**Fix pattern:** the server embeds the page's query data as a JSON boot script, the client seeds the query cache before the hold, and main.tsx awaits the route chunk before the first createRoot render, so the first commit is the finished page. Inject modulepreload hints for that chunk graph (from the Vite manifest) so the await costs no extra round trip.

**Also:** an absolutely positioned `::before` inside the sticky consent banner was reported as jumping from stale rects on every reflow (up to 0.1). Paint decorative washes as background layers, not pseudo-elements.

**How to apply:** when measuring CLS, read layout-shift sources with a buffered PerformanceObserver (getEntriesByType('layout-shift') always returns []). Measure a local `npm run build` + `NODE_ENV=production PORT=5055 node dist/index.js`; dev timings are dominated by Vite module fan-out.

**First-visit LCP:** the consent banner copy (42688 px² at 1920 wide) outranks the prerender, so first-visit LCP equals JS boot time, not FCP.
