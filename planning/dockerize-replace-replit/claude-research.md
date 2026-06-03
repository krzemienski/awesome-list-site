# Research Findings — Criterion #7 Dockerize & Replace Replit

> Synthesized from 6 parallel Explore agents (3 codebase, 3 web), 2026-06-01.
> Codebase claims carry `path:line`; web claims carry URL + access date.
> Tree-of-Thought decision tables at the end feed the interview (Step 6).

---

## A. Codebase reconciliation — current state (verified)

### A1. Auth is hybrid, but Replit code is ISOLATED to one file

- **Replit OIDC** (`server/replitAuth.ts`) — `openid-client`, memoized OIDC discovery (`getOidcConfig` :11), `getSession` (:21), `setupAuth` (:67), `isAuthenticated` (:154) with token-refresh branch (:166-176). Registers `/api/login` (:126), `/api/callback` (:134), `/api/logout` (:142).
- **Wiring**: `routes.ts:47` import; `routes.ts:410` `if (process.env.REPL_ID)` guard → `:411 setupAuth(app)`; else-branch `:414-418` imports `getSession`, mounts it, `passport.initialize/session`; `:431` **unconditional** `setupLocalAuth()`.
- **passport-local** (`server/localAuth.ts:6`) mints the SAME session shape as OIDC: `{ claims: { sub, email, first_name, last_name, profile_image_url }, expires_at }` (`:41-50`). → **the ~45 `req.user.claims.sub` reads and ~90 `isAuthenticated`/`isAdmin` middleware sites are auth-agnostic**, not Replit-bound.
- **Local auth routes**: `POST /api/auth/local/login` (`routes.ts:434`, with lockout guard `:438`), `POST /api/auth/register` (`:505`), `POST /api/auth/logout` (`:599`), `POST /api/user/change-password` (`:1048`), `GET /api/auth/user` (`:546`, public, returns user|null).
- **Session store**: `connect-pg-simple` over `DATABASE_URL`, table `"sessions"`, `createTableIfMissing:false` (`replitAuth.ts:25-26`), secret `process.env.SESSION_SECRET!` (`:31`, non-null — crashes if unset). Session table defined in `shared/schema.ts:19-27`, shipped in `migrations/0000_dry_kingpin.sql`.

**Landmines for any auth change:**
- `server/types.ts:4` imports `SessionUser` from `./replitAuth` — **but replitAuth never exports it** (phantom type; compiles only because handlers use `req.user as any`). Must define-or-delete.
- `routes.ts:1078-1082` change-password does a **raw SQL DELETE keyed on the OIDC session JSON path**: `WHERE sess->'passport'->'user'->'claims'->>'sub' = ${userId}`. Hard-codes the claims shape into SQL.
- Two divergent serialize/deserialize impls: local pass-through (`routes.ts:421-427`) vs OIDC DB-hydrating (`replitAuth.ts:106-124`). `/api/auth/user` (`:560-565`) re-fetches to compensate.
- `isAuthenticated` (OIDC) has refresh-token logic that is dead under local auth (static 1-week `expires_at`, no refresh_token).

### A2. DB driver — Replit DB already gone

`server/db/index.ts` uses `drizzle-orm/node-postgres` + `pg.Pool` over `DATABASE_URL`. Comments say "Neon free tier" and `.env` carries `NEON_DATABASE_URL` — cosmetic only. Pool `max:3`. `server/index.ts:53 runMigrations()` runs **only when `NODE_ENV=production`**, with a fallback that treats "tables exist" as success (masks the journal gap below).

### A3. Migrations journal defect — CONFIRMED, real

- `migrations/` has `0000_dry_kingpin.sql`, `0027_add_api_keys_table.sql`, `0028_add_research_discovery_sub_subcategory.sql`.
- `migrations/meta/_journal.json` lists **only `0000`**.
- **Mechanism (source-verified)**: drizzle `readMigrationFiles()` reads `_journal.json` then iterates `journal.entries[]`, reading exactly `${tag}.sql` per entry. It **does NOT scan the folder**. → `0027`/`0028` are **silently skipped**; `migrate()` applies `0000` and reports success. API-keys table + research sub-subcategory columns will be MISSING at runtime.
- `__drizzle_migrations` table (default schema `drizzle`) is the applied-tracking source of truth.

### A4. Replit reference removal inventory (exhaustive)

| Ref | Location | Action |
|---|---|---|
| Whole OIDC file | `server/replitAuth.ts` | Extract reusable `getSession`+`isAuthenticated`, delete OIDC |
| Phantom type | `server/types.ts:4` | Define real `SessionUser` or delete |
| Import + REPL_ID branch | `routes.ts:47`, `:409-418` | Remove; make session+local-auth unconditional |
| Vite plugins (REPL_ID-gated) | `vite.config.ts:8-22` | Remove |
| Deps | `package.json:152-153` (`@replit/vite-plugin-*`), `:82` (`memorystore`, **dead — zero imports**), `openid-client`, `memoizee` (if only OIDC) | Drop |
| Client banner + host check | `client/index.html:96`, `:158-159`, `:83` | Remove |
| REPL_ID comment | `client/src/lib/authUtils.ts:28-29` | Clean |
| OIDC login links | `Login.tsx:94`, `SubmitResource.tsx:274,:336` | Remove/redirect to `/login` |
| GitHub `REPL_IDENTITY` | `server/github/replitConnection.ts:39-40` | Separate concern (GitHub conn), evaluate |
| Replit project config | `.replit` | Delete (not consumed at runtime) |
| Cosmetic | `.env NEON_DATABASE_URL`, "Neon" pool comments | Clean |

### A5. Functional-audit inventory (17 client routes + 14-tab admin)

Router: `client/src/App.tsx:66-87`. **Public**: `/` (Home), `/login`, `/register`, `/category/:slug`, `/subcategory/:slug`, `/sub-subcategory/:slug`, `/resource/:id`, `/about`, `/advanced`, `/submit` (form gated), `/journeys`, `/journey/:id`, `/settings/theme`, `*` (404). **Guarded**: `/profile` + `/bookmarks` (`AuthGuard`), `/admin` (`AdminGuard role=admin`, 14 tabs: approvals/edits/enrichment/researcher/export/database/resources/categories/subcategories/subsubcategories/journeys/users/github/linkhealth/audit).

**Persistent chrome** (every screen, every breakpoint): `AppHeader` (mobile-drawer-trigger, search dialog via `/` + Cmd/Ctrl+K, theme palette link, login/avatar dropdown); `AppSidebar` (brand resource count, nav items, CATEGORIES accordion with DB-sourced badges, footer About); `search-dialog` (Fuse.js client-side).

**Counts (assert UI == DB)**: top-level category badges DB-sourced via `GET /api/categories` `resourceCount` (`AppSidebar.tsx:402-410`, `Home.tsx:107`); count SQL `CategoryRepository.getResourceCountsByCategory` = `count(*) WHERE status='approved' GROUP BY category`. ⚠️ Sub-/sub-sub badges still client-side recursive sum (`getTotalResourceCount`) — drift point. ⚠️ single-category `getCategoryResourceCount` does NOT filter status — admin list uses unfiltered; assert public = approved-only.

**Seed (`server/seed.ts`)**: source = **live S3 fetch** `https://hack-ski.s3.us-east-1.amazonaws.com/av/recategorized_with_researchers_2010_projects.json` (`:208`) — NOT a local file (network dependency at seed time — flag for offline Docker). ~2010 projects → **~1949-1953 approved resources** after skips; `mapCategoryName` collapses 21 raw → **9 canonical** top categories. **Admin user: `admin@example.com` / `admin123`, role admin** (`:137-173`). **Idempotent**: admin by email, categories by slug, resources by URL — skip-if-exists. Journey steps backfilled via `seedJourneyStepsForExisting()`.

**Known defects to re-verify in audit**: M-02 HIGH `/settings/theme` color picker blank + no-op (field-shape mismatch `ThemeSettings.tsx` ↔ `shadcn-themes.ts` ↔ `theme-provider.tsx`); FP-01 HIGH `/advanced` Export+AI tabs need full pointer-event sequence (bare `.click()` dead); FP-02 MED `/journey/6` 0 steps seeded; FP-03/FX-04/FP-05 LOW. Home subhead total drifts 1712/1713/1952/1953 across snapshots — assert live-UI == live-DB, not == stale screenshot.

**Reusable E2E assets**: `playwright.config.ts` (baseURL `localhost:5000`, chromium/ff/webkit + Pixel5 + iPhone12, webServer reuse), `tests/e2e/*.spec.ts`, `scripts/audit-gap-fill*.mjs`, prior `_planning/AUDIT_*.md` + `SITE_MAP.md`.

---

## B. Web research

### B1. better-auth (v1.6.13, ~28.5k★, active — Auth.js now recommends it)
- Native pg Pool OR `drizzleAdapter(db,{provider:"pg"})`. Creates 4 tables: `user`, `session`, `account` (holds hashed `password`), `verification` — **own session model (opaque token + expiresAt), NOT compatible with connect-pg-simple `sessions`**.
- Express: `app.all("/api/auth/*", toNodeHandler(auth))`. **No `req.user`** — call `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`. Gotcha: mount auth handler BEFORE `express.json()`.
- Email+password built in; verification optional; reset built in; **rate-limiting built in** (stricter on auth routes); scrypt hashing. No first-class N-attempt lockout (rate-limit is the defense).
- CLI: `generate` emits Drizzle schema → applied via YOUR drizzle-kit (no journal conflict). `migrate` is Kysely-only (don't use with Drizzle).
- **Effort into existing passport app**: REPLACES express-session/connect-pg-simple/passport-local; rewrites every `req.user`/`req.isAuthenticated()` site (~45 + ~90); rewrites raw-SQL session DELETE; rewrites client surface; manual password-hash backfill into `account.password`. ~1-3 days for small app, NOT a drop-in.
- Alternatives: **Lucia v3 DEPRECATED** (EOL Mar 2025, now a tutorial). **Auth.js v5 maintenance-mode** (security-only since Sept 2025; Express second-class; JWT default = no instant revoke). **passport-local stable but legacy-maintenance** (no built-in verify/reset/rate-limit — you DIY, as already done).

### B2. Deploy targets (weighted table in §C2)
- **Railway** (railway.json already present, DOCKERFILE builder): `deploy.healthcheckPath` is a first-class field → `/health`→`/api/health` is a one-line fix. Managed PG auto `DATABASE_URL`, runtime-env secrets (not baked), volume-backed PG, ~$10-20/mo. **Score 8.9.**
- **DO App Platform** ($5 app + $15 managed PG with backups+PITR): Dockerfile deploy, encrypted env, configurable health path, **real automated backups+PITR**. New config from scratch. **Score 7.9 — runner-up, stronger if managed backups are a hard requirement.**
- **Render** ($7 app + $6-20 PG): ⚠️ **build-arg secret-baking footgun** (env vars leak into image at build); free PG deleted after 30 days. **Score 6.9.**
- **Fly.io**: safest secrets (`fly secrets`, runtime-only) BUT **Managed PG $38+/mo**; self-PG adds ops. **Score 6.6.**
- **None run docker-compose.yml in production** — compose is local-dev/CI only; each service becomes a separate managed resource everywhere.
- **vercel.json is a dead end** for a long-lived Express+SSR container — delete it.

### B3. Audit harness (Chrome DevTools MCP available in this env)
- **MCP constraints**: `list_network_requests` has **NO HTTP-status filter** (filter 4xx/5xx yourself from returned status); `list_console_messages` filters by `types` only (regex hydration patterns over text yourself); `take_snapshot` returns UIDs that `click`/`fill` consume; `resize_page(width,height)` raw px; messages/requests scoped "since last navigation" (use `includePreserved*` to span).
- **Per-breakpoint loop**: `resize_page` → `navigate_page`/reload → `wait_for(text=<post-hydration marker>)` → `list_console_messages(types:["error"])` → `list_network_requests` (filter ≥400) → `evaluate_script(<overflow+clipping probe>)` → `take_snapshot` → `take_screenshot`.
- **Overflow probe**: `scrollWidth > clientWidth` (use clientWidth, not innerWidth) + per-element `getBoundingClientRect().right > docW+1` to find culprits + zero-size/off-viewport interactive-control check.
- **SSR settle (2026 best practice)**: `networkidle` now Playwright-DISCOURAGED. Prefer a **positive hydration marker** (`data-hydrated` attr / body class). Fallback only: networkidle + 250-500ms delay + re-query refs. **Capture hydration-mismatch console errors as a first-class defect.**
- **MCP vs Playwright**: MCP best for agent-driven exploratory first pass + triage (zero setup, already present); Playwright best for repeatable CI matrix (auto-wait locators + typed events solve the race natively). Pragmatic: MCP for the audit pass; this project already HAS a Playwright config + specs to lean on.

### B4. Container hardening (2026)
- **Non-root**: `addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs`; `COPY --from=build --chown=nodejs:nodejs` (not post-hoc `chown -R`); pre-create writable dirs before `USER nodejs`; bind port >1024.
- **App healthcheck**: pure-Node check avoids needing curl in alpine: `node -e "fetch('http://localhost:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`; set `start_period` so slow boot doesn't trip retries.
- **Migrate/seed on startup**: RECOMMENDED = **dedicated one-shot `migrate` service**, `depends_on: { db: service_healthy }`, app `depends_on: { migrate: service_completed_successfully }`. Avoids multi-replica race; decouples bad migration from app boot. Entrypoint-script alternative OK for single-container self-host. Seeds idempotent (`ON CONFLICT DO NOTHING`/skip-if-exists — seed.ts already is).
- **Secrets**: never bake into image/ENV/ARG; compose `env_file` acceptable for dev; prod = file-based secrets (`/run/secrets/*`, `_FILE` env convention) backed by a store.

### B5. Replit service → self-host map
| Replit service | App marker | Self-host replacement |
|---|---|---|
| Replit Auth (OIDC) | `ISSUER_URL`,`REPL_ID`,`REPLIT_DOMAINS`,`SESSION_SECRET` | Keep passport-local OR better-auth; delete openid-client + getOidcConfig (it fetches `replit.com/oidc/.well-known` at boot → hangs in container if left) |
| Replit DB (KV) | `REPLIT_DB_URL` | Postgres (already on it) — verify no usage |
| Replit Object Storage | bucket id + Replit GCS creds | S3 client (`@aws-sdk/client-s3`) → MinIO/local volume; seed already uses an S3 URL. **Verify if app actually uses object storage at all** |
| Replit Secrets/sidecars | process env | `.env` / Docker secrets — same `process.env.*` names |

---

## C. Tree-of-Thought Decision Tables (for interview)

### C1. AUTH — better-auth vs passport-local vs Lucia vs Auth.js

| Option | PG/Drizzle adapter | Session model | email+pw | Maintenance 2026 | Fit (existing code) | Churn / Risk | Score |
|---|---|---|---|---|---|---|---|
| **Finish passport-local** | Already wired (pg + connect-pg-simple) | DB sessions (`sessions` table, exists) | DIY (already built: register/lockout/pw-change) | Stable, legacy-maint | **Native — ~80% done; rip 1 file** | low / low | **9/10** |
| **better-auth** | Native (pg or Drizzle adapter) | Own opaque-token session table | Built-in (+reset, rate-limit) | **Active, leading** | Rewrite: no `req.user`, replaces session/passport stack, ~45+90 sites + client + SQL DELETE + hash backfill | high / med-high | **6/10** |
| Lucia v3 | Adapters deprecated | manual | DIY | **Deprecated** | N/A | — | 2/10 |
| Auth.js v5 | adapter | JWT default (no instant revoke) | not first-class | Maintenance-mode | Express second-class | high | 4/10 |

**Research recommendation: Finish passport-local + rip out Replit OIDC.** The codebase already mints the shared session contract that better-auth would discard; (a) is deletions + unification (~200-300 lines, low risk), (b) is a 1-3 day full auth rewrite for net-new managed features the app already hand-rolls. ⚠️ USER DECISION — spec defaulted to better-auth; deviation must be confirmed in interview.

### C2. DEPLOY — Railway vs DO vs Render vs Fly

| Option | Dockerfile | Managed PG + cost | Secrets | Healthcheck path | Backups | Ops | Fit (existing cfg) | Score |
|---|---|---|---|---|---|---|---|---|
| **Railway** | yes | ~$10-15 PG | runtime env (safe) | `healthcheckPath` in railway.json (1-line fix) | volume-backed | very low | **railway.json already present** | **8.9** |
| **DO App Platform** | yes | $15 (backups+PITR) | encrypted env | configurable | **PITR** | low | new spec | **7.9** |
| Render | yes | $6-20 | ⚠️ build-arg bake | render.yaml | paid ok (free 30d delete) | low | new blueprint | 6.9 |
| Fly.io | yes | ⚠️ $38+ MPG | safest (`fly secrets`) | fly.toml | snapshot-billed | medium | new fly.toml | 6.6 |

**Research recommendation: Railway** (lowest friction given railway.json already targets the Dockerfile; `/health`→`/api/health` one-line fix; delete vercel.json). **DO App Platform** is the runner-up if managed backups+PITR are a hard requirement. ⚠️ USER DECISION in interview.

### C3. MIGRATION STRATEGY — repair journal + startup mechanism

| Decision | Options | Recommendation |
|---|---|---|
| Journal repair | (a) add 0027/0028 entries to `_journal.json` · (b) re-baseline from schema · (c) switch to `push` | **(a)** — files exist + likely already applied; first probe `__drizzle_migrations` to know applied-vs-pending. (b) re-creates existing tables → errors. (c) abandons history + destructive-diff risk. |
| Startup mechanism | runtime `migrate()` · `drizzle-kit push` | **`migrate()` via one-shot service** gated `service_completed_successfully`. Push is non-deterministic on drift, "never in production". |

---

## D. Open questions for the interview (Step 6)
1. **Auth end-state**: confirm finish-passport-local (research rec) vs better-auth (spec default)?
2. **Deploy target**: Railway (rec) vs DO App Platform vs leave both configs?
3. **Object storage**: does the app actually USE Replit object storage anywhere, or is it auth+DB+secrets only? (decides if MinIO/S3 is in scope)
4. **Seed network dependency**: seed fetches from S3 at runtime — acceptable for "offline `docker compose up`", or must we vendor the JSON into the image/volume?
5. **Audit harness**: Chrome DevTools MCP (agent-driven, this session) vs codify into Playwright suite — or both?
6. **Production deploy execution**: actually deploy live to the target (needs account/secrets), or prepare verified config only?
7. **Default admin creds**: keep `admin@example.com`/`admin123` seeded (with forced-change), or parameterize via env?
