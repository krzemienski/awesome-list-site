# Consistency review of the lane designs against each other and PLAN.md

> Layout is mine. Read-only: no other file was edited. Files compared: run-due-jobs-design (RD), prepublish-spec (PP), tier2-spec (T2S), tier1-checks (T1C), runner-design (RUN), logger-design (LOG), merge-gate-design (MG), usage-aggregate-design (USE), code-deepdive (CD, mine), PLAN.md, plus axiom-research and tier3-dryrun where they decide a point. `S`=`server/`.
> "Verified" means I re-read the code line; otherwise the item is a document-vs-document conflict only.
> Severity: **H** would break or mislead an implementation, **M** wrong but recoverable, **L** naming or wording.

## A. Direct contradictions

| # | Sev | Item | File A says | File B says | Recommended single answer |
|---|---|---|---|---|---|
| 1 | M | Run-due endpoint path | RD and PLAN B2/decision 11: `POST /api/ops/run-due-jobs` | CD sketch (mine): `POST /api/internal/run-due-jobs` | `/api/ops/run-due-jobs`. CD is superseded; CD's sketch should not be coded from. |
| 2 | M | Run-due auth header and secret name | RD: `Authorization: Bearer <OPS_CRON_TOKEN>` | CD: `x-job-token`, secret `JOBS_TOKEN` | `OPS_CRON_TOKEN` as a Bearer header (RD, in PLAN). Add one pre-merge check: send a bogus Bearer to a throwaway route locally and confirm `clerkMiddleware`/`clerkUserContext` (`S index.ts:~452`, `:489-495`) and `optionalApiKey` (which also reads Bearer, `S api/public.ts`) do not reject or mutate it. **UNVERIFIED**: I did not read Clerk's handling of a non-session Bearer. If it interferes, switch to a custom header `X-Ops-Token` (cron-job.org can set any header). |
| 3 | M | Where the route lives | RD: "1 new route file (~80 lines)" but also "register it in `operations.ts` next to the health routes" | `S routes/domains/operations.ts:19-22`: that registrar **must run last**; its trailing `app.all('/api', …)` JSON 404/405 fallbacks only work if every real route is already mounted (verified). `routes.ts:389` calls it last | New file `S routes/domains/ops-cron.ts`, registered in `routes.ts` **before** `registerOperationsRoutes` (before `:389`). Registering inside `operations.ts` after the fallbacks would 404 the route. |
| 4 | H | Backup retention rule | PLAN decision 2: "kept **14 days**" | RD: "**Keep 14**" (a count, `prune function`) | Retention by **age**: delete backups older than 14 days, but always keep the newest 3 regardless. Reason: PP adds one backup **per deploy**, so a count of 14 can be consumed by a busy deploy week and evict every daily backup. Make RD's prune function take `maxAgeDays=14, keepMin=3`. |
| 5 | M | Backup freshness field | PP: `sort_by(.createdAt)`, "`createdAt` under 10 minutes" | T1C T1-17: `sort_by(.completedAt)\|last`; tier01 dry run: `.backups[0].completedAt` | Use `completedAt` everywhere. The manifest's `createdAt` is the **start** time (`S backup/databaseBackup.ts:439-440`, `startedAt`), so it understates age by the dump duration. Field names on the list response (`totalRows`, `tableCount`, `bytes`) were taken from PP; I did not re-read `summarizeBackup` and could not find it by grep, so confirm them once. |
| 6 | M | Row-count rule for the pre-publish backup | PP: new backup rows within ±1 % of the previous (two-sided) | PLAN §6: "rows not lower than the previous backup" | One-sided with tolerance: new rows ≥ 99 % of previous. PP itself warns `agent_events` grows quickly (so an upper bound would trip after a long gap), and PLAN's rule would fail on a legitimate small delete (e.g. QA cleanup). Update both to "≥ 99 %". |
| 7 | H | Where Tier tests write evidence | PLAN §5 and phase 5: `reports/prod-check/<UTC>/`, "evidence committed under `reports/`" | Global directive §4: evidence only under `.claude/evidence/<session_id>/` or the project's `e2e-evidence/`. Also RUN would write a directory every 30 min from the scheduler | Two modes. Scheduled runs write to `$HOME/.cache/prod-check/<UTC>/` (never in the repo). Manual and deploy runs write to `e2e-evidence/prod-check/<UTC>/`, committed only for deploy runs. Change RUN's `--out` default accordingly and add `.cache`-style paths to nothing in git. |
| 8 | H | Tier 3 is read-only vs has writes | RUN `tier3.ts` + PLAN + tier3-dryrun: Tier 3 read-only, and the runner's route guard aborts any non-GET in Tier 0/1/**3** | USE §7: "Tier 3 round-trips (journey enrol/unenrol, collections, digest preferences) run only on the audit member… `real` counts must be unchanged" | Keep Tier 3 read-only (PLAN, RUN, the guard). Move the member write round-trips to a **Tier 2 extension** (T2-15..), and run the USE before/after isolation check there. Edit USE §7 wording from "Tier 3" to "Tier 2". |
| 9 | M | What `--tier 2` leaves behind before #77 exists | RUN: "until #77 exists it stops after T2-05 … rather than leaving unreachable rows" | T2S: T2-01 creates id1, T2-03 rejects it, T2-04/05 create and withdraw id2. Both rows persist (rejected and withdrawn) until the cleanup endpoint deletes them (T2S §2) | The statement is wrong: stopping after T2-05 **leaves two `[QA-` rows per run**. Before #77, either (a) do not run Tier 2 at all, or (b) run only the steps that leave nothing: bookmark add/remove (T2-06/07) on a fixed approved resource. Phase 5's "zero `[QA-` rows left" needs #77 first, as the PLAN ordering (phase 2 before 5) already implies. |
| 10 | M | Axiom ingest URL | LOG: `POST https://api.axiom.co/v1/datasets/${AXIOM_DATASET}/ingest`, optional `AXIOM_URL` default `api.axiom.co`, "Bearer AXIOM_TOKEN" | PLAN B3 / `axiom-research.md:17`: `POST https://us-east-1.aws.edge.axiom.co/v1/ingest/<dataset>`; ingest uses a separate **Basic (ingest-only)** token | Use the edge URL: `${AXIOM_URL ?? "https://us-east-1.aws.edge.axiom.co"}/v1/ingest/${AXIOM_DATASET}`. Update LOG (it said "check before coding"; the research file already did). Region is an owner choice at account creation. |
| 11 | L | `unhandledRejection` decision | LOG: "needs an owner decision (exit vs continue)" | PLAN decision 18: **keep serving, log and alert through the sink** | Closed: log, flush, continue. LOG should drop the open item. `uncaughtException` still logs, flushes, exits 1 (Node's state is undefined after it; PLAN is silent, so confirm). |
| 12 | M | Link-scan retry window | CD (mine): "30-min-style retry window" | RD: "a failed run under the retry pause"; code `S services/linkHealthService.ts:15`: `RETRY_AFTER_FAILURE_MINUTES = 60` (verified) | 60 minutes. CD's wording was wrong; the cron must not be assumed to retry sooner than 60 min after a failure. |
| 13 | M | "Tier 0 on the schedule" implementation | PLAN §7: Tier 0 is "a plain launchd job: bash + curl every 30 min, no LLM"; T1C: the 30-min schedule reports T0-01 as **info only** | RUN: Tier 0 lives in the TypeScript runner and has no schedule mode; no flag makes T0-01 informational | Add `--schedule` to RUN (T0-01 becomes `info`, "main ahead of prod by N commits"; no browser) and have launchd call `npx tsx scripts/prod-check/index.ts --tier 0 --schedule`. One implementation, not a bash twin that can drift from the TS one. |
| 14 | M | What covers the site while the Mac sleeps | PLAN §7 limitation: "A 30-min Tier 0 from the external cron of decision 11 covers the site while the Mac sleeps" | RD: the cron-job.org entry calls `POST /api/ops/run-due-jobs` every 15 min; it cannot run the runner | Add a **second** cron-job.org entry: `GET /api/health/ready` every 5-30 min with failure alerts (this is T0-02 only). State that it is a liveness probe, not Tier 0. Also note a probe wakes the instance and so partly masks B2's "no instance" gaps; keep it separate from the run-due entry. |

## B. Cross-file gaps and risks (one file assumes something another contradicts or never states)

| # | Sev | Item | File A | File B | Recommended answer |
|---|---|---|---|---|---|
| 15 | H | Audit-account cookies are short-lived | RUN: audit member/admin sessions loaded from env vars `PROD_CHECK_AUDIT_*_COOKIE` (static strings) | `C lib/queryClient.ts:184-187` (verified): Clerk's `__session` token "lives about a minute and is refreshed in the background" | A static cookie string would expire within about a minute unless it is the long-lived Clerk `__client` cookie plus a refresh. The owner session works because it is the admin-password cookie (`S routes/domains/auth-user.ts:164`), a different mechanism. Decide before coding: audit accounts sign in with **credentials inside the run** (NEW-6 flow, `PROD_CHECK_AUDIT_*_USER/_PASSWORD`) and let Clerk refresh in the browser context; and for API-only steps take the token from that context. **UNVERIFIED** how #76 creates the accounts (Clerk vs password). |
| 16 | H | `inFlight` backup flag is per process | PP (b): backup running when `GET /api/admin/database-backups` has `.inFlight==true` | `S backup/databaseBackup.ts:380-399` (verified): `backupInFlight` is a module variable; and RD/CD run backups from any Autoscale instance | The probe can read `false` while another instance is dumping. Expose cross-instance state: have the GET also report whether advisory lock `(5117,1)` is held (`pg_locks` classid 5117, objid 1) and use that in PP. Minimum: PP must say the probe only sees the serving instance. |
| 17 | M | Backup call path in run-due | RD calls `createDatabaseBackup({createdBy:null})` directly | `S routes/domains/export-link-health.ts:1057-1070`: the admin route wraps it in `runHeavyWork('database-backup', …)` (1 active, 2 queued, 2 s wait) and writes the `database.backed_up` audit row | RD should do both: call through `runHeavyWork` (outcome `busy` on rejection) and write the same audit row (actor null, note "scheduled"). Otherwise a cron backup can overlap an export or the link scan's catalog read, and leaves no audit trail. |
| 18 | M | Lock id inventory | RD: `pg_try_advisory_lock(5117, 1)` (backup). Existing: `pg_advisory_xact_lock(5116, 7)` link health (`linkHealthService.ts:185,343,409`). Others use `hashtext('enrichment_job_admission')` and `hashtext('research_job_admission')` (`EnrichmentRepository.ts:107`, `researchService.ts:1097`) | CD: "a Postgres advisory lock per job" (all four jobs) | No collision: the two-int form `(k1,k2)` and the single-`bigint` `hashtext(...)` form are separate key spaces, and 5117/1 differs from 5116/7. Keep **only the backup** lock, as RD says (link scan, digest, purge are already serialized). Record the registry in one comment block: `5116/7 link-health`, `5117/1 backup`, `hashtext(enrichment_job_admission)`, `hashtext(research_job_admission)`. |
| 19 | M | Extra connection for the session lock | RD: session-level lock "on a dedicated `pg.Client` (not the shared pool)" | CD pool table: a backup already uses 1 extra `pg.Client` (`databaseBackup.ts:287`) + a `pg_dump` process outside the 8-slot pool | Take the lock on the **same** client `createDatabaseBackup` already opens (`withClient`), or accept 2 extra connections for about 10 s. Update CD's budget (3 pools; backup adds up to 2 clients). |
| 20 | M | "Skip when called within the hour" has no state | RD: contact purge "at most hourly: skip when called within the hour" | No persisted last-run exists for purge (the scheduler uses an in-process timer); the purge is a bounded idempotent `DELETE … LIMIT` (`ContactRepository.ts:14-32`, verified) | Drop the skip. Running the purge every 15 min is cheap. Only backup (age from `listDatabaseBackups`), link scan (DB) and digest (DB queue) have durable "due" state. |
| 21 | M | Job context for cron-run work | LOG: `runWithJobContext` wraps the schedulers and job runners | RD: the cron request runs jobs inside an HTTP request that already has a `rid`; the link scan continues after the response in the same async context | In `ops-cron.ts` wrap each job in `runWithJobContext(job, …)` so the lines show `job=` and not the cron request's `rid`. Without it, a 60-min scan's lines would carry the cron call's rid. |
| 22 | M | Freshness thresholds vs the new cadence | T1C T1-18: newest link scan `completed` and < **26 h**; PLAN phase 0: backup < 26 h | RD: scan due after 24 h from the last completed job's **creation** (`linkHealthService.ts:174`), cron every 15 min, scan runs 20-90 min (RD's own history) | Worst case age of the newest completed scan is about 24 h + 15 min + 90 min = 25.75 h, only 15 min under 26 h; any failed run (60 min retry, row 12) pushes it over. Set T1-18 to **30 h** (warn 26 h). Backups: due at > 20 h and checked every 15 min, so 26 h is fine. |
| 23 | L | Check-id coverage | PLAN: "T0-01..03, T1-01..19, T2-00..14"; T1C has T1-01..19 (no T1-00) and NEW-1..4 in the Tier 1 section, NEW-6..11 under Tier 2 | RUN assigns `T3-j1…T3-adv` (tier3-dryrun ids) to `tier3.ts`; T1C has no NEW-5 and no T3 table | Add a short T3 table to T1C with stable ids (T3-01..T3-14 mapped to the dry-run ids) and either add NEW-5 or renumber 6-11. PLAN's id range sentence should include T3. |
| 24 | L | Two audit-user-id env names | T2S §2.4: server env `QA_CLEANUP_USER_IDS` (allowlist for the cleanup endpoint) | RUN: runner-side `PROD_CHECK_AUDIT_*_ID` to confirm the signed-in user is the audit account; USE B-heuristic lists `QA_CLEANUP_USER_IDS` too | Not a conflict (server vs Mac env) but they must hold the same ids. Say so in RUN. For USE, the heuristic should be: ids in `QA_CLEANUP_USER_IDS` ∪ names starting `[AUDIT` ∪ `USAGE_TEST_EMAIL_DOMAINS`. PLAN B9 lists only the last two. |
| 25 | L | Env names that may be scrubbed or not | LOG: scrub matches env names containing `SECRET\|TOKEN\|PASSWORD\|API_KEY\|_KEY$\|DATABASE_URL\|PRIVATE\|AUTH` (`S lib/logger.ts:~81`) | `OPS_CRON_TOKEN`, `AXIOM_TOKEN`, `QA_CLEANUP_USER_IDS` | `OPS_CRON_TOKEN` and `AXIOM_TOKEN` match, so a leak of their values into a line is redacted. `QA_CLEANUP_USER_IDS` and `INSTANCE_ID` do not match and are not secret. No change; noted so nobody renames a secret to dodge the scrubber. |
| 26 | L | Axiom query token has no name | PLAN B3: separate Advanced (query) token for the poller | LOG env list covers only the ingest token | Name it `AXIOM_QUERY_TOKEN`, stored only on the Mac (launchd env), **never** in Replit Secrets. Add to LOG's env table as "not for the app". |
| 27 | L | Hosting of the new files vs line limits | PLAN/CLAUDE.md: files ≤ 500 lines | `S routes/domains/operations.ts` is 344 lines; `export-link-health.ts` is 2,023; `S index.ts` 760 | Do not add the new route to `export-link-health.ts` or `operations.ts` (see row 3). The new files (`ops-cron.ts` ~80, `admin-usage.ts` ~150, `logSink*.ts`, `processHandlers.ts`, runner files ≤ 350) all fit. |
| 28 | L | Merge gate vs new tsconfig include | MG: tsc runs `-p .` unpiped | PLAN §5: `scripts/prod-check/**` added to tsconfig `include` | Consistent: once included, the gate covers the runner. One consequence: a type error in the runner then blocks unrelated merges, which is the intent. |
| 29 | L | USE schema column vs "no schema change" | USE option A adds `users.is_test` (needs `db:push` and an owner UI publish) | PLAN decision 19: **Later**, heuristic first | Consistent. Make sure the heuristic ships with `testDefinition:"heuristic"` as USE says, and that no check depends on the column. |
| 30 | L | Pre-publish vs cron tick during a publish | PP: running-jobs check passes immediately before `publish_app` | RD: cron fires every 15 min and may start a scan or backup seconds later; a publish kills in-process work (B2 history jobs 6, 7, 11) | Small window (a publish is minutes). Accept and state it in PP; do not add a pause mechanism unless a job is actually lost. Cheaper mitigation: run-due's link-scan branch refuses to start when the build is less than 5 min old (`/api/version` boot time is available). **UNVERIFIED** whether boot time is exposed. |

## C. Items checked and found consistent

- Merge-gate exit codes 10/11/12, the `--incremental false`, the symlink-after-merge rule, and the ESLint count-regression rule: MG = PLAN §6.
- Runner exit codes 0-5, the Tier 2 triple gate, `--allow-writes`, the route guard on non-GET, Clerk GET-only (572 requests): RUN = PLAN §5.
- Logger sink sizing (2,000 buffer, 200/2 s flush, ~250 added lines), `INSTANCE_ID → HOSTNAME → boot uuid`, ISO timestamp: LOG = PLAN §4.
- Link-health scheduler constants: 10-min tick, 60 s first tick, `LINK_HEALTH_INTERVAL_HOURS=24`: CD, RD and `S jobs/linkHealthScheduler.ts` agree.
- USE size (~130-160 lines), 14 metrics, guard `isAuthenticated, isAdmin`, no public cache: USE = PLAN B9.
- T2S step numbering vs T1C T2-00..14 (steps 1-6, cleanup 2.1-2.5 = T2-10..13): consistent.

## D. Suggested edits, in priority order
1. Row 15 (audit-session mechanism) and row 9 (leftover QA rows): both can make Tier 2 fail or pollute prod on first use.
2. Row 16 and row 17 (backup in-flight and heavyWork/audit): they decide whether pre-publish and cron backups are safe.
3. Rows 4, 6, 7, 8, 22: threshold and policy contradictions that would produce false alarms or break rules.
4. Rows 1-3, 10-14, 18-21: naming and wiring; fix in the design files before coding.
5. Everything else is wording.

## Not checked
- Behaviour of Clerk middleware with a non-Clerk Bearer (row 2), the account mechanism behind #76 (row 15), and `summarizeBackup` field names (row 5) were not read in code.
- I did not re-verify PLAN numbers that no design file repeats (costs, phase list).

---

# PLAN re-check (against PLAN.md as it stands now, 326 lines)

> Read-only. Status per row: **OK** = now consistent, **CONTRA** = PLAN still contradicts the recommended answer, **GAP** = PLAN does not address it (no contradiction, but the decision is not recorded). Line numbers are PLAN.md lines. Rows 8-9 of table A are in the same numbering as above.

| # | Status | PLAN line(s) | Note |
|---|---|---|---|
| 1 | OK | 84, 316 | `POST /api/ops/run-due-jobs`. |
| 2 | OK (check open) | 84 | Bearer `OPS_CRON_TOKEN`. The Clerk/`optionalApiKey` Bearer-interference check is not in the plan: GAP on that sub-point. |
| 3 | OK | 84 | "registers before `registerOperationsRoutes`". File name (`ops-cron.ts`) not stated; fine. |
| 4 | OK | 83, 307 | Age-based, 14 days, never fewer than the newest 3. |
| 5 | GAP | 197, 289 | PLAN says "newest < 10 min" / "< 26 h" without naming `completedAt` vs `createdAt`. Design files still disagree (PP `createdAt`, T1C `completedAt`). Fix in PP. |
| 6 | CONTRA | 197 | Still "rows not lower than the previous backup"; PP says ±1 %. Recommended: new rows ≥ 99 % of previous, in both. |
| 7 | CONTRA (partly) | 157-159 OK; **294** | §5 is fixed. Phase 5 row still says "evidence committed under `reports/`", which breaks the rule §5 now cites. Change to "`e2e-evidence/`". |
| 8 | OK in PLAN | 162-163, 184 | PLAN keeps Tier 3 read-only (guard covers 0/1/3). The contradiction is only in `usage-aggregate-design.md` §7. See answer below. |
| 9 | OK | 168 | States the two leftover `[QA-` rows and that Tier 2 is not scheduled until #77. |
| 10 | OK | 135 | Edge ingest URL, separate Basic ingest-only token. `logger-design.md` still shows `api.axiom.co` (design file, not PLAN). |
| 11 | OK / GAP | 323, 147 | Rejection: keep serving (decision 18). `uncaughtException` exit-after-flush is not stated in PLAN. |
| 12 | GAP | 84 | PLAN does not state the 60-min failure retry; only my code-deepdive wording was wrong. No PLAN change needed. |
| 13 | GAP | 181, 250 | PLAN still describes Tier 0 on the schedule as a "plain launchd bash + curl" job (250) while §5 defines Tier 0 in the TS runner (181). Add `--schedule` to the runner or state that the bash job is the T0-02/03 subset only. |
| 14 | CONTRA | 258 | Still says the 30-min Tier 0 comes from the cron of decision 11. Decision 11 (316) and line 84 define that cron as the 15-min run-due call, which cannot run Tier 0. Add a second cron-job.org entry: GET `/api/health/ready`, liveness only. |
| 15 | CONTRA (wording) | 166 OK; **167** | 166 correctly says sign in with credentials in each run. 167 still says "both audit-cookie env vars". Change to the audit user/password env vars. |
| 16 | GAP | 83 OK; 191-193 | B1 (83) covers the cross-instance lock for the scheduled backup. §6 "Running jobs" still reads the backup GET `inFlight`, which is per process. Say the probe sees only the serving instance, or read the advisory lock. |
| 17 | OK | 83 | "goes through `runHeavyWork`, writes its audit row, holds a cross-instance advisory lock". |
| 18 | GAP | 83, 84 | Locks are mentioned, ids are not. Record the registry (5116/7 link health, 5117/1 backup, two `hashtext` admission locks) in the run-due design or a code comment. No collision. |
| 19 | GAP | none | Extra connection for the session-level lock is not addressed. |
| 20 | GAP | none | PLAN is silent; `run-due-jobs-design.md` still has "skip within the hour" for purge. Drop it there. |
| 21 | GAP | 146 | `runWithJobContext` is planned for schedulers; wrapping each job inside the cron request is not stated. |
| 22 | GAP | 289 | Only the backup "< 26 h" appears. T1-18 (link scan < 26 h) lives in `tier1-checks.md` and is too tight with a 15-min cron plus a 90-min scan; set 30 h there. |
| 23 | GAP | 175 | Id range still "T0-01..03, T1-01..19, T2-00..14"; no T3 ids, NEW-5 missing from the series. |
| 24 | GAP | 91 | Heuristic lists names, email domains and `audit`/`qa` tokens; it does not include the ids in `QA_CLEANUP_USER_IDS` and the runner-side `PROD_CHECK_AUDIT_*_ID` equality is not stated. |
| 25 | OK | n/a | No change needed. |
| 26 | GAP | 135 | "Advanced token scoped to query one dataset" is there; the env name and "Mac only, not in Replit Secrets" are not. |
| 27 | OK | 84 | New route is a new file registered ahead of the fallbacks. |
| 28 | OK | 169-170 | `scripts/prod-check/**` goes into tsconfig. |
| 29 | OK | 91, 324 | Heuristic first, `is_test` later. |
| 30 | GAP | 84, 191-193 | The window between the pre-publish check and a cron tick is not mentioned. Low severity; add one sentence. |

Counts: OK 13 (rows 1, 3, 4, 8, 9, 10, 17, 25, 27, 28, 29, plus 2 and 11 with a sub-gap), CONTRA 4 (rows 6, 7, 14, 15), GAP 13.

## Edits still needed in PLAN.md (4 contradictions)
1. Line 197: "rows not lower than the previous" → "rows ≥ 99 % of the previous backup".
2. Line 294: "evidence committed under `reports/`" → "evidence under `e2e-evidence/`".
3. Line 258: replace with "a separate cron-job.org entry pings `/api/health/ready` as a liveness probe; Tier 0 itself needs the Mac or a deploy".
4. Line 167: "both audit-cookie env vars" → "the audit admin and audit member user/password env vars".

## Row 8: the single answer for Tier 3 vs the usage design
**Tier 3 stays read-only.** PLAN (162-163, 184), the runner guard (aborts any non-GET in Tiers 0/1/3) and `tier3-dryrun.md` all say so. `usage-aggregate-design.md` §7 is the odd one: its before/after isolation check (`test` counts rise, `real` counts unchanged) is valid but belongs to **Tier 2 extension steps** (member enrol/unenrol, collection, digest preference on the audit member), which run only with `--allow-writes` and after #77. Until then the usage endpoint is used read-only: Tier 3 and the daily anomaly check only *read* `/api/admin/usage`. Edit USE §7 "Tier 3 round-trips" to "Tier 2 round-trips".

---

# Proposed PLAN text (for the 13 not-addressed rows)

> Read-only: PLAN.md is not edited. Anchors are PLAN.md lines as of its current 337-line text. "Insert after" means a new sentence or bullet directly after the anchored line. Rows that should stay in a design file are marked **DESIGN ONLY** with the reason. The two sub-gaps on rows 2 and 11 are included as 2b and 11b.

| Row | Where | Action | Exact text |
|---|---|---|---|
| 2b | after PLAN:92 (B2 row, after "adds a cross-instance lock around backup") | insert | "Before coding, send one bogus `Authorization: Bearer` to the route locally and confirm Clerk's middleware and `optionalApiKey` neither reject nor rewrite it; if they do, use a custom `X-Ops-Token` header instead." |
| 5 | PLAN:206 (fresh backup bullet) and PLAN:298 | replace | 206: "Then check 201, newest `completedAt` < 10 min (not `createdAt`, which is the dump's start time), tables ≥ 42, total rows ≥ 99 % of the previous backup's." 298: "...shows a scheduled backup with `completedAt` < 26 h old two days running..." Also tell `lanes/prepublish-spec.md` to use `completedAt`. |
| 11b | after PLAN:156 (processHandlers bullet) | insert | "`uncaughtException` logs, flushes (≤ 3 s) and exits 1, because Node's state is undefined afterwards; `unhandledRejection` logs and keeps serving (decision 18)." |
| 12 | **DESIGN ONLY** | none | The 60-min failure retry (`linkHealthService.ts:15`) only corrected a wrong phrase in my code-deepdive; PLAN never states a retry interval. Put it in `run-due-jobs-design.md`'s link-scan row. |
| 13 | PLAN:259 | replace | "Tier 0 on the schedule is `npx tsx scripts/prod-check/index.ts --tier 0 --schedule` run by launchd every 30 min: GET checks only, no browser, no LLM, and T0-01 reported as info (\"main ahead of prod by N commits\"). One implementation serves both the schedule and the post-publish run." Add `--schedule` to the CLI flag list at the runner **Files** bullet (PLAN:~170). |
| 16 | PLAN:202 (Running jobs bullet) | insert after | "The backup probe reads the serving instance's in-flight flag only; the scheduled backup's cross-instance advisory lock is what prevents two dumps, so a deploy treats a `locked` result from the run-due endpoint as running." |
| 18 | **DESIGN ONLY** | none | Lock ids are an implementation detail. Add a comment block at the lock site and one table in `run-due-jobs-design.md`: `5116/7` link health, `5117/1` backup, `hashtext('enrichment_job_admission')`, `hashtext('research_job_admission')`. PLAN already says a lock exists. |
| 19 | **DESIGN ONLY** | none | The backup takes its session lock on the same `pg.Client` it already opens; budget note belongs in `run-due-jobs-design.md` and `code-deepdive.md` (backup adds up to 2 clients plus `pg_dump`, outside the 8-slot pool). |
| 20 | **DESIGN ONLY** | none | Drop "skip within the hour" for contact purge in `run-due-jobs-design.md`; the purge is a bounded idempotent DELETE, safe every 15 min. No PLAN sentence mentions it. |
| 21 | after PLAN:155 (runWithJobContext bullet) | replace | "Background jobs, including each job run from the cron endpoint, get `job=`/`jobId=` through a `runWithJobContext` wrapper, so a 60-min scan's lines never carry the cron request's `rid`." |
| 22 | PLAN:191 (Tier 1 row) and `lanes/tier1-checks.md` T1-18 | insert/replace | In the Tier 1 row where the scan-age check is listed: "newest link scan `completed` and < 30 h old (warn at 26 h)". Reason in one clause: "a scan is due at 24 h, the cron ticks every 15 min and a scan takes up to 90 min." Update T1-18 to match. |
| 23 | PLAN:184 | replace | "Check ids (T0-01..03, T1-01..19, T2-00..14, T3-01..14, NEW-1..11), each with its assertion and dry-run command: `lanes/tier1-checks.md`." Needs a T3 table (T3-01..T3-14 mapped to the dry-run ids) and either a NEW-5 or a renumbering in `tier1-checks.md`. |
| 24 | PLAN:99 (B9 row), end of the heuristic sentence | insert | "The predicate also treats the ids in `QA_CLEANUP_USER_IDS` as test accounts; the runner confirms the signed-in audit users equal those ids (`PROD_CHECK_AUDIT_*_ID`) before any Tier 2 write." |
| 26 | after PLAN:144 (Axiom row) | insert | "The poller's query token is stored only as `AXIOM_QUERY_TOKEN` in the Mac's launchd environment, never in Replit Secrets; the app holds only the ingest token (`AXIOM_TOKEN`) and `AXIOM_DATASET`." |
| 30 | after PLAN:202 | insert | "A cron tick can start a scan or backup seconds after the running-jobs check passes. The window is a few minutes; accept it and record any job a publish kills (the link scan already retries after a restart)." |

## Result
- 11 PLAN edits (rows 2b, 5, 11b, 13, 16, 21, 22, 23, 24, 26, 30; 2b and 11b are the sub-gaps on rows 2 and 11).
- 4 rows stay in design files only (12, 18, 19, 20), because they are implementation detail or only corrected a wrong phrase in a design file.
- Row 13 is the only one that changes the runner's CLI; the others are wording.
