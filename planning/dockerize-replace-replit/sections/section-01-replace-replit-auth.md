# Section 01 / 06 — Phase 1: Replace Replit Auth (SUBTRACTIVE) + Remove All Replit References

> Goal: app builds and runs **locally, non-Docker**, on `passport-local` only. Zero Replit references in `server/`, `client/`, `shared/` (grep-proven). Replit OIDC ripped out; the working local auth stays.

## Background

The app has **hybrid auth**. Two systems coexist:

- **Replit OIDC** — `server/replitAuth.ts`, an `openid-client`-based OIDC flow, wired into `server/routes.ts:47` (import) and gated behind a `process.env.REPL_ID` branch at `server/routes.ts:407-431` (dynamic `import("./replitAuth")`).
- **Local passport-local** — `server/localAuth.ts`, `setupLocalAuth()` at `server/localAuth.ts:6`. It mints a session user of shape `{ claims: { sub, email, first_name, last_name, profile_image_url }, expires_at }` at `server/localAuth.ts:41-50`. This already works.

**Decision D1: finish `passport-local`, rip out Replit OIDC.** (Not better-auth — out of scope.)

Why this is safe: the session-user shape minted by local auth is **identical** to the shape the OIDC flow minted. The roughly **45 `req.user.claims.sub` reads** and roughly **90 `isAuthenticated` / `isAdmin` middleware sites** across the codebase are therefore **auth-agnostic** — they read the minted shape, not the auth provider — so they keep working unchanged. We are removing the *provider*, not the *contract*.

## Requirements

- Zero `replit` / `REPL_ID` references in `server/`, `client/`, `shared/` (proven by `rg`, `.md` files excluded). The **only** allowed surviving reference is the documented GitHub-connection `GITHUB_TOKEN` fallback (see step 12).
- App builds (`npm run build` exits 0) and runs locally without Docker.
- Register, login, session persistence, and logout all work via `passport-local`.

## Dependencies

- **Requires:** section-00 (repo/env baseline, local Postgres reachable).
- **Blocks:** section-02.

## Implementation Steps

1. **Create `server/session.ts`.** Move `getSession()` out of `server/replitAuth.ts:21-42` (the `connect-pg-simple` session-middleware factory — verified to have **no** `openid-client` / `memoizee` coupling). Add a **simplified** `isAuthenticated` middleware that does an **expiry check only**. The OIDC token-refresh branch at `server/replitAuth.ts:166-176` imports `openid-client`; stripping it is **necessary, not optional** (keeping it re-introduces the dependency we are deleting). Define a real `SessionUser` type matching the minted shape:
   ```ts
   export interface SessionUser {
     claims: {
       sub: string;
       email: string;
       first_name: string;
       last_name: string;
       profile_image_url: string;
     };
     expires_at: number;
   }
   ```
   `isAuthenticated`: reject if not authenticated or if `req.user.expires_at` is in the past; otherwise `next()`.

2. **Edit `server/routes.ts`.**
   - Line 47: change the import to `import { isAuthenticated } from "./session";` — **drop** `setupAuth`.
   - Lines 407-431: **collapse to unconditional**. Delete the entire `if (process.env.REPL_ID) { ... }` block and the `await import("./replitAuth")` dynamic import. Replace with:
     ```ts
     app.set("trust proxy", 1);
     app.use(getSession());            // from ./session
     app.use(passport.initialize());
     app.use(passport.session());
     passport.serializeUser((user: any, done) => done(null, user));
     passport.deserializeUser((user: any, done) => done(null, user));
     setupLocalAuth(app);
     ```
   - **Leave `server/routes.ts:1078-1082` UNTOUCHED** — the raw-SQL session DELETE `sess->'passport'->'user'->'claims'->>'sub'` works under local auth (same minted shape).
   - **Do NOT** port the OIDC `dbUser` hydration. Divergent serialize/deserialize (pass-through vs. DB hydration) is **not a regression**: `isAdmin` (`server/routes.ts:97`) and `/api/auth/user` (`server/routes.ts:560`) both re-fetch from the DB.

3. **Edit `server/types.ts:4`** — change to `import { SessionUser } from "./session";` (or inline the interface). Ensure the Express `Request.user` augmentation references `SessionUser`.

4. **Delete `server/replitAuth.ts`** after extraction. Then grep to confirm no importers remain:
   ```
   rg -n "replitAuth" server
   ```
   Expect zero hits.

5. **Edit `vite.config.ts`** — remove lines 8-22 (the `@replit/*` plugin blocks: cartographer + runtime-error-modal). **Keep** `react()`.

6. **Edit `client/index.html`** — remove:
   - `:158-159` — the `replit-dev-banner` script tag.
   - `:96` — the `.replit.dev` host check.
   - `:83` — the related comment.

7. **Edit `client/src/lib/authUtils.ts:28-29`** — remove the `REPL_ID` comment.

8. **Repoint OIDC login links.** Remove the "Login with Replit" `/api/login` buttons, or point them to `/login`:
   - `client/src/pages/Login.tsx:94`
   - `client/src/pages/SubmitResource.tsx:274`
   - `client/src/pages/SubmitResource.tsx:336`

9. **Edit `package.json`** — remove dependencies:
   - `@replit/vite-plugin-cartographer` (optionalDep)
   - `@replit/vite-plugin-runtime-error-modal` (optionalDep)
   - `openid-client` (OIDC-only)
   - `memoizee` (grep-verified OIDC-only)
   - `memorystore` (`:82` dead — zero imports)
   - `@neondatabase/serverless` (`:25` dead — app uses node-postgres; **verify no import first**, then remove)

   Then `npm install` to update the lockfile.

10. **Delete `.replit`.** Clean `.env`: remove `NEON_DATABASE_URL`. Remove "Neon" comments in `server/db/index.ts`.

11. **Object storage — VERIFIED not used.** No `@replit/object-storage`, no `REPLIT_DB_URL`, no GCS. **No action required.** Documented here for completeness.

12. **GitHub `REPL_IDENTITY` is a SEPARATE concern.** `server/github/replitConnection.ts:39-40` is a GitHub *connection* token, **not auth**. **Leave it**, with a documented `GITHUB_TOKEN`-env fallback. This is the single allowed surviving `replit`-named reference (it lives in a connection module, not the auth path).

## Validation Gate VG-1 (BLOCKING)

**Prerequisites:** local Postgres reachable; `DATABASE_URL` and `SESSION_SECRET` set in env.

**Capture (run exactly):**
```
mkdir -p e2e-evidence/phase1

rg -i "replit|REPL_ID" server client shared --glob '!*.md' | tee e2e-evidence/phase1/replit-refs.txt

npm run build 2>&1 | tee e2e-evidence/phase1/build.txt

# start the server, then with a cookie jar:
curl -s http://localhost:5001/api/health | tee e2e-evidence/phase1/health.json
curl -s -c e2e-evidence/phase1/jar.txt -X POST http://localhost:5001/api/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"vg1@example.com","password":"Vg1-passw0rd","firstName":"VG","lastName":"One"}' \
  | tee e2e-evidence/phase1/register.json
curl -s -c e2e-evidence/phase1/jar.txt -b e2e-evidence/phase1/jar.txt -X POST http://localhost:5001/api/local/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"vg1@example.com","password":"Vg1-passw0rd"}' \
  | tee e2e-evidence/phase1/login.json
curl -s -b e2e-evidence/phase1/jar.txt http://localhost:5001/api/auth/user \
  | tee e2e-evidence/phase1/auth-user.json
```

**Pass criteria:**
- `replit-refs.txt` is **empty** (the only allowed line is the documented GitHub-connection fallback from step 12).
- `build.txt` shows build **exit 0**.
- `auth-user.json` returns the registered user with `isAuthenticated: true` (the session persists across the cookie jar).

**Mock guard:** Do **NOT** stub auth or fake a session to make the gate pass. If it fails, fix the real wiring (`server/session.ts`, `server/routes.ts`).

## Acceptance Criteria

- [ ] `server/session.ts` created with `getSession()`, simplified expiry-only `isAuthenticated`, and `SessionUser` type.
- [ ] `server/routes.ts:47` imports `isAuthenticated` from `./session`; `setupAuth` no longer imported.
- [ ] `server/routes.ts:407-431` collapsed to unconditional local-auth wiring; `REPL_ID` branch + dynamic `import("./replitAuth")` deleted.
- [ ] `server/routes.ts:1078-1082` raw-SQL session DELETE left untouched.
- [ ] `server/types.ts:4` references `SessionUser`.
- [ ] `server/replitAuth.ts` deleted; `rg "replitAuth" server` returns zero hits.
- [ ] `vite.config.ts` `@replit/*` plugin blocks removed; `react()` kept.
- [ ] `client/index.html` lines `:158-159`, `:96`, `:83` removed.
- [ ] `client/src/lib/authUtils.ts:28-29` `REPL_ID` comment removed.
- [ ] `/api/login` "Login with Replit" buttons removed/repointed in `Login.tsx:94`, `SubmitResource.tsx:274` & `:336`.
- [ ] `package.json` Replit/OIDC/dead deps removed; lockfile updated via `npm install`.
- [ ] `.replit` deleted; `.env` `NEON_DATABASE_URL` removed; Neon comments removed from `server/db/index.ts`.
- [ ] GitHub `REPL_IDENTITY` left with documented `GITHUB_TOKEN` fallback (only allowed surviving ref).
- [ ] VG-1 passes: `replit-refs.txt` empty, build exit 0, `/api/auth/user` returns user with `isAuthenticated: true`.

## Files to Create / Modify / Delete

**Create:**
- `server/session.ts`

**Modify:**
- `server/routes.ts`
- `server/types.ts`
- `vite.config.ts`
- `client/index.html`
- `client/src/lib/authUtils.ts`
- `client/src/pages/Login.tsx`
- `client/src/pages/SubmitResource.tsx`
- `package.json`
- `server/db/index.ts`
- `.env`

**Delete:**
- `server/replitAuth.ts`
- `.replit`
