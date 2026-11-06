# Tier 0/1 dry run (PLAN.md §5) — 2026-11-06 ~21:00Z

All by hand, read-only. Each check run twice. B=https://awesome.video. Admin GETs used `curl -H @"$HOME/.cache/awesome-audit/owner.hdr"` (never printed). Browser: `agent-browser --session visitor2`, HAR `evidence/visitor/visitor2.har` (1,169 requests; awesome.video: 1,119 GET, 0 other; no status ≥400; `navigator.webdriver` true). The 404 check used curl only: no telemetry POST.

## Results
| ID | Command (runner form) | Value | Verdict | Time (run1/run2) | Notes |
|---|---|---|---|---|---|
| T0-a | `curl -s $B/api/version \| jq -r .revision` vs `git ls-remote origin refs/heads/main \| cut -f1` | both `6cb1a93e9992…` | PASS | 0.23 s / 0.11 s (+0.17 s ls-remote) | Not flaky. Use `ls-remote`, not `rev-parse origin/main` (stale unless fetched). Runner needs git + network + correct remote (origin = awesome-list-site; the `awesome-video` repo is the content list, different SHA). |
| T0-b | `curl -s -o /dev/null -w '%{http_code}' $B/api/health/ready` | 200, `{"status":"ready"}` | PASS | 0.50 s / 0.30 s | Not flaky. |
| T0-c | `curl -s -o /dev/null -w '%{http_code} %{time_total}' $B/` | 200, 0.78 s / 0.21 s | PASS (<5 s) | 0.78 / 0.21 | First hit was 4x slower than second; threshold has wide margin. |
| P1 | browser: open `/`, 9 categories, `/subcategory/codecs`, `/sub-subcategory/online-forums`; count `a[href^="/resource/"]` ≥ 1; `errors` empty | home 17; categories 48 each; sub 48; sub-sub 20; 0 errors | PASS | 38 s | Not flaky. Needs 2.5 s settle per page. Could be ~5 s by curl against SSR HTML (SSR contains links) with the browser only for 1 page. |
| P1-total | sitemap `/resource` count == public total | sitemap 4074 = `/api/categories` sum 4074 = `/api/admin/stats.totalPublic` 4074 | PASS (±0) | 0.8 s | Not flaky. "resource total" is ambiguous: I used categories sum; `totalPublic` equals it. Pick one in the spec. |
| P2 | 3 random sitemap `/resource/:id` via curl as Googlebot: 200, `<h1`, outbound `<a href="https…" rel="…noopener…">` excluding github/krzemienski footer links | 6 of 6 (2 runs × 3) 200, h1=1, outbound link with noopener=1 | PASS | 3 s | Not flaky. SSR HTML has the link, so no browser needed. Must exclude footer/GitHub links in the selector or the check is vacuous. |
| P3a | `curl -s "$B/api/search?q=ffmpeg" \| jq .total` > 0 | 451 | PASS | 0.3 s | Not flaky. Note: values drift as catalog changes; threshold ">0" is fine. |
| P3b | browser: `Meta+k`, fill `ffmpeg`, count `option "ITEM` ≥ 1 | 15 rows | PASS | ~8 s | Not flaky here. Needs the combobox ref re-read after open (ref not stable); in Playwright use the role selector instead. |
| P4 | Googlebot UA on `/`, `/category/media-tools`, `/resource/190924`, `/journey/7`: `<title`, `name="description"`, `rel="canonical"`, og:image URL → 200, each `ld+json` block parses | all 4 pass; JSON-LD blocks 1/2/2/2 parse; og:image 200 | PASS | 4 s | Not flaky. Title is `<title data-react-helmet="true">`: a regex `<title>` fails. Hard-coded ids 190924 and journey 7 can disappear; choose from sitemap/`/api/journeys`. |
| P4-sm | sitemap URL count within ±2 % of last run | 4766 both runs | PASS (no baseline) | 0.7 s | **Ambiguous**: needs a stored previous value; first run has none. Replace with: resource count == `totalPublic` (already P1-total) plus total ≥ 4,000 floor, and compare to last `result.json` only when one exists. |
| P4-rb | `curl -o /dev/null -w '%{http_code}' $B/robots.txt` | 200 | PASS | 0.2 s | Not flaky. Also assert body contains `Sitemap:` (not checked here). |
| P5-404 | `curl -s -o /dev/null -w '%{http_code}' $B/zz-not-a-route` | 404 | PASS | 0.2 s | Not flaky. curl only, no POST. |
| P6a | browser: `/sign-in`, Clerk widget present | `cl-` elements present, 2 inputs, heading "Welcome back" | PASS | ~6 s | Not flaky. Class-name prefix `cl-` is Clerk-internal; prefer asserting an `input` for identifier plus no console errors. |
| P6b | browser: `/profile` redirects | lands on `/sign-in?redirect_url=%2Fprofile` | PASS | ~6 s | Not flaky. Client-side redirect (HTTP is 200 shell), so curl cannot check it. |
| 390 | browser at 390×844: `scrollWidth <= innerWidth` on `/`, category, resource | true ×3 | PASS | ~9 s | Not flaky. Measured scrollWidth 384 vs 390. |
| Con | `agent-browser errors` empty on every page above | 0 on all | PASS | n/a | Not flaky. Note Playwright `console` error events also capture 4xx resource loads; expect to filter the external OG-image 429 seen earlier. |
| P7 | `GET /api/admin/stats` | 200; resources 4315, public 4074, pending 23, rejected 148 | PASS | 0.48 s / 0.48 s | Not flaky. |
| P8 | `GET /api/admin/pending-resources` (approvals readable) | 200, keys `resources,total` | PASS | 0.23 s / 0.23 s | Not flaky. "Approvals" is not a route name: this is the actual one. |
| P9a | `GET /api/admin/operations/health \| jq -r .status` == `ready` | `ready` (`readiness.lastProbe.ready` true, 147 ms) | PASS | 0.33 s / 0.33 s | Not flaky. |
| P9b | newest backup age < 26 h: `GET /api/admin/database-backups \| jq .backups[0].completedAt` | 2026-11-06T02:08:48Z → **18.8 h** | PASS (margin 7 h) | 0.52 s / 0.38 s | Only **1** backup listed. 26 h presumes a daily schedule; the 02:08Z backup is the single point and the threshold passes only until ~04:08Z tomorrow. Confirm a schedule exists; if backups are manual, this check will fail on its own schedule. Also check `jq .backups\|sort_by(.completedAt)\|last` instead of `[0]` (order unverified with n=1). |
| P9c | newest link scan age < 26 h: `GET /api/admin/link-health/status \| jq .job.completedAt` | job 14 completed 2026-11-06T12:06:07Z → **8.9 h**; 4100 checked, 27 broken, 16 suspect | PASS | 0.22 s / 0.27 s | Not flaky. Also require `.job.status=="completed"`. |
| P10 | `GET /api/researcher/jobs \| jq '.jobs[0].status'` not a config failure | latest job 109 `cancelled` (2026-11-06 02:11), prior 108 `budget_stopped`, 107 `completed`; `error` null on all three | **AMBIGUOUS** (PASS only by a lenient reading) | 0.31 s / 0.29 s | "Config failure" is not a field. Status values seen: completed, cancelled, budget_stopped. Replace with: newest job status ∈ {completed, cancelled, budget_stopped} AND `.error` null/empty; flag any other status or a non-null error, and warn if no job in 14 days. Whether the last cancellation was an operator action is unknown from the API. |

## Problems with the proposed checks
1. P4-sm (sitemap ±2 %) needs a stored baseline; first run undefined. Replace as above.
2. P10 undefined: see replacement above.
3. P9b assumes a daily backup cadence that the API does not show (1 backup total).
4. T0-a: `git rev-parse origin/main` is stale without `git fetch`; use `ls-remote`. A deploy lags a merge, so a FAIL right after merge is expected: gate it on "after publish", not the 30-min scheduler, or the scheduler pages whenever main is ahead of prod.
5. Tier 1 as written says "P1 ... ⌘K returns rows" and 390 px/console checks need a browser; the rest are curl. Splitting into curl-only (fast) and browser (slow) halves would let the 6-hourly run stay cheap.
6. Hard-coded ids (resource 190924, journey 7) are fragile: pick from the sitemap and `/api/journeys` at run time.
7. Playwright vs my tool: selectors (cmdk combobox, Radix) and `<title data-react-helmet>` need role/attribute selectors, not text regex.
8. `/api/admin/*` checks depend on the cached owner session (#76) staying valid; a 401 should be reported as "auth expired", not "backup missing".

## Runtime estimates (sequential, measured)
- **Tier 0**: ~1.2 s of curl wait + 0.2 s `ls-remote` → **~2 s**.
- **Tier 1 curl-only** (P1-total, P2, P3a, P4 incl. og:image, sitemap, robots, 404, P7–P10): ~4 s (bots+sitemap) + ~3 s (P2) + ~3 s (admin) → **~10 s**.
- **Tier 1 browser** (P1 render 38 s, P3b ~8 s, P6 ~12 s, 390 px ~9 s): **~70 s** by hand with fixed 2.5 s sleeps; Playwright with proper waits likely 30–40 s, and P1 could drop to ~5 s by checking SSR links by curl.
- **Tier 1 total: ~80 s** as measured (~45 s achievable). Tier 0+1 together under 90 s.
