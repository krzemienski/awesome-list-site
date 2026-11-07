# Lane: logs (prod-ops 2026-11-06)

Read-only. No `publish_app` / `update_app_using_prompt`; no POST/PUT/PATCH/DELETE to awesome.video; SSH used only for read-only `hostname`/`date`/`ls`. Evidence: `evidence/logs/`.

## 1. Access-level verdict

**UI-only, with a thin, lossy agent-mediated read path. Not durable, not queryable.**

| Path | Result | Evidence |
|---|---|---|
| Replit MCP tools | No tool returns logs. Tools: `ask_question`, `get_publish_status`, `list_app_files`, `read_app_file`, `search_apps`, `resolve_app_by_name`, `list_apps` (+ `publish_app`, `update_app_using_prompt`, `create_app_from_prompt`, off-limits/irrelevant). `get_publish_status` → `{"found":true,"deploymentId":"b112b7e1-…","status":"success","url":"https://awesome.video"}` for replId `71ccccc7-37f7-4f07-a880-5973ae4aa911` ("Awesome Video"). Note: `search_apps url=https://awesome.video` returns `[]`, and the app named "awesome list site" (51c665b4, the SSH dev workspace) has `found:false` publish status; the prod replId is **71ccccc7** (“Awesome Video”). | tool outputs in this run |
| Replit Publishing → Logs UI | UI-only. A fresh headless agent-browser to replit.com is stopped by a Cloudflare "Attention Required" challenge, not signed in. No signed-in agent-reachable browser was evidenced (chrome-devtools MCP session not inspected). **Owner export/screenshot needed: Replit → Awesome Video → Publishing → Logs tab (filter by level/time).** | `evidence/logs/replit-com-unauth.png` |
| `ask_question` (Replit Agent) | **Works, but it is the Agent's report, not the log.** 2 of the 3 allowed questions answered (the third was unnecessary; two parallel sends bounced with "Agent busy … NOT submitted" — send them strictly one at a time). Agent returned verbatim-looking timestamped lines. Reach: **only the currently live build** (from 2026-11-06T18:36:11.633Z, boot of this build, to the time of asking; ~2 h, 1,168 lines). The Agent said logs of earlier builds "aren't reachable from here". | `askq-a-30-recent-warn-error.txt`, `askq-b-classes-window.txt` |
| SSH `awesome-replit` | DEV workspace container (`REPLIT_DEPLOYMENT` unset); `/var/log` holds only system logs. Contains no production app logs. | ssh output |
| In-process telemetry | `GET /api/admin/operations/health` (owner session): counters since this instance's boot, per instance, reset on restart. Useful signal, not a log. | `ops-health-*.json`, captures below |
| DB-persisted job history | Durable: `GET /api/enrichment/jobs`, `/api/researcher/jobs`, `/api/admin/link-health/remediation` carry `errorMessage` per job back to 2025-11-18. This is the only durable failure record, and it covers jobs only. | `enrichment-jobs.json`, `researcher-jobs.json`, `linkhealth-remediation.json` |

**Window actually available: ≈2 hours (current build), via an LLM intermediary.** An agent cannot query production logs unattended.

## 2. What the code logs (read in full: logger.ts, requestContext.ts, operationalTelemetry.ts, bootState.ts, index.ts, errorHandler.ts, privateStorage.ts)

- Single write choke point: `server/lib/logger.ts:239` `write()` → `console.error` / `console.warn` / `console.log`. Everything else is stdout/stderr scraped by Replit.
- Line: `HH:MM:SS LEVEL [area] message k=v … rid=<6 hex> req="METHOD /path"`; ERROR lines append up to 8 scrubbed stack frames on following lines (multi-line events).
- **Timestamp is time-only, no date** (`logger.ts:234-237`: `toISOString().slice(11,19)`, UTC). The date only exists in the platform's own prefix (the Agent's quotes show `[2026-11-06T20:12:36.130Z ERROR] 20:12:35 ERROR …`, i.e. the platform adds an ISO ts and a stream label; the label `ERROR` means stderr, not severity — all `console.warn` lines were shown under `ERROR`).
- **No instance/machine/process id on any line** (no `hostname`/`pid`/`REPLIT_*` read in server code; the Agent confirmed none in lines). Multi-instance Autoscale traffic cannot be told apart.
- **rid correlation:** `rid` = `randomBytes(3)` (24 bits, `requestContext.ts:40`), unique only per request within a short window; set by `operationalRequestContext`; the status line (`logHttpRequest`, area `http`) and any in-request lines share it. Background jobs (watchdog, schedulers) have no rid. 24-bit ids will collide at volume and across instances.
- Levels: INFO / WARN / ERROR only. 5xx → ERROR, 4xx (not 401) → WARN, rest INFO. Page documents are logged only when ≥400. API requests: one line each. Static `/assets` not logged.
- Areas (≈47 `createLogger` areas): http, startup, migrations, job-watchdog, link-health, digest, enrichment, research, ai-jobs, ops, db, public-cache, heavy-work, errors, rate-limit, auth, github-sync, backup, contributions, … ; ops adds `Database query failed` (WARN, errorClass) and `Slow database query` (INFO, ≥500 ms).
- Not through the logger: no `uncaughtException` / `unhandledRejection` / `SIGTERM` handlers anywhere in `server/` (`rg`): a crash prints Node's raw trace to stderr, and there is **no flush hook** for any future buffered sink. `server/index.ts:569` logs migration failure and `process.exit(1)`.
- Boot/migrations logged: `[migrations] Migrations completed successfully`, `Migration journal verified: 34 recorded, all 34 … applied`, `[startup] Serving on port 5000 mode=production`.
- 127 `console.*` calls outside the logger are all in CLI/test scripts (`cli/parse-list.ts`, `cli/seedJourneys.ts`, `ai/test-blurhash.ts`, …), not the server request path.

## 3. Error / warning classes seen (window: 2026-11-06T18:36:11Z → 20:38:51Z, Agent's claim) 

| Class | Count (Agent claim) | Example | Severity |
|---|---|---|---|
| App INFO | 857 | `[http] GET … status=200` | — |
| App WARN | 271 (269 are 404s) | `WARN [http] GET /resource/190625 status=404 ms=37`; probes `/resource/<id>/.git/config` ×3 at 20:18:11 (scanner traffic); `[contributions:dead-link]` | noise; **/resource/<numeric id> 404s ≈ visitors/crawlers hitting deleted resources (≥15 in last 20 min)** |
| App ERROR | 2 | `[job-watchdog] Orphan watchdog periodic sweep failed (non-fatal) … cause="Connection terminated due to connection timeout"` at 19:50:33.931Z and 20:12:35 (22 min apart) | **real: DB connection timeout on the enrichment_jobs query** |
| Lines with no level | 38 | platform/Node lines, e.g. `extending Node.js network family autoselection attempt timeout` | startup notice |
| 5xx | none seen in the Agent's window; telemetry on the instance I hit shows 0 `5xx` endpoint buckets and 0 DB errors | | — |
| Pool | telemetry `pool.errors=0` but `peakActive=8`, `peakWaiting=5` against `databasePool.max=3` (and `total:4`) — see §6 note | | worth a look: pool max 3 is exceeded by the peak counters |
| Slow queries (telemetry, since boot) | select: 6,824 queries, 62 ≥500 ms, **max 7,200 ms**; update: 142, 9 slow, max 2,731 ms | | slow tail present, no per-query log lines in the Agent's 24 h/2 h summary other than counts |
| Link-health | 14 lines, 0 failures; `Link health schedule on: a full scan every 24h`; remediation job 14 completed 2026-11-06 12:06Z (4,100 checked, 27 broken, 16 suspect) | | OK |
| Digest | 14 lines, 0 failures; cycles finished at 18:36:31 and 19:36:18; the 20:36:16 cycle "started" with no "finished" in the window (unconfirmed) | | verify later |
| Enrichment (DB history) | 36 jobs: 25 completed, 8 cancelled, 3 failed — all 3 `Orphaned by server restart` (2025-11-18, 2025-11-19, 2026-06-26) | | server-restart orphans |
| Researcher (DB history, last 50 jobs, 2026-07-30 → 2026-11-06) | 21 completed, 13 cancelled, 11 `budget_stopped`, 5 failed (402 glm credits exhausted; 429 codex quota; 400 model `gpt-6.1-sol` not in catalog; 400 `__qa_test_unknown_model__`; 1 orphaned by restart) | | upstream model/budget errors, durable in DB |
| Boot/migration | one clean boot at 18:36:15; `/api/admin/operations/health` agrees (`migrations.completedAt 2026-11-06T18:36:15.638Z`) | | OK |

Also: `/api/admin/operations/health` `telemetry.endpoints` shows per-group counts (e.g. `GET:link-health:2xx` max 1,446 ms; `GET:other:2xx` max 1,303 ms; `GET:catalog:2xx` max 869 ms). Mutating buckets seen on this instance (`POST:other:2xx` 9, `PATCH` 1, `PUT` 1) are not from the logs lane (it sent none); other lanes/visitors.

## 4. Live signal captures

Spaced ≥10 min. `captures.txt` has raw output; `ops-health-N.json` the bodies. (Table completed at end of run.)

| # | UTC | /api/version | /api/health/ready | ops/health | migrations.completedAt | pool total/idle/active/waiting (max 3) | selects (count / ≥500ms / max ms) | pool.errors / peak |
|---|---|---|---|---|---|---|---|---|
| 1 | 20:36:48 | 200 0.13s, rev 6cb1a93e | 200 0.28s `ready` | 200 0.19s | 18:36:15.638Z | 4/4/0/0 | 4,873 / 52 / 7200 | 0 / 8, 5 |
| 2 | 20:51:57 | 200 0.14s, same rev | 200 0.30s | 200 0.18s | same | 2/2/0/0 | 7,816 / 66 / 7200 | 0 / 8, 5 |
| 3 | 21:02:57 | 200 0.11s, same rev | 200 0.30s | 200 0.21s | same | 3/3/0/0 | 8,691 / 69 / 7200 | 0 / 8, 5 |
| 4 | 21:13:58 | 200 0.11s, same rev | 200 0.53s | 200 0.19s | same | 3/3/0/0 | 10,328 / 75 / 7200 | 0 / 8, 5 |

Differences: none that indicate a second instance. Revision is constant, `migrations.completedAt` is constant, and every counter rises monotonically (selects 4,873 → 10,328; cache evictions 1,065 → 1,445), so all four owner-session responses came from one process that booted 18:36:15Z (uptime ≥2h38m at the last capture). Only the idle pool size moves (4 → 2 → 3 → 3). That is one instance seen from one vantage, not proof there is only one: with no instance id in responses or logs, a second instance serving other requests could not be detected. Each ops/health response is per-instance and in-memory, so a restart would zero the counters. All captures: 0 DB errors, 0 pool errors, no 5xx endpoint bucket, 0 heavy-work ops. Slow selects keep growing (52 → 75 ≥500 ms) with the same max 7,200 ms.

## 5. Gap statement

1. **Retention:** none that an agent can reach. The UI shows the live build only; the Agent says earlier builds are unreachable. The window is ≈2 h today and resets at every publish. Durable record = only DB job rows.
2. **Query:** no API. `ask_question` is natural-language retrieval by a second LLM, costs Agent credits, bounces if the Agent is busy (and the reply can be lost if it outlives the call timeout), and returns "verbatim" text that is the Agent's claim. It can silently truncate (it summarised 101 lines into 30) and cannot be diffed or counted reliably.
3. **Multi-instance coverage:** unknown. Lines have no instance id; Autoscale may run several instances; ops telemetry is per instance and reset on restart, and I cannot tell which instance a given `/api/admin/operations/health` response came from (see captures: `completedAt` identical on every capture so far ⇒ same boot).
4. **Correlation:** `rid` is 24-bit random, request-scoped only, absent on background jobs, and not carried to the client (no `X-Request-Id` check done here).
5. **Date-less timestamps:** app lines carry `HH:MM:SS` only; the date comes from the platform prefix, which a sink would not get unless the logger emits full ISO. Day boundary ambiguity inside any exported/copied log.
6. **Stderr label ≠ severity:** platform labels every `console.warn` as `ERROR`. Counting "ERROR" lines in the UI overstates errors by ~100× (271 WARN + 2 ERROR show as 101 "ERROR/WARN-tagged" in a 24 h answer).
7. **No crash capture / no flush hook:** no `uncaughtException`/`unhandledRejection`/`SIGTERM` handlers.
8. **Self-healing precondition not met:** an agent cannot poll, tail, count or alert on production logs without a human or a credit-spending Agent in the loop.

## 6. Notes worth the lead's attention

- `databasePool` reports `max:3, total:4`; telemetry `peakActive:8, peakWaiting:5`. Either the counters sum multiple pools or the pool exceeds its configured max; the watchdog timeouts ("Connection terminated due to connection timeout") are consistent with pool pressure. Not investigated further (read-only lane).
- Watchdog sweep failures recur ~every 22 min in the Agent's window (19:50, 20:12), described as non-fatal.

## 7. Log sink comparison (R1-logs, R3 pins)

Volume assumption: the Agent counted 1,168 lines in ≈2 h 2 min of the live build (this window includes heavy parallel audit traffic ⇒ upper-ish bound) ⇒ ≈575 lines/h ≈ **14 k lines/day**. At ~200 B/line (incl. stack frames on ERROR) ≈ **2.8 MB/day ≈ 85 MB/month**. Even 10× that (≈850 MB/month) fits every free tier below except Better Stack's 3-day window.

| Option | Free tier (page quoted) | Agent query API | Retention | Autoscale fit | Change to `logger.ts` | Package / pin / docs |
|---|---|---|---|---|---|---|
| (a) JSONL to existing private App Storage bucket via `privateStorage.ts` | no new vendor; bucket cost not stated in the SDK docs fetched | **none today.** `client.list({prefix})` + `downloadAsText` exist (list already used: `server/backup/databaseBackup.ts:483`); the SDK has **no append** (uploads overwrite) so each flush must be a new object. The agent could only read it via a **new admin GET route** (not allowed pre-approval) or the dev workspace if it shares the bucket (unverified) | forever (until pruned) | works, but must write per-instance objects (`logs/<env>/<date>/<instanceId>-<ts>-<seq>.jsonl`), batch (e.g. every 5 s / 100 lines), and flush on SIGTERM which does not exist yet; a hard kill loses the buffer | moderate: batching writer + instance id + SIGTERM hook + ISO ts (~80 lines) **plus** a query route | `@replit/object-storage@1.0.0` already a dependency (`package.json:61`); docs https://docs.replit.com/reference/object-storage-javascript-sdk |
| (b) Better Stack Logs | 3 GB/mo, **3-day** retention, $0 | v1 `GET telemetry.betterstack.com/api/v1/query` is **deprecated** per its doc; current path is a ClickHouse HTTP endpoint with **basic auth** (`curl -u user:pass -X POST 'https://eu-nbg-2-connect.betterstackdata.com' -d "SELECT dt, raw FROM remote(tNNN_source_logs) … FORMAT JSONEachRow"`), password shown once | 3 days | fine (HTTP ingest) | small | `@logtail/node@0.6.1`, `@logtail/pino@0.6.1` (npm modified 2026-11-06); docs https://betterstack.com/docs/logs/query-api/connect-remotely/ |
| (c) Axiom | Personal $0: **500 GB/mo ingest, 30-day retention**, 25 GB storage, 10 GB-hours/mo query compute | `POST https://<AXIOM_DOMAIN>/v1/query/_apl?format=tabular`, `Authorization: Bearer <token>`, body `{"apl":"<dataset> \| where level==\"ERROR\" \| limit 50","startTime":…,"endTime":…}`; advanced API token with custom **query-only** permission per dataset (basic tokens are ingest-only; the page does not name the exact scope strings) | 30 days | good; batched HTTP ingest; SDK flushes on interval and has a manual `flush()` for a SIGTERM hook | small: in `write()` also push a structured object `{_time, level, area, msg, rid, instance, fields}`; add `instance` (e.g. `REPLIT_DEPLOYMENT_ID`/`hostname`) and full ISO time | `@axiomhq/js@2.0.0` (npm modified 2026-09-03), `@axiomhq/pino@2.0.0`; docs https://axiom.co/docs/restapi/query , https://axiom.co/docs/reference/tokens |
| (d) Grafana Cloud Loki | 50 GB logs/mo, **14-day** retention, 3 active users | `GET /loki/api/v1/query_range?query=<LogQL>&start=&end=&limit=&direction=` ; Grafana Cloud uses HTTP Basic (user/tenant id + access-policy token). Push: `POST /loki/api/v1/push` JSON `{"streams":[{"stream":{labels},"values":[["<ns epoch>","line"]]}]}` (gzip allowed) | 14 days | good | small, and **zero dependencies possible** (plain `fetch` push), or `pino-loki@3.0.0` / `winston-loki@6.1.7` | docs https://grafana.com/docs/loki/latest/reference/loki-http-api/ |
| (e) Sentry (errors only) | Developer plan: 5k errors, 30-day lookback; pricing page lists API access as **No** on Developer (not verified against API docs, so treat as unconfirmed) | issues/events REST API (needs auth token); unconfirmed on free tier | 30 days | good | adds `Sentry.init` + capture hook in `errorHandler` and `logger.error`; does not capture WARN/INFO/request lines | `@sentry/node@11.11.0` (modified 2026-11-05); https://docs.sentry.io/pricing/ |

### Recommendation: **(c) Axiom**

1. Biggest free ceiling (500 GB/mo vs an ~85 MB/mo need) with 30-day retention, so no pricing pressure and 30 days of history for incident review.
2. A real agent-callable query path: one `POST` with a bearer token and a read-only token that can be issued separately from the ingest token, so an unattended agent never holds write credentials. APL gives counts/group-by (`summarize count() by area, level`), which is exactly what the Agent-mediated route cannot do.
3. Smallest app change: all output funnels through `logger.ts:239 write()`; add one structured push there plus a flush on `SIGTERM`/`beforeExit`, and add `instance` + ISO time fields (fixes gaps 3 and 5 at the same time).
4. Stays a sink, not a rewrite: stdout/stderr output is unchanged, so the Replit UI still works.

Why the others lost: **Better Stack** — 3-day retention is shorter than the ≈2-hour/one-build window problem warrants fixing only barely, and its current query path is ClickHouse basic-auth credentials shown once, with the old REST endpoint deprecated. **Loki** — a close second (14 days, 50 GB, dependency-free push); pick it if the owner prefers Grafana, but its auth model (basic with tenant id + token) and LogQL are a bit more fiddly for an agent than Axiom's bearer + APL. **Sentry** — errors only, no request/WARN trail, and API access on free is doubtful; it complements but does not replace a log sink. **Bucket JSONL** — no vendor, but append-less object writes, per-instance keys, SIGTERM-less flush, and no query surface until a new admin route is built; most work for the least capability.

Open verification items before adopting Axiom (not exercised: no account created, no ingest/query call made): exact query-only token permission names, whether the edge domain differs per region, Replit egress to `api.axiom.co` from Autoscale, and the free plan's 10 GB-hours query-compute ceiling under agent polling.

## 8. HAR / write-method table

This lane used no browser traffic to awesome.video (one agent-browser visit to replit.com, blocked by Cloudflare, no HAR). All awesome.video requests were `curl` GETs: `/api/version`, `/api/health/ready`, `/api/admin/operations/health`, `/api/enrichment/jobs`, `/api/researcher/jobs`, `/api/admin/link-health/remediation`. POST/PUT/PATCH/DELETE sent: **0**.

## Lead correction (2026-11-06)
§3/§6 "pool max 3": that `max: 3` is a hard-coded literal in the ops panel (`server/routes/domains/operations.ts:96`). The real app pool max is **8** (`server/db/index.ts:35`), with a separate rate-limit pool of 2 (`pgRateLimitStore.ts:49`). peakActive 8 = the pool's own ceiling; peakWaiting 5 still means it saturated. See PLAN B4.
