---
name: Replit OIDC + local-account email collision
description: Latent bug — signing in via Replit OIDC with an email that already exists as a local account fails the upsert; and general OIDC/login-UI coupling notes.
---

The rule: the social-login backend (Replit OIDC via /api/login, /api/callback) and the login-page UI are independently deployable surfaces — a client refactor can silently remove the only UI entry point while the backend keeps working (this happened: a passport-local refactor dropped the social buttons; prod /api/login still 302'd to replit.com/oidc the whole time).

**Why:** users report it as "social login is broken" when the backend is fine; check the UI entry point first, then the 302.

**How to apply:** any login-page rework must keep a control that navigates to /api/login. OIDC callback failureRedirect must NOT point at /api/login (endless consent-screen loop); it points at /login?error=oauth which the Login page surfaces as a toast.

**Unfixed latent bug (deliberately deferred):** users.email is UNIQUE and the OIDC verify() upserts by id only. A Replit sign-in whose email already belongs to a local email/password account (different id) throws on insert → auth fails (now gracefully → /login?error=oauth, formerly an infinite loop). Proper fix is account linking, which is invasive: many routes read req.user.claims.sub directly as the userId, so linking to the existing row's id requires either migrating child FKs to the OIDC sub or routing all userId reads through a helper that prefers a session dbUserId. Don't attempt a quick patch — session claims get rewritten on token refresh (updateUserSession), so overriding claims.sub does not survive.
