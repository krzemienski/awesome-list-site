---
name: Clerk auth migration
description: Post-migration auth architecture invariants and the security decisions behind them.
---

# Clerk auth migration (August 2026)

The app migrated from Replit OIDC + local email/password (Passport) to Replit-managed Clerk. Architecture details live in `replit.md` (Authentication System section); this file holds the non-obvious invariants.

## ID bridge
- `users.id` = legacy subject id = Clerk `externalId`, exposed on session tokens as `sessionClaims.userId`. All app lookups use this bridge id.
- Clerk-native `user_...` ids are ONLY for Clerk API calls (`clerkClient.*`). Brand-new Clerk-era users have no externalId, so their bridge id IS the `user_...` id — both shapes coexist in `users.id`.
- **Why:** 14 pre-migration users keep all FK'd data (bookmarks, edits, journeys) without a rewrite.

## JIT provisioning fails closed on email collision
- `ensureDbUser` (server/clerkAuth.ts): select by bridge id → insert `onConflictDoNothing` → re-select. If the insert was swallowed by the UNIQUE(email) constraint (existing row, different id), it returns `undefined` — NO email-based auto-binding.
- **Why:** session email claims are not proof of ownership; auto-binding would let a Clerk session carrying someone else's email inherit that account's role/API keys/data (account takeover). Code review flagged this; the original fallback was removed.
- **How to apply:** never resolve an authenticated identity to an existing account row by email match alone; collisions need manual/admin reconciliation.

## Runtime facts that look like bugs but aren't
- Clerk FAPI proxy (`/api/__clerk`) is **production-only** — in dev it 404s and the client talks to Clerk's dev FAPI directly (VITE_CLERK_PROXY_URL empty in dev). A dev 404 on that path is expected.
- **Dev-browser handshake 307 vs non-browser fetches:** in dev, Clerk's middleware 307-redirects any request that *looks like* an HTML document request (explicit `Accept: text/html`) but lacks a dev-browser token to `...clerk.accounts.dev/v1/client/handshake`. Node `fetch` follows it off-site — hammering that endpoint returns CLERK's bare 429s, easily misread as app rate limiting. Script probes of SSR pages must either drop the `Accept: text/html` header (SSR still serves HTML; request stays anonymous) or carry a valid audit key (skips Clerk entirely — but then the probe is AUTHENTICATED and bypasses anonymous cache/admission semantics, changing what's under test). Real browsers complete the handshake silently, so browser-based audits never see this.
- Honest 503: DB failure during user resolution is stored in `res.locals.clerkUserLookupError`; `requireAuth` propagates it via `next(err)` instead of mislabeling an outage as 401.
- CSRF cookie sniff is `__session` (was `connect.sid`).
- The openapi-drift gate (`scripts/validation/openapi-drift.ts`) pins hardcoded route count+hash baselines for BOTH `replit` and `portable` envs; any intentional route surface change must update both (they are now identical — no more REPL_ID-conditional routes).

## Prod deploy requirement
Production needs the same env vars (CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, VITE_CLERK_PUBLISHABLE_KEY, VITE_CLERK_PROXY_URL for the proxy) and the prod-only proxy path verified after the next publish.
