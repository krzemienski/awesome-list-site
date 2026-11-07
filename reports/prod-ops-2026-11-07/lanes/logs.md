# Lane: logs (prod-ops 2026-11-07), revision 1cd25ab0

Read-only. Revision seen at `/api/version` at 20:30Z: `1cd25ab06e344b1db198857910a95486efe36082`. Evidence dir: `/Users/nick/Desktop/awesome-list-site/.claude/worktrees/prod-ops-1107/e2e-evidence/prod-ops-2026-11-07/logs/`. Session `po1107-logs-1` (admin state, role `admin` confirmed via `/api/auth/user`). Writes sent: 0 (the one `network route` abort on `POST /api/recommendations*` is client-side only). Secret scan of all 20,494 records: 0 emails, 0 IPs, 0 tokens.

## 1. Sources table

| Source | Retrieved? | Window / retention | Unattended access | Cost | Consent | Blocked step |
|---|---|---|---|---|---|---|
| `GET /api/admin/logs` (App Storage JSONL sink, `server/lib/logSinkStorage.ts`) | YES, 20,494 deduped records, 162 hourly slices, 0 failed reads | Code: 7 d. Observed: oldest record 2026-11-07T02:45:30Z (about 17.8 h at 20:30Z); the 7 d claim is still unproven. Newest lag up to 60 s (flush 60 s/500 rec) | Yes, with an admin session: `fetch('/api/admin/logs?since=&until=&limit=2000')` in a page. Needs one hourly slice per call (200-object / 2000-record caps) | $0 | none (read) | none; cap forces 20+ calls per day |
| `/api/admin/operations/health` | YES (3 snapshots: 20:27Z, 20:59Z, 21:31Z, section 4) | In-memory, per instance, reset on restart | Yes, admin session | $0 | none | none |
| Replit deployment logs / MCP | NO | Live build only (11-06 evidence) | Not unattended | Agent credits for `ask_question` (forbidden this run) | OAuth by owner | `mcp__replit__*` shows only `authenticate`/`complete_authentication`: OAuth pending. Owner URL given 20:26Z |
| `ssh awesome-replit` | Reached (`hostname`=repl, `REPLIT_DEPLOYMENT=unset`, `/var/log` has only system logs: alternatives, apt, dpkg...) | n/a | n/a | $0 | none | It is the DEV workspace. It cannot see deployment logs at all |
| PostHog Logs / Error Tracking | NO | n/a | n/a | n/a | OAuth by owner | `mcp__plugin_posthog_posthog__*` shows only `authenticate`/`complete_authentication`. BLOCKED (OAuth). Skills not read since no query tool exists |
| Axiom | Inert | n/a | n/a | n/a | owner sets `AXIOM_TOKEN`/`AXIOM_DATASET` | `logSink.ts:170-177`: Axiom only if both set, else storage sink. Not set, storage sink is live (records carry `deployment=production`) |
| DB job rows (enrichment/research/link-health jobs) | Not re-pulled; 11-06 values stand | back to 2025-11 | admin session | $0 | none | covers jobs only |

Missing access, exactly: (1) Replit MCP OAuth (platform build/runtime/crash lines, OOM and SIGKILL evidence, deploy logs); (2) PostHog MCP OAuth (client exceptions, PostHog Logs); (3) `AXIOM_TOKEN`+`AXIOM_DATASET` if a 30 d off-box store is wanted.

## 2. Real log lines from revision 1cd25ab0 (instance `awesome-list-site.replit.app-85128c75`)

1,530 records, 18:52:42.985Z to 20:30:46Z (when the sweep ran). 1,447 info, 83 warn, 0 error. Raw: `records-rev1cd25ab0-and-all-errors.jsonl`.

```
18:52:42.985 info [claude] Claude service initialized: router router.hack.ski (bearer token); models haiku=cc/claude-haiku-4-5-20251001 ...
18:52:43.530 info [migrations] Migrations completed successfully
18:52:43.594 info [migrations] Migration journal verified: 34 recorded, all 34 journal entr(y/ies) applied
18:52:44.201 info [startup] Serving on port 5000 {"mode":"production"}
18:52:44.203 info [link-health] Link health schedule on: a full scan every 24h
18:52:44.204 info [backup-scheduler] Backup scheduler initialized (every 30 minutes)
18:52:44.512 info [job-watchdog] Orphan watchdog: no stuck jobs found
18:52:44.584 info [routes] Database already populated: 9 categories, 4319 resources
18:52:59.203 info [digest] Digest cycle started
18:53:00.014 info [digest] Digest cycle finished {"recovered":0,"queued":0,"processed":0,"ms":811}
18:53:14.313 info [contact-retention] Contact retention purge finished {"deleted":0,"batches":1,"batchLimitReached":false}
19:02:04.045 info [ops] Slow database query {"command":"select","ms":1820}
18:57:18.173 WARN [http] GET /resource/184973 {"status":404,"ms":38,"rid":"d2ba50"}
19:01:03.862 WARN [http] GET /.well-known/traffic-advice {"status":404,"ms":3,"rid":"615d58"}
19:52:45.714 info [digest] Digest cycle finished {"recovered":0,"queued":0,"processed":0,"ms":1509}
```
Boot mark: `migrations.completedAt 2026-11-07T18:52:43.594Z` matches the lead's health snapshot 1. Status mix on this instance (1,488 http lines): 200 x1389, 304 x15, 401 x1, 404 x77, 405 x1, 410 x5. **0 x 5xx, 0 x 429.** HTTP latency p50 98 ms, p95 389 ms, max 1,556 ms. 17 slow-query lines (534-1820 ms, all select). 0 pool/timeout lines, 0 watchdog failures, 0 process/SIGTERM lines.

## 3. Top errors and warnings (all revisions since 02:45Z, 7 boots/instances, 20,494 records; lower bound for 6 hours that hit the 2000 cap: 09, 10, 13, 14, 16, 17Z)

Levels: info 18,799 / warn 1,688 / **error 7**. HTTP statuses: 200 15,967; 304 716; 201 89; 204 78; 404 1,450; 401 239; 410 80; 400 37; 403 23; 405 18; 409 3; **503 x1**; 429 x0.

| # | Level / area | Count | Signature | Code location | User-facing break? |
|---|---|---|---|---|---|
| 1 | warn http 404 | 1,450 | `GET /resource/N` 262, `/api/resources/N` 107, `/api/resources/N/related` 32, `/api/awesome-list/listing` 30, `/N.php` 32 and other scanner paths | page 404 logged at `server/index.ts:563-572`; API 404s at `index.ts:547` | Visitors/crawlers hit deleted resource ids (also 80 x 410). Pages are gone (by design) but bots/links keep requesting them. `/api/awesome-list/listing` x30 is a 404 for unknown taxonomy (route exists). Not an outage |
| 2 | warn http 401 | 239 | 45 of them `GET /api/admin/logs`, others admin/stats, bookmarks | auth middleware | Expected anonymous checks and audit denial tests |
| 3 | warn contributions:dead-link | 77 | telemetry POSTs for 404 paths (QA paths, `/resource/N`) | `server/routes/domains/catalog-contributions.ts` | Noise, but real `/resource/N` ids are counted here |
| 4 | **error scheduled-backup** | 2 (11:05:17, 12:35:18, instance 4e7de364) | `Scheduled backup failed {"errorClass":"Error"}`, followed by `Scheduled backup check finished {"status":"error"}` | `server/backup/scheduledBackup.ts:132-134`; `errorClass` (`:86`) logs only `error.name`, so the cause is invisible | Owner-facing function broken: scheduled DB backup failed twice. No later backup at 24 h cadence is visible until 13:47 (manual, `Database backup finished` bytes 6118763). Cause UNKNOWN: it can be the lock client `connect()` (5 s timeout, `:116`) or backup itself |
| 5 | **error digest** | 1 (03:01:31, instance 1894a707, ran 2 minutes before it was retired) | `Digest cycle failed; retrying next hour` reason `Failed query: delete from "digest_unsubscribe_tokens" where expires_at < now() returning "id"` | `server/jobs/digestScheduler.ts:29`, `digestService.ts` | Digest email housekeeping failed once; next hourly cycles finished (e.g. 18:53, 19:52). Self-healed |
| 6 | **error link-health** | 1 (11:27:30) | `Progress write failed Failed query: update "link_health_jobs" set "checked_links"...` | `server/services/linkHealthService.ts:253` (fire-and-forget progress write, logs only `err.message`) | Progress counter only; the scan finished (4,091 links, 11:27-11:56 per 07b) |
| 7 | **error http 503** | 1 (09:51:11) | `POST /api/ops/run-due-jobs` 503, 30 ms | `server/routes/domains/ops-cron.ts:115-118`: `OPS_CRON_TOKEN` unset returns 503 | **The external cron entry point is not configured in prod.** Documented as a safety net for Autoscale at zero instances; with it 503, only in-process timers run. One probe seen; a real caller would show a 503 every 15 min, so none is calling it |
| 8 | **error admin** | 2 (17:45:13, 17:45:22) | `Error unapproving resource {"err":"Resource is not approved"}` | `server/routes/domains/admin-content.ts:640` | Handler returns 409 (3 x 409 in the log) but logs an ERROR with stack for an expected conflict. Audit probe; not a user break, but inflates error counts |
| 9 | info ops | 474 | `Slow database query`: select 405, update 55, delete 6, begin 4, commit 3, with 1; p50 726 ms, p95 2,601 ms, max 6,119 ms | `server/ops/operationalTelemetry.ts:98-107` | DB tail latency. Peak hours 06Z and 11Z. The only indirect pool/DB signal |

Watchdog: 11-06 had 2 x ERROR "Orphan watchdog periodic sweep failed ... connection timeout". In 1cd25ab0 the sweep retries once (`orphanJobWatchdog.ts:~220-226`) and only errors after 3 consecutive failures (`:192,:228-236`, WARN first). Today: 0 failure lines on any instance. The sweep still logs nothing on success (`:250`), so sweeps run per day cannot be counted.

## 4. Health snapshot diff

Files: `lead/health-1.json` (20:27:25Z), `logs/health-2.json` (20:59:13Z), `logs/health-3.json` (21:31:14Z). Same boot throughout (`migrations.completedAt 18:52:43.594Z`), so counters are comparable and no restart happened.

| Counter | Snap 1 | Snap 2 | Snap 3 |
|---|---|---|---|
| status / pool max,total,idle,active,waiting | ready / 8,6,6,0,0 | ready / 8,6,6,0,0 | ready / 8,4,4,0,0 |
| pool.errors | 0 | 0 | 0 |
| pool peakActive / peakWaiting | 6 / 0 | 8 / 6 | 8 / 8 |
| DB queries with errors (all commands) | 0 | 0 | 0 |
| selects: count / slow(>=500ms) / max ms | 13,495 / 17 / 1,820 | 26,361 / 25 / 3,089 | 33,719 / 35 / 3,089 |
| other commands (update/insert/begin/commit/delete) | 105/0/8/2/8 | 171/43/59/37/19 | 206/46/65/37/19 |
| endpoint 5xx buckets | none | none | none |
| endpoint 4xx (sum of DOC:* and GET:*) | 23 | 98 | 125 |
| DOC requests total | 559 | 998 | 1,449 |
| DOC:resource:bot-ai 4xx | 17 | 20 | 36 |
| publicCache generation / entries / resource-mutation invalidations | 1 / 383 / 0 | 14 / 31 / 13 | 14 / 294 / 13 |
| cache evictions live/expired, heavyWork peakQueued | 0/0, 0 | 0/0, 0 | 0/0, 0 |

Reading:
- No query errors, no 5xx, no pool errors, no cache or heavy-work failures in any snapshot.
- Pool saturation happened between snaps 1 and 2 and again by snap 3: peakWaiting 0, then 6, then 8 (pool max 8). Nothing failed (0 errors, 0 5xx), but requests waited for a connection. Idle pool shrank 6 to 4 at snap 3. This coincides with parallel audit lanes starting around 20:35Z, so audit load is the likely cause (UNVERIFIED); it shows the pool can fill with a modest read load. The logs have no pool gauge to date it (issue #284).
- Slow selects 17 to 25 to 35; max 1,820 to 3,089 ms. Same slow-DB tail as the log's 474 slow lines.
- publicCache generation 1 to 14 with 13 resource-mutation invalidations between snaps 1 and 2: the QA/audit writes from other lanes emptied the cache (383 to 31 entries); it refilled to 294 by snap 3.
- DOC 4xx growth is bot-ai resource pages (17, 20, 36) plus human resource 404s (0 to 45, audit probes in the same window); consistent with the log's /resource/N 404s.

## 5. Blind spots

1. **Pre-logger crashes**: `installProcessHandlers()` runs at `server/index.ts:50` after the imports; an import-time throw or a failed boot prints Node's raw trace only to the platform log. `index.ts:590` and `:779` exit(1) after logging, but the 3 s flush may lose the line.
2. **OOM / SIGKILL / platform restarts**: invisible in the sink. 6 instance retirements today (02:54, 03:00, 03:02, 04:49, 07:35, 18:52) left **no `SIGTERM received` line** (`processHandlers.ts:41-46` would write one), so Replit retires instances without delivering a catchable SIGTERM or the flush loses the race. UNVERIFIED which. Instance 4e7de364 ended at 18:52:08 with a final `/api/health/ready` probe and no shutdown line.
3. **Retention gaps**: only 17.8 h exist (shipping began with the 02:45Z deploy). The oldest slices (10-31 through 11-07T01Z) were scanned and are empty. The 7 d claim is unproven until 11-14. The sink holds a 60 s buffer: up to 500 records lost on a hard kill. Also 6 hours hit the 2000 cap in my slicing, so those hours are undercounted.
4. **Query cap**: 200 objects / 2000 records per call (`admin-logs.ts:26-28,93`). `since=-24h` returns only the newest ~100 min with `truncated=true`; a whole-day count needs hourly slices.
5. **Client-only errors**: no endpoint ships browser errors into the sink; the only client hook is `client/src/hooks/use-analytics.tsx` (vendor SDK, consent-gated, suppressed under `navigator.webdriver`). JS exceptions, hydration failures, failed asset loads (`/assets` is not logged) and Core Web Vitals are not in the log. PostHog is BLOCKED (OAuth).
6. **Bots**: `bot-ai`/`bot-search` traffic only appears as counts in `DOC:*` telemetry (health snapshot) and as 404/410 lines; successful page views are not logged at all (page documents are logged only at >=400).
7. **Success silence**: periodic watchdog sweep, admin edits/deletes/category/user changes (http line only, no actor on GET; mutating calls carry `user=`), backup failure cause.
8. **Instance identity**: 7 distinct tags today; the first has no suffix. Two overlapped at 03:00 (1894a707 and 2441095d), so Autoscale does run more than one instance at times, and `ops/health` is per instance and reset on restart.
9. **Pool pressure**: pool numbers appear only in watchdog failure lines and the health endpoint, never as a periodic gauge.
10. **Date-less stdout**: stdout lines already carry ISO time (`logger.ts:319`), so the 11-06 gap is closed.

## 6. Self-healing signal inventory

| Signal | Exists today? | Latency | False-positive risk | Needs |
|---|---|---|---|---|
| `GET /api/health`, `/live` (process up) | yes, unauthenticated | seconds | low | external poller (launchd/curl) |
| `GET /api/health/ready` (DB reachable, 750 ms acquire / 500 ms query budget) | yes, unauthenticated, 200/503 | seconds | medium: a slow DB tail (p95 2.6 s slow queries) can trip a 500 ms budget on a busy minute; require 2 consecutive failures | poller |
| `/api/version` revision = expected main SHA | yes | seconds | none | poller |
| Log query: error-level count per hour (`level=error`) | yes, admin session | up to 60 s flush + poll interval | low (7 errors/17.8 h baseline) but #8 (409 logged as error) must be excluded or fixed | admin credential for an agent; hourly slice query; today only manual |
| Log query: 5xx and 429 count | yes (`q=` substring on fields `"status":5`) | as above | low (1 x 503, from missing OPS_CRON_TOKEN) | same |
| `Scheduled backup failed` / no `Database backup finished` in 24 h | partial: failure line exists, cause missing | 30 min | low | log the error message at `scheduledBackup.ts:133` |
| Digest cycle finished hourly | yes (`Digest cycle finished` every hour) | 1 h | medium (a zero-work cycle still logs finished) | absence-alert logic |
| Watchdog sweep failure (WARN then ERROR after 3 consecutive) | yes, quiet when healthy | 3 min | low | none; success heartbeat missing |
| Pool waiting/exhaustion | health endpoint only (`peakWaiting` reached 8 of 8 by 21:31Z with 0 failures); no log gauge | poll | medium: peak counters never reset, so alert on delta | periodic gauge line when `waiting>0` (issue #284) |
| Crash / SIGTERM / OOM | partly: `process` area lines in code, **none ever observed**; OOM/SIGKILL no | n/a | n/a | Replit deployment log access, or heartbeat gap detection (a new instance tag plus boot sequence in the sink is a reliable restart signal today: 7 seen) |
| Restart detection (new `instance` tag + `Serving on port`) | yes | 60 s | low | query |
| `ops/health` counters (query errors, 5xx buckets, cache failures, pool.errors) | yes, admin session, per instance | poll | low | poller with admin cookie or token (none exists for agents; OPS_CRON_TOKEN is unset) |
| Client JS errors / hydration / CWV | no | n/a | n/a | PostHog OAuth, or a rate-limited client-error POST logging area `client` |
| Alerting of any kind | no | n/a | n/a | owner decision on Axiom/PostHog alerts (no alerts created this run) |

## 7. Findings to carry to the lead

- F-LOGS-1: Scheduled DB backup failed twice (11:05, 12:35Z) and the log carries no reason (`errorClass` is `Error`). Fix: log `error.message` (scrubbed) at `scheduledBackup.ts:133`.
- F-LOGS-2: `OPS_CRON_TOKEN` unset in prod, so `/api/ops/run-due-jobs` returns 503 (09:51:11Z). The documented zero-instance safety net is not armed. Owner secret decision.
- F-LOGS-3: expected 409 conflicts logged as ERROR with stack (`admin-content.ts:640`). Lowers the signal of the error count.
- F-LOGS-4: `/api/awesome-list/listing` 404 x30 (route exists, `server/contracts/endpointSchemas.ts:681`; client `TaxonomyListing.tsx:95` handles a 404 for an unknown taxonomy) and `/api/resources/N/related` 404 x32 (deleted ids): likely audit probes and stale links, UNVERIFIED which.
- F-LOGS-5: no SIGTERM line on any of 6 retirements, so the flush-on-shutdown path is unproven.
- F-LOGS-6: 11-06's watchdog connect-timeout error did not recur on 1cd25ab0/60e07dcf (retry plus WARN-first landed).
