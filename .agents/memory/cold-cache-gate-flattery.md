---
name: Cold-cache gate flattery
description: A crawl/SEO gate passing after warm-up proves nothing; confirm cold, bound uncached work, and fail local admission overflow immediately.
---

**Rule:** Never accept a crawl-gate pass as proof if a warm-up burst (or a prior run) populated the route cache first. The honest confirmation is a fresh server boot (empty publicCache) + solo gate run.

**Why:** A saturation-retry ladder showed "0 failures" only after another harness had warmed deep routes. Cold solo reruns still produced random 503s. The first bounded queue then remained vulnerable because local overflow entered the same retry ladder, turning rejected work into backoff timers.

**How to apply:** For any "fixed the 503s under load" claim, restart the server, let background initialization settle, and run the gate solo. Cap active uncached work below database capacity, bound and cancel waiters, and treat local admission overflow as non-retryable. Reserve retries for downstream transient saturation. Never overlap scratch-database gates with a crawl gate; shared contention produces false failures.
