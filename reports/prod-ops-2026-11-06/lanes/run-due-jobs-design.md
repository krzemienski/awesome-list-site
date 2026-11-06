# Design: `POST /api/ops/run-due-jobs` (code design only; nothing built or called)

Layout is mine. Purpose: an external cron (cron-job.org, every 15 min) wakes an idle Autoscale instance and runs the jobs that are due (B2). All file:line refs are in `.claude/worktrees/prod-ops`.

## Auth
- `Authorization: Bearer <OPS_CRON_TOKEN>`, a new Replit Secret (an approval-gated change). If the secret is unset the route answers 503 and does nothing (fail closed, same posture as the missing-config checks elsewhere).
- Compare in constant time. Reuse the pattern at `server/clerkAuth.ts:178-182` (`secretsMatch`: sha256 both sides, then `timingSafeEqual`). It is not exported, so export it or copy 5 lines. Wrong or missing token: 401 with no detail.
- Not behind `isAuthenticated`/`isAdmin` (`operations.ts:63`), because the caller has no session. Register it in `operations.ts` next to the health routes.

## Rate limiting and logging
- Wrap with `createRateLimiter` (`server/middleware/rateLimit.ts:194`) at about 10 requests per 15 min per IP. `trust proxy` is already 1 (`server/index.ts:134`). Failed-auth attempts count too.
- One structured log line per job per call via `createLogger("ops-cron")`: job, outcome, ms. Never log the token or the header. Errors log class and code only, matching `contactRetentionScheduler.ts:35-40`.

## Per-job idempotency (each call is safe to repeat)
| Job | Reuse | Why a repeat is harmless |
|---|---|---|
| Link scan | `linkHealthService.startCheckIfDue(24)` `linkHealthService.ts:158` | Returns null if a scan is pending/processing (`:165`), if a failed run is under the retry pause (`:167`), or if the last completed scan is under 24 h old (`:174`). `startCheck` takes `pg_advisory_xact_lock(5116, 7)` (`:185`), so two instances cannot both start one. |
| Digest | `runDigestCycle({workerId, limit: 20})` `digestService.ts:1191` | Recovers stale jobs, enqueues due ones, claims by `workerId` (`:1200-1203`). Mirrors `digestScheduler.ts:19`. |
| Contact purge | `purgeExpiredContactSubmissions(500)` `ContactRepository.ts:14` | Batch deletes of expired rows only; loop and cap copied from `contactRetentionScheduler.ts:22-26` (500 x 20 batches). Run at most hourly: skip when called within the hour. |
| Backup | `createDatabaseBackup({createdBy: null})` `databaseBackup.ts:386`; age check via `listDatabaseBackups` `:481` | Due only if the newest backup is over about 20 h old. The only guard inside is the per-process flag (`:392-393`), so it needs the cross-instance lock below. **Keep 14 needs new code:** `databaseBackup.ts` exports no delete/prune function, so pruning means adding one that deletes the oldest `.dump` + `.manifest.json` pairs beyond 14 (the new code must never delete the newest backup). Ship backup first and pruning second if scope matters. |

## Cross-instance lock
Only the backup needs one (the other three are already serialized above). Use a session-level `pg_try_advisory_lock(5117, 1)` on a dedicated `pg.Client` (not the shared pool: a transaction-scoped lock would release before the roughly 10 s dump ends), released in `finally`. If not acquired, report `skipped: "locked"`. `createdBy: null` is already allowed by the signature (`:388`). The existing backup route uses `runHeavyWork` (`export-link-health.ts:1057`); reuse it for backup so it shares the one heavy-work slot (`heavyWork.maxActive: 1`, seen in `health-1.json`).

## Response shape
HTTP 200, `Cache-Control: no-store`, always JSON so cron-job.org can alert on a changed body:
`{"ranAt":"<iso>","jobs":{"linkScan":{"outcome":"started|not_due|running","jobId":14},"digest":{"outcome":"ran","processed":0},"contactPurge":{"outcome":"ran|not_due","deleted":0},"backup":{"outcome":"created|not_due|locked|failed","id":"…"}}}`
A job error becomes `outcome:"failed"` for that job only and never fails the others. Return 500 only if the route itself breaks, so a cron-job.org failure notification means something real.

## A job that outlives the request (the real risk)
- Digest, purge and backup are short (seconds): **await** them inside the request, so the instance is certainly up while they run.
- The link scan runs 20-90 min (`lh-history.json`), so it must be **fire and forget**: `startCheckIfDue` returns after creating the job and runs `runCheckInBackground` detached (`linkHealthService.ts:203-205`). The route answers `started` immediately.
- **Risk:** Autoscale may scale the instance down after the response. The history shows exactly that outcome: jobs 6, 7 and 11 ended "Interrupted by server restart". I cannot confirm Autoscale's idle timeout (docs silent, see Follow-up). Mitigations, cheapest first: (1) the 15-min cron is itself traffic, which probably keeps the instance up through a scan (UNVERIFIED); (2) an interrupted scan is already recovered (`recoverInterruptedJobs` `:74`, called at `:159`) and retried after the short pause (`:167`), so the cost is delay, not corruption; (3) if scans still die, move only the scan to a Reserved VM or a Scheduled Deployment, which are always-on during the run. Verify by reading job statuses for a week after launch.

## Existing in-process timers
Keep them. `initializeLinkHealthScheduler/DigestScheduler/ContactRetentionScheduler` (`server/index.ts:753-755`) are harmless duplicates: every job is idempotent as shown, so a tick and a cron call at the same moment cannot double-run. They cover the case where cron-job.org is down. Remove them later only after a month of clean cron history. Do not touch `linkHealthIntervalHours` (`linkHealthScheduler.ts:11`); the endpoint passes the same value. The orphan watchdog (`orphanJobWatchdog.ts:186`) stays as is.

## Change size and open items
About 1 new route file (about 80 lines) plus an exported `secretsMatch`, a prune function (if keep-14 is in scope), one Secret and one cron-job.org entry. No schema change. Open: the Autoscale idle timeout; whether the existing backup bucket permits deleting objects from the app.
