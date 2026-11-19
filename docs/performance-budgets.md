# Client performance budgets

## Current budgets

The current initial-JavaScript limits and latest checked-in measurement are:

| Initial JavaScript | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| Earlier baseline | 930,462 B | 275,991 B | 228,296 B |
| Latest measured result | 600,641 B | 184,665 B | 155,687 B |
| Budget ceiling | 650,000 B | 200,000 B | 168,000 B |

Keep admin, AI recommendation, PDF/export, html2canvas, and chart modules out of
the static initial closure. No bundle-budget script or pre-publish gate exists
in the repository; check these limits by hand against the production build
output when a change touches the initial bundle.

## Measuring a build

```sh
npm run build
```

Vite emits `.vite/manifest.json`; follow its logical entry keys (not hashed
filenames) to find the initial JavaScript files and compare their raw, gzip,
and brotli sizes with the ceilings above.

## Mobile profile

Profile by hand in a browser at 390×844 @2x, 150 ms latency, 1.6 Mbps download,
750 Kbps upload, and 4× CPU slowdown with cache disabled. Record
DOMContentLoaded, React home readiness, first category readiness, script
transfer/decoded bytes, script evaluation, and total task duration.

For the latest recorded before/after bundle and mobile measurements, see
[`performance/task326-measurements.json`](performance/task326-measurements.json).
The earlier optimization baseline remains available in
[`performance/task301-measurements.json`](performance/task301-measurements.json)
as historical evidence, not as the current budget.

GA4, Mixpanel, PostHog, and Amplitude initialization is consent-gated and
deferred until the first painted frame. Amplitude's optional plugins are loaded
in stages and torn down on consent revocation.
## Entry evaluation order (paint before hydrate)

The production build keeps the entry chunk as a `<link rel="modulepreload">`
in `<head>` and starts its evaluation from a body-end `<script type="module">`
after two `requestAnimationFrame` callbacks (1 s fallback; hidden documents
start immediately). This is the `paint-before-hydrate` plugin in
`vite.config.ts`. A deferred module script in `<head>` would otherwise evaluate
the entry — and fetch the route chunks — before the already-complete SSR or
prerendered markup is presented when the whole document arrives in one chunk.
The request, its priority and start time, the chunk graph and the manifest
entry are unchanged, and `server/ssr.ts` still injects the Home bootstrap
ahead of the only `<script type="module"` in the template. The dev server
serves `client/index.html` untouched. Measured on the compiled Home document:
pre-first-paint raster 37–57 ms and hydration 250–1050 ms after navigation,
with Lighthouse mobile medians 83 / 75 / 83 for `/`, the category and the
resource route (see `docs/parity/DS-AUDIT.md`).
