---
name: JIT re-provisioning defeats DB-first teardown
description: Order of operations when tearing down disposable Clerk identities while a browser session is still alive.
---
Delete the Clerk user FIRST, then the local `users` row.

**Why:** Any live browser session (a tester left open, a tab polling `/api/auth/user`) re-runs JIT provisioning on its next request, so a DB-only delete is silently undone within seconds — the row reappears with the same Clerk id, `role=user`, and a fresh `created_at`. A "0 residue" check taken right after the DB delete can pass and still be wrong minutes later.

**How to apply:** teardown = Clerk `DELETE /v1/users/:id` → WAIT past the session-JWT lifetime (~60–90 s; the app verifies the JWT offline, so a still-valid token re-JITs even after the Clerk user is gone) → local cleanup (own rows, null `resource_audit_log.performed_by`, delete `users`) → re-query after a pause. Sign-in for a native tester works via `/sign-in?__clerk_ticket=<ticket>` on the app port (the public dev hostname serves the design-system artifact).
