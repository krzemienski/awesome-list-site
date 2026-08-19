---
name: Clerk headless UI sign-in
description: How to drive a real Clerk UI sign-in in headless Playwright against the dev instance (client-trust step, test-email OTP).
---

# Headless Clerk UI sign-in (dev instance)

- Create a throwaway user via `createClerkClient({ secretKey: CLERK_SECRET_KEY }).users.createUser({ emailAddress: ["__qa_test_<run>+clerk_test@example.com"], password, skipPasswordChecks: true })`. Pre-insert the DB users row with the Clerk `user_...` id (bridge id for Clerk-era users) to set `role: "admin"` before first sign-in.
- After the password step, headless/new-device sessions land on **`/sign-in/client-trust`** (device verification). The OTP field has NO name/class — select it by `input[aria-label="Enter verification code"]`, click it, `keyboard.type` the code.
- `+clerk_test@example.com` emails accept the fixed verification code **424242** — no inbox needed.
- **Why:** two full runs failed silently at client-trust before the aria-label selector + test-code combo worked; standard `.cl-otpCodeFieldInput` / `input[name="code"]` selectors don't match.
- **How to apply:** any future authed-browser E2E against dev Clerk (session refresh, admin pages, sign-out via `window.Clerk.signOut()`); teardown deletes the Clerk user AND the DB row.

**OTP entry addendum:** plain `.fill("424242")` does NOT register with Clerk's OTP field — the submit never enables. Working sequence: `.click()` the OTP input, then `.pressSequentially("424242", { delay: 150 })`, then wait for URL to leave /sign-in.
