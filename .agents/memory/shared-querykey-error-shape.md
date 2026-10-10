---
name: Shared queryKey error shape
description: Two components sharing a react-query key with different queryFns — whichever fetch wins decides the cached error type.
---
When two components use the same queryKey with different queryFns, the one that fetches first fills the shared cache entry, including its error. If one throws a plain Error and the other a status-bearing ApiError, status-aware UI (404 vs 503 vs offline) is racy: it sometimes shows "not found" copy for a 503.

**Why:** resource detail's 503 proof failed intermittently because the breadcrumb ancestor disclosure shared the detail key with a plain-Error fetcher.

**How to apply:** grep for every user of a queryKey before relying on error.status; all fetchers for one key must go through apiRequest (or the same fetcher).
