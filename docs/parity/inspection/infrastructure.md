# Phase 0 parity inspection — infrastructure

Read-only inspection; no product edits, tests, browser, server, network, or env/secrets access. Complete ledger: `/tmp/parity-inspection/ledger.json`. Client ledger: `/tmp/parity-inspection/client-src-read.json` (179/179 files; 49,610 lines; complete contiguous reads; SHA256/bytes recorded per file).

## Instructions and design records
- Fully read `replit.md`, `docs/DESIGN-SYSTEM.md`, `docs/COMPONENT-LIBRARY.md`, `docs/UX-DECISIONS-2026-09-01.md`, the attached design-system brief, and `.local/tasks/verified-app-design-parity-archive-review.md`; hashes/size/line counts are in ledger.
- No requested file was missing among those paths. Auth guidance is Clerk-based in `replit.md`; relevant Clerk memory files exist under `.agents/memory/` and were not reproduced here to avoid credentials.

## Runtime and dependency surface
- Root package is `rest-express`, ESM, MIT. Declared commands include dev/build/start/check/type-check/lint/test gates, design-system artifact generation/validation, cache/pool/font/auth-return validations. Installed versions and license metadata for selected dependencies are in `infrastructure-read.json`; lockfile was traversed programmatically (not semantic source-read, no security-pass claim).
- Design system: five systems × ten accents, CSS attribute driven; Editorial/Crimson default; shadcn bridge; preserve APIs, auth, analytics, test IDs, ARIA in later work.
- `awesome-list.config.yaml` and `shared/schema.ts` were fully read and ledgered. Schema contains resources, taxonomy, users/auth-related tables, bookmarks/favorites, journeys, public API keys, and legacy password-reset/session structures.

## Auth/status and public API shape (source-derived, not runtime proven)
- Clerk middleware/session cookie and same-origin Clerk Frontend API proxy are documented in `replit.md`; `requireAuth` gates protected routes, `clerkUserContext` resolves/JIT-provisions DB users. No credentials or env values inspected.
- Health/status routes: `GET /api/health`, `/api/health/live`, `/api/health/ready`, `/api/health/ai`; version `GET /api/version`; OpenAPI `GET /api/openapi.json`, docs `GET /api/docs`. Exact response shapes should be taken from handlers/OpenAPI at implementation time; this read did not claim live functionality.
- Read-only public endpoints: `GET /api/public/resources` (pagination/filter shape in `server/api/public.ts`), `/api/public/resources/:id`, `/api/public/categories`, `/api/public/tags`; `/api/public/me` is API-key protected despite `/public` naming. Public collections: `GET /api/public/collections/:shareId`. Catalog endpoints include `/api/awesome-list`, `/api/awesome-list/nav`, `/api/awesome-list/listing`, `/api/categories`, `/api/subcategories`, `/api/sub-subcategories`, `/api/tags` (handlers in route domains). Static public endpoints include sitemap and OG images.
- Source comments/documentation indicate catalog audit counts of 9 categories and 2,282 resources; this is historical/source evidence, not a live count. No server was started and no network request made, so current counts/status are explicitly unproven.

## Requested parity considerations
- `kind`/`featured`: inspect existing resource metadata/schema/import/export serializers before additive changes; preserve backward compatibility and default-off behavior. No product changes made.
- Contact/server destination: public API is read-only for anonymous consumers; API-key route exists for `/api/public/me`. Any contact destination must be configured server-side with a safe default-off/read-only mode and must not expose env values; validate at implementation phase.
- Relevant implementation ownership: `client/index.html`, `awesome-list.config.yaml`, `shared/schema.ts`, root manifests/lockfiles/configs, Express route domains/serializers/importers/migrations. Later phases must gate on this baseline.

## Limitations
- No runtime endpoint counts, auth round-trip, response payloads, analytics delivery, or functionality were proven. No env, `.env`, secrets, credentials, network, browser, tests, or server changes were accessed/executed.
- Complete source reading means source files were read and hashed; it does not establish production behavior.
