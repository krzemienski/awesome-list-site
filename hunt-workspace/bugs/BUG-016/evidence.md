# BUG-016 — Login page email field pre-filled with admin@example.com (no actual account exists)

**Severity:** HIGH (security/info-leak — invites brute force on a known email)
**Affected page:** https://awesome.video/login
**Affected viewports:** 1440, 768, 375 (every viewport)

## Reproduction
1. Open https://awesome.video/login in a fresh chromium.
2. The Email input is pre-filled with the literal value `admin@example.com`.
3. The Password input is empty.

## Expected
The email field should be empty by default (or remembered only after a successful prior login, then only for that user). Pre-filling `admin@example.com` for every visitor tells attackers which account to target, and is misleading — that account likely does not exist (no admin email shown elsewhere on the public site).

## Actual
Every visitor sees the email input pre-populated with `admin@example.com`. Same value across fresh contexts (no cookies/storage used).

## Evidence
- `screenshots/public2_login_1440.png` — shows the pre-filled email
- `screenshots/public2_login_768.png`
- `screenshots/public2_login_375.png`
- Confirmed twice — re-run shows same pre-filled value.

## Fix prompt
Task: The /login page pre-fills the email input with `admin@example.com` for every visitor.

Reproduction: open https://awesome.video/login in incognito; observe Email input value.
Acceptance: the email input is empty by default. If autofill is desired, scope it to the most recently logged-in user's email via browser autofill heuristics only — never hard-code a default.

---

STATUS: FIXED in plans/awesome-video-bughunt-fixes/phase-04.md (client side already-fixed at Login.tsx:57 `defaultValues.email = ""`; server-side owner = P2 per plan.md)
</input>

STATUS: NOT-REPRO/FIXED-in-source (anon POST → 401, 0 rows) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
