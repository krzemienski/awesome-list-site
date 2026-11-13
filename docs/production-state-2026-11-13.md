# awesome.video production state, 2026-11-13 (run 20261113T0041Z)

Copy of the run report committed in the final PR. Results that only exist after this deploy (the 2-hour log window, the QA-row cleanup and the judges) are added to the run folder copy, `.local/audit/20261113T0041Z/REPORT.md`.

## 1. Outcome

- **What production serves.** Production runs GitHub `main`. The last code commit, X = `ec3f9204`, went live 2026-11-13T20:40:32Z. The FINAL commit adds only this report, `docs/production-state-2026-11-13.md`, its architecture diagram and the CHANGELOG line: the commit that adds this file (`git log -1 --format=%H -- docs/production-state-2026-11-13.md`).
- **Deploys.** 27 PRs merged (#381–#407), deployed in 19 batches through `replit-deploy`. Every batch ran the same gates: workspace tree equals `origin/main`, build exit 0, a running-jobs gate, one fresh backup, MCP publish, then a check that `/api/version` equals the merged SHA and `/api/health/ready` returns 200.
- **Matrix.** Every matrix row was re-driven on X at 390, 768 and 1280 by opus verifiers on live production (section 3). L9 is curl-only.
- **Removed layer.** The self-heal, CI and harness layer is gone from the repo and the runtime (section 5).
- **Findings.** 36 ledger findings in total:
  - 25 fixed and verified on production.
  - 7 closed with evidence as intended behaviour or not a product defect.
  - 4 left for the owner (section 8).
- **Error windows.** Production log windows measured during the run show 0 error-level records and 0 5xx responses. The 2-hour window on FINAL starts after the FINAL deploy; its result is in the run folder's REPORT.md.

## 2. Bugs fixed

All fixes were verified on live production by an opus verifier other than the builder. Evidence is under `.local/audit/20261113T0041Z/evidence/`.

| Ledger | Tier | Symptom | Root cause | PR | Production evidence |
|---|---|---|---|---|---|
| LG-001 / LG-010 | T1 | Category, subcategory and resource pages returned 503 or a "shed" shell during crawler bursts: 225 human 5xx and 459 shed responses in 6 days | `server/cache/publicCache.ts` rejected cold rebuilds above the 64 cap | #388 | A 300-URL burst at 20 concurrent: 300 × 200, 0 shed (R-B7) |
| LG-009 / LG-008 | T1 | DB pool connect timeouts in 4 windows broke Clerk user lookup (500) | Idle pooled TCP connections dropped; traffic flush ran on idle instances | #382, #389 | 0 timeouts and 0 "Failed to resolve local user" from B2 onward (`/api/admin/logs`, paged) |
| LG-002 | T1 | A second Autoscale instance served an edited or withdrawn page for up to 6 h | `invalidatePublicCache()` only cleared the instance that handled the write | #396 | Two-server local repro; production edits visible in 6–8 s, with catalog-stamp clears in the logs (R-B12) |
| LG-003 | T2 | A failed lookup pinned generic page metadata for 6 h | Swallowed errors returned `found: true` fallback metadata, which was cached | #394 | Two-server local repro (synthetic); no safe production repro |
| LG-019 / LG-024 | T1–T2 | Accessible names did not start with the visible label (WCAG 2.5.3) | Labels built as `name, count` | #390, #391, #398 | axe `label-content-name-mismatch` = 0 at 1280 and 390 (R-B11, R-B13) |
| LG-020 | T2 | Removing a bookmark as a guest called `/api/bookmarks` and got a 401 | The Undo snapshot read the server list for guests | #392 | 0 `/api/bookmarks` requests and 0 console errors (R-B11) |
| LG-023 | T2 | A keyboard tab change from `/admin/<section>` dropped focus to the h1 | Two sibling admin routes remounted the page, and the route hand-off took focus | #399 | Focus stays on the tablist; the h1 got 0 focus events (R-B13) |
| LG-029 | T2 | A long password ran under the "Show password" toggle on sign-in and sign-up | `.input` padding (14 px) replaced Clerk's password padding | #402 | padding-right 58 px; text ends 9 px left of the toggle at all widths (FP-4) |
| LG-034 | T2 | After an offline route failure, Retry rendered the page without its stylesheet | Vite's preload helper never re-requests a CSS dependency it has already marked as seen | #405, #406 (first attempt failed on production; fixed on the second) | The CSS is re-requested (200), and h1 is 48 px, the same as a plain reload, on both the online auto-retry and a Retry press (FP-1) |
| LG-035 | T2 | Unparseable input (e.g. `0-1`) in the researcher budget meant "no cap" | A `type=number` field reports bad input as `""`, which was treated as blank | #407 | The invalid alert shows and no "no cap" confirm appears, for budget, turns and duration at all widths (FP-8) |
| LG-012 | T3 | The Link health panel said "Automatic remediation" | Copy | #383 | R-B2 |
| LG-013 / LG-016 / LG-004 | T2–T3 | Admin pages jumped on first load (CLS up to 0.316); #385 regressed every tab | Loading and loaded states mounted different nodes and heights | #384–#387 | All 19 admin tabs × 3 widths CLS < 0.1 (R-B12, FP-7) |
| LG-017 / LG-018 / LG-021 / LG-022 | T3 | The overview, enrichment and GitHub panels shifted as data arrived | Placeholders were smaller than the loaded content | #389, #395 | /admin @768 0.0156; enrichment @1280 0.0487; GitHub @390 ≤ 0.0315 |
| LG-027 | T3 | Research run view CLS 0.22–0.24 @390 | The body painted in 3 stages; the late "ran for" text wrapped the head | #401 | 0.0021–0.0026 @390, 0.0002 @768 (FP-8) |
| LG-030 | T3 | A /search category deep link shifted at 390 (CLS 0.127) | The filter chip changed width, so "Clear all" wrapped onto a new line | #402 | 0.0156 on 12 cold loads (FP-2) |
| LG-031 | T3 | Clerk proxy 5xx responses were invisible to `/api/admin/logs` | The proxy is mounted before request logging | #403 | The `clerk-proxy` area logs 5xx (stub probe); the C10 window reads it |
| LG-033 | T3 | The shared collection page shifted at 390 (CLS 0.161) | A card grid was painted under a header of unknown height | #404 | CLS 0 @390, ≤ 0.0022 @768 and 1280, on 3 collections (FP-5) |
| LG-007 | T2 | Reported: an archived duplicate API answered 200 | Not reproduced | — | 301 → kept row on both routes (re-checked 07:38Z and in L1-16) |

Review comments: every Sourcery and ecc-tools comment on #381–#407 was read and triaged in `review-comments.md`. The two Sourcery mediums on #393 were fixed in #397. The file-size low on `ResourceDetail.tsx` was dismissed as pre-existing.

## 3. Matrix summary by tier (final pass on X = `ec3f9204`)

Each row × width has a screenshot, a network log, a console log and `api-version.json` = X, under `evidence/final/<row>/<width>/`.

| Lane | Tier focus | Rows × widths | PASS | Notes |
|---|---|---|---|---|
| L1 browse | T1 | 55 | 55 | L1-17 confirms LG-034 is fixed |
| L2 search | T1 | 48 | 48 | L2-10 confirms LG-030 is fixed |
| L3 resource | T1 | 27 | 27 | L3-07 is graded as the anonymous sign-in prompt (the dialog is checked in L6-13) |
| L4 auth | T2 | 36 | 36 | LG-014 and LG-015 are graded against current intended behaviour |
| L5 member | T2 | 42 | 42 | L5-14 log half was read by the lead (0 Claude calls from member page loads) |
| L6 admin curation | T2 | 36 | 36 | L6-07 made one AI analyze call |
| L7 admin ops | T2 | 27 | 27 | |
| L8 admin AI | T2 | 15 | 15 | L8-02 overshot its cap by $0.0096, within the documented one-turn bound |
| L9 SSR / SEO / API (curl) | T1 | 10 | 10 | |
| L10 perf / a11y | T1 | 24 | 24 | |

Superseded rows (UNVERIFIED pending the lead's log read, or graded before a ruling) stay in the TSVs with a later row that supersedes them. Rows driven on earlier SHAs are archived under `final-109c320a/`, `final-b1e4db3a/`, `final-1a7ff534/`, `final-2eeb7a58/` and `final-67c5e9b6/`. Those passes found LG-029 through LG-035.

Driver limits:
- agent-browser cannot emulate touch, so the 390 and 768 rows use the mobile viewport, dpr and UA without touch events.
- The bundled Chrome 149 was replaced by system Chrome 157 after it produced a key-repeat artifact (LG-032).

## 4. Improvements

| Id | Change | Measure (PostHog) | Baseline | Target | Early reading |
|---|---|---|---|---|---|
| I-1 | The Visit click is recorded after the tap's frame (#393). The hide path is kept off the tap task, and Amplitude Guides & Surveys is deferred 3 s (#397) | "Mobile INP p75 — /resource (I-1)", insight SkKMLbVU on dashboard 2347420 | 280 ms (30 d); 268 ms (7 d before deploy) | ≤ 200 ms | 1 mobile `/resource` sample since B12 (09:21Z): p75 112 ms (n=1, not significant; 7 d before: 268 ms, n=16). Lab at 6× CPU: tap 104–112 → 88–104 ms; startup long tasks 216 → 113 ms. Re-read at 72 h and 7 d |
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

The archify diagram (one diagram) is saved as `.local/audit/20261113T0041Z/architecture.html` (source `architecture.json`) (archify showcase validation: 9/9 checks, 0 errors; browser visual check pass).

- **Pages.** A visitor's page is server-rendered by the Express app on Replit Autoscale. Route metadata and the public cache are per instance. A rebuild waits up to 5 s for one of 64 slots (512 waiters) instead of being turned away. Each serving instance checks a fingerprint of the catalog tables at most once per 30 s, without a timer, and clears its cache when the fingerprint changes.
- **Sign-in and writes.** Members and admins sign in through Clerk via `/api/__clerk`, which logs 5xx responses. Admin writes go to Neon Postgres over a keepAlive pool.
- **Logs and analytics.** Logs are queryable at `/api/admin/logs`. Analytics (PostHog, GA, Amplitude) send only with consent.
- **Deploy path.** GitHub `main` → workspace reset over SSH → `publish-build.sh` guard → running-jobs gate → one backup → MCP `publish_app` → `/api/version` = `origin/main`.

Finish-line checks on FINAL: on X: `grep -rEi "self-?heal|prod-check|merge-gate|ops-watch|ops/signals|auto-?remediat" --exclude-dir=node_modules --exclude-dir=.local --exclude-dir=docs .` returns nothing (exit 1); `.github/workflows/` does not exist; `npm run build` exit 0. `/api/version` = `origin/main` is checked after the FINAL deploy (REPORT.md in the run folder carries the result).

## 7. Issues closed or parked

- **#284 (DB pool pressure):** closed 2026-11-13 with evidence.
- **#77 (QA cleanup by server-enforced prefix):** the server-enforced route (`/api/admin/qa-rows`) shipped before this run and was used for C11; closed or kept open per the C11 result below.
- **#281 (scheduled backups, restore drill):** an owner question was posted this run. The default (keep the schedule) stands until the owner answers.
- **#283 (queryable logs, Axiom sink):** the Axiom sink is out of scope (C21); parked with a comment.
- **#302 (split `server/routes.ts`):** out of scope (C21); parked.
- No open GitHub issue carries the `bug` label.

## 8. Blocked items

- **LG-014 (T2):** a valid sign-up creates a usable account at once, with no email-code step. #334 moved verification to after sign-up. Owner decision: keep, or require the code before first use.
- **LG-036 (T3):** a research run stopped at budget shows "Turns 3 of 2": the SDK counts the interrupted turn. A fix is small. Re-verifying it on production needs one more paid research run, and this run's AI spend is at $0.97 of the owner's $1 cap. Owner decision: raise the cap for one run, or accept the label.
- **LG-006 / C11 QA residue:** cleanup runs inside the FINAL deploy (backup → deletes through `/api/admin/qa-rows` and the admin delete routes → publish). Rows the route cannot delete (the append-only `resource_audit_log`, research jobs, revoked API keys, view interactions) are listed with counts for an owner decision in the run folder's REPORT.md.
- **AI spend.** Total for the run is about $0.97 of the $1.00 cap:
  - L6-07 analyze calls: 2 × ~$0.10 (assumed; the app exposes no per-call cost);
  - research jobs 112, 113, 114 and 115: $0.2478 + $0.1068 + $0.1059 + $0.1096.
