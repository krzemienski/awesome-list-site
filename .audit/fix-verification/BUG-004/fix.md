# BUG-004 — FIXED (code change)
**Severity:** Medium
**Fix:** routes.ts GET /api/resources now accepts ?status=approved|pending|rejected with allow-list validation; unknown → 400; default 'approved' for public. The repository already supported status filter, the handler now passes it through.
