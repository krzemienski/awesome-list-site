# BUG-094 — /admin nav state doesn't reflect the current user when reloading (logout/login flicker)

**Severity:** LOW (UX)
**Affected page:** /admin

## Reproduction
1. As admin (logged in), navigate /admin.
2. Open DevTools → Application → Cookies → delete connect.sid.
3. The page now shows "Authentication Required" but only after a 7-10s
   wait.
4. Reload — still 7-10s.

The SPA doesn't have a quick logout-driven state check — it waits for
the next admin fetch.

## Expected
A `connect.sid` deletion should immediately trigger a re-render to the
auth-gate state (within 1 s).

## Actual
7-10s delay before re-render.

## Evidence
- `screenshots/admin_categories.png` / `admin_resources.png` (admin loading)

## Fix prompt

```
Task: Add a client-side connection watch on /admin to detect cookie
removal and re-render within 1 s.

Acceptance:
1. Delete connect.sid cookie → page rerenders to auth-gate in ≤1 s.
2. Verifiable with Playwright.
```


STATUS: FIXED (same as BUG-092 — logout session invalidation) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
