# VG-038 — Clearing first name drops last name → PASS

## Root cause
Both server name-composition sites (`GET /api/auth/user`, `GET /api/auth/me`)
used `firstName && lastName ? "first last" : firstName || emailPrefix || 'User'`
— with firstName empty/null, lastName was ignored entirely and the email
local-part ("admin") was shown instead of "User".

## Fix
`server/routes.ts` (both send sites): compose with
`[firstName, lastName].filter(Boolean).join(' ') || emailPrefix || 'User'` —
whichever parts exist are joined; lastName alone now renders.

## Live evidence (dev, real admin session, real PATCH /api/user/profile)
1. Before: `name = 'Admin User'` (firstName Admin, lastName User).
2. `PATCH {"firstName":""}` → 200, response `firstName: null, lastName: "User"`
   — **last name retained in storage**.
3. `GET /api/auth/user` → `name = 'User'`; `GET /api/auth/me` → `name = 'User'`
   (not empty, not "admin" email prefix, not malformed).
4. Profile UI reloaded while cleared: heading shows "User"; no
   null/undefined/malformed traces in body text (screenshot
   vg038-profile-cleared.png).
5. Other combos verified live: restore firstName → `'Admin User'`;
   clear lastName only → `'Admin'`; restore lastName → final `'Admin User'`.
State fully restored (net-zero).
Verdict: **PASS**
