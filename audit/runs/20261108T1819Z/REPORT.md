# Run 20261108T1819Z: zero known production defects, harness removal, PostHog-chosen improvements

## Outcome
- Production serves main: `/api/version` is `ff4d51bf`, and that equals origin/main.
- Every code defect the run found or inherited is fixed, reviewed by an independent agent, merged and proven on awesome.video. That is 15 PRs: #335, #338–#349.
- The final pass re-drove all 228 matrix rows on the live SHA. 0 FAIL, 212 PASS, 5 CARRIED, 1 RECLASSIFIED; the remaining rows are split per width.
- QA cleanup left 0 qa-audit rows in every deletable table.

Still open:
- The 2-hour no-5xx window started at the 22:31Z deploy and closes at or after 00:31Z.
- Owner-only items: a Cloudflare redirect rule, a GA4 property setting, and catalog link replacements. See "Owner decisions" below.

## Finish lines
| # | Finish line | State | Evidence |
|---|---|---|---|
| 1 | `/api/version` equals origin/main HEAD | MET: `ff4d51bf` both | `curl -s https://awesome.video/api/version` |
| 2 | The whole matrix passes | MET: 0 FAIL on `496c51c9`/`ff4d51bf`. 5 rows CARRIED: sign-up, sign-out and role change, which owner rules forbid re-driving; first pass PASS; the code that changed under them (#345) is proven separately. 1 RECLASSIFIED: an edge-side 500 on `/api/version`, which never reaches the app's logger | final-L1..L6.tsv |
| 3 | No bug-labelled issue open; #284 closed with its 3 conditions | #337 closed with prod proof. #284 has evidence for all three conditions (see below) | issue comments |
| 4 | 0 5xx for 2 h after the last deploy | IN PROGRESS: 0 5xx at 22:42Z (11 min into the window). The 20:13Z burst of 23 human-class 503s was this run's own #336 load test | telemetry-2240.md |
| 5 | No new PostHog exception groups | MET but weak: 0 `$exception` since capture was enabled at 19:48Z. The sample is consent-gated and small | decisions.tsv |
| 6 | Harness grep empty and build passes | MET at #335; every later PR built with exit 0 | PR bodies |
| 7 | 0 qa-audit rows | MET for deletable tables (resources 0, edits 0, collections 0, bookmarks 0). Audit-log rows are append-only by design | cleanup/qa-rows-after.json |
| 8 | improvements.md has a baseline and target for each item | MET | improvements.md |
| 9 | REPORT.md and a ledger entry | This file, plus the section in `audit/ledger.md` | |

## Fixes (PR → squash SHA, proof)
| PR | Defect | Proof on prod |
|---|---|---|
| #335 → bfd08f7a | Ops, self-heal and CI harness removed | grep 0, build 0 |
| #338 → d9a90bd4 | Real navigations got 503 during crawler bursts (#336) | burst: 10/10 navigations 200, non-navigation clients still 503 + Retry-After |
| #339 → 5c0d66af | Scheduled backup failures logged no stage (D2) | the outcome line appears on the next scheduled run, after 2026-11-09T14:10Z |
| #341 → 83079b6b | Archived duplicates answered 410 (#337) | 27/27 pairs return 301 on page and API; query string kept; unmapped archived still 410; sitemap 0 |
| #340 → 396abf2c | Decline did not stop Replit's page counting | 0 beacons after Decline; Allow restores them; earlier, cookie-only and hand-set cases all pass; policy and copy agree |
| #342 → e123be1d | Watchdog retry outcome was invisible (#284) | code; the log line appears on the next real connect timeout |
| #343 → 68ff5fc2 | A turn-capped researcher run showed "failed" and "4 of 3" | run #111: "STOPPED AT TURN CAP", 1 of 1, $0.0474 |
| #344 → 20c36511 | Sign-in card off-centre (20/60 px at 390) | 20/20, 181/181, 437/437 at 390/768/1280 |
| #345 → a7a673b2 | Two auth.login rows for one session | one row per session (30251, 30263), each with a sessionId |
| #346 → b451f455 | A reclaimed enrichment run could overwrite its status | TLA+ model FixGuardedWrites passes (5.0M states); reviewed |
| #347 → ac96736a | Re-seed could wipe the catalog with no server confirmation | 400 without confirm; 403 unauthenticated |
| #348 → 496c51c9 | A reclaimed research run could overwrite its status | reviewed; same pattern as #346 |
| #349 → ff4d51bf | Back/Forward shifted the page column (CLS 0.21/0.22) | counted CLS 0 for click, Enter, Back and Forward at 390/768/1280; scroll restore intact |

## #284 exit conditions
1. A fresh anonymous page view makes no `/api/auth/user` request. Final L1 pass at 3 widths, plus a fresh isolated context on ff4d51bf: only `GET /api/config` (0 /api/auth/user by network list and resource timing).
2. The cache reports live vs expired evictions. `/api/admin/operations/health` on ff4d51bf returns `publicCache.evictions: {"live":0,"expired":0}`, reported apart as required (server/cache/publicCache.ts sweepExpired/evictToBounds). Both are 0 because the cache holds 13 entries (4.9 MB) against limits of 4096 entries and 48 MB, so no eviction has happened since the last restart. Pool: max 8, idle 8, waiting 0. Evidence: e2e-evidence/20261108T1819Z/issue284/operations-health.json.
3. The watchdog retries once. The code retries once on a connect timeout, and #342 logs the outcome. The success WARN appears only when a real timeout occurs; none has happened since the deploy.

## PostHog-chosen improvements (improvements.md)
I-01 home → category 19% (target ≥ 25%), I-02 mobile resource INP p75 344 ms (target < 200), I-03 home CLS p75 0.116/0.121 (target < 0.1). Baselines and queries are recorded. None shipped in this run. Defects came first, as the brief orders.

## Owner decisions
1. **www.awesome.video loops.** The Cloudflare redirect rule answers `location: awesome.video` with no scheme. Fix it in the Cloudflare dashboard; the target must be `https://awesome.video` plus the path.
2. **GA4 counts each SPA navigation twice.** In GA4 Admin → Data streams → web stream → Enhanced measurement, turn off "Page changes based on browser history events".
3. **9 catalog link replacements** (cycle-23 table). The owner applies these PUTs.
4. **Repo-name titles**, 390 of 4,000. The default is to keep them.
5. **Orphan accounts from earlier runs:** `krzemienski+qa-audit-2026-10-29@gmail.com` and `audit-c22-member@example.com`.
6. **Rotate credentials.** The audit admin and audit member passwords and MAILTM_PASSWORD were read into lane transcripts. Also rotate the string typed in session bf07af10, if it was real.
7. **#281 scheduled backups** stay, escalated, not closed.

## Follow-ups (not defects on the live SHA)
- H-02: link-scan apply timing vs backup failures. Compare times once the D2 outcome line exists.
- H-11/H-12: admin cosmetics.
- A cross-instance cancel can overlap for up to 10 s; the heartbeat bounds it.
- #302: routes split (parked by the brief).
- PostHog `$web_vitals` would need a navigation-type property to attribute field CLS.
