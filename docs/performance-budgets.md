# Client performance budgets

## Recorded baseline

Baseline commit: `62e36d7880bf617539a4b2b7926b395c77ff07a4`.

| Initial JavaScript | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| Baseline | 1,257,018 B | 372,294 B | 302,232 B |
| Task 301 measured result | 839,837 B | 253,230 B | 209,906 B |
| Reduction | 33.2% | 32.0% | 30.5% |

`scripts/validation/bundle-budgets.json` allows limited build variance above
the measured result while preserving at least a 30% compressed reduction:
260,000 B gzip and 211,500 B brotli. Major-route budgets are incremental
static-import closures (shared initial chunks excluded) with approximately
5–7% headroom. The largest individual dynamic entry also has a ceiling.

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

The original pre-change trace (`/tmp/task301-baseline/mobile-trace.json`) used
the same throttle and recorded:

- DOMContentLoaded: 2,704 ms
- Home content ready: 3,314 ms
- First category ready: 3,715 ms
- Script evaluation: 740 ms
- Task duration: 1,391 ms
- Script transfer: 363,851 B
- Decoded script: 1,257,018 B

For an exact post-implementation comparison, the baseline production artifact
and current production artifact were each served through `perf:serve`, then
rerun through the current `perf:mobile` collector against the same API server.
To reproduce the baseline, point `PERF_STATIC_DIR` at its saved `public`
directory. The complete three-run results and bundle summary are checked in at
[`performance/task301-measurements.json`](performance/task301-measurements.json).

| Cold home metric | Before | After | Improvement |
| --- | ---: | ---: | ---: |
| DOMContentLoaded | 2,691 ms | 1,975 ms | 26.6% |
| Home content ready | 3,460 ms | 2,689 ms | 22.3% |
| Script evaluation | 664 ms | 520 ms | 21.7% |
| Main-thread task duration | 1,167 ms | 994 ms | 14.8% |
| Script transfer | 372,557 B | 260,698 B | 30.0% |
| Decoded script | 1,257,018 B | 855,672 B | 31.9% |

The report records deferred work separately rather than hiding it inside the
home metric. Median first-category readiness improved from 7,504 ms to 6,537
ms; click-to-category readiness improved from 4,044 ms to 3,884 ms; cumulative
script evaluation through that route improved from 1,566 ms to 965 ms.

Amplitude Analytics still starts in the pre-React bootstrap. Session Replay,
Experiment, and Engagement retain the previous initialization order; the later
two SDKs are now fetched at their feature boundary instead of blocking the
entry. GA4, Mixpanel, and PostHog remain governed by the existing consent path.