# Guard mutation probes — fonts-not-ready and frame-level API traffic

Two post-review guards were proven by making them fire on purpose against
the live dev app (`http://127.0.0.1:5000/category/community-events`, 375 px,
Chromium 148 with `--disable-partial-raster`, the same launch the runner
uses). The probe script lives outside the harness fingerprint
(`.cache/parity-task/mutation-guards.mjs`) and imports `settlePage`,
`stableFullPageCapture`, `attachNetworkTracker` and `FontsNotReadyError`
from `tests/parity/readiness.mjs` unchanged.

## 1. Fonts that never load fail the capture

Mutation: `page.route(/fonts\.gstatic\.com/, abort)` before navigation, then
the normal settle.

Result: `settlePage` threw `FontsNotReadyError`:

```
actual fonts not ready (14 face(s) failed to load: Fraunces italic 400,
Fraunces normal 400, Fraunces normal 500, Fraunces normal 600; 14 declared
parity face(s) not loaded after a forced load: Fraunces|italic|400 (unloaded), …);
a fallback-font render is not a capture
```

The 14 faces are every declared family|style|weight of the parity families on
the app page (Fraunces, Inter, JetBrains Mono); the reference page declares 39.
In the runner the side is reopened once in a fresh context and the second
failure becomes `capture failed: … fonts not ready …` (row `FAIL`, never a
pixel comparison of fallback fonts).

Control (same probe without the route): `complete: true`,
`forcedParityFaces: 14` (app) / `39` (reference), `failedFaces: []`,
`unloadedParityFaces: []`.

## 2. API traffic that overlaps a frame discards the frame

Mutation: settle normally, delay `/api/categories*` by 3 s at the route layer,
then schedule `fetch("/api/categories?probe=1")` from the page 800 ms later —
after the 500 ms quiet check that precedes frame 1 passes, i.e. while frame 1
is being rasterised.

Result:

```json
{
  "discardedFrames": [
    { "attempt": 1, "reason": "0 request(s) completed and 1 started during the frame (GET /api/categories)" }
  ],
  "stableAttempts": [2, 3],
  "apiTraffic": { "completedAtCaptureStart": 4, "completedAtCaptureEnd": 5, "failures": 0 }
}
```

Frame 1 was discarded although its pixels were identical to frame 2's; the
quiet check before frame 2 waited for the delayed request to finish (the
`completedAtCaptureEnd` increment), and frames 2 and 3 formed the pair.

Control (request fired *before* the capture started): no discarded frame —
the pre-frame quiet wait absorbed it (`completedAtCaptureStart: 4 →
completedAtCaptureEnd: 5`, pair `[1, 2]`), which is the intended behaviour:
the guard waits for traffic it can see coming and discards only frames it
cannot vouch for.

## 3. Row `apiFailures` come from the live tracker

`captureRow` now reads `currentApiFailures(page)` after both captures and the
identity reads. The one-row visitor diagnostic (`app.category@375`) recorded
`apiFailures: []`, `referenceApiFailures: []` and
`apiTraffic.failures: 0` on both sides; the diagnostic run directory was
deleted afterwards (selected runs never write shared reports).
