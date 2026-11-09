# Run 20261108T1819Z: zero known production defects, harness removal, PostHog-chosen improvements identified (none shipped)

## Outcome
- Production served origin/main at every checkpoint. The last checkpoint was 2026-11-09 00:2xZ, on `69ef14e7`, before this docs PR merged. Merging it moves main ahead of production by one docs-only commit.
- Every code defect the run found or inherited is fixed, independently reviewed and merged. That is 17 PRs: #335, #338–#349 and #351–#353.
  - 13 are proven on awesome.video. One part of #351 (D13, word wrap in pending edits) is code-only, because no pending edit exists to render.
  - #339 (backup outcome line) and #342 (watchdog retry line) are deployed, but their proof needs a real event: the next scheduled backup, and a real database connect timeout.
  - #346 and #348 (job status guards) rest on a TLA+ model check and independent review. They have no production check.
- The final matrix pass covered 218 rows, one per surface per width, across final-L1 to L6: 212 PASS, 5 CARRIED, 1 RECLASSIFIED, 0 FAIL.
- QA cleanup brought every deletable table to 0 qa-audit rows.

Still open:
- The 2-hour no-5xx window restarts with each deploy. It starts from the last deploy.
- Owner-only items, listed under "Owner decisions" below.

## Finish lines
| # | Finish line | State | Evidence |
|---|---|---|---|
| 1 | `/api/version` equals origin/main HEAD | MET before this docs PR, `69ef14e7` both. A docs-only merge moves main ahead of the live SHA without changing any shipped file | `curl -s https://awesome.video/api/version` |
| 2 | The whole matrix passes | 0 FAIL in the final matrix (218 rows). 5 CARRIED rows: sign-up, sign-out and role change, which owner rules forbid re-driving. They kept their first-pass PASS, and the code under them (#345) is proven separately. 1 RECLASSIFIED: an edge-side 500 on `/api/version`. `matrix-fixes.tsv` also records three non-PASS fix checks: P336-01 INCONCLUSIVE (load burst 1 never filled the gate), P336-05 PARTIAL (shed lines classed the test traffic as human, so the user agent was wrong), and P340-B8b FAIL (GA4 counts each SPA page view twice; owner setting) | final-L1..L6.tsv, matrix-fixes.tsv |
| 3 | No bug-labelled issue open; #284 closed with its 3 conditions | NOT MET. #284 is open with the `bug` label. Conditions 1 and 2 have production evidence. Condition 3 (the watchdog retry) is code-only and has not been observed on production. #336 and #337 are closed | `gh issue list --label bug --state open` |
| 4 | 0 5xx for 2 h after the last deploy | IN PROGRESS. 0 5xx in the 11 minutes read after the 22:31Z deploy. Later deploys restarted the window. The 20:13Z burst of 23 human-class 503s was this run's own #336 load test | telemetry-2240.md |
| 5 | No new PostHog exception groups | WEAK. 0 `$exception` in a 3 h read at about 20:38Z (capture on at 19:47:38Z; last exception ever 2026-09-16; only 4 `$pageview` in that window). Not re-read since | decisions.tsv |
| 6 | Harness grep empty and build passes | MET at #335. Each later PR records its own build result; `decisions.tsv` records exit 0 explicitly for #340, #342, #343 and #349 | PR bodies |
| 7 | 0 qa-audit rows | MET for deletable tables: resources 0, edits 0, collections 0, bookmarks 0. Audit-log rows are append-only by design | cleanup/qa-rows-after.json |
| 8 | improvements.md has a baseline and target for each item | MET | improvements.md |
| — | #320 (draft approval package) | Closed on GitHub at 2026-11-09T00:25Z. Its 7 still-reproducing findings were fixed in #351–#353 and its owner items moved to "Owner decisions" | ledger rows R-320-* |
| 9 | REPORT.md and a ledger entry | This file, plus the run section in `audit/ledger.md` | |

## Fixes (PR → squash SHA, proof)
| PR | Defect | Proof on prod |
|---|---|---|
| #335 → bfd08f7a | Ops, self-heal and CI harness removed | grep 0, build 0 |
| #338 → d9a90bd4 | Real navigations got 503 during crawler bursts (#336) | Burst: 10/10 navigations got 200; non-navigation clients still got 503 + Retry-After |
| #339 → 5c0d66af | Scheduled backup failures logged no stage (D2) | DEPLOYED, proof pending: the outcome line appears on the next scheduled run, after 2026-11-09T14:10Z |
| #341 → 83079b6b | Archived duplicates answered 410 (#337) | 27/27 pairs return 301 on page and API; query string kept; unmapped archived still 410; sitemap shows 0 |
| #340 → 396abf2c | Decline did not stop Replit's page counting | 0 beacons after Decline; Allow restores them; earlier, cookie-only and hand-set cases pass; policy and copy agree |
| #342 → e123be1d | Watchdog retry outcome was invisible (#284) | DEPLOYED, proof pending: the line appears on the next real connect timeout |
| #343 → 68ff5fc2 | Turn-capped researcher run showed "failed" and "4 of 3" | Run #111: "STOPPED AT TURN CAP", 1 of 1, $0.0474 |
| #344 → 20c36511 | Sign-in card off-centre (20/60 px at 390) | Gutters 20/20, 181/181, 437/437 at 390/768/1280 |
| #345 → a7a673b2 | Two auth.login rows per session | One row per session (30251, 30263), each with a sessionId |
| #346 → b451f455 | A reclaimed enrichment run could overwrite its status | Code only: TLA+ FixGuardedWrites passes (5.0M states) plus independent review |
| #347 → ac96736a | Re-seed could wipe the catalog with no server confirmation | 400 without confirm; 403 when unauthenticated |
| #348 → 496c51c9 | A reclaimed research run could overwrite its status | Code only: independent review; same pattern as #346 |
| #349 → ff4d51bf | Back/Forward shifted the page column (CLS 0.21/0.22) | Counted CLS 0 for click, Enter, Back and Forward at 390/768/1280; scroll restore intact |
| #351 → b03197c6 | #320 D10a, D10b, D13 (admin Audit note, Export card shift, mid-word wrap) | D10a PASS. D10b PASS at 1280 (0.1005 → 0) and FAIL at 390 (0.0278), fixed again by #353. D13 code only (queue empty) |
| #352 → 2a6eafa1 | #320 D9, D11a, D11b, M-2 (onboarding draft, loading blanks, Settings layout) | All PASS at 1280 and 390: draft cleared on reset, malformed draft safe; blank band ~200 → 41-45 px with CLS 0; related skeletons visible; Settings shows no layout when prefs fail |
| #353 → 69ef14e7 | #351 left a 167 px shift at 390 on the Export tab | PASS at 390 and 1280 on 69ef14e7: no counted shift from an export card or the link-check card; the cards' top stays at 456 (390) and 379 (1280), and the card renders below them. Remaining page CLS 0.026 (390) and 0.055 (1280) comes from the admin masthead and is under 0.1 |

## #284 exit conditions
1. **A fresh anonymous page view makes no `/api/auth/user` request.** Checked in the final L1 pass at 3 widths, plus a fresh isolated context on ff4d51bf. The only request is `GET /api/config`.
2. **The cache reports live vs expired evictions.** On ff4d51bf, `/api/admin/operations/health` returns `publicCache.evictions: {"live":0,"expired":0}`, reported separately. Both are 0 because 13 entries (4.9 MB) sit far below the limits (4096 entries, 48 MiB). Pool: max 8, idle 8, waiting 0. Evidence: e2e-evidence/20261108T1819Z/issue284/operations-health.json.
3. **UNOBSERVED on production.** The watchdog retries once on a connect timeout, and #342 logs the outcome. No timeout has occurred since that deploy, so the line has not appeared.

## PostHog-chosen improvements (improvements.md)
Identified with baselines and targets. None shipped; defects came first, as the brief orders.

| Id | Metric | Baseline | Target |
|---|---|---|---|
| I-01 | Home → category | 19% | ≥ 25% |
| I-02 | Mobile resource INP p75 | 344 ms | < 200 ms |
| I-03 | Home CLS p75 | 0.116/0.121 | < 0.1 |

## Owner decisions
1. **www.awesome.video redirect loop.** Cloudflare answers with `location: awesome.video` and no scheme. Set the rule's target to `https://awesome.video` plus the path.
2. **GA4 counts each SPA navigation twice.** GA4 Admin → Data streams → web stream → Enhanced measurement: turn off "Page changes based on browser history events".
3. **9 catalog link replacements** (cycle-23 table). You apply these PUTs yourself.
4. **Repo-name titles.** 390 of 4,000. The default is to keep them.
5. **Leftover QA data from earlier runs:**
   - the qa-audit-2026-10-29 Gmail alias account;
   - `audit-c22-member@example.com`;
   - withdrawn rows 190989, 190992 and 190993, whose titles are not `[QA-` prefixed.
6. **Rotate credentials.** The audit admin and audit member passwords and MAILTM_PASSWORD were read into lane transcripts. Also rotate the string typed in session bf07af10, if it was real.
7. **#281 scheduled backups.** These stay: escalated, not closed.

## Follow-ups (not defects on the live SHA)
- H-02: compare link-scan apply timing with backup failures once the D2 outcome line exists.
- H-11/H-12: admin cosmetics.
- A cancel from a second instance can overlap the running job for up to 10 s; the heartbeat bounds it.
- #302: the routes split, parked by the brief.
- Attributing field CLS in PostHog `$web_vitals` would need a navigation-type property.
- The admin masthead shifts on load (counted 0.024 at 390, 0.051 at 1280, both under 0.1), as does the collapsed "Validation controls" disclosure on Export (0.0036). These are not defects by the 0.1 CLS threshold.
- At 390 the Export tab's link-check progress card is a scroll below the Run Link Check button; the toast points to it.
