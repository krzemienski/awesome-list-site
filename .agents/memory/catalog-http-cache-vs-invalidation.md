---
name: Catalog HTTP cache defeats query invalidation
description: Why invalidating React Query after admin writes still showed stale public listings, and the rule for catalog reads.
---
Catalog GETs send `Cache-Control: public, max-age=60`. After an admin write, invalidateQueries refetches, but the browser serves the pre-mutation body from its HTTP cache for up to 60 s, so listings and sidebars stay stale even though the invalidation fired.

**Why:** the admin freshness bug survived a correct invalidation graph. Only a single-document browser run that checked rendered counts caught it.

**How to apply:** after a catalog write in the tab, catalog reads must use `cache: 'no-cache'` (ETag revalidation) for the max-age window. Any new catalog fetcher must go through the shared request-cache helper in queryClient. Verify freshness in ONE SPA document, never with a reload.
