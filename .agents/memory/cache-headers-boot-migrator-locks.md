---
name: cache-headers spawned prod boot locks DEV
description: Why seo-snapshot randomly 503s /tag/* pages during parallel completion validation
---
The cache-headers gate (`--spawn --build`) boots `node dist/index.js` with NODE_ENV=production against the SAME dev database. Production boot runs the boot migrator; its idempotent DDL briefly takes table locks, and concurrent SSR reads hit `lock timeout` (55P03), which og-middleware sheds as a bounded 503. That gate holds only the `dist` lease, not `db-heavy`, so it can overlap the seo-snapshot crawl.

**Why:** seen 2026-10-10. Two runs in a row failed on different tag routes (javascript/rtmp/html5, then open-source), all 200 in <0.7s when run alone. The next run passed untouched.
**How to apply:** a seo-snapshot failure that is only 503s on a few listing routes during the full parallel run is this overlap, not a route bug. Retry, or fix the harness: have cache-headers also hold `db-heavy` while its server is up, or point it at a scratch DB.
