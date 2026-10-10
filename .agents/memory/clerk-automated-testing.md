---
name: Clerk in automated tests
description: How to get a usable Clerk session in headless/automated runs, and how to tear it down.
---

Consolidated index for driving Clerk from test harnesses.

- Preferred path — mint sessions server-side: [clerk-backend-session-api-checks.md](clerk-backend-session-api-checks.md).
- Driving the real sign-in UI headlessly: [clerk-headless-ui-signin.md](clerk-headless-ui-signin.md).
- Knowing when auth actually completed: [clerk-auth-completion-signal.md](clerk-auth-completion-signal.md).
- The built-in tester specifically: [native-tester-clerk-workaround.md](native-tester-clerk-workaround.md).
- Teardown ordering: [jit-teardown-order.md](jit-teardown-order.md) — delete the Clerk user BEFORE the local row.

**Why:** every one of these cost a long debugging detour that looked like an app bug.
**How to apply:** reach for a backend-minted session first; only drive the UI when the UI itself is under test.
## Session JWT lifetime
- Backend-minted session JWTs expire after ~60 s. Long harnesses must re-mint a token (`POST /sessions/:id/tokens`) right before each authed call, including the cleanup calls, or teardown silently 401s and leaves residue.

**Client Trust (seen 2026-10-10):** after many password sign-ins from this container, DEV Clerk began routing audit sign-ins to `/sign-in/client-trust` (new-device verification), failing `auth-return-audit` at random cases. Not an app regression — backend-minted sessions are unaffected. Resolved by ticket sign-in: mint `POST /sign_in_tokens`, then load the current `/sign-in?redirect_url=…` URL with `&__clerk_ticket=<token>` added. The prebuilt `<SignIn>` completes the ticket itself AND honors redirect_url, so return-path audits stay real (unlike `signIn.create`+`setActive` in page.evaluate, which skips the component's redirect).
