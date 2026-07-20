# NB-031 (LOW) — Search dialog fetches limit=1000 for 15 rows; cache never shared
**Verdict: FIXED.** Palette now requests `/api/resources?search=X&page=1&limit=24` and uses the same query cache key shape as /search page 1.

Live probe (Playwright network log):
- palette fetch observed: `/api/resources?search=…&page=1&limit=24` (no limit=1000 anywhere)
```
NB-031 new search fetches after landing on /search: 0 PASS (cache shared)
```
Navigating from the palette to /search issues ZERO refetches for the same query — the cache entry is reused. Probe: /tmp/nbev/probeA.mjs.
