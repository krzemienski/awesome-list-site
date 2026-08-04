---
name: Shared Postgres rate-limit store
description: Cross-instance express-rate-limit counters via rate_limit_hits table; gotchas hit while building it.
---

All app limiters use a custom Postgres store (`rate_limit_hits` table, fixed window via one atomic upsert) so documented per-IP limits hold across Autoscale instances.

**Why:** the default MemoryStore is per-process — advertised 240/min was effectively 240 × instance count; single-IP bursts never tripped 429 in prod.

**How to apply / gotchas:**
- With `localKeys=false`, express-rate-limit's ERR_ERL_DOUBLE_COUNT validation groups stores by CONSTRUCTOR NAME — layered limiters on one route (login burst + auth cluster + backstop) falsely trip it unless each store instance sets a distinct `prefix`.
- Store fails open: on DB error/2s timeout a shared circuit breaker falls back to per-instance MemoryStore for 30s (old semantics, never blocks traffic). Uses its own tiny pool (max 2) so limiter traffic can't starve the app pool.
- Because counters live in the DB, creating a limiter per request (the dynamic tier limiter does this) now counts correctly — the store instance is stateless besides its name.
- Real-outage test: `LOCK TABLE rate_limit_hits IN ACCESS EXCLUSIVE MODE` in a psql transaction; expect one ~2s request then instant fail-open passes.
