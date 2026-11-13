# Watchdog timeout root cause (logs lane follow-up)

Read-only: code, saved HARs, saved GET JSON. No new production requests, no `ask_question`.

## Verdict
**Real, low-severity latent risk. Not an artefact of the audit load.** Both errors predate every audit lane's first request, and the error is a connect-time timeout that the code makes likely on a quiet pool. It is self-healing (next sweep is 60 s later), but it costs one failed sweep each time and shows the same mechanism can hit any query that needs a fresh connection.

## 1. What the code does
- `server/jobs/orphanJobWatchdog.ts:186` `startOrphanWatchdogPeriodic()`: `setInterval` every **60 s** (`PERIODIC_SWEEP_INTERVAL_MS`), started from `server/routes.ts:430` after the boot sweep. One run = `sweepOrphanedJobs()`.
- First statement is the failing query: `select id, worker_id, heartbeat_at, started_at, created_at from enrichment_jobs where status in ('pending','processing')`, via the shared `db` (same pool as requests). It then queries `research_jobs` the same way, and updates `github_sync_queue`. Three separate pool acquisitions per sweep, none retried.
- Failure handling: the whole sweep is one `try/catch` (`:~229`) that logs `❌ Orphan watchdog periodic sweep failed (non-fatal)` and waits for the next tick. No retry, no pool-wait budget, no distinction between a connect timeout and a real fault. Because enrichment is the first query, a timeout there skips the research and github sweeps for that minute too.
- Pool (`server/db/index.ts:35-45`): **max 8**, `idleTimeoutMillis: 30000`, **`connectionTimeoutMillis: 3000`**, `statement_timeout 8000`, `query_timeout 10000`.
- The logged text `Connection terminated due to connection timeout` is node-pg's message when `connectionTimeoutMillis` (3 s) expires while acquiring a client. That means either all 8 clients were busy for 3 s, or no idle client existed and opening a new connection to the database took >3 s.

## 2. Which cause fits
- **Pool saturation (8 busy) at 19:50/20:12: unlikely.** Telemetry in my four captures (20:36-21:13Z) shows `waiting: 0`, `active: 0` at every sample, and zero `pool.errors`. `peakWaiting 5 / peakActive 8` (since boot at 18:36) proves the pool *did* saturate at least once, but it cannot be dated, and saturation by an admin burst would also have produced 503s/5xx; the Agent reported none and telemetry shows no 5xx bucket (`evidence/logs/ops-health-4.json`).
- **Cold connect on an idle pool: fits best.** Idle clients are dropped after 30 s; the sweep fires every 60 s. With no traffic in between (the quiet period before the audit; the Agent's window shows only sparse scanner 404s from ~20:18), each sweep must open a *new* connection. Opening one to the hosted Postgres sometimes exceeds 3 s: telemetry shows selects with `max 7,200 ms` and 52-75 selects ≥500 ms out of 4.9-10 k, i.e. the database is intermittently slow, so a 3 s connect budget is plausible to miss. Evidence is circumstantial: the logs carry no connection-open timings, so I could not measure connect latency directly.
- Rate: 2 failures in the Agent's ~2 h 2 min window, ≈122 sweeps ⇒ **~1.6%** of sweeps (assumes the 60 s interval ran the whole window; the Agent did not report successful-sweep counts).

## 3. What else was running at 19:50 / 20:12 (candidates checked)
| Candidate | Evidence | Result |
|---|---|---|
| Audit lanes (admin-content 19,155-row audit-log paging, analytics pulls, member, visitor, admin-ops) | Earliest request in any saved HAR: visitor 20:35:33Z; admin-content 20:36:16Z; member 20:36:28Z; admin-ops 20:39:31Z (`evidence/*/*.har`, `startedDateTime` min). My own first curl: 20:36:48Z. | **No lane traffic before 20:35Z, so neither 19:50 nor 20:12 can be caused by this run.** (Lane curl calls without HAR are not covered, but lane files and PROGRESS show lanes started ~20:35.) |
| AI jobs | newest enrichment job 37 ran 02:13Z; newest researcher job 109 ran 02:11Z (`enrichment-jobs.json`, `researcher-jobs.json`) | none running |
| Link-health | remediation job 14 created 10:54Z, completed 12:06Z; next due 2026-11-07 10:54Z | not running |
| Digest | cycles at :36 each hour (18:36, 19:36, 20:36) | 19:36 finished in 1.6 s; not at 19:50 |
| Other visitor traffic | Agent: 404 noise from crawlers, 3 `/.git/config` probes at 20:18:11 | light |
| Unknown | I cannot see requests or background work at 19:50/20:12 beyond this. A second Autoscale instance could also be sharing the database. | **unresolved** |

## 4. Fix recommendations (not applied; read-only lane)
1. **Retry the sweep once on a connect timeout** (smallest change, `orphanJobWatchdog.ts` periodic handler): on error whose message matches `connection timeout`, wait ~1 s and run again; log only if the retry also fails. Removes the noise and the skipped research/github sweep.
2. **Log at WARN, not ERROR, for a single non-fatal timeout**, and ERROR only after e.g. 3 consecutive failures. Today it is the only app-level ERROR in the window, so it dominates error counts.
3. **Keep one client warm** — set pool `min: 1` or raise `idleTimeoutMillis` above the 60 s sweep interval (e.g. 120000), so the sweep reuses a connection instead of reconnecting every minute. Check the database's own idle-connection limit first.
4. **Add the missing evidence** so this can be proven next time: log the pool snapshot (`total/idle/waiting`) and acquisition time on the watchdog error, and the instance id and ISO timestamp (see logger gaps in `lanes/logs.md`).
5. Separately, `operations.ts` hard-codes `databasePool.max: 3` (real value 8, per the lead's correction); read it from the pool options so the health endpoint cannot mislead.

## Unverified
Whether the two failures were cold-connect timeouts or a brief saturation; whether sweeps ran every 60 s throughout; what the database's connect latency was at those minutes. Confirming needs production log lines around 19:49-19:51 and 20:11-20:13 (an owner log export, or one more `ask_question`).
