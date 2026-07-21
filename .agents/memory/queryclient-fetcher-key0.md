---
name: Default query fetcher reads only queryKey[0]
description: TanStack default queryFn in this repo builds the URL from queryKey[0] ONLY; array key segments are cache-only, not path parts.
---

The app's default `getQueryFn` (client/src/lib/queryClient.ts) does `const url = queryKey[0] as string` — it fetches `queryKey[0]` verbatim and IGNORES every later segment.

**Why:** This contradicts the generic fullstack guideline that implies `['/api/x', id]` becomes `/api/x/id`. It does NOT here. A `useQuery({ queryKey: ['/api/enrichment/jobs', selectedJobId] })` with NO custom `queryFn` silently hits the LIST endpoint `/api/enrichment/jobs`, so a `{success, job}` single-shape binding gets a `{success, jobs}` list payload → `data.job` is `undefined` and the whole details view renders defaults/zeros with no error. This bit the enrichment details dialog (stats + per-run config all blank).

**How to apply:** For any single-resource / parameterized fetch, either (a) put the FULL URL in `queryKey[0]` (e.g. `['/api/x/' + id + '/events']`) and use extra segments only for cache identity, or (b) supply an explicit `queryFn` that fetches `/api/x/${id}` (the researcher job + discoveries queries already do this — copy that pattern). Array-segment keys alone are fine for cache invalidation but never change the requested URL.
