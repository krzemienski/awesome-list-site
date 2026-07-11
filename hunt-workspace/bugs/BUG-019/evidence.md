# BUG-019 — Reset-password page has no form at all on the unauthenticated public visit

**Severity:** HIGH
**Affected page:** https://awesome.video/reset-password
**Affected viewports:** all three

## Reproduction
1. Open https://awesome.video/reset-password (no token in URL).
2. Page renders "Invalid reset link — This link is missing its reset token."
3. There is **no password input, no submit button, no email field** anywhere on the page.
4. The only CTA is "Request a new link" which routes to /forgot-password.

## Expected
Even with a missing token, the user should see the reset-password *form* (or at least a link to /forgot-password) so they can recover. As-is, a user landing here from an old email link sees a wall and has no obvious path forward.

## Actual
The page is a thin error state with one button. metrics.inputCount=0 on this page at every viewport (public-deep-pass1.json).

## Evidence
- `screenshots/public2_reset-password_1440.png` — empty form area with only "Request a new link" button
- `public-deep-pass1.json` — `inputsCount: 0` at every viewport
- Confirmed twice — re-run reproduces identical sparse state.

## Fix prompt
Task: /reset-password at /reset-password (no token) renders only an error and a "Request a new link" CTA — no inputs or form elements at all.

Reproduction: open https://awesome.video/reset-password in a fresh tab.
Acceptance: provide either (a) the full reset form pre-token (e.g., email + new password fields), or (b) prominently surface the link to /forgot-password plus a clear explanation. Both should be reachable without a token so a broken email link is recoverable.