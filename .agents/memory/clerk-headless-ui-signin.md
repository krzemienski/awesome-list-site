---
name: Clerk headless UI sign-in
description: Non-sensitive interaction details for Clerk's client-trust step in headless browser validation.
---

# Headless Clerk UI sign-in

**Rule:** Headless/new-device sessions can land on `/sign-in/client-trust`.
The verification field has no stable name/class, so locate it by its accessible
label. Enter the approved test value with sequential, user-like keypresses;
programmatic whole-value filling may not trigger Clerk's field state.

**Why:** Browser validation previously stalled at client-trust because generic
OTP selectors did not match and whole-value filling did not enable submission.

**How to apply:** Use only values supplied by approved runtime test
configuration, or the code Clerk documents for `+clerk_test` addresses; never
store verification values in memory. Always delete the throwaway identity and
matching database row.

## Recovery routing and completion

**Rule:** The current Clerk recovery UI can keep both “Forgot Password?” and
its email-code verification screen at `/sign-in/factor-one`; do not require a
`forgot-password` or `verify` path segment. Require the whole flow to remain
under `/sign-in`, confirm the verification field actually appeared, and treat
the resulting authenticated session as completion even when Clerk does not
show a new-password form.

**Why:** A real browser recovery run restored the account directly after the
email-code challenge. A validator that assumed route names or a mandatory
new-password screen falsely failed a working configured flow.

**How to apply:** Assert the canonical `/sign-in` prefix at each recovery step,
wait for Clerk’s accessible verification input before typing, then race the
configured outcomes: an authenticated session or a visible new-password form.
The browser global exposes `Clerk.user` reliably here; `Clerk.isLoaded` may be
undefined and must not gate the completion check.

## Getting past the bot gate

**Rule:** Only **sign-up** invokes the captcha — `SignIn.create` has no captcha
path, so sign-in flows need no bypass at all. For sign-up, a Clerk **testing
token** on every Frontend API request is necessary but **not sufficient**: it
makes FAPI accept the attempt server-side, but it does **not** flip
`captcha_bypass` on `/v1/client`, and clerk-js gates locally on
`client.captchaBypass` inside `SignUp.create`. Force that flag true from a
context init script (re-set it on an interval; the client is re-created).

**Why:** Cloudflare Turnstile's "smart" widget serves headless Chromium an
interactive checkbox whose challenge iframe is not reachable via
`frameLocator`, so solving it is not an option. Bypassing only the third-party
bot gate keeps the registration, session, app code and analytics network path
real.

**How to apply:** Gate these flows on a `pk_test_` publishable key plus a
backend secret and report them as an explicit SKIP otherwise — never as a pass.
