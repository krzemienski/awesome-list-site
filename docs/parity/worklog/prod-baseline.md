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
| `scripts/validation/production-baseline-capture.mjs` | `npm run baseline:capture` — resumable per route × viewport (PNG + DOM + axe as one unit), per endpoint and per Lighthouse route, every file via temp + rename; `--max-navigations N` (screenshots and Lighthouse audits alike) stops early with exit 2 so a short shell budget can run it in slices, exit 1 wins when anything failed; a dated dir refuses a different `--base`; `manifest.json` records every invocation |
| `scripts/validation/production-baseline-compare.mjs` | `npm run baseline:compare -- --baseline <dir> --against <url> [--routes …]` — re-captures the candidate (routes + API, no Lighthouse), prints a per-route / per-endpoint table, writes `compare-report.md` + `.json` and side-by-side `strips/<slug>@<w>.png` on a union canvas; exit 1 on tracked deltas |
| `package.json` | `baseline:capture`, `baseline:compare`; `@axe-core/playwright`, `lighthouse` added to `devDependencies` |

Tracked columns (a difference fails the compare): HTTP status, redirect chain,
final URL, visible `data-testid` set per viewport, `<title>`, `h1[]`, axe
serious+critical rule set **and node counts** at 375/1440, document counts and
**body** (sitemap/robots), API status, recursive key paths, item and total
counts. URLs and document bodies are equal when byte-identical or when they
differ only by each side's own origin (`{origin}`); a redirect, final URL or
sitemap entry that newly points at a foreign host is a delta. Everything else
(cache-control, canonical, robots meta, JSON-LD types, nav labels, first/last
ids, consent presence, client navigations) is a *note*.

The browser context is read-only by construction: every non-`GET`/`HEAD`/
`OPTIONS` request is aborted and recorded under `blockedRequests` in `dom.json`.
`--base`/`--against` reject URLs carrying userinfo because they are written
verbatim into manifests and reports.

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

## Post-review hardening (same day)

The architect review flagged five defects; all are fixed and re-verified
(`docs/parity/evidence/prod-baseline/review-hardening-2026-09-12.md`):

1. **Resume unit** — a viewport whose PNG existed but whose DOM/axe record was
   missing used to keep the old PNG and record a *new* page load beside it. Now
   any missing constituent recaptures the whole viewport, PNG and JSON writes
   are atomic, and the completeness summary uses the same rule.
2. **Budget** — `--max-navigations` now also counts Lighthouse audits, and exit
   1 (failures) takes precedence over exit 2 (budget), because exit 2 promises
   that a plain re-run will finish.
3. **Origin mixing** — resuming a dated directory with a different `--base`
   is an error instead of a silent interleave.
4. **False "same" verdicts** — document bodies (equal URL counts with
   different URLs, changed robots directives) and axe node growth on an
   existing rule are tracked deltas; URL comparison keeps foreign origins.
   Proven by mutating a copy of the same-day candidate: five planted changes →
   five deltas; the unmodified candidate still compares at 0.
5. **Byte-faithful API bodies** — the capture appended a newline to every API
   body so the file's sha256 never matched the one recorded in `shapes.json`.
   The 12 committed bodies were rewritten without it (all 12 now hash to their
   recorded digests); the writer stores the body unchanged.

Also added: non-GET requests are aborted in the capture context (zero were
observed on the four routes re-captured to verify it), and `--base`/`--against`
reject credentials in the URL.

## Gates run

| gate | result | evidence |
|---|---|---|
| `node scripts/validation/root-script-drift.mjs` | pass | run after adding the two npm scripts (the gate covers root + `scripts/*`; the new files live in `scripts/validation/`) |
| `npm run lint` on the three new scripts | **pre-existing red for every `.mjs` under `scripts/`** — `typescript-eslint` `projectService` rejects files outside the tsconfig ("was not found by the project service"); `scripts/validation/auth-return-audit.mjs` and every sibling fail the same way | linted instead with `@eslint/js` recommended + node/browser globals: `npx eslint --no-config-lookup -c <js-only config> scripts/validation/production-baseline-*.mjs` → 0 problems |
| `npm run baseline:capture` (full) | 26/26 routes · 12/12 endpoints · 3/3 Lighthouse · 0 failures | `tests/parity/production-baseline/2026-09-12/manifest.json` |
| `npm run baseline:compare` vs `http://127.0.0.1:5000` | exit 1 — 36 tracked deltas (37 after the hardening added the sitemap body), all explained by data volume plus one real schema drift | `docs/parity/evidence/prod-baseline/compare-local-2026-09-12.md` |
| `npm run baseline:compare` vs `https://awesome.video` (same day, ~15 min after capture) | exit 0 — **0 tracked deltas**, all 12 API bodies byte-identical, `/sitemap.xml` and `/robots.txt` byte-identical | `docs/parity/evidence/prod-baseline/compare-prod-2026-09-12.md` |
| lint + root-script-drift transcript | see above | `docs/parity/evidence/prod-baseline/gates-2026-09-12.md` |
| hardened compare re-run on the stored candidates (offline) | prod 0 deltas · local 37 deltas | `docs/parity/evidence/prod-baseline/compare-{prod,local}-2026-09-12-recheck.md` |
| hardening smoke + mutation probe | 5/5 planted changes caught · live resume/budget/blocking checks pass · 0 deltas on re-captured routes | `docs/parity/evidence/prod-baseline/review-hardening-2026-09-12.md` |

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
- `/sitemap.xml` 4487 → 2325 URLs (its body is a tracked delta since the
  hardening) and `/robots.txt` byte-identical.

## Known gaps left on purpose

- Only the anonymous visitor is captured; signed-in and admin surfaces have
  their own wave tasks and would need real sessions (never mocked).
- Lighthouse performance scores are recorded but not compared (they vary run to
  run by design).
- The strips (`strips/*.png`, ~46 MB per compare) stay in `/tmp`; only the
  markdown reports are committed as evidence.
