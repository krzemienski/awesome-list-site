---
name: API key tier entitlements
description: Why developer API key entitlements are server-owned, and the cache rule that keeps key checks from being bypassed.
---
Rate-limit tiers come from the server, never from key scopes. A presented-but-bad key is a 401, never a silent guest fallback.
Responses that depend on the key must Vary on Authorization and keyed responses must not be shared-cached, or an edge cache
answers bad-key requests with a cached 200 and skips both the 401 and the per-key bucket.
**Why:** an audit found a self-chosen "premium" scope changed nothing and the old scope-driven limiter would have allowed self-upgrade;
a later review caught the shared-cache bypass. The shared-collection read under /api/public is a site endpoint and deliberately exempt.
**How to apply:** a future paid tier is an admin-set entitlement on the key row resolved in the optional-key middleware; any new
developer route gets the same key middleware, limiter and cache helper.
