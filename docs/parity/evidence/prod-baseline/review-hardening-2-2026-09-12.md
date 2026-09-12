# Production baseline — second hardening round evidence (2026-09-12)

The second architect review (of `e1cab5de`) found four residual defects:

1. **Route × viewport unit not transactional.** "All three files present" was
   the completeness rule, so a crash between the PNG write and the JSON writes
   — or a resumed run — could leave a PNG from one page load beside DOM/axe
   records from another, and the rule could not tell.
2. **Navigation budget could be exceeded.** `--max-navigations` was checked
   once per route/audit; throttle retries inside a viewport and Lighthouse's
   retry attempts were never charged.
3. **URL normalisation dropped fragments** (`/x#a` and `/x#b` compared as
   same) and `parseOriginUrl` accepted a base with a path or query, which then
   leaked into every URL the run built.
4. **Lighthouse ran outside the routed context** (it attaches over the
   remote-debugging port, so `context.route` never saw its traffic — a page
   could POST or beacon during the audit), and WebSockets were not covered by
   the request filter anywhere.

Everything below was run against the fixed scripts from the uncommitted
working tree; every `commit e1cab5de…` in the transcripts names the previous
commit.

## 1. What changed

- **Unit binding.** Every completed route × viewport now carries a fresh
  `unitId` in its DOM record and (at axe widths) the same id in its axe record,
  plus `screenshot.sha256` of the PNG that was written from the same page
  load. The DOM record is written **last** (PNG → axe → DOM), so it doubles as
  the commit marker; before any recapture the stale records are removed and
  persisted and the PNG deleted. `routeIsComplete`, the resume loop and the
  completion summary all use the one rule: DOM `unitId` present, PNG digest
  equals the recorded one, axe `unitId` identical. Documents bind the same
  way: body file first, DOM record (with the body's sha256) last.
- **Budget.** One `createNavigationBudget(max)` object per invocation is
  handed to `captureRoute` and `captureLighthouseSet`; `budget.take()` runs
  **before** every `page.goto` and every Lighthouse attempt, including retries
  after 429/503, and throws when the budget is spent. Exhaustion inside a
  route leaves it incomplete (exit 2, resume with the same command);
  `navigations` in the manifest is the budget's own counter.
- **URLs.** `normalizeUrl` keeps the fragment; `parseOriginUrl` rejects
  anything but a bare origin (path `/`, no query, no hash) and returns
  `url.origin`.
- **Lighthouse on a read-only page.** Lighthouse is now given a page
  (`lighthouse(url, flags, undefined, page)`) opened through Lighthouse's own
  `puppeteer-core` (resolved via `createRequire` from the Lighthouse package —
  no new dependency) with request interception that aborts every non
  `GET`/`HEAD`/`OPTIONS` request and the same WebSocket stub as the capture
  contexts. `scores.json` entries gain `requestCount`, `blockedRequests` and
  `blockedWebSockets`.
- **WebSockets.** Capture contexts call `context.routeWebSocket("**", …)`
  (never connects) and install an init script that replaces `window.WebSocket`
  with a constructor that records the URL and throws; the union is stored per
  viewport as `blockedWebSockets`. Residual: dedicated workers get neither
  hook (they have no `window`); `client/src` opens no WebSockets.
- **Compare.** A document body file missing on either side is reported as
  `missing: … body` (exit 3) instead of falling back to the recorded digest.

## 2. Committed baseline backfilled

The committed `tests/parity/production-baseline/2026-09-12` predates the unit
fields. Because its manifest shows exactly one uninterrupted invocation
(routes + api + lighthouse, 96 navigations, 0 failures, 0 throttle events),
every PNG on disk is the one written beside its record, so the binding was
backfilled rather than recaptured: a fresh `unitId` per route × viewport
written into `dom.json` and (at 375/1440) `axe.json`, and `screenshot.sha256`
computed from the PNG on disk (`screenshot.bytes` re-verified against the
file size first). The two documents' body files were checked against the
digest already recorded in their DOM records.

```
backfilled 96 units across 24 routes; 2 documents verified
```

A copy of the backfilled directory then resumed under the new rule without a
single page load (smoke step 8 below): `routes complete 26/26 · api 12/12 ·
lighthouse 3/3 · 0 navigations`.

## 3. Compare mutation probe (offline, `--candidate`)

Two mutants of the same-day production candidate
(`/tmp/validation/pb-compare-prod-2026-09-12/candidate`):

| mutant | planted change | verdict |
|---|---|---|
| A | the five changes from the first round (robots directive, sitemap `<loc>`, axe node growth, foreign `finalUrl`, foreign redirect hop) | 5 deltas, as before |
| A | **new:** `/submit` final URL gains `#signin` (fragment only) | `final-url` delta (was "same") |
| B | `routes/robots-txt/body.txt` deleted | `missing: candidate body`, exit 3 |

```
== mutant A (expect 6 deltas, exit 1)
exit 1
- tracked deltas: **6** (6 routes, 0 endpoints)
| `/category/encoding-codecs` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | final-url |  |
| `/about` | 200 | ∅ → 301→https://evil.example/about | +0 / −0 | same | same | 0/0 | 0/0 | redirects |  |
| `/submit` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | final-url |  |
| `/design-system` | 200 | same | +0 / −0 | same | same | 1/1 → 1/2 | 1/1 | axe@375 |  |
| `/sitemap.xml` | 200 | same | n/a | n/a | n/a | n/a | n/a | body | body differs beyond its own origin |
| `/robots.txt` | 200 | same | n/a | n/a | n/a | n/a | n/a | body | body differs beyond its own origin |
== mutant B (expect missing candidate body, exit 3)
exit 3
- tracked deltas: **0** (0 routes, 0 endpoints) · 1 entries missing on one side
| `/robots.txt` | missing: candidate body | | | | | | | missing | |
== control prod (expect 0, exit 0)
exit 0
- tracked deltas: **0** (0 routes, 0 endpoints)
== control local (expect 37, exit 1)
exit 1
- tracked deltas: **37** (25 routes, 7 endpoints)
```

## 4. Live smoke against a local read-only probe origin

Production cannot be made to throttle or to attempt writes on demand, so this
round used a throwaway origin (`/tmp/validation/pb-smoke3-server.mjs`) that
serves every path as a small page whose scripts try `fetch POST /mutate`,
`fetch PUT /put`, `navigator.sendBeacon("/beacon")` and
`new WebSocket("/socket")`, answers **503 on every odd browser navigation to
`/about`**, and appends every request and every WebSocket upgrade it receives
to a log. `/about` is used because the capture only accepts inventoried
routes.

Exercised: budget charged per attempt (a 503 attempt spends the budget and the
retry is refused), unit binding under three tamperings (foreign PNG under a
bound record, axe record without its unit id, DOM record whose unit id differs
from the axe record — each recaptures exactly that viewport), document body
refetch without navigation, refusal of mutation attempts in the capture
contexts and in Lighthouse's page, Lighthouse budget, the committed baseline
resuming with zero loads, and rejection of path-bearing `--base`/`--against`.

```
smoke origin on 33911
== 1 /about (503 on every odd navigation) with budget 1: the 503 attempt is charged, retry refused (expect exit 2, nav 1, no unit)
Production baseline capture → ../../../tmp/validation/pb-smoke3
  base http://127.0.0.1:33911 · commit e1cab5deac7811283209be4612a8d277af11c3da · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
  status probe /about
  capture /about @375 +axe
  throttled (HTTP 503) loading http://127.0.0.1:33911/about@375; attempt 1/6
Playwright lease released (production-baseline-capture)
Done in 3s · 1 navigations · 1 throttle retries · 0 failures
  routes complete 0/1 · api 0/12 · lighthouse 0/3
  stopped by --max-navigations; re-run the same command to resume
exit 2
   manifest: nav 1 budget 1 stopped true fail 0 throttled 1
   pngs: none | dom viewports: no dom.json | axe viewports: no axe.json
== 2 budget 2: 503 + retry = one bound unit (expect exit 2, nav 2, @375 attempts=2)
Production baseline capture → ../../../tmp/validation/pb-smoke3
  base http://127.0.0.1:33911 · commit e1cab5deac7811283209be4612a8d277af11c3da · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
  capture /about @375 +axe
  capture /about @768
  throttled (HTTP 503) loading http://127.0.0.1:33911/about@768; attempt 1/6
Playwright lease released (production-baseline-capture)
Done in 4s · 2 navigations · 1 throttle retries · 0 failures
  routes complete 0/1 · api 0/12 · lighthouse 0/3
  stopped by --max-navigations; re-run the same command to resume
exit 2
   manifest: nav 2 budget 2 stopped true fail 0 throttled 1
   pngs: about@375.png | dom viewports: 375 | axe viewports: 375
   @375 attempts=1 unit=2a6e2b5f pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
== 3 unlimited: remaining three viewports, two loads each (expect exit 0, nav 6)
Production baseline capture → ../../../tmp/validation/pb-smoke3
  base http://127.0.0.1:33911 · commit e1cab5deac7811283209be4612a8d277af11c3da · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
  capture /about @768
  capture /about @1024
  throttled (HTTP 503) loading http://127.0.0.1:33911/about@1024; attempt 1/6
  capture /about @1440 +axe
  throttled (HTTP 503) loading http://127.0.0.1:33911/about@1440; attempt 1/6
Playwright lease released (production-baseline-capture)
Done in 8s · 5 navigations · 2 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
exit 0
   manifest: nav 5 budget null stopped false fail 0 throttled 2
   pngs: about@1024.png,about@1440.png,about@375.png,about@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=1 unit=2a6e2b5f pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @768 attempts=1 unit=02577572 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1024 attempts=2 unit=552dc4db pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1440 attempts=2 unit=4b492704 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
== 4a foreign PNG under a bound record (sha mismatch) → only @768 recaptured
  throttled (HTTP 503) loading http://127.0.0.1:33911/about@768; attempt 1/6
Production baseline capture → ../../../tmp/validation/pb-smoke3
Playwright lease acquired (production-baseline-capture, slot 1/1)
  capture /about @768
Playwright lease released (production-baseline-capture)
Done in 4s · 2 navigations · 1 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
   manifest: nav 2 budget null stopped false fail 0 throttled 1
   pngs: about@1024.png,about@1440.png,about@375.png,about@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=1 unit=2a6e2b5f pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @768 attempts=2 unit=9fc7a5f0 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1024 attempts=2 unit=552dc4db pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1440 attempts=2 unit=4b492704 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
== 4b axe record without the unit id → only @1440 recaptured
  throttled (HTTP 503) loading http://127.0.0.1:33911/about@1440; attempt 1/6
Production baseline capture → ../../../tmp/validation/pb-smoke3
Playwright lease acquired (production-baseline-capture, slot 1/1)
  capture /about @1440 +axe
Playwright lease released (production-baseline-capture)
Done in 4s · 2 navigations · 1 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
   manifest: nav 2 budget null stopped false fail 0 throttled 1
   pngs: about@1024.png,about@1440.png,about@375.png,about@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=1 unit=2a6e2b5f pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @768 attempts=2 unit=9fc7a5f0 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1024 attempts=2 unit=552dc4db pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1440 attempts=2 unit=bcf95343 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
== 4c DOM record from another generation (unit id differs from axe) → only @375 recaptured
  throttled (HTTP 503) loading http://127.0.0.1:33911/about@375; attempt 1/6
Production baseline capture → ../../../tmp/validation/pb-smoke3
Playwright lease acquired (production-baseline-capture, slot 1/1)
  capture /about @375 +axe
Playwright lease released (production-baseline-capture)
Done in 4s · 2 navigations · 1 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
   manifest: nav 2 budget null stopped false fail 0 throttled 1
   pngs: about@1024.png,about@1440.png,about@375.png,about@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=2 unit=225271a2 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @768 attempts=2 unit=9fc7a5f0 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1024 attempts=2 unit=552dc4db pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1440 attempts=2 unit=bcf95343 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
== 4d document body deleted → refetched, no navigation
  status probe /robots.txt
Done in 1s · 0 navigations · 0 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
Done in 1s · 0 navigations · 0 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
body.txt dom.json status.json 
== 5 mutation attempts from the page are refused in the routed contexts
Done in 5s · 4 navigations · 0 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
   pngs: home@1024.png,home@1440.png,home@375.png,home@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=1 unit=3df0758d pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @768 attempts=1 unit=17a15351 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1024 attempts=1 unit=2d15274f pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
   @1440 attempts=1 unit=12816a5c pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket
== 6 Lighthouse runs on a read-only page (expect exit 0, nav 3, blocked POST/PUT + ws recorded)
Production baseline capture → ../../../tmp/validation/pb-smoke3
  base http://127.0.0.1:33911 · commit e1cab5deac7811283209be4612a8d277af11c3da · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: lighthouse
  lighthouse /
  lighthouse http://127.0.0.1:33911/: refused 6 non-safe request(s)
  lighthouse /category/encoding-codecs
  lighthouse http://127.0.0.1:33911/category/encoding-codecs: refused 6 non-safe request(s)
  lighthouse /resource/185020
  lighthouse http://127.0.0.1:33911/resource/185020: refused 6 non-safe request(s)
Playwright lease released (production-baseline-capture)
Done in 19s · 3 navigations · 0 throttle retries · 0 failures
  routes complete 3/26 · api 0/12 · lighthouse 3/3
exit 0
   manifest: nav 3 budget null stopped false fail 0 throttled 0
   / scores {"performance":1,"accessibility":1,"best-practices":0.93,"seo":1} requests 5 blocked POST /mutate,PUT /put,POST /beacon,POST /mutate,PUT /put,POST /beacon ws /socket
   /category/encoding-codecs scores {"performance":1,"accessibility":1,"best-practices":0.93,"seo":0.92} requests 5 blocked POST /mutate,PUT /put,POST /beacon,POST /mutate,PUT /put,POST /beacon ws /socket
   /resource/185020 scores {"performance":1,"accessibility":1,"best-practices":0.93,"seo":0.92} requests 5 blocked POST /mutate,PUT /put,POST /beacon,POST /mutate,PUT /put,POST /beacon ws /socket
== 6b Lighthouse --force with budget 1 (expect exit 2, nav 1)
  lighthouse http://127.0.0.1:33911/: refused 6 non-safe request(s)
  base http://127.0.0.1:33911 · commit e1cab5deac7811283209be4612a8d277af11c3da · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Phase: lighthouse
  lighthouse /
Done in 7s · 1 navigations · 0 throttle retries · 0 failures
  routes complete 3/26 · api 0/12 · lighthouse 3/3
  stopped by --max-navigations; re-run the same command to resume
exit 2
   manifest: nav 1 budget 1 stopped true fail 0 throttled 0
== 7 origin log: every non-safe method / upgrade that reached the origin (expect none)
   requests logged: 39
   none reached the origin
   only GET/HEAD/OPTIONS in the origin log
== 8 committed baseline (copy) resumes as complete with zero loads
Production baseline capture → ../../../tmp/validation/pb-committed-copy
  base https://awesome.video · commit e1cab5deac7811283209be4612a8d277af11c3da · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Phase: api
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
Phase: lighthouse
Playwright lease released (production-baseline-capture)
Done in 1s · 0 navigations · 0 throttle retries · 0 failures
  routes complete 26/26 · api 12/12 · lighthouse 3/3
exit 0
   manifest: nav 0 fail 0 routes 0 routes with loads
== 9 base with a path is rejected
Error: --base must be a bare origin without path, query or fragment, got "http://127.0.0.1:33911/foo"
exit 1
Error: --against must be a bare origin without path, query or fragment, got "http://127.0.0.1:33911/foo?x=1"
exit 3
== done
```

The origin log after the whole run — 39 requests, no method other than `GET`,
no upgrade:

```
     14 GET /about browser:navigate
      8 GET /favicon.ico browser:no-cors
      6 GET / browser:navigate
      4 GET /robots.txt browser:no-cors
      3 GET /robots.txt browser:cors
      1 GET /resource/185020 browser:navigate
      1 GET /category/encoding-codecs browser:navigate
      1 GET / browser:cors
      1 GET /about browser:cors
```

Two things worth knowing when reading these numbers:

- **Lighthouse lists every refused request twice.** Its `bf-cache` gatherer
  navigates the audited page to `chrome://terms` and back through the history
  entry; the restore re-executes the page from cache (one document `GET` at
  the origin, two script executions), so three mutation attempts appear as
  "refused 6". The `network-requests` audit in the same report shows
  `/mutate`, `/put` and `/beacon` with status `-1` (never sent).
- **Request interception alone does not stop WebSockets.** A control probe
  (`/tmp/validation/pb-lhprobe.mjs`) that drove Lighthouse through a
  puppeteer page with interception but *without* the init-script stub logged
  `!!! UPGRADE REACHED ORIGIN: /socket` twice at the origin; with the stub
  (the shipped path) the origin log above contains no upgrade at all.

A live `compare --against` the same origin (`/about,/robots.txt`) also ran
through the new code path: unlimited default budget, one 503 retry, 0 blocked
requests reaching the origin, 30 tracked deltas (expected — the probe page is
nothing like production).

## 5. Static gates

```
node --check ×3                                            ok
npx eslint (JS-only config) production-baseline-*.mjs      0 problems
node scripts/validation/root-script-drift.mjs              PASS (27 files, 0 stray)
node scripts/validation/dead-exports.mjs                   PASS (gate scope is client/src + shared; in the lib the new
                                                           createNavigationBudget export is imported by the capture
                                                           script and NavigationBudgetExhausted stays module-private)
```
