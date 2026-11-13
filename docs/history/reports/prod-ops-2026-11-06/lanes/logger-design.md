# Logger upgrade design (PLAN §4)

> Layout is mine. Design only: no code was edited. Source: origin/main `6cb1a93e`. `logger.ts` is 354 lines; its single write point is `write()` at `server/lib/logger.ts:239`, called only from `emit()` (`:246`), which `createLogger` and `logHttpRequest` (`:324`, `:337`) both use.
> UNVERIFIED: nothing was run. Axiom API details are from memory of its public ingest API, check before coding.

## Findings that shape the design
- Line today: `HH:MM:SS LEVEL [area] msg k=v … rid=… req="…"` (`:234-237`, `:311`). Time is `toISOString().slice(11,19)`, so the date is dropped.
- `rid` is 3 random bytes per request (`ops/requestContext.ts:35`) and is added only when `getRequestLogContext()` finds an AsyncLocalStorage store (`logger.ts:303-307`). Background jobs have no store, so their lines carry no id. `logHttpRequest` passes `rid` explicitly (`:349`).
- **No `process.on(...)` handler exists anywhere in `server/`** (grep over `server/`, excluding `cli`). An uncaught exception or unhandled rejection currently produces Node's default stderr dump and exit, with no structured line, and SIGTERM during an Autoscale scale-down is silent.
- No instance id is read in code. Env names seen in the repo: `REPLIT_DEPLOYMENT` (`"1"` in prod, `lib/privateStorage.ts:32`), and from a dev-workspace dump only `REPL_ID`, `REPLIT_CLUSTER`, `REPLIT_ENVIRONMENT`, `REPLIT_DOMAINS` (`docs/audit-578/.../2-repaired.out`). That dump is a workspace, not a deployment, so I found **no documented per-instance variable** for Autoscale. `REPL_ID` is per app, not per instance.

## (1) Full timestamp
Change `timestamp()` (`:234`) to return `now.toISOString()` for the stdout line. Keeps the Replit viewer readable (longer by 11 chars). The shipped record uses the same ISO string as `_time`.

## (2) Instance id
`const INSTANCE = process.env.INSTANCE_ID ?? process.env.HOSTNAME ?? bootUuid` where `bootUuid = crypto.randomUUID().slice(0,8)` generated once at module load. Reasoning: a boot uuid is unique per process, which is what Autoscale needs (each scale-up is a new process). `HOSTNAME` is probably the container name but is **UNVERIFIED** for Replit, so log it as a separate field once at boot rather than trusting it. Also attach `deployment: REPLIT_DEPLOYMENT === "1" ? "production" : "dev"` and `commit` (the SHA `version-route.ts` already reads). On stdout the id appears only on the boot line and on ERROR lines (`inst=ab12cd34`), to keep viewer lines short; every shipped record carries it.

## (3) rid and job context
Reuse the existing store, no second mechanism. Add to `requestContext.ts` a small `runWithJobContext(job: string, jobId: string|number, fn)` that runs `fn` inside the same `AsyncLocalStorage` with `{ id: jobId-based, kind: "job", job, jobId }`. `getRequestLogContext()` then returns either shape and `emit` writes `rid=` for requests or `job=link-health jobId=412` for jobs. Wrap the entry points: `linkHealthScheduler.tick`, `digestScheduler.runScheduledCycle`, `contactRetentionScheduler.runScheduledCycle`, `startCheck`'s `runCheckInBackground`, `orphanJobWatchdog`, enrichment/researcher job runners. Each is a one-line wrap. Because ALS propagates through awaits, every line inside the job (including repository logs) is tagged.

## (4) Process handlers
Install from a new `server/lib/processHandlers.ts` (about 45 lines), imported and called in `server/index.ts` right after the module logger exists (`index.ts:44`), before `registerRoutes`/`listen`, so even boot failures are caught.
- `uncaughtException`, `unhandledRejection`: `logger.error("uncaught …", err)` (the existing scrubber and 8-line stack apply), `await sink.flush(2000)`, then `process.exit(1)` for exceptions. For rejections: log and flush, **do not exit** (Node's default is exit; keep that only if the team wants it, otherwise a stray rejection would take the site down; decide explicitly).
- `SIGTERM` (and `SIGINT`): log `shutdown signal`, stop accepting (`server.close`), `await sink.flush(3000)`, exit 0. The `server` object is created inside the async IIFE (`index.ts:576`), so `processHandlers` takes a `setShutdownHook(fn)` that the IIFE calls after `registerRoutes`. Autoscale gives limited grace time (**UNVERIFIED** how long); keep the flush timeout under 3 s.
- Guard against re-entry with a `shuttingDown` flag.

## (5) Sink adapter, at the choke point
In `logger.ts`, `emit()` already builds `message`, `pairs`, scrubbed values, level, area. Build one structured record there **after scrubbing** and hand it to `write()`:
```
interface LogRecord { _time: string; level: "info"|"warn"|"error"; area: string; message: string;
  fields: Record<string, unknown>; rid?: string; job?: string; jobId?: string|number;
  req?: string; inst: string; deployment: string; stack?: string }
interface LogSink { push(r: LogRecord): void; flush(timeoutMs: number): Promise<void>; stats(): {sent:number;dropped:number;queued:number} }
```
`write(level, line, record)` keeps `console.*` exactly as now, then `sink.push(record)`; `push` is synchronous, never throws, never awaits.
**Batching buffer (`server/lib/logSink.ts`, about 90 lines):** array capped at `LOG_BUFFER_MAX = 2000` records; when full, drop the **oldest INFO** first, else the incoming record, and increment `dropped`. Flush when `queued >= 200` or every 2 s (`setInterval(...).unref()`). Only one flush in flight; a failed POST retries once after 1 s then drops the batch and adds to `dropped`. A byte cap per batch (about 900 KB) keeps requests under the ingest limit. Emit a `sink.stats` record (sent/dropped) every minute so loss is visible in Axiom itself, and expose `stats()` on `/api/admin/operations/health`.
**Axiom implementation (`logSinkAxiom.ts`, about 45 lines):** `POST https://api.axiom.co/v1/datasets/${AXIOM_DATASET}/ingest` (EU orgs use `https://api.eu.axiom.co`; make the host `AXIOM_URL`, default the US one). Headers `Authorization: Bearer ${AXIOM_TOKEN}`, `Content-Type: application/x-ndjson`. Body: one JSON object per line, `_time` set from the record. Use global `fetch` with `AbortSignal.timeout(5000)`. If `AXIOM_TOKEN` or `AXIOM_DATASET` is unset the null sink is used and the logger behaves exactly as today. The sink's own failures log to stderr via raw `console.error`, never through `emit` (no feedback loop).

## (6) What stays identical
- Stdout line format and level labels, `console.log/warn/error` routing, 20,000-char line clip, 500-char value clip, stack handling, and `[label]` sub-area rewriting: untouched (only `timestamp()` widens).
- **Scrub before ship:** the record is built from the same already-scrubbed `words`/`pairs`/`stack` values, so `scrubText`, `isSensitiveKey`, `scrubPath` and the env-secret-value redaction run first, in the same order, and the sink only sees scrubbed text. The sink must never receive raw args. `AXIOM_TOKEN` matches the `TOKEN` pattern in `knownSecretValues()` (`:81`), so it is redacted automatically if it ever reaches a line.
- `logHttpRequest` output unchanged apart from the timestamp.

## Latency rule
Request paths must never wait on the sink: `push` is a synchronous array append with O(1) drop; the HTTP call happens on a timer, off the request's async chain; no `await` of the sink inside `emit`. The only awaited flush is in the crash/SIGTERM handlers, with a hard timeout. Memory is bounded by the 2000-record cap (a few MB at the existing 20 KB line limit worst case, so also cap per-record size at about 8 KB for the shipped copy).

## Size and env
| File | Change | Lines |
|---|---|---|
| `server/lib/logger.ts` | ISO time, build `LogRecord`, pass to `write`, job/instance fields | +about 35 (354 → about 390) |
| `server/lib/logSink.ts` (new) | interface, buffer, null sink, stats | about 90 |
| `server/lib/logSinkAxiom.ts` (new) | NDJSON POST | about 45 |
| `server/lib/processHandlers.ts` (new) | 3 handlers, shutdown hook | about 45 |
| `server/ops/requestContext.ts` | `runWithJobContext`, widen context type | +about 20 |
| `server/index.ts` | install handlers (+3), set shutdown hook (+3) | +about 6 |
| 6 job entry points | wrap in `runWithJobContext` | +about 12 |
Total about 250 added lines.

Env: `AXIOM_TOKEN` (ingest-only API token, Replit Secret), `AXIOM_DATASET` (e.g. `awesome-video-prod`), optional `AXIOM_URL`, optional `INSTANCE_ID`. Set only in the production deployment so dev stays stdout-only.

## Risks
- A shared-secret redaction miss would ship secrets off-box; add one smoke check that pushes a line containing a fake token shape and confirms `[redacted]` in the record before enabling in prod.
- `unhandledRejection` policy (exit vs continue) changes crash behaviour; needs an owner decision.
- Axiom free-tier ingest limits are not known to me; the drop counter will show if volume exceeds them. Sampling INFO `http` lines is the first lever if needed.
