# BUG-078 — /admin "Loading…" appears during hydration; meta description/title don't change

**Severity:** LOW (UX drift)

The /admin page title is "Admin — Awesome Video" immediately but the
body renders "Loading…" for 7-10 s. From the user's perspective the
tab title is fixed; only the body changes.

## Expected
Either the title updates to include "(loading)" or a progress bar.

## Evidence
- BUG-101 / BUG-066 evidence

## Fix prompt

```
Task: /admin shows the public nav chrome for 7-10s before the admin
dashboard renders. Show a clearer loading affordance (skeleton, title
updating, etc).

Acceptance:
1. /admin shows within 1s a more informative title ("Loading admin…
   Awesome Video"), or
2. The body renders a dashboard-shaped skeleton immediately.
```
