# awesome.video production run 20261113T0041Z: report

## 1. Outcome

- **What production serves.** Production runs GitHub `main`. The last code commit, X = `980f031e`, went live 2026-11-14T11:23:42Z. The FINAL commit changes only `docs/production-state-2026-11-13.md` (this report) and `CHANGELOG.md`. Its SHA, the post-deploy checks and the 2-hour error window are recorded in the run folder's REPORT.md.
- **Deploys.** 36 PRs merged (#381–#416; #408 and #414 docs only), deployed in 24 code batches plus the docs-only FINAL through `replit-deploy`. One publish (B20) failed on Replit and succeeded on retry. Every batch ran the same gates: workspace tree equals `origin/main`, build exit 0, a running-jobs gate, one fresh backup, MCP publish, then a check that `/api/version` equals the merged SHA and `/api/health/ready` returns 200.
- **Matrix.** Every matrix row was re-driven on X at 390, 768 and 1280 by opus verifiers on live production (section 3): 320 cells, 0 FAIL. Two cells are NEEDS_YOU because the AI spend cap blocks their paid step (section 8). L9 is curl-only.
- **Removed layer.** The self-heal, CI and harness layer is gone from the repo and the runtime (section 5).
- **Findings.** 44 ledger findings (LG-001–LG-044). Section 2 lists each fix with the level of proof it has: most were re-driven on production; LG-002, LG-003 and LG-031 have local or stub proof only, and LG-008/LG-009 are mitigations whose cause is not proven. Closed as intended behaviour or not a product defect: LG-005, LG-007, LG-015, LG-025, LG-026, LG-028, LG-032. Owner decisions: section 8. LG-039 (a failed edit submit's toast covered the dialog's Submit button), LG-040 (same-millisecond writes left the catalog stamp unchanged) and LG-041 (the boot sweep failed live GitHub syncs on sibling instances) were first recorded as known limits, then fixed in #415 after review pointed out that the owner had not accepted them. The final pass on that commit found LG-042 (the new inline error pushed the focused Submit out of the dialog's view at 1280×800, a regression from the LG-039 fix) and LG-043 (the Report broken link dialog kept its draft after Cancel); both were fixed in #416. LG-044 is an environment item: two requests got a 500 from the hosting front end that never reached the app (section 8).
- **Review comments.** Every bot review comment on #381–#416 was read. 45 findings on #395–#408 were each checked against the code; the confirmed ones (including one high: a malformed research budget could still launch with no cap) were fixed in #409–#411. The 13 findings on #409–#411 were triaged the same way (run folder `.local/audit/20261113T0041Z/reviews/pr409-412.md`, not in the repository): 10 real, fixed in #413; one not real, one by design, and one documentation correction made here and in the CHANGELOG. #413, #415 and #416 had their own reviews resolved before merging: 3, 4 (of 6) and 1 sourcery findings fixed, and the rest answered in `reviews/pr409-412.md`. Codex reviews of the #413 and #415 branches found no actionable regressions. A Codex review of the run's decision trail (`reviews/codex-trail-2.md`) reopened LG-039, LG-040 and LG-041, which had been recorded as known limits.
- **Error windows.** The app's own logs show 0 error-level records and 0 5xx responses in every window measured during the run, so everything that reached Express succeeded. Two user-visible 500s did not reach it: 07:10:24Z (a POST to `/api/resources/191129/edits`, retried with 201) and 11:35:06Z (a Clerk session-token refresh). Both came back from Google Frontend as `text/plain`, 21 bytes, with no app headers and no app log record (LG-044, section 8). The infrastructure cause is not proven; the product now shows a clear inline error when a write fails (LG-039/LG-042). The 2-hour window on FINAL starts after the FINAL deploy; its result is in the run folder's REPORT.md.

## 2. Bugs fixed

Each row says what proves it. "Production" means an opus verifier other than the builder re-drove it on live awesome.video; "local" or "stub" means it was not provable on production. Evidence is under `.local/audit/20261113T0041Z/evidence/`.

| Ledger | Tier | Symptom | Root cause | PR | Production evidence |
|---|---|---|---|---|---|
| LG-001 / LG-010 | T1 | Category, subcategory and resource pages returned 503 or a "shed" shell during crawler bursts: 225 human 5xx and 459 shed responses in 6 days | `server/cache/publicCache.ts` rejected cold rebuilds above the 64 cap | #388 | Production: a 300-URL burst at 20 concurrent returned 300 × 200, 0 shed (R-B7). This load stays under the 64-slot cap, so it shows no regression, not the saturated path; 0 shed records since |
| LG-009 / LG-008 | T1 | DB pool connect timeouts in 4 windows broke Clerk user lookup (500) | Not proven. Mitigations: pool TCP keepalive; traffic flush only on serving instances | #382, #389 | Mitigated, cause unproven: 0 connect timeouts and 0 "Failed to resolve local user" in every warn+ record from B2 (03:20Z) to 00:24Z (2,161 records, paged, failedReads 0). The builder asked for ≥ 24 h before calling it fixed |
| LG-002 | T1 | A second Autoscale instance served an edited or withdrawn page for up to 6 h | `invalidatePublicCache()` only cleared the instance that handled the write | #396, #409 | Local: two-server repro passes. Production: only one instance was serving, so the cross-instance path was not exercised; edits visible in 6–8 s and catalog-stamp clears in the logs (R-B12). #409 made the stamp exact (same-ms edits, tag canonicalization); its SQL runs in 10.3 ms on a restored production snapshot |
| LG-003 | T2 | A failed lookup pinned generic page metadata for 6 h | Swallowed errors returned `found: true` fallback metadata, which was cached | #394 | Local only (synthetic two-server repro); no safe production repro |
| LG-019 / LG-024 | T1–T2 | Accessible names did not start with the visible label (WCAG 2.5.3) | Labels built as `name, count` | #390, #391, #398 | axe `label-content-name-mismatch` = 0 at 1280 and 390 (R-B11, R-B13) |
| LG-020 | T2 | Removing a bookmark as a guest called `/api/bookmarks` and got a 401 | The Undo snapshot read the server list for guests | #392 | 0 `/api/bookmarks` requests and 0 console errors (R-B11) |
| LG-023 | T2 | A keyboard tab change from `/admin/<section>` dropped focus to the h1 | Two sibling admin routes remounted the page, and the route hand-off took focus | #399 | Focus stays on the tablist; the h1 got 0 focus events (R-B13) |
| LG-029 | T2 | A long password ran under the "Show password" toggle on sign-in and sign-up | `.input` padding (14 px) replaced Clerk's password padding | #402 | padding-right 58 px; text ends 9 px left of the toggle at all widths (FP-4) |
| LG-034 | T2 | After an offline route failure, Retry rendered the page without its stylesheet | Vite's preload helper never re-requests a CSS dependency it has already marked as seen | #405, #406 (first attempt failed on production; fixed on the second) | The CSS is re-requested (200), and h1 is 48 px, the same as a plain reload, on both the online auto-retry and a Retry press (FP-1) |
| LG-035 | T2 | Unparseable input (e.g. `0-1`, `e`, `-`) in the researcher budget meant "no cap" | A `type=number` field reports bad input as `""`; React's onChange does not fire when the value stays `""` | #407, #410 | Production: invalid alert and no "no cap" confirm for `0-1`, `e` and `-` in budget, turns and duration at all widths (FP-8 on b0c7fb47) |
| LG-012 | T3 | The Link health panel said "Automatic remediation" | Copy | #383 | R-B2 |
| LG-013 / LG-016 / LG-004 | T2–T3 | Admin pages jumped on first load (CLS up to 0.316); #385 regressed every tab | Loading and loaded states mounted different nodes and heights | #384–#387 | All 19 admin tabs × 3 widths CLS < 0.1 (R-B12, FP-7) |
| LG-018 / LG-021 / LG-022 | T3 | The overview, enrichment and GitHub panels shifted as data arrived | Placeholders were smaller than the loaded content | #389, #395, #410 | Production: /admin @768 0.0156; enrichment @1280 0.0487; GitHub @390 ≤ 0.0315 |
| LG-017 | T3 | Page-view counts held in memory were lost when an instance went idle | Counts were flushed only on a 5-minute tick that idle instances skip | #389 | Code review only: one flush on the serving→idle transition; a 3 s SIGTERM race remains. Not measurable on production without stopping an instance |
| LG-027 | T3 | Research run view CLS 0.22–0.24 @390 | The body painted in 3 stages; the late "ran for" text wrapped the head | #401 | 0.0021–0.0026 @390, 0.0002 @768 (FP-8) |
| LG-030 | T3 | A /search category deep link shifted at 390 (CLS 0.127) | The filter chip changed width, so "Clear all" wrapped onto a new line | #402 | 0.0156 on 12 cold loads (FP-2) |
| LG-031 | T3 | Clerk proxy 5xx responses were invisible to `/api/admin/logs` | The proxy is mounted before request logging | #403, #409 | Stub probe only (a real Clerk 5xx cannot be induced). #409 logs at error after the response finishes and no longer logs client aborts |
| LG-037 | T3 | One link-health progress-write error logged no cause | `err.message` only, at error level, for a non-fatal tick | #409 | Code review: logs the cause at warn; job 21 had completed 4095/4095 |
| LG-033 | T3 | The shared collection page shifted at 390 (CLS 0.161) | A card grid was painted under a header of unknown height | #404 | CLS 0 @390, ≤ 0.0022 @768 and 1280, on 3 collections (FP-5) |
| LG-038 | T2 | After one submission, typing the next one on the same page lost keystrokes | The success card's ref was a new callback on every render, so it took focus again on each keystroke's render | #412 | Production: submissions 2–4 typed on the same page after a success, no lost keystrokes (FP-5 L5-01 @1280 on 5f29bfd8) |
| LG-039 | T3 | After a failed edit suggestion, the error toast covered the dialog's Submit button at 1280 for about 5 s | The toast viewport is fixed bottom-right above the open dialog | #415 | Production (synthetic 500 from an in-page fetch wrapper; no request left the browser): inline alert above the buttons, 0 toasts in 13 s, alert clears on edit, at 1280, 768 and 390 (FP-6a/FP-6b on 980f031e) |
| LG-040 | T3 | Two writes to one resource in the same millisecond left the catalog stamp unchanged, so a sibling instance could keep the first version | The per-row stamp tuple keyed on `updated_at`, which both writes shared | #415 | Local: on a Postgres clone, three writes that leave `updated_at` unchanged move the stamp each time. Production has one serving instance, so the cross-instance path is not exercised there |
| LG-041 | T2 | The boot sweep failed every processing GitHub sync queued more than 5 min ago, including one a sibling instance was still running | It judged rows by `created_at`; the queue has no liveness column | #415 | Local: on a Postgres clone, dead-worker, legacy and malformed-timestamp rows are failed; a beating sibling and a just-started old row are kept. Liveness lives in the existing `metadata` jsonb (no schema change). Not exercised on production: it needs a live sync during an instance start |
| LG-042 | T2 | After a failed edit submit at 1280×800, the inline error pushed Cancel and Submit below the dialog's visible area while focus stayed on Submit | Regression from the LG-039 fix: the alert made the dialog taller than its scroll area | #416 | Production (synthetic): after the failed submit, Submit is fully visible and focused at 1280×800 (scrollTop 54), 768 and 390; a duplicate-URL 409 moves focus to the URL field (FP-6a/FP-6b on 980f031e) |
| LG-043 | T3 | The Report broken link dialog kept the typed note after Cancel or Escape | The note was cleared only after a successful submit | #416 | Production: after Escape or Cancel the reopened dialog is empty (0/500) at 1280, 768 and 390 (FP-6a/FP-6b on 980f031e) |

Not a fix: LG-007 (an archived duplicate API was reported to answer 200) was not reproduced; both routes answer 301 to the kept row (L1-16).

Review comments: every Sourcery, Cursor and ecc-tools comment on #381–#408 was read. Triage is in the run folder `.local/audit/20261113T0041Z/` (not in the repository): `review-comments.md` (#381–#394), `reviews/pr395-408.md` (#395–#408, with per-finding verdicts in the ProofPunk run's `results/19-RV-*.json`) and `reviews/pr409-412.md` (#409–#414). Fixed in #397 and #409–#411; four findings were checked and are not real; two are by design and documented in code.

## 3. Matrix summary by tier (final pass on X = `980f031e`)

Each row × width has a screenshot, a network log, a console log and `api-version.json` = X, under `evidence/final/<row>/<width>-980f031e/`.

| Lane | Tier focus | Rows × widths | PASS | Notes |
|---|---|---|---|---|
| L1 browse | T1 | 55 | 55 | L1-17 (LG-034 recovery) PASS under a named console-error exception (see below); L1-18 analytics events PASS (page_viewed sent and ingested in PostHog for the seeded distinct id, Umami send 200) |
| L2 search | T1 | 48 | 48 | L2-10 confirms LG-030 is fixed |
| L3 resource | T1 | 27 | 27 | L3-07 is graded as the anonymous sign-in prompt (the dialog is checked in L6-13) |
| L4 auth | T2 | 36 | 36 | LG-014 and LG-015 are graded against current intended behaviour |
| L5 member | T2 | 42 | 42 | L5-01 confirms LG-038 is fixed; L5-14 log half read by the lead (0 AI calls) |
| L6 admin curation | T2 | 36 | 35 | L6-07 @1280: the paid "Analyze with AI" step not run (AI cap, NEEDS_YOU); it passed on earlier SHAs |
| L7 admin ops | T2 | 27 | 27 | |
| L8 admin AI | T2 | 15 | 14 | L8-01 confirms #413's one-click Launch (20/20 per width); L8-02 @1280 paid launch not run (AI cap, NEEDS_YOU); it launched and passed on `ec3f9204` |
| L9 SSR / SEO / API (curl) | T1 | 10 | 10 | |
| L10 perf / a11y | T1 | 24 | 24 | |

A "cell" is one row at one width (L9 rows are one curl cell). L1 has 19 rows: L1-15 is curl-only and the other 18 run at three widths, so 55 cells. Superseded rows (UNVERIFIED pending the lead's log read, or graded before a ruling) stay in the TSVs with a later row that supersedes them. Rows driven on earlier SHAs are archived under `final-109c320a/`, `final-b1e4db3a/`, `final-1a7ff534/`, `final-2eeb7a58/`, `final-67c5e9b6/`, `final-ec3f9204/`, `final-b0c7fb47/` and `final-5f29bfd8/` (L2, L5 and part of L6 before #413 changed X). Those passes found LG-029 through LG-035 and LG-038.

L1-17 is graded under a named exception. The row injects an offline chunk failure, and the error boundary that handles it logs exactly two console errors: React's caught-error log of "Unable to preload CSS for /assets/About-…css" and `console.error("Route render error:")` at `client/src/App.tsx:431`. Those two lines are exempt from the "0 console errors" rule; any other console error fails the row. On 980f031e the verifier graded it under the exception: exactly the two lines, with every behavioural check passing (retry card, no reload loop, CSS re-requested with 200, h1 the same size as a plain reload). L8-02 and L6-07 at 768 and 390 are graded by the width rule: the paid step runs only at 1280, so one click opening the confirm and Cancel closing it, with 0 paid requests, is a PASS.

Not covered by any row: completing a password reset (L4-09 stops at the reset-code screen because the code needs the inbox) and completing an email verification code (L4-04 stops at the code screen). Both are Clerk-hosted flows.

Driver limits:
- agent-browser cannot emulate touch, so the 390 and 768 rows use the mobile viewport, dpr and UA without touch events.
- The bundled Chrome 149 was replaced by system Chrome 157 after it produced a key-repeat artifact (LG-032).

## 4. Improvements

| Id | Change | Measure (PostHog) | Baseline | Target | Early reading |
|---|---|---|---|---|---|
| I-1 | The Visit click is recorded after the tap's frame (#393). The hide path is kept off the tap task, and Amplitude Guides & Surveys is deferred 3 s (#397) | "Mobile INP p75 — /resource (I-1)", insight SkKMLbVU on dashboard 2347420 | 280 ms (30 d); 268 ms (7 d before deploy) | ≤ 200 ms | Re-read 2026-11-14 09:2xZ with the insight's own filters: 2 mobile `/resource` samples since B12 (2026-11-13 09:21Z), p75 94 ms (n=2, not significant; 7 d before: 268 ms, n=16). Lab at 6× CPU: tap 104–112 → 88–104 ms; startup long tasks 216 → 113 ms. Re-read at 72 h and 7 d |
| I-2 | Not shipped. The browse funnel (home → category → resource → outbound) converts 10.7 % over 56 people | — | — | — | The sample is too small to justify a change |

## 5. What was removed, what was kept and why

Removed (#381):
- the agent directories `.agents/`, `.codex/` and `.omp/`;
- the MCP config;
- the TLA+ models;
- the archived scripts;
- the data receipts and `journals/`;
- the ESLint guard step in the build;
- the orphan-job watchdog's 60 s loop and retry;
- the unattended link-remediation apply (`LINK_HEALTH_REMEDIATION`);
- the CI workflows.

`reports/` and `audit/` moved to `docs/history/` as renames.

Kept, because each is product, deploy or data protection rather than self-repair:
- `.replit`;
- `scripts/migrate.ts`, `scripts/db-backup.ts`, `scripts/publish-build.sh` and `scripts/deployment/`;
- the `replit-deploy` skill with its schema check;
- `tsc` in the build;
- the backup schedule (#281);
- the one-time boot sweep and the empty-DB seed guard;
- the read-only link-health scan with its manual Apply;
- digest and contact retention.

## 6. Architecture as shipped

The one archify diagram is a run file, `.local/audit/20261113T0041Z/architecture.html` (source `architecture.json`; showcase validation 9/9 checks, 0 errors; browser visual check pass). It is not in the repository: the FINAL commit may change only this document and the CHANGELOG. The bullets below describe the same system.

- **Pages.** A visitor's page is server-rendered by the Express app on Replit Autoscale. Route metadata and the public cache are per instance. A rebuild waits up to 5 s for one of 64 slots (512 waiters); past that a request still gets a 503. Each serving instance starts a check of an exact catalog fingerprint at most once per 30 s, without a timer, and clears its cache when it changes; the request that starts a check is served from cache, so one request after a write can still be stale.
- **Sign-in and writes.** Members and admins sign in through Clerk via `/api/__clerk`, which logs 5xx responses at error level (client aborts excluded). Admin writes go to Neon Postgres over a keepAlive pool.
- **Logs and analytics.** Logs are queryable at `/api/admin/logs`. Analytics (PostHog, GA, Amplitude) send only with consent.
- **Deploy path.** GitHub `main` → workspace reset over SSH → `publish-build.sh` guard → running-jobs gate → one backup → MCP `publish_app` → `/api/version` = `origin/main`.

Finish-line checks on X: `grep -rEi "self-?heal|prod-check|merge-gate|ops-watch|ops/signals|auto-?remediat" --exclude-dir=node_modules --exclude-dir=.local --exclude-dir=docs .` returns nothing (exit 1); `.github/workflows/` does not exist; `npm run build` exit 0. `/api/version` = `origin/main` is checked after the FINAL deploy (REPORT.md in the run folder carries the result).

## 7. Issues closed or parked

- **#284 (DB pool pressure):** closed 2026-11-13 with evidence.
- **#77 (QA cleanup by server-enforced prefix):** kept open (comment 6868021763): the route deleted every QA resource, edit and collection it can, but QA rows remain in tables with no QA delete path (section 8).
- **#281 (scheduled backups, restore drill):** an owner question was posted this run. The default (keep the schedule) stands until the owner answers.
- **#283 (queryable logs, Axiom sink):** the Axiom sink is out of scope (C21); parked with a comment.
- **#302 (split `server/routes.ts`):** out of scope (C21); parked.
- No open GitHub issue carries the `bug` label.

## 8. Blocked items

Each item is in the run's `needs.md` with the routes tried and a live probe.

- **LG-044 (environment).** Two intermittent 500s from the hosting front end (Google Frontend) never reached the app; details under Error windows. Neither the Replit MCP tools nor the workspace CLI read deployment request logs. Owner action: check the Replit Publishing pane's logs for 2026-11-14 07:10:24Z and 11:35:06Z, or raise it with Replit support.

- **LG-014 (T2):** a valid sign-up creates a usable account at once, with no email-code step. #334 moved verification to after sign-up. The Clerk CLI is linked to the development instance only, so the production setting cannot be read or changed from here. Owner decision: keep, or require the code before first use.
- **LG-036 (T3):** a research run stopped at budget shows "Turns 3 of 2": the SDK counts the interrupted turn. Re-verifying a fix needs one more paid research run. Owner decision: raise the AI cap for one run, or accept the label.
- **AI spend cap.** Research jobs 112–115 cost $0.5701 (measured). Four "Analyze with AI" calls are assumed at $0.10 each because the app reports no per-call cost; a fifth attempt was refused by the allowlist before reaching Claude and cost nothing. Total ≈ $0.97 of the owner's $1.00. This is an estimate: $0.10 per analyze call is an assumption, not a measured upper bound, so staying under the cap is not demonstrated. The final pass on X therefore drove L8-02 and L6-07 at 1280 up to their paid confirm and recorded the paid step as NEEDS_YOU (the launch passed on `ec3f9204`, job 115; the analyze call passed on earlier SHAs). At 768 and 390 the width rule grades reaching the confirm and cancelling as PASS. Owner decision: raise the cap by about $0.25 for one research run, or accept the earlier result.
- **QA residue (LG-006 / C11 / #77).** The final cleanup (2026-11-14 08:44Z, at the FINAL deploy) deleted 75 QA rows through the QA route (17 edits, 48 resources, 10 collections) and the 6 QA sign-ups through the admin API, all returning 200; `/api/admin/qa-rows` then listed 0 deletable rows. A scan of the restored post-cleanup snapshot 20261114T085543Z-65ca10e2 (`evidence/C11/qa-scan-after-2.txt`) still finds QA text where no QA delete path exists: the append-only resource audit log (1,468 rows), revoked API keys (57), deleted-user tombstones (21), research jobs (9) and one discovery, 3 link-health checks, 4 edits and 1 bookmark on real resources, and one QA user from 2026-10-29. C11 is therefore not fully met: these rows are retained pending an owner decision (keep them as records, or approve a delete route), not cleaned.
