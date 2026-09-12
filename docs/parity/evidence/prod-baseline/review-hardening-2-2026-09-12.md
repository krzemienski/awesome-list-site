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
  viewport as `blockedWebSockets`. *(Superseded by the two-layer guard in §6:
  the reviewer's re-check showed page-scoped hooks leave workers and popups
  uncovered.)*
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

## 6. Re-check by the same reviewer → two residuals, closed

The reviewer re-checked the four findings against the committed fix
(`ff2a2d81`): unit binding and budget **PASS**; two residuals remained.

**Finding 3 residual — `normalizeUrl` dropped userinfo.** `URL.origin` has no
credentials, so `https://user:secret@host/x` normalised to the same string as
`https://host/x` and `equivalent()` called them the same. Fix: userinfo is
re-attached in front of the origin (`user:<password>@…`, the password itself
redacted so the report never echoes a secret); a URL carrying credentials can
no longer normalise to one that does not. Mutant A gained a seventh planted
change — `/categories` final URL rewritten to `https://qa:hunter2@awesome.video/categories`:

```
- tracked deltas: **7** (7 routes, 0 endpoints)
| `/categories` | 200 | same | +0 / −0 | same | same | 0/0 | 0/0 | final-url |  |
grep -c hunter2 compare-report.md → 0
```

**Finding 4 residual — page-scoped hooks.** `page.setRequestInterception`,
`context.route`, `evaluateOnNewDocument`/`addInitScript` are all page-scoped:
a dedicated worker (blob URL — never loads over the network) or a popup opened
from Lighthouse's page had neither the method filter nor the WebSocket stub.
The probe origin's page was extended to spawn exactly that — a blob worker
that `POST /worker-mutate`s and opens `ws://…/worker-socket`, plus
`window.open("/popup")` — and, unguarded, all of it reached the origin
(`POST /mutate`, `PUT /put`, `POST /beacon`, `/socket`, `/worker-socket`, and
a popup storm of `GET /popup`).

The read-only property is now enforced by construction in two layers, both
installed for every browser the library launches (`launchBrowser` fails if
the first cannot be installed):

1. **Browser-target `Fetch` interceptor** (`browser.newBrowserCDPSession()` →
   `Fetch.enable` with `urlPattern: "*"`). Chromium pauses every HTTP request
   from every target of the browser there — pages, popups, iframes,
   dedicated/shared/service workers, and the page Lighthouse drives over the
   remote-debugging port — and anything but `GET`/`HEAD`/`OPTIONS` is failed
   with `BlockedByClient`. This layer is independent of page-level routing: a
   probe context whose `context.route` **continued** every request still had
   all 45 of its `POST`/`PUT` attempts (page, popups and blob worker) failed
   by the browser layer, and the origin saw none.
2. **Sealed window realm** (init script in every document — main frame,
   iframes, popups — for Playwright contexts and Lighthouse's puppeteer page).
   WebSocket handshakes are not fetches, so sockets are refused where they are
   created: `WebSocket`, `Worker`, `SharedWorker` and `window.open` are
   replaced with recording constructors/functions that throw or return null,
   `navigator.serviceWorker.register` rejects, and every property is
   non-configurable so a page cannot delete or reassign it to recover the
   native one. A realm this script cannot reach (a worker) therefore cannot
   come into existence; a popup cannot be opened outside a page-scoped
   driver's hooks. Attempts are recorded as `blockedWebSockets`,
   `blockedWorkers`, `blockedPopups`, `blockedServiceWorkers` per viewport and
   per Lighthouse audit; the manifest gains `browserGuard`
   (`continued`/`blocked`/`sample`) per invocation.

Page-level routing is kept only for per-viewport attribution — because it
decides first, `browserGuard.blocked` is normally `0` and the refusals show
up in the per-viewport `blockedRequests` instead.

Full smoke, same nine steps as §4, now against the page with worker + popup:

```
smoke origin on 37699
== 1 /about (503 on every odd navigation) with budget 1: the 503 attempt is charged, retry refused (expect exit 2, nav 1, no unit)
Production baseline capture → ../../../tmp/validation/pb-smoke3
  base http://127.0.0.1:37699 · commit ff2a2d81189ac5cd14c14d14dd5c339b426f1cf3 · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
  status probe /about
  capture /about @375 +axe
  throttled (HTTP 503) loading http://127.0.0.1:37699/about@375; attempt 1/6
Playwright lease released (production-baseline-capture)
Done in 3s · 1 navigations · 1 throttle retries · 0 failures
  routes complete 0/1 · api 0/12 · lighthouse 0/3
  stopped by --max-navigations; re-run the same command to resume
exit 2
   manifest: nav 1 budget 1 stopped true fail 0 throttled 1 guard continued 1 blocked 0
   pngs: none | dom viewports: no dom.json | axe viewports: no axe.json
== 2 budget 2: 503 + retry = one bound unit (expect exit 2, nav 2, @375 attempts=2)
Production baseline capture → ../../../tmp/validation/pb-smoke3
  base http://127.0.0.1:37699 · commit ff2a2d81189ac5cd14c14d14dd5c339b426f1cf3 · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
  capture /about @375 +axe
  capture /about @768
  throttled (HTTP 503) loading http://127.0.0.1:37699/about@768; attempt 1/6
Playwright lease released (production-baseline-capture)
Done in 4s · 2 navigations · 1 throttle retries · 0 failures
  routes complete 0/1 · api 0/12 · lighthouse 0/3
  stopped by --max-navigations; re-run the same command to resume
exit 2
   manifest: nav 2 budget 2 stopped true fail 0 throttled 1 guard continued 2 blocked 0
   pngs: about@375.png | dom viewports: 375 | axe viewports: 375
   @375 attempts=1 unit=2286d3f9 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
== 3 unlimited: remaining three viewports, two loads each (expect exit 0, nav 6)
Production baseline capture → ../../../tmp/validation/pb-smoke3
  base http://127.0.0.1:37699 · commit ff2a2d81189ac5cd14c14d14dd5c339b426f1cf3 · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: routes
  capture /about @768
  capture /about @1024
  throttled (HTTP 503) loading http://127.0.0.1:37699/about@1024; attempt 1/6
  capture /about @1440 +axe
  throttled (HTTP 503) loading http://127.0.0.1:37699/about@1440; attempt 1/6
Playwright lease released (production-baseline-capture)
Done in 8s · 5 navigations · 2 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
exit 0
   manifest: nav 5 budget null stopped false fail 0 throttled 2 guard continued 5 blocked 0
   pngs: about@1024.png,about@1440.png,about@375.png,about@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=1 unit=2286d3f9 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @768 attempts=1 unit=741149b4 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1024 attempts=2 unit=8fbbd013 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1440 attempts=2 unit=59535cf5 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
== 4a foreign PNG under a bound record (sha mismatch) → only @768 recaptured
  throttled (HTTP 503) loading http://127.0.0.1:37699/about@768; attempt 1/6
Production baseline capture → ../../../tmp/validation/pb-smoke3
Playwright lease acquired (production-baseline-capture, slot 1/1)
  capture /about @768
Playwright lease released (production-baseline-capture)
Done in 4s · 2 navigations · 1 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
   manifest: nav 2 budget null stopped false fail 0 throttled 1 guard continued 2 blocked 0
   pngs: about@1024.png,about@1440.png,about@375.png,about@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=1 unit=2286d3f9 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @768 attempts=2 unit=33c082e6 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1024 attempts=2 unit=8fbbd013 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1440 attempts=2 unit=59535cf5 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
== 4b axe record without the unit id → only @1440 recaptured
  throttled (HTTP 503) loading http://127.0.0.1:37699/about@1440; attempt 1/6
Production baseline capture → ../../../tmp/validation/pb-smoke3
Playwright lease acquired (production-baseline-capture, slot 1/1)
  capture /about @1440 +axe
Playwright lease released (production-baseline-capture)
Done in 4s · 2 navigations · 1 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
   manifest: nav 2 budget null stopped false fail 0 throttled 1 guard continued 2 blocked 0
   pngs: about@1024.png,about@1440.png,about@375.png,about@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=1 unit=2286d3f9 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @768 attempts=2 unit=33c082e6 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1024 attempts=2 unit=8fbbd013 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1440 attempts=2 unit=61f95bbd pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
== 4c DOM record from another generation (unit id differs from axe) → only @375 recaptured
  throttled (HTTP 503) loading http://127.0.0.1:37699/about@375; attempt 1/6
Production baseline capture → ../../../tmp/validation/pb-smoke3
Playwright lease acquired (production-baseline-capture, slot 1/1)
  capture /about @375 +axe
Playwright lease released (production-baseline-capture)
Done in 4s · 2 navigations · 1 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
   manifest: nav 2 budget null stopped false fail 0 throttled 1 guard continued 2 blocked 0
   pngs: about@1024.png,about@1440.png,about@375.png,about@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=2 unit=5f82e8ef pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @768 attempts=2 unit=33c082e6 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1024 attempts=2 unit=8fbbd013 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1440 attempts=2 unit=61f95bbd pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
== 4d document body deleted → refetched, no navigation
  status probe /robots.txt
Done in 1s · 0 navigations · 0 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
Done in 1s · 0 navigations · 0 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
body.txt dom.json status.json 
== 5 mutation attempts from the page are refused in the routed contexts
Done in 7s · 4 navigations · 0 throttle retries · 0 failures
  routes complete 1/1 · api 0/12 · lighthouse 0/3
   pngs: home@1024.png,home@1440.png,home@375.png,home@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=1 unit=4393af5d pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @768 attempts=1 unit=f13238de pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1024 attempts=1 unit=a4517684 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
   @1440 attempts=1 unit=aad3f092 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon ws=/socket workers=Worker:blob: popups=/popup
== 6 Lighthouse runs on a read-only page (expect exit 0, nav 3, blocked POST/PUT + ws recorded)
Production baseline capture → ../../../tmp/validation/pb-smoke3
  base http://127.0.0.1:37699 · commit ff2a2d81189ac5cd14c14d14dd5c339b426f1cf3 · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: lighthouse
  lighthouse /
  lighthouse http://127.0.0.1:37699/: refused 6 non-safe request(s)
  lighthouse /category/encoding-codecs
  lighthouse http://127.0.0.1:37699/category/encoding-codecs: refused 6 non-safe request(s)
  lighthouse /resource/185020
  lighthouse http://127.0.0.1:37699/resource/185020: refused 6 non-safe request(s)
Playwright lease released (production-baseline-capture)
Done in 28s · 3 navigations · 0 throttle retries · 0 failures
  routes complete 3/26 · api 0/12 · lighthouse 3/3
exit 0
   manifest: nav 3 budget null stopped false fail 0 throttled 0 guard continued 15 blocked 0
   / scores {"performance":1,"accessibility":1,"best-practices":0.93,"seo":1} requests 5 blocked POST /mutate,PUT /put,POST /beacon,POST /mutate,PUT /put,POST /beacon ws /socket workers 1 popups 1
   /category/encoding-codecs scores {"performance":1,"accessibility":1,"best-practices":0.93,"seo":0.92} requests 5 blocked POST /mutate,PUT /put,POST /beacon,POST /mutate,PUT /put,POST /beacon ws /socket workers 1 popups 1
   /resource/185020 scores {"performance":1,"accessibility":1,"best-practices":0.93,"seo":0.92} requests 5 blocked POST /mutate,PUT /put,POST /beacon,POST /mutate,PUT /put,POST /beacon ws /socket workers 1 popups 1
== 6b Lighthouse --force with budget 1 (expect exit 2, nav 1)
  lighthouse http://127.0.0.1:37699/: refused 6 non-safe request(s)
  base http://127.0.0.1:37699 · commit ff2a2d81189ac5cd14c14d14dd5c339b426f1cf3 · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Phase: lighthouse
  lighthouse /
Done in 7s · 1 navigations · 0 throttle retries · 0 failures
  routes complete 3/26 · api 0/12 · lighthouse 3/3
  stopped by --max-navigations; re-run the same command to resume
exit 2
   manifest: nav 1 budget 1 stopped true fail 0 throttled 0 guard continued 5 blocked 0
== 7 origin log: every non-safe method / upgrade that reached the origin (expect none)
   requests logged: 39
   none reached the origin
   only GET/HEAD/OPTIONS in the origin log
== 8 committed baseline (copy) resumes as complete with zero loads
Production baseline capture → ../../../tmp/validation/pb-committed-copy
  base https://awesome.video · commit ff2a2d81189ac5cd14c14d14dd5c339b426f1cf3 · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
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
Error: --base must be a bare origin without path, query or fragment, got "http://127.0.0.1:37699/foo"
exit 1
Error: --against must be a bare origin without path, query or fragment, got "http://127.0.0.1:37699/foo?x=1"
exit 3
== done
```

Origin log after the run — 39 requests, all `GET`, no upgrade, no
`/worker-mutate`, no `/popup`:

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

Layer-independence probe (`/tmp/validation/pb-guard-probe2.mjs`; no window
guard, so sockets still connect — that is layer 2's job):

```
=== none  (no page-level route)
guard continued=90 blocked=[POST /mutate, PUT /put, POST /beacon × 30]
origin: 8 upgrades /socket · 7 upgrades /worker-socket · 90 GET · 0 mutations
=== route (context.route continues everything)
page-route saw: GET /, POST /mutate, PUT /put, POST /beacon, GET /popup, … (all continued)
guard continued=45 blocked=[POST /mutate, PUT /put, POST /beacon × 15]
origin: 9 upgrades /socket · 7 upgrades /worker-socket · 45 GET · 0 mutations
```

Known limits, stated rather than hidden: the browser layer covers HTTP
requests only (WebSocket upgrades are not `Fetch` events — hence layer 2), and
layer 2 relies on Chromium running `addScriptToEvaluateOnNewDocument` before
any page script in every new document, which is the contract both drivers
build their init scripts on. Nothing in `client/src` constructs a WebSocket, a
Worker or a SharedWorker, so the sealed realm changes nothing about what the
product renders during capture.

Static gates after this pass: `node --check` ×3 ok; JS-only eslint 0
problems; `root-script-drift` PASS; `dead-exports` PASS.


## 7. Fourth review round → two more residuals, closed

The reviewer re-checked §6 and failed both findings again, for reasons the
§6 construction did not cover:

- **Popups without `window.open`.** The Lighthouse page only had the window
  seal through `page.evaluateOnNewDocument`, a *page-scoped* hook. A document
  can create and programmatically click `<a target="_blank" href="about:blank">`
  (or a `javascript:` href); that creates a new target with no `window.open`
  call, the new target gets no init script, and its `WebSocket` stays native.
  The browser-level `Fetch` guard cannot stop a WebSocket handshake, so a
  socket from such a popup would have reached the origin.
- **Password redaction collapsed identities.** `normalizeUrl` mapped every
  non-empty password to the literal `<password>`, so
  `https://user:first@host/p` and `https://user:second@host/p` normalised to
  the same string and compared equal.

### 7.1 Probes that decided the fix

- `--block-new-web-contents` is **not honoured** by Playwright's Chromium
  build (popups were still created) — abandoned.
- Playwright's own auto-attach installs a context's init scripts, `route`
  and `routeWebSocket` in a popup *before* the popup runs script, for every
  popup vector — verified: popups opened by `window.open`, by clicks on
  `target=_blank` anchors to a document, to `about:blank` and to a
  `javascript:` URL all reported the init marker and a sealed `WebSocket`
  (`pb-popup-probe2`, mode `default`: 135 pages, every one `init-ran` /
  `wsSealed: true`). Playwright ignores pages of the default browser context
  (where puppeteer's `newPage()` lands), which is exactly why the previous
  Lighthouse page was outside that contract.
- Leaving Chromium's popup blocker on (`ignoreDefaultArgs:
  ["--disable-popup-blocking"]`) stops page scripts from opening any window
  without user activation: the same probe in mode `blocker-on` created no
  popup from the page's own `window.open("/popup")` or its anchor clicks
  (only the two opened from the probe's `page.evaluate`, which Playwright
  runs with a user gesture, and nothing from the third click because the
  activation was consumed), and the origin logged **0** popup navigations
  and **0** upgrades.

### 7.2 What changed

- **One read-only context factory for every page.** `openReadOnlyContext`
  (`serviceWorkers: "block"`, `context.route` failing non-safe methods,
  `routeWebSocket`, `addInitScript(READ_ONLY_WINDOW_SOURCE)`) now opens every
  screenshot/DOM/axe load *and* the page Lighthouse audits. Its `refusals()`
  reads the window guard from **every attached frame** (a cross-origin iframe's
  refused socket and worker are now attributed, not just enforced) and lists
  any other page of the context still open at read-back as
  `blockedPopups: "contained <url>"`.
- **Lighthouse drives a Playwright page.** `openLighthousePage` creates the
  page in a read-only context with no Playwright viewport emulation
  (Lighthouse applies its own mobile metrics), navigates it to a one-off
  `about:blank#production-baseline-lighthouse-<uuid>` marker, finds the same
  target through the puppeteer browser connected to the remote-debugging port
  (`waitForTarget(url === marker)` → `target.page()`), and hands that handle to
  `lighthouse(url, flags, undefined, puppeteerPage)`. Two CDP clients on one
  target: Lighthouse's navigation runner, the `bf-cache` gatherer and the
  scores all still work; the puppeteer-side request interception and the
  `evaluateOnNewDocument` seal are gone (the context provides both).
- **Popup blocker on** in `launchBrowser`; the seal on `window.open` stays as a
  second layer and for attribution.
- **Compare:** the password in a URL is fingerprinted with
  `HMAC-SHA256(key = crypto.randomBytes(32) per run)` truncated to 16 hex
  (`user:<pw#1a2b…>@`). Same secret → same fingerprint within a run, different
  secret → different fingerprint, never reversible without the key (which is
  never stored), never printed.

### 7.3 Live smoke (third run of `pb-smoke3.sh`, exit 0, 9/9 steps)

The probe origin page now additionally embeds a cross-origin iframe
(`http://localhost:<port>/frame`, which POSTs, opens a socket and spawns a
blob worker that POSTs) and, on `DOMContentLoaded`, programmatically clicks
`target=_blank` anchors to `/popup`, `about:blank` and a `javascript:` URL that
opens a socket, and submits a `target=_blank` POST form.

```
  routes complete 1/1 · api 0/12 · lighthouse 0/3
   pngs: home@1024.png,home@1440.png,home@375.png,home@768.png | dom viewports: 375,768,1024,1440 | axe viewports: 375,1440
   @375 attempts=1 unit=198ff456 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon,POST /frame-mutate ws=/socket,/frame-socket workers=Worker:blob:,Worker:blob: popups=/popup
   @768 attempts=1 unit=a9655af7 pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon,POST /frame-mutate ws=/socket,/frame-socket workers=Worker:blob:,Worker:blob: popups=/popup
   @1024 attempts=1 unit=03fa1b6d pngSha=bound axeUnit=- blocked=POST /mutate,PUT /put,POST /beacon,POST /frame-mutate ws=/socket,/frame-socket workers=Worker:blob:,Worker:blob: popups=/popup
   @1440 attempts=1 unit=a2be8c08 pngSha=bound axeUnit=same blocked=POST /mutate,PUT /put,POST /beacon,POST /frame-mutate ws=/socket,/frame-socket workers=Worker:blob:,Worker:blob: popups=/popup
== 6 Lighthouse audits a page inside a read-only Playwright context (expect exit 0, nav 3, refusals recorded, nothing at the origin)
Production baseline capture → ../../../tmp/validation/pb-smoke3
  base http://127.0.0.1:33429 · commit 5970774affddd951cf0c4d558900f3b8b04453e1 · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Playwright lease acquired (production-baseline-capture, slot 1/1)
Phase: lighthouse
  lighthouse /
  lighthouse http://127.0.0.1:33429/: refused 8 non-safe request(s)
  lighthouse /category/encoding-codecs
  lighthouse http://127.0.0.1:33429/category/encoding-codecs: refused 8 non-safe request(s)
  lighthouse /resource/185020
  lighthouse http://127.0.0.1:33429/resource/185020: refused 8 non-safe request(s)
Playwright lease released (production-baseline-capture)
Done in 29s · 3 navigations · 0 throttle retries · 0 failures
  routes complete 3/26 · api 0/12 · lighthouse 3/3
exit 0
   manifest: nav 3 budget null stopped false fail 0 throttled 0 guard continued 15 blocked 0
   / scores {"performance":1,"accessibility":0.89,"best-practices":0.93,"seo":1} requests 7 blocked POST /mutate,PUT /put,POST /beacon,POST /frame-mutate,POST /mutate,PUT /put,POST /beacon,POST /frame-mutate ws /socket,/frame-socket workers 2 popups 1
   /category/encoding-codecs scores {"performance":1,"accessibility":0.89,"best-practices":0.93,"seo":0.92} requests 7 blocked POST /mutate,PUT /put,POST /beacon,POST /frame-mutate,POST /mutate,PUT /put,POST /beacon,POST /frame-mutate ws /socket,/frame-socket workers 2 popups 1
   /resource/185020 scores {"performance":1,"accessibility":0.89,"best-practices":0.93,"seo":0.92} requests 7 blocked POST /mutate,PUT /put,POST /beacon,POST /frame-mutate,POST /mutate,PUT /put,POST /beacon,POST /frame-mutate ws /socket,/frame-socket workers 2 popups 1
== 6b Lighthouse --force with budget 1 (expect exit 2, nav 1)
  lighthouse http://127.0.0.1:33429/: refused 8 non-safe request(s)
  base http://127.0.0.1:33429 · commit 5970774affddd951cf0c4d558900f3b8b04453e1 · chromium chromium-1223 · lighthouse 12.8.2 · axe 4.13.0
Phase: lighthouse
  lighthouse /
Done in 8s · 1 navigations · 0 throttle retries · 0 failures
  routes complete 3/26 · api 0/12 · lighthouse 3/3
  stopped by --max-navigations; re-run the same command to resume
exit 2
   manifest: nav 1 budget 1 stopped true fail 0 throttled 0 guard continued 5 blocked 0
== 7 origin log: every non-safe method / upgrade that reached the origin (expect none)
   requests logged: 54
   none reached the origin
   only GET/HEAD/OPTIONS in the origin log
```

Origin log tally for the whole run (every request the origin ever saw):

```
     19 GET /frame browser:navigate
     14 GET /about browser:navigate
      8 GET / browser:navigate
      4 GET /robots.txt browser:no-cors
      3 GET /robots.txt browser:cors
      2 GET /resource/185020 browser:navigate
      2 GET /category/encoding-codecs browser:navigate
      1 GET / browser:cors
      1 GET /about browser:cors
```

No `/popup`, `/popup-plain`, `/form-popup`, no `/js-popup-socket` or
`/frame-socket` upgrade, no non-safe method: the iframe's `POST /frame-mutate`
and `ws://…/frame-socket` are refused *and* attributed in every record.

### 7.4 Compare mutation probe

| probe | expected | observed |
| --- | --- | --- |
| mutant A vs mutant B (`/categories` final URL `qa:hunter2@` → `qa:swordfish9@`, nothing else) | 1 delta, no secret in the report | **1** tracked delta (`final-url`), rendered as `` qa:<pw#42be2580e17d29b3>@{origin}/categories → qa:<pw#c95ef21ae2e88e7b>@{origin}/categories ``; `grep -c hunter2` 0, `grep -c swordfish9` 0 |
| mutant A vs byte-identical copy | 0 deltas | **0** |
| committed baseline vs mutant A (7 planted changes) | 7 deltas | **7**, `grep -c hunter2` 0 |

### 7.5 Static gates and known limits

`node --check` ×3 ok; JS-only eslint 0 problems; `root-script-drift` PASS;
`dead-exports` PASS. Limits that remain, stated plainly: a popup blocked by
Chromium's popup blocker leaves no trace in the record (only its absence at
the origin); a refusal inside a frame that is detached before read-back is
enforced but not attributed (the origin-side evidence is the route layer); the
browser layer still sees HTTP only, sockets remain the sealed realm's job —
now in every document of every page and popup of every context.
