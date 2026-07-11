# BUG-084 — /admin fetches /api/admin/stats repeatedly while loading (rate-limit risk)

**Severity:** LOW
**Affected endpoint:** /api/admin/stats

## Reproduction
Within a single admin page load, the SPA appears to re-poll
/api/admin/stats multiple times (Lighthouse trace or DevTools Network
panel confirms ~5+ duplicates during the "Loading admin dashboard…"
window).

## Expected
Each admin page should fetch /api/admin/stats once (or at most twice
on tab focus), with SWR-style caching.

## Actual
Multiple fetches during the long hydration window.

## Evidence
- /api/admin/stats observed in admin trace
- timing overlap with the 7-10s Loading window

## Fix prompt

```
Task: Audit /admin network fetches. /api/admin/stats should be called
once per page load (or once per SWR refresh window).

Acceptance:
1. Open DevTools Network panel on /admin: /api/admin/stats is requested
   no more than twice.
2. Add SWR or React-Query caching to deduplicate.
3. Verifiable with Playwright route counting.
```
