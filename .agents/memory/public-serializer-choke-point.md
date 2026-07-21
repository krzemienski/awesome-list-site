---
name: Public serializer choke point
description: Stripping internal columns per-route misses surfaces; strip at a shared util / data source instead.
---

**Rule:** When an internal-only column (e.g. a Postgres full-text vector) must never reach the public API, strip it through ONE shared serializer applied at every send site — and prefer stripping at the data-source builder for shared structures (the awesome-list tree builder feeds both API routes and og-middleware).

**Why:** A per-route strip on list/search/detail passed review of those routes but still leaked on 4 other surfaces (related, awesome-list tree with thousands of occurrences, public API list + detail). Route-local fixes systematically miss sibling surfaces that serialize the same entity.

**How to apply:** Enumerate every endpoint that serializes the entity (grep for `res.json` + the repository/type), route all of them through the shared strip util, then prove with a live probe of ALL surfaces (grep response bodies for the field name, expect 0), not just the routes you touched. Keep the strip type-preserving (spread + cast back to T) so repository types don't ripple.
