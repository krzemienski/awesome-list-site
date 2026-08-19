# Client performance budgets

## Current executable budgets

[`scripts/validation/bundle-budgets.json`](../scripts/validation/bundle-budgets.json)
is authoritative. The current initial-JavaScript limits and latest checked-in
measurement are:

| Initial JavaScript | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| Executable baseline | 930,462 B | 275,991 B | 228,296 B |
| Latest measured result | 600,641 B | 184,665 B | 155,687 B |
| Budget ceiling | 650,000 B | 200,000 B | 168,000 B |

The same JSON file owns incremental major-route limits, the largest asynchronous
chunk limit, and forbidden modules in the initial closure. Do not copy those
values into prose.

## Deterministic report and gate

```sh
npm run build
npm run bundle:report
npm run bundle:budget
```

Vite emits `.vite/manifest.json` plus `bundle-modules.json`. The report follows
logical manifest keys rather than hashed filenames, compresses each JavaScript
file with fixed gzip/brotli settings, and checks module composition. The gate
fails with per-route/per-metric overages and rejects admin, AI recommendation,
PDF/export, html2canvas, or chart modules in the static initial closure.

The pre-publish gate runs `npm run bundle:budget` immediately after the
production build.

## Repeatable mobile profile

Build once, then serve the build through the deterministic gzip/API-proxy
harness:

```sh
PERF_STATIC_DIR=dist/public PERF_STATIC_PORT=5101 \
  PERF_API_BASE_URL=http://127.0.0.1:5000 npm run perf:serve
PERF_BASE_URL=http://127.0.0.1:5101 \
  npm run perf:mobile -- --json /tmp/mobile-performance.json
```

The checked-in script runs three cold contexts at 390×844 @2x, 150 ms latency,
1.6 Mbps download, 750 Kbps upload, and 4× CPU slowdown with cache disabled. It
records DOMContentLoaded, React home readiness, first category readiness,
script transfer/decoded bytes, script evaluation, and total task duration.

For the latest reproducible before/after bundle and mobile measurements, see
[`performance/task326-measurements.json`](performance/task326-measurements.json).
The earlier optimization baseline remains available in
[`performance/task301-measurements.json`](performance/task301-measurements.json)
as historical evidence, not as the current budget.

GA4, Mixpanel, PostHog, and Amplitude initialization is consent-gated and
deferred until the first painted frame. Amplitude's optional plugins are loaded
in stages and torn down on consent revocation.