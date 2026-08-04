# Task 268 — Prod rate-limit verification (awesome.video)

Date: 2026-08-04 · Tool: `scripts/validation/prod-rate-limit-check.mjs` (re-runnable; `--burst` deliberately trips the limiter)

## Command
```
BURST_N=4000 BURST_PAR=100 node scripts/validation/prod-rate-limit-check.mjs --burst
```

## Recorded output (verbatim)
```
PASS  API serves new-build RateLimit-* headers — status 200, ratelimit-limit=240, policy=240;w=60
PASS  human-paced navigation (12 pages, 3s apart) — all 200
PASS  static asset 200 (baseline) — /assets/index-BJKi30Ry.js → 200
Bursting /api/awesome-list/nav (4000 reqs, 100-way parallel)…
PASS  burst trips app limiter — 1744/4000 responses were 429
note: 1481 bare EDGE 429s (no RateLimit-*) observed: {
  level: 'edge', hasRl: false, hasRa: false,
  snippet: '<!doctype html><meta charset="utf-8">…<title>429</title'
}
PASS  429 JSON variant (fetch client): Retry-After + retryAfter body — retry-after=54, content-type=application/json; charset=utf-8
PASS  429 HTML variant (browser nav): styled rate-limit page — retry-after=53, content-type=text/html; charset=utf-8
PASS  static asset 200 (during hot window) — /assets/index-BJKi30Ry.js → 200

OK: 7/7 checks passed
```

## Done-looks-like mapping
1. **12 human-paced navigations never 429** — PASS (all 200; browser UA; the prod WAF blocks default curl UAs, so the script always sends a Chrome UA).
2. **Tripping /api/awesome-list/nav past 240/min returns negotiated 429s** — PASS. Fetch clients get JSON `{message, error, retryAfter}` with `Retry-After`; browser navigations get the styled HTML page (`data-testid="rate-limit-page"`, meta-refresh). Both carry `RateLimit-*`.
3. **Static /assets/*.js during the hot window** — PASS, 200 both baseline and while 429s were flowing.
4. **Bare-text edge 429 recorded** — observed during the 4000-req burst: minimal `<title>429</title>` HTML with NO `RateLimit-*`/`Retry-After` headers → platform edge (Google Frontend), not app-level, matching the Task #256 triage.

## Operational notes
- Autoscale runs express-rate-limit's in-memory store per instance, so the effective per-IP ceiling is 240 × instance count; a modest burst (≤1500 reqs after scale-out) may produce zero app 429s. Use `BURST_N=4000 BURST_PAR=100` if the default doesn't trip it. Follow-up #279 tracks making the limit hold under scale-out.
- 429 probes must retry until they land on an already-throttled instance; the script retries 30× per variant and skips edge 429s while probing.
