# BUG-099 — /admin fetches data with no client-side error boundary (a failed /api/admin/* silently leaves the user staring at "Loading…")

**Severity:** MEDIUM
**Affected page:** /admin

## Reproduction
1. Network throttle /api/admin/* to a 500 ms failure.
2. Visit /admin. The SPA shows "Loading…" forever — no error UI, no
   retry button.

## Expected
A client-side error boundary renders a "Couldn't load admin stats"
message + Retry button.

## Actual
Loading… indefinitely with no observable error.

## Evidence
- `/api/admin/*` 500 path

## Fix prompt

```
Task: Add an error boundary around the admin shell: if any
/api/admin/* request fails, surface an error UI with a retry button
instead of leaving the user at "Loading…".

Acceptance:
1. Inject a server-side failure to /api/admin/stats.
2. The admin page renders an error UI with a Retry button within 5 s
   of the failure.
3. Verifiable with Playwright.
```
