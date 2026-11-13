# Code deep-dive: B4 pool, B14 cache, B12 refetch, B2 job trigger, backup

> Layout is mine (the brief listed questions, not a template). Code-only, read-only: nothing was run, no prod contact, no production numbers were available to me. Source: checkout of origin/main `6cb1a93e`.
> Anything marked **UNVERIFIED** is inference from reading, not an observation. Paths: `S`=`server/`, `C`=`client/src/`.

## B4. DB pool

**Pools per instance (3, not 1)**
| Pool | max | Where | Note |
|---|---|---|---|
| App pool (drizzle `db`) | 8 | `S db/index.ts:33-35` | `connectionTimeoutMillis 3000`, `statement_timeout 8000`, `query_timeout 10000`, `lock_timeout=2000`, `idle_in_transaction_session_timeout 10000` (`:36-44`) |
| Rate-limit store | 2 | `S middleware/pgRateLimitStore.ts:49-52` | One shared pool, own circuit breaker; the comment at `db/index.ts:28-30` budgets 8+2 = 10 per instance |
| Migration runner | 1 | `S migrate.ts:59-62` | Production boot only, before `listen` (`S index.ts:564-573`) |
| Backup (off-pool) | +1 client, +1 `pg_dump` process | `S backup/databaseBackup.ts:287` (`pg.Client`, `statement_timeout 120_000`), `:412` (`pg_dump --dbname`) | Not counted in the 10. One backup = up to 2 extra server connections for its duration |

**Ops panel is stale.** `S routes/domains/operations.ts:96` hard-codes `max: 3`. `db/index.ts:20-26` says the old `max=3` was raised to 8 (Task #327). Fix: `max: pool.options.max`.

**Who holds a connection for long** (hold = one pool client checked out)
| Path | Holds a connection? | Evidence |
|---|---|---|
| Every statement | Capped at 8 s server-side; a transaction left idle >10 s is killed | `db/index.ts:40-44` |
| Faceted listing | 3 concurrent queries per request (count + page + facets) = 3 of 8 slots at once | `db/index.ts:20-24` comment; ~2.6 listings fill the pool |
| Link-health sweep (20-40 min) | **No.** The HTTP sweep runs with `concurrent: 10`, then 10-wide browser re-check; DB is touched only by a throttled progress `UPDATE` (≤1 per 2 s, fire-and-forget) | `S services/linkHealthService.ts:221-228` (comment "network-bound… 20-40 minutes"), `:245-259`, `:283-288` |
| Link-health finalize | **Yes, one transaction**: advisory lock, insert of every check row in chunks of 500, update, prune. Bounded by the 8 s statement cap per statement but one connection for the whole tx | `linkHealthService.ts:342-390` |
| Auto remediation (right after finalize in prod) | One short transaction per action, run sequentially, so 1 connection at a time; each action calls `withResourcePublication` which invalidates the whole public cache | `S services/linkRemediation.ts:365-387`, `S repositories/resourcePublication.ts:16-17` |
| heavyWork queue | It is a semaphore (`MAX_ACTIVE 1`, `MAX_QUEUED 2`, queue wait 2 s), not a pool consumer. What runs inside it consumes the pool: exports (full-table reads), `automatic-seed`/`manual-seed`, `catalog-validation`, `github-sync`, `database-backup`, `link-health` (catalog read only) | `S ops/heavyWork.ts:6-24`; callers `S routes/domains/export-link-health.ts:650,697,738,827,1057,1084,1261,1312`, `S routes.ts:449` |
| Seed / clear & re-seed | Longest single transaction in the code (`db.transaction` when clearing) | `S seed.ts:340` |
| Researcher | Short admission tx under an advisory lock, then the agent loop uses ordinary pool queries between model calls. No transaction spanning a model call found in the three `transaction` sites I read | `S ai/researchService.ts:1096`, `:1937`, `:395`. **UNVERIFIED** for the rest of the 2k-line file |
| Enrichment | Admission tx (advisory lock), per-item writes; each item awaits 2 network calls via `Promise.all` and writes after | `S repositories/EnrichmentRepository.ts:106`, `S ai/enrichmentService.ts:457,492,516`. **UNVERIFIED** that no tx wraps the network await |
| Boot backfills | Sequential, one connection: watchdog, count queries, auto-seed only when DB empty, kind backfill = one SELECT of all NULL-kind rows then updates in chunks of 500 | `S routes.ts:419-494`, `S repositories/ResourceRepository.ts:1013-1043` |
| Cache misses (cause of pressure) | A `catalog-tree` rebuild is 4 sequential queries; a route-meta miss runs a route resolve against the DB. Thrashing the cache (B14) turns hits into these | `S repositories/LegacyRepository.ts:90-97`, `db/index.ts:23-24` |

**Reading:** nothing in the code holds a connection for minutes. The long background work (link scan, researcher, enrichment) is network-bound and uses short statements, so the pool is mostly exposed to bursts of request-path queries (3-wide listings, tree rebuilds), plus the finalize tx and seed tx. I have no pool telemetry, so "8 is too small / big enough" is **UNVERIFIED**.

**Recommendation**
1. Read live numbers first: `GET /api/admin/operations/health` already returns `total/idle/active/waiting` (`operations.ts:95-101`) and `heavyWork`. If `waiting` stays 0 and `active` peaks <6, keep 8.
2. Fix the label: `max: pool.options.max` at `operations.ts:96`.
3. Fix B14 before touching the pool; cache misses are the avoidable DB load.
4. If `waiting > 0` under normal traffic: raise the app pool to 10-12 (budget per instance becomes 12-14 plus 2 for a backup). Check Neon's connection ceiling x max autoscale instances first (not visible from code; the comment assumes ">100").
5. Optional hardening: give the link-health finalize/remediation work its own pool of 1-2 so a scan finishing never competes with visitors. Not needed if (4) is not triggered.

## B14. Public cache

**Mechanics** (`S cache/publicCache.ts`)
- Cap: `MAX_ENTRIES = 512` (`:45`), `MAX_BYTES = 48 MB` (`:52`), `MAX_IN_FLIGHT = 64` (`:53`). LRU by Map insertion order; a hit re-inserts (`:129-132`). `evictToBounds` (`:96-103`) pops the oldest while over either cap and increments `evictions`.
- **Expired entries are never swept.** They are only removed when the same key is read again (`:134`). So the entries cap fills with dead entries and `evictions` counts evicting entries that were already past their 60 s TTL. Evictions of expired entries cost nothing. **The 1,039→1,296 counter alone does not prove live entries are being thrown away.** To tell: log `expiresAt > now` at eviction.
- Invalidation clears everything at once and bumps the generation (`:188-195`); `entries.clear()` does not touch the `evictions` counter. 34 call sites call `invalidatePublicCache`.
- TTL is 60 s everywhere (`ttlMs: 60_000`).

**Keys** (all prefixed `public:v1:<namespace>:`)
| Namespace | Key | Where | Count |
|---|---|---|---|
| route-meta | the request path (`?page=N` appended when N>1; `/sign-in?admin`) | `S og-middleware.ts:347-357` | see below |
| catalog-body | `complete`; `filtered:<cat>\|<sub>\|<subsub>` | `S routes/domains/export-link-health.ts:1536,1596` | 1 + singles 9+99+46 = 154 + any combination of known slugs |
| catalog-nav | `complete` (home SSR), `api-complete` | `S home-ssr-data.ts:15`, `export-link-health.ts:1715` | 2 |
| catalog-tree | `complete-tree` | `S repositories/LegacyRepository.ts:93` | 1 |
| catalog-taxonomy | `categories`, `tags`, `subcategories:<id\|all>`, `sub-subcategories:<id\|all>`, `kind-counts:<category>` | `S routes/domains/catalog-contributions.ts:1310,1342,1385,1427,527`; `home-ssr-data.ts:33` | ~1 + 1 + (9+1) + (99+1) + (9+1) ≈ 122 |
| catalog-body | `home-feed-v1` | `S routes/domains/home-feed.ts:22` | 1 |

**route-meta is the one that overflows.** `resolveRoute` bypasses the cache only for `/search`, taxonomy URLs with a query string, `/collection/*` and tag-filtered Home (`og-middleware.ts:335-345`). Everything else is cached under its path, **including paths that resolve to a soft 404** and unknown ids. A path with a file extension is skipped earlier (`:2210`), nothing else filters. So the key space is every URL a crawler or scanner asks for, not just real pages.

**Real-page key-space estimate** (inputs from the brief and code; resource count is from memory notes, ~1,950 approved)
| Page type | Keys |
|---|---|
| `/resource/:id` | ~1,950 |
| `/category/*`: 9 nodes | 9 |
| `/subcategory/*`: 99 | 99 |
| `/sub-subcategory/*`: 46 | 46 |
| `/tag/*` | 280 (all cacheable as paths) |
| Extra listing pages (`?page=N`, 24 per page, `LISTING_PAGE_SIZE` `seo-content.ts:256`) | roughly 1,950/24 ≈ 81 per taxonomy level, so ≈ 100-250 beyond page 1 |
| Static pages, journeys, Home, auth | ≈ 30-40 |
| **route-meta total** | **≈ 2,400-2,700** |
| Other namespaces | ≈ 280 (see table) |
| Plus filtered catalog bodies (1-3 MB each, so the 48 MB cap allows only ~16-48 of them) | variable |

So the legitimate key space is **~5x the 512 cap** even before any junk probing. With a 60 s TTL, the live working set is the number of distinct keys requested per minute. A crawler walking `/resource/N` pages will cycle the whole cap. Whether live (unexpired) entries are being evicted in prod is **UNVERIFIED**; the counter cannot say.

**Recommendation**
1. Cheapest and highest value: sweep or skip expired entries. In `evictToBounds` evict expired entries first (scan from the oldest while `expiresAt <= now`) and count `evictedLive` vs `evictedExpired` separately in `getPublicCacheSnapshot`. That answers "is it really thrashing" with one deploy.
2. Raise `MAX_ENTRIES` to 4096. route-meta values are small strings/objects; the 48 MB byte cap already bounds memory, and it is the real limiter for big bodies. 4096 covers the legitimate key space (~2.7k) with headroom. Keep `MAX_BYTES` as is.
3. Stop caching junk: in `og-middleware.ts:347-357`, don't cache soft-404 / unresolved routes (or cache them under one shared key per status), so a scanner can't fill the cap. This needs the resolver result to carry "resolved" (not read in full: **UNVERIFIED** how it marks a soft 404).
4. Optional: separate small caps per namespace so one namespace can't evict `catalog-tree` / `catalog-nav` (the expensive, hot ones). A cheap alternative is to treat those 6-8 hot keys as pinned.
5. Note the side effect: a single approve/archive clears the whole cache (`:188`); remediation applies one action per archive, each clearing again (`linkRemediation.ts:321`), so the post-scan minutes are cold-cache.

## B12. Why `/api/config`, `/api/auth/user`, `/api/awesome-list/nav` refetch for anonymous visitors

**Root cause shared by all three:** there is no query persistence (grep for `persistQueryClient` found none), so every **document load** builds a fresh `QueryClient` and re-fetches. `staleTime` only suppresses refetches **inside** one SPA session. Default `staleTime: Infinity` (`C lib/queryClient.ts:301`), `refetchOnWindowFocus: false` (`:300`). The "refetch on every page view" you see is every full page load (crawlers, first visits, link clicks that reload), not client-side navigation.

| Endpoint | Client hook / options | Server cache header | Why it hits the server |
|---|---|---|---|
| `/api/config` | `useContactConfig`, `staleTime 5 min`, `enabled` when the contact variant is set (`C lib/contact.ts:59-68`). 8 call sites share one query key (MainLayout, footer, dialog, palette, About, Legal, Taxonomy, GitHub panel) | `public, max-age=300` (`S contact.ts:171-175`) | Not seeded by SSR ("client-only", `contact.ts:63-65`), so each document load asks. The browser HTTP cache should absorb repeat loads within 5 min; `apiRequest` uses `cache: 'default'` normally, `'no-cache'` for a window after an admin catalog write (`queryClient.ts:334-336`). First-time visitors and crawlers always miss. |
| `/api/auth/user` | `useAuth`, `staleTime 5 min`, `retryOnMount: false` (`C hooks/useAuth.ts:148-165`). Home SSR seeds the anon value but **deliberately excludes it from dehydration** so a Clerk session set between render and hydrate is not masked (`C entry-server.tsx:38-49`) | none on the anonymous reply; the handler sets nothing (`S auth-user.ts:93-107`). `SESSION_CACHE_CONTROL = private, no-store` is added only when `req.dbUser` exists (`S index.ts:516-520`) | Fetched on every document load for everyone, including visitors who have never signed in. |
| `/api/awesome-list/nav` | `useQuery(["awesome-list-nav"])`, `staleTime 1 h` (`C App.tsx:743-745`); non-Home pages also fire an early fetch from `index.html:238-243` | `public, max-age=60, must-revalidate` (`S http-cache-policy.ts:40`), server cache TTL 60 s | Home is SSR-seeded (no fetch). Every other route fetches once per document load; the browser may revalidate after 60 s. |

**Minimal changes**
1. `/api/auth/user`: skip the request when the visitor has no Clerk session hint. `hasClerkSessionHint()` already exists (`C lib/clerk-bridge.tsx:136-143`: `__client_uat` non-zero or `__session` present). In `fetchAuthUser` (`useAuth.ts:136`-ish), return `{ user: null, isAuthenticated: false }` when it is false. **Risk to check before shipping:** the owner password login (`POST /api/auth/admin-login`, `S auth-user.ts:164`) sets its own cookie that this hint does not see; confirm the cookie name and add it to the hint, or admin sessions will look signed out. **UNVERIFIED** (not read).
2. `/api/config`: add `Cache-Control: public, max-age=300, stale-while-revalidate=3600` and, since SSR cannot seed it, set `staleTime: Infinity` on the query. No other change.
3. `/api/awesome-list/nav`: for non-Home routes, the server could embed the nav in the HTML like Home does (`data-home-ssr` path). That is a larger change; the cheap one is `stale-while-revalidate=300` on the response so repeat loads never wait or revalidate.
4. Do not bump global `staleTime`; it is already `Infinity`.

## B2. External "run due jobs" trigger

**Why it is needed:** the schedulers are `setInterval` timers started at boot (`S index.ts:753-755`) and the backup route comment says "autoscale deployments only run code while a request is open" (`export-link-health.ts:1053`). On a scaled-to-zero instance nothing ticks. (Whether prod actually idles to zero is **UNVERIFIED**.)

**Is there already an endpoint?** Partially, and not suitable for a bot:
| Job | Existing HTTP trigger | Gap |
|---|---|---|
| Link health | `POST /api/admin/link-health/run` (`export-link-health.ts:1184`) calls `startCheck()` (always starts, 409 if running), not `startCheckIfDue` | Not "if due"; admin cookie only |
| Digest | none. `runDigestCycle` has no route (`S services/digestService.ts:1191`) | Missing |
| Contact purge | none (`purgeExpiredContactSubmissions` only in the scheduler) | Missing |
| Backup | `POST /api/admin/database-backups` (`export-link-health.ts:1055`), synchronous | Admin cookie only; no schedule |
Guards today are Clerk session + `isAdmin` or the owner cookie. API keys (`optionalApiKey`/`requireApiKey`) are only for `/api/public/*`. No shared-secret header or cron token exists (grep found none).

**Idempotency/lock already present** (so a double trigger is safe):
- Link health: advisory lock `pg_advisory_xact_lock(5116,7)` plus "already running" check (`linkHealthService.ts:184-197`); `startCheckIfDue` checks interval and a 30-min-style retry window (`:158-181`).
- Digest: jobs have an idempotency key (`digestService.ts:559`), claimed with `FOR UPDATE SKIP LOCKED` (`:599`); notification inserts are idempotent (`:900-904`).
- Contact purge: single `DELETE … WHERE id IN (… LIMIT n)`; safe to repeat (`ContactRepository.ts:14-32`).
- Backup: process-local boolean `backupInFlight` only (`databaseBackup.ts:382-399`); see Backup section.

**Sketch** (`POST /api/internal/run-due-jobs`, new file under `S routes/domains/`)
- Guard: shared secret in `x-job-token`, compared with `crypto.timingSafeEqual` (pattern exists at `S clerkAuth.ts:181`), secret in a Replit Secret (`JOBS_TOKEN`), 503 if unset, no Clerk/admin session. Rate-limit it (reuse `adminLoginLimiter` style) and exclude it from the SPA/public contract list.
- Body: `{ jobs?: ["linkHealth","digest","contactPurge","backup"] }`, default the first three. Backup only when asked explicitly or when the newest backup is older than N hours.
- Behaviour per job, all "if due", each wrapped so one failure doesn't stop the rest and each returns `{ ran | skipped | error }`:
  - `startCheckIfDue(linkHealthIntervalHours())` (`jobs/linkHealthScheduler.ts:10`). Returns immediately; the scan continues in the background, which on autoscale only survives while the instance stays up (**UNVERIFIED** how long prod keeps it).
  - `runDigestCycle({ limit: 20 })`, awaited inside the request (bounded by `limit`).
  - the purge loop from `contactRetentionScheduler.ts:19-35`; extract it into an exported function and call it from both places.
  - backup: see below.
- Lock: a Postgres advisory lock per job (`pg_try_advisory_lock`, skip if not acquired) so two overlapping callers, or the in-process scheduler plus the endpoint, don't double-run; the digest and link-health paths already tolerate this, so the lock matters most for backup and purge.
- Keep the in-process schedulers; the endpoint is an additional trigger, and `DISABLE_BACKGROUND_JOBS` stays untouched.
- Caution for the lead: calling this against prod is a write action (scan, remediation auto-apply, email send). It is deferred under the lane rules.

## Backup (`S backup/databaseBackup.ts`)
- **Format:** `pg_dump --format=custom --compress=6 --no-owner --no-privileges`, whole DB minus the `_system` schema (`:63`, `:412-420`). Two objects per backup: `<id>.dump` and `<id>.manifest.json` (id `YYYYMMDDTHHMMSSZ-8hex`, `:166`). Manifest carries sha256, byte size, per-table row counts and sequence values read back out of the archive, plus a schema inventory (`:108-130`, `:309-355`). Manifest is uploaded last and is the commit marker (`:452-456`); a backup with no manifest is invisible.
- **Storage:** private Replit App Storage under `<PRIVATE_OBJECT_DIR>/db-backups/<environment>/`, **no download route** by design (`:19-26`). Requires `DEFAULT_OBJECT_STORAGE_BUCKET_ID` / `PRIVATE_OBJECT_DIR` (`:149-152`); `isBackupStorageConfigured()` reports whether.
- **Needs at runtime:** `pg_dump` and `pg_restore` binaries on PATH inside the deployment image (`runTool`, `:183`; version check `:402`). **UNVERIFIED** that the Autoscale image has them; `.replit` lists `postgresql-16` as a module, but the build step is `scripts/publish-build.sh` which I did not read.
- **Restore needs:** CLI only, `npm run db:backup -- restore <id>` (`scripts/db-backup.ts`) with `TARGET_DATABASE_URL` pointing at an **empty** database; it refuses a non-empty target and refuses this app's own `DATABASE_URL` (`:523-545`), verifies sha256, runs `pg_restore` in one transaction, then compares row counts, sequences, inventory (`:560-620`). There is no restore route. So a restore is a manual, new-database operation, and promoting it into prod would be a separate step (changing the secret).
- **Retention:** **none.** grep for prune/delete/retention in the file and `scripts/db-backup.ts` finds nothing; backups accumulate until someone deletes the objects. A scheduler would need to add pruning (list via `listDatabaseBackups`, `:481`, delete old `.dump` + `.manifest.json` pairs, keep last N and one per week).
- **Can a scheduler reuse `createDatabaseBackup`?** Yes mechanically (`createdBy: null`), but:
  1. The in-flight lock is a module variable (`backupInFlight`, `:380-399`), so it protects one process only. On Autoscale two instances can dump at once (each also needs a temp dir, `withTempDir` `:367`). Add `pg_try_advisory_lock` around it.
  2. It runs inside `runHeavyWork('database-backup')` only in the route (`export-link-health.ts:1057`); a scheduler must do the same so exports/seed don't overlap (heavyWork allows 1 active, 2 queued, 2 s wait, so it would 503 instead of waiting).
  3. It is synchronous and long (dump + `pg_restore --data-only` read-back + upload); on Autoscale it only completes if the instance stays alive for the duration. A request-driven trigger (B2) keeps the instance alive while the response is open; a `setInterval` does not.
  4. The audit row is written by the route (`export-link-health.ts:1058-1070`), not by `createDatabaseBackup`; a scheduler should write the same `database.backed_up` audit entry.
  5. Pool: `pg_dump` and the inventory client are extra connections outside the 8-slot pool (B4).

## What I did not verify
- No runtime numbers: pool waiting/active, cache live-eviction ratio, real resource count (taken from memory notes), and whether Autoscale idles to zero were not observable from code.
- `og-middleware.ts` soft-404 caching behaviour (recommendation 3 for B14) rests on reading lines 335-357 only.
- Owner-cookie name for the auth hint change (B12.1) was not read.
- `pg_dump` availability in the deployed image, and the rest of `researchService.ts` / `enrichmentService.ts` for transactions spanning network calls.
