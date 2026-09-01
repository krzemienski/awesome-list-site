---
name: Audit-key header auth for admin audit scripts
description: How automated audit/validation scripts authenticate as admin after the Clerk migration, and the credential-scoping rule that goes with it
---

# Audit-key header auth (post-Clerk)

**Rule:** Automated audit scripts authenticate as the local admin by sending the
`X-Admin-Audit-Key` header (value = ADMIN_PASSWORD) on requests to the app. There is
no login POST and no session cookie anymore — the local login route, express-session,
and `connect.sid` were all removed in the Clerk migration, so any script that still
POSTs credentials to a login endpoint gets a 404.

**Why:** With no session store, a restored login route couldn't keep an automated
browser context authenticated across page loads. A stateless header rides every
request. The server honors it only when ADMIN_PASSWORD is set in the SERVER
environment and is at least 8 characters (fail-closed, mirroring the admin-seed
guard); anonymous visitors and prod-without-the-secret can never exercise it.

**How to apply:**
- NEVER attach the key context-wide (e.g. Playwright `extraHTTPHeaders`) — the SPA
  requests third-party origins (Clerk assets, external images) and a context-wide
  header hands an admin bearer credential to every one of them. Inject via route
  interception gated on `new URL(url).origin === app origin`, and pass the header
  explicitly on API-context calls (those bypass route interception).
- Keep the cross-origin leak probe (fulfilled fake external origin asserting the
  header is absent) at context setup — it's the regression guard for the above.
- Scripts should verify the header actually authenticates (identity endpoint returns
  the admin) before running, and warn+SKIP authed checks when ADMIN_PASSWORD < 8
  chars rather than silently running them anonymously.
- Rotation = rotate the ADMIN_PASSWORD secret (server restart/republish applies it);
  the header path has no login rate limiter, so the old session-cache/429-backoff
  workarounds are obsolete.
- Registration-based scripts (throwaway-user flows) can't use this — they need a
  Clerk-era replacement for the removed register endpoint.
- **Where the key lives in dev:** task environments may lack the ADMIN_PASSWORD
  secret entirely. Supply it via the gitignored `.env` (dotenv is loaded by the
  server AND by the audit scripts themselves — scripts read process.env for the
  header, so a server-only env var isn't enough). NEVER use setEnvVars for it:
  development env vars are written in plaintext into the committed `.replit`,
  which is a versioned-credential leak (code review rejects it; rotate by
  deleting the var and restarting so the fail-closed bypass goes dead).
- Gates that need a BROWSER session with admin UI (not just API calls) should
  create a disposable Clerk user (+clerk_test / OTP 424242), sign in through the
  real UI, then `UPDATE users SET role='admin'` on the JIT-provisioned row —
  role is app-local state read fresh per request, so the next full page load
  renders admin chrome. This works in task envs where ADMIN_PASSWORD is absent;
  tear down under a scoped `__qa_test_<gate>_` sub-prefix (admin users can
  acquire extra FK refs — see qa-throwaway-user-teardown.md).
- A durable QA admin account exists for browser-based admin testing (Clerk
  password sign-in, pre-provisioned `role=admin` row bridged via external_id);
  its email/password live in the gitignored `.env` as TEST_ADMIN_EMAIL /
  TEST_ADMIN_PASSWORD. In prod the same sign-in JIT-provisions a plain `user`
  row — elevation there still needs an existing prod admin.
