# Worklog — prod-baseline (capture the production regression baseline)

Task: record what `https://awesome.video` serves today so every later parity
wave can be diffed against a dated production snapshot instead of memory.
Baseline: `tests/parity/production-baseline/2026-09-12/` (its `README.md`
documents layout, protocol and quirks). Evidence:
`docs/parity/evidence/prod-baseline/`.

## What was built

| file | role |
|---|---|
| `scripts/validation/production-baseline-lib.mjs` | shared capture library: route/endpoint inventory, throttle-aware fetch, sandboxed Chromium launch through the shared Playwright lease, per-viewport capture (fresh context, `networkidle` + `fonts.ready` + 2 rAF, consent dismissed via `consent-decline`, lazy-image warm scroll, full-page PNG, DOM extraction, axe), API shape description, Lighthouse over the browser's debug port |
| `scripts/validation/production-baseline-capture.mjs` | `npm run baseline:capture` — resumable per route × viewport, per endpoint and per Lighthouse route; `--max-navigations N` stops early with exit 2 so a short shell budget can run it in slices; `manifest.json` records every invocation |
| `scripts/validation/production-baseline-compare.mjs` | `npm run baseline:compare -- --baseline <dir> --against <url> [--routes …]` — re-captures the candidate (routes + API, no Lighthouse), prints a per-route / per-endpoint table, writes `compare-report.md` + `.json` and side-by-side `strips/<slug>@<w>.png` on a union canvas; exit 1 on tracked deltas |
| `package.json` | `baseline:capture`, `baseline:compare`; `@axe-core/playwright`, `lighthouse` added to `devDependencies` |

Tracked columns (a difference fails the compare): HTTP status, redirect chain,
final URL, visible `data-testid` set per viewport, `<title>`, `h1[]`, axe
serious+critical counts at 375/1440, API status, recursive key paths, item and
total counts. Everything else (cache-control, canonical, robots, JSON-LD types,
nav labels, first/last ids, consent presence, client navigations) is a *note*.

Rejected alternative: pixel-diffing production PNGs against a local candidate.
Production and a dev database never carry the same rows, so every strip would
"fail" on content; the strips are for eyes and the tracked columns carry the
signal. The parity pixel gate keeps its own reference (the design-system
artifact), not production.

## Timings (2026-09-12, UTC)

| run | command | wall clock | navigations | throttle retries | failures |
|---|---|---|---|---|---|
| production capture (06:19–06:25) | `node scripts/validation/production-baseline-capture.mjs --base https://awesome.video` | 390 s | 96 | 0 | 0 |
| compare vs local dev (06:27–06:33) | `… --against http://127.0.0.1:5000 --out /tmp/validation/pb-compare-local-2026-09-12` | ~380 s | 96 | 0 | 0 |
| same-day compare vs production (06:33–06:39) | `… --against https://awesome.video --out /tmp/validation/pb-compare-prod-2026-09-12` | ~360 s | 96 | 0 | 0 |

Each capture navigation on production costs ~4 s (sandboxed Chromium, cold
context, network idle, warm scroll, PNG compression); the dev server is slower
because Vite serves unbundled modules. Lighthouse adds ~50 s for three routes.

## Production quirks recorded

Full list in the baseline `README.md`; the ones that changed the plan:

- `/api/awesome-list/listing?category=…` is a 400 (`validation_failed`);
  the brief's spelling was replaced with `?level=category&slug=…`.
- `/submit` does **not** redirect guests on production (200,
  `alert-login-required` + `link-login` rendered in place); the redirect-chain
  columns are still recorded so a future redirect shows up.
- The edge rewrites `cache-control` to `private` on read-only catalog endpoints
  (origin says `public`), and adds `private` where the origin sends nothing;
  compare treats cache-control as a note for that reason.
- No 429/503 was seen in any of the three sequential runs; the retry path is
  exercised only by unit-level reasoning (backoff on 429/503 with
  `retry-after`, max 6 attempts, never recorded as a status).

## Gates run

| gate | result | evidence |
|---|---|---|
| `node scripts/validation/root-script-drift.mjs` | pass | run after adding the two npm scripts (the gate covers root + `scripts/*`; the new files live in `scripts/validation/`) |
| `npm run lint` on the three new scripts | **pre-existing red for every `.mjs` under `scripts/`** — `typescript-eslint` `projectService` rejects files outside the tsconfig ("was not found by the project service"); `scripts/validation/auth-return-audit.mjs` and every sibling fail the same way | linted instead with `@eslint/js` recommended + node/browser globals: `npx eslint --no-config-lookup -c <js-only config> scripts/validation/production-baseline-*.mjs` → 0 problems |
| `npm run baseline:capture` (full) | 26/26 routes · 12/12 endpoints · 3/3 Lighthouse · 0 failures | `tests/parity/production-baseline/2026-09-12/manifest.json` |
| `npm run baseline:compare` vs `http://127.0.0.1:5000` | exit 1 — 36 tracked deltas, all explained by data volume plus one real schema drift | `docs/parity/evidence/prod-baseline/compare-local-2026-09-12.md` |
| `npm run baseline:compare` vs `https://awesome.video` (same day, ~15 min after capture) | exit 0 — **0 tracked deltas**, all 12 API bodies byte-identical, `/sitemap.xml` and `/robots.txt` byte-identical | `docs/parity/evidence/prod-baseline/compare-prod-2026-09-12.md` |
| lint + root-script-drift transcript | see above | `docs/parity/evidence/prod-baseline/gates-2026-09-12.md` |

### Reading the local compare

- Title on `/` differs only in the resource count (3824 vs 1816); every h1 is
  identical; every status / redirect chain is identical; axe serious+critical
  is identical on all 24 HTML routes (including the one `color-contrast` node
  on `/design-system`, which reproduces locally).
- `data-testid` deltas are id-suffixed cards (`card-resource-<id>`) and sidebar
  taxonomy nodes (`sub-*`, `subsub-*`) that follow the database, not the code.
- API key-path deltas are the real signal: local already serialises
  `resources[].kind` (`/api/resources`, `/api/resources/:id`, listing,
  recommendations) which production does not yet expose — the W1 resource-kind
  wave; `/api/recommendations` on local lacks `metadata.tags` on the sampled
  items (union of keys across ten data-dependent rows).
- `/sitemap.xml` 4487 → 2325 URLs and `/robots.txt` byte-identical.

## Known gaps left on purpose

- Only the anonymous visitor is captured; signed-in and admin surfaces have
  their own wave tasks and would need real sessions (never mocked).
- Lighthouse performance scores are recorded but not compared (they vary run to
  run by design).
- The strips (`strips/*.png`, ~46 MB per compare) stay in `/tmp`; only the
  markdown reports are committed as evidence.
