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