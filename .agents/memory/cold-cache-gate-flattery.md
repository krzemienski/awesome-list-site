---
name: Cold-cache gate flattery
description: A crawl/SEO gate passing right after a warm-up harness proves nothing; confirm on a cold boot. Retry ladders lose to sustained saturation.
---

**Rule:** Never accept a crawl-gate pass as proof if a warm-up burst (or a prior run) populated the route cache first. The honest confirmation is a fresh server boot (empty publicCache) + solo gate run.

**Why:** The og-middleware saturation-retry ladder showed "0 failures" only because /tmp/burst.mjs had warmed the deep-tag routes minutes earlier. Cold solo reruns produced 3-5 random tag 503s per run — the ladder's ~2s of backoff cannot outlast a sustained 12-way crawl saturating an 8-connection pool, because during a gate crawl EVERY route resolves cold (TTL 60s << crawl duration).

**How to apply:** For any "fixed the 503s under load" claim: restart the server, wait ~90s for background init, run the gate solo. The durable fix for crawl-vs-pool saturation is capping concurrent uncached route resolutions BELOW the pool size (slot-transfer semaphore in og-middleware, limit 5 < pool 8); retries are only the second line of defense. Also: never overlap scratch-DB gates (migration-drift, boot-safety run DDL on the same Neon instance) with a crawl gate — that alone produces 503 false-fails.
