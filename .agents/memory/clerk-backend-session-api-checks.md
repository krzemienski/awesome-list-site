---
name: Clerk backend-session API checks
description: How validation scripts authenticate as throwaway non-admin users post-Clerk (no browser, no audit-key).
---

Per-user API integration checks can mint real Clerk sessions server-side — no browser flow and no admin audit-key needed:

1. `POST api.clerk.com/v1/users` with `external_id: "__qa_test_<feature>_<ts>"` (+ matching email, `skip_password_requirement: true`).
2. `POST /v1/sessions {user_id}` then `POST /v1/sessions/{id}/tokens` → short-lived (~60s) JWT; send as `Authorization: Bearer` to the app. Mint a fresh token per scenario.
3. The instance's session-token template maps `external_id` → the `userId` claim, so the app's bridge id (users.id) becomes the chosen `__qa_test_` prefix — JIT provisioning creates the local row on first request, and teardown can sweep by prefix (`users.id LIKE '__qa_test_%'`, plus child rows), then delete the Clerk user via `DELETE /v1/users/{id}`.

**Why:** Post-Clerk there is no local login endpoint; the X-Admin-Audit-Key bypass only resolves the admin row, so non-admin race/permission checks need real sessions.
**How to apply:** Any scripts/validation check exercising authenticated user endpoints (see `scripts/validation/preferences-revision-races.ts` as the reference implementation).
