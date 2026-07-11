# BUG-044 — /forgot-password form is left-aligned instead of centered at 1440×900

**Severity:** MEDIUM (visual defect / inconsistency)
**Affected page:** https://awesome.video/forgot-password
**Affected viewport:** 1440×900 (and partially 768)

## Reproduction
1. Open https://awesome.video/forgot-password in a fresh chromium at
   1440×900.
2. The recovery form is left-aligned inside its container; the rest of
   the viewport to the right is empty whitespace.
3. Compared to /login (centered at the same viewport), /forgot-password
   uses a different layout — likely a bug from a layout branch.

## Expected
A password-recovery form centered on the page, matching /login's
layout.

## Actual
The form sits hard-left.

## Evidence
- `screenshots/public2_forgot-password_1440.png` (off-center)
- `public-deep`-audit reproduction at 768 confirmed partial.

## Fix prompt

```
Task: /forgot-password on https://awesome.video/ renders its form
left-aligned at 1440×900 viewport, while /login renders centered.
Match the layout to /login.

Reproduction: load /forgot-password at 1440×900, visually compare to /login.

Acceptance:
1. /forgot-password form is centered (same layout as /login).
2. Verifiable with Playwright: the form's bounding box center is
   within ±10 px of the viewport center horizontally.
```

---

STATUS: FIXED in plans/awesome-video-bughunt-fixes/phase-04.md (ForgotPassword.tsx:69 already uses same `flex items-center justify-center` wrapper as Login.tsx:126 + `Card w-full max-w-md`; verified 2026-07-10)
</input>
