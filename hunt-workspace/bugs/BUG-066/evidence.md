# BUG-066 — Login redirect: after successful login the user goes to /admin, but the homepage CTA to "Admin" is invisible

**Severity:** LOW (UX)

## Reproduction
1. After login, the response redirects to /admin (confirmed earlier: phase2-login.js).
2. The /admin shell + dashboard then takes a long 7–10 s to render (see BUG-101 / BUG-104).
3. During this time the user sees "Loading admin dashboard…" with no progress indicator.
4. The user might think they're stuck.

## Expected
Either:
- Pre-render the dashboard shell + skeleton, or
- 302 to a lighter loading state that has an activity indicator.

## Actual
A blank "Loading…" for up to 10 s.

## Evidence
- `verify-findings.js`, `admin_dashboard.png`
- `screenshots/admin_dashboard.png` (3s capture) + `admin_a_loaded.png` (8s)

## Fix prompt

```
Task: /admin takes 7-10 seconds to render the dashboard after login.
Replace the "Loading…" placeholder with a skeleton + better fetch
orchestration.

Acceptance:
1. After login, the admin page shows TOTAL USERS / TOTAL RESOURCES /
   LEARNING JOURNEYS / PENDING APPROVALS tiles (or named skeletons)
   within 2.5 s.
2. Verifiable: Playwright at t+2.5s reports the tile names or a skeleton
   with the same labels.
```


STATUS: NOT-REPRO/FIXED-in-source (admin loads 229ms, not 7-10s) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
