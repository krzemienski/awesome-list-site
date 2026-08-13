---
name: Admin password rotation path (RETIRED)
description: Local admin password stack removed Aug 2026 (Clerk owns auth); ADMIN_PASSWORD boot sync no longer exists.
---

**Rule:** As of Task 310 (Aug 12, 2026) the local admin password stack is retired: `syncAdminPasswordFromEnv()` and `sendPasswordResetEmail()` were deleted, and there is no local-login endpoint (`/api/auth/local/login` returns 404). Admin auth is Clerk-only; role comes from `users.role` on the Clerk-bridged user row.

**Why:** After the Clerk migration nothing authenticated against `users.password`; the boot sync only re-hashed a secret into a dead column. Scripts that log in with `ADMIN_PASSWORD` against `/api/auth/local/login` are broken and are being converted under the "automated site checks sign-in" task.

**How to apply:**
- Do NOT reintroduce ADMIN_PASSWORD-based flows; scripts needing admin API access must authenticate via Clerk (see the auth-check fix task).
- `users.password`, `sessions`, and `password_reset_tokens` tables are intentionally KEPT (historical data, non-destructive schema); nothing reads them.
- `PROD_ADMIN_PASSWORD` and `ADMIN_PASSWORD` secrets are both obsolete for login purposes.
