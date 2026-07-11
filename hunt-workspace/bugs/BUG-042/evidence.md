# BUG-042 — /reset-password renders zero form inputs

**Severity:** HIGH (functional — password recovery broken)
**Affected page:** https://awesome.video/reset-password

## Reproduction
1. Open https://awesome.video/reset-password in a fresh chromium at
   1440×900.
2. The page renders a heading + a "Back to login" link, but **no
   `<input>`** elements (no email field, no new password field, no
   confirm password field).
3. A user who clicks the password-reset link from their email has no
   way to enter a new password.

## Expected
At minimum: a "New Password" + "Confirm Password" field, and a hidden
or visible token-validation field. Optionally: a "Reset link expired,
request another" CTA if the token is invalid.

## Actual
Zero inputs render. The page is a dead-end.

## Evidence
- `public-deep`-audit: `public-deep-pass1.json inputsCount = 0`
- `screenshots/public2_reset-password_1440.png` (confirms empty form)

## Fix prompt

```
Task: GET https://awesome.video/reset-password renders a heading and a
back-link but no <input>. Users who arrive via /forgot-password cannot
complete the recovery.

Reproduction: load /reset-password and evaluate
  document.querySelectorAll('input').length → today 0

Acceptance:
1. /reset-password renders at least 2 inputs (password + confirm
   password) plus a token field (URL param ?token=… or hidden input).
2. Submitting the form either updates the password and redirects to
   /login, or shows a validation error.
3. The token validity is checked server-side; an expired token renders
   a "request a new link" CTA.
4. Verifiable with the same locator and a Playwright form fill.
```

---

STATUS: FIXED in plans/awesome-video-bughunt-fixes/phase-04.md (ResetPassword.tsx already renders newPassword + confirmPassword FormFields, reads `?token=` from URL, and shows missingToken CTA; verified 2026-07-10)
</input>
