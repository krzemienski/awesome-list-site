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
