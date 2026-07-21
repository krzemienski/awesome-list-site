---
name: Admin password rotation path
description: How the local admin password is rotated on a populated deployment (boot sync from ADMIN_PASSWORD secret); PROD_ADMIN_PASSWORD secret is stale.
---

**Rule:** The ONLY way to rotate `admin@example.com`'s password on a populated deployment is the boot-time sync: `syncAdminPasswordFromEnv()` (server/seed.ts, called from `runBackgroundInitialization`) bcrypt-compares the `ADMIN_PASSWORD` secret against the stored hash on every boot and rotates on mismatch. Changing the secret + restart (dev) or republish (prod) is the whole procedure.

**Why:** `seedAdminUser` only runs when the DB is completely empty; prod DB is a read-only replica for the agent (no direct UPDATE); the reset-email flow can't reach the placeholder admin inbox and prod never logs reset tokens. The old `PROD_ADMIN_PASSWORD` secret went stale (prod rejected it for both admin accounts) with no recovery path — hence this boot sync.

**How to apply:**
- To change the admin password: update the `ADMIN_PASSWORD` secret; dev picks it up on workflow restart, prod on next publish. Never edit hashes by hand.
- `PROD_ADMIN_PASSWORD` secret is obsolete — do not trust it for prod logins; `ADMIN_PASSWORD` is the source of truth for both envs. All committed scripts now read `ADMIN_PASSWORD` (July 16, 2026); the stale secret awaits manual user deletion — agents cannot delete secrets (only env vars), `deleteEnvVars` on a secret name silently no-ops.
- Rotation does NOT invalidate existing sessions (accepted risk; architect-noted).
- Scripts hitting the prod admin API must capture ONLY the `connect.sid` cookie from the login response and never update it afterward — prod infra injects a GAESA affinity Set-Cookie on arbitrary responses that clobbers naive cookie jars. Right after a republish, retry login (boot sync runs async post-listen).
