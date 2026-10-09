# HTTP-PROBE: public endpoints and pages on production

Status: PASS (54/56; both flags pre-existing, not regressions).

Command: `node docs/audit-578/live-smoke/http-probe.mjs https://awesome.video` → docs/audit-578/live-smoke/prod-http.json (15:52 UTC). DEV comparison: docs/audit-578/live-smoke/dev-http.json.

- All pages 200; the unknown route returns 404 + noindex.
- Internal metadata scan: only `tags` (+ `twitterImage` on 2 awesome-list rows, the old prod behavior).
- `/api/journeys/not-a-number` → 400 validation_failed (expected 404). DEV is identical; caused by the contract validator running before the handler. Pre-existing, no 500.
- `/api/search` ignores category/tags by design (q-only); the Search UI filters through /api/resources (browser sweep: "36 results for ffmpeg" with chips).
