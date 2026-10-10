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

## Client Trust new-device step
- Repeated password sign-ins from one container make Clerk start inserting a new-device verification step, so password-driven UI audits flake at random. It is not an app regression. Prefer sign-in tickets through the real `<SignIn>` page (it honors redirect_url) over password typing or `setActive` shortcuts, which skip the component's redirect.
