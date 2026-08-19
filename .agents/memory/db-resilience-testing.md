---
name: Real-outage DB resilience testing + non-retryable classification
description: How to test transient-DB-outage code paths against a real Postgres (LOCK TABLE), and how to classify pg errors as retryable vs permanent
---

# Real-outage DB resilience testing

**Inducing a REAL transient outage (no mocks):** hold `LOCK TABLE <t> IN ACCESS EXCLUSIVE MODE` in a `db.transaction` kept open by a deferred promise (with a safety `setTimeout` release). Every insert into that table wedges until release — exercising timeout wrappers, retry loops, queue paths, and backoff exactly as a wedged pool would. Release, settle ~2s, then verify recovery/drain.

**Why:** monkey-patching db violates the no-mocks rule and misses real pool-level behavior under contention.

**Consequences to plan for:**
- Timed-out queries are NOT cancelled — they stay queued on their connections and COMMIT after the lock releases. Any retry/queue design therefore needs a unique index + `onConflictDoNothing` (+ select-existing-id fallback) or retries double-insert. Assert "exactly one row" post-release to prove the race is closed.
- With a tiny pool, side-channel awaits (event emits, log persists) contend for connections during the outage — every one of them needs its own timeout guard or the run hangs even though the "main" op is guarded.
- A gate observing an HTTP response through a retrying middleware must budget the middleware's full backoff ladder; the underlying capacity guard may reject synchronously while the visible 503 is intentionally delayed. Keep separate assertions for the capacity cap, status/body/headers, recovery, and no-late-write behavior so widening the HTTP timing budget cannot mask a broken guard.

**Non-retryable classification:** pg error codes class `22` (data exception) and `23` (integrity violation) are permanent input failures — retrying/queueing the identical row can never succeed; fail fast instead. Read the code via `err?.code ?? err?.cause?.code` (drizzle may wrap). Timeout/acquire errors carry no code → treated retryable by default. A real FK violation (bogus job id) is an easy live test for the fast-fail path.
