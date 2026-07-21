# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,600 curated video development resources. The project uses PostgreSQL as the single source of truth for all data, providing a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. Features include AI-powered learning platform capabilities, user authentication, admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories. The business vision is to create a leading platform for video development education and resource discovery, leveraging AI for personalized learning paths and an engaged community.

**Production Status**: ✅ Production-ready as of December 4, 2025. All critical bugs fixed, database integrity verified (0 orphaned resources), comprehensive error handling implemented.

## Recent Changes

> **Full history:** see [`CHANGELOG.md`](./CHANGELOG.md) for every dated entry back to December 2025. Older "Recent Changes" entries are moved there periodically.


### R6 Residual Remediation — Run25 (July 21, 2026)
- **All 22 R6 residual work orders closed** with per-finding claims + live dev proof — report: `artifacts/r6/CLAIMS.md` (9-section, evidence in `artifacts/r6/evidence/`). Highlights: R4-017 finally root-caused (flex-anchor `min-width:auto` on the URL text, not just the dialog shell) and locked in by a permanent self-seeding scrollWidth guard inside `responsive-audit` (now 28 checks); NB-018 proven contained with an 8,000-char seeded log line; R5-063 tag families folded to 0 via compact-key merge in `tagCanonicalize.ts`; NB-015/R5-032/R4-022 repaired by journaled, idempotent `scripts/r6-data-fixes.ts` (2nd APPLY run no-op). Dispositions: R5-002 invalid (no taxonomy description column), BUG-024 declined (cold-boot variance; API 36ms), R4-031 declined-by-design, R4-023 platform (archive.org egress-blocked), BUG-038 residual is browser-native console behavior.
- **Needs republish**, then prod data runs: `scripts/run24-data-fixes-prod.ts` (outstanding from Run24) and `npx tsx scripts/r6-data-fixes.ts --apply`. Done-check for both: second run fully no-op.

### R5 Audit Remediation — Run24 (July 20, 2026)
- **97-finding R5 audit cycle fully closed** (32 Part A residual orders + 65 Part B findings R5-001..065; specs `attached_assets/REPORT-R5_1784576224900.md` + MASTER-FIX-PROMPT-R5). Six parallel sub-runs merged: 24A server hardening (shared unicode/URL validators, session invalidation on password change, auth-before-method), 24B SEO/head/redirects (hydration head adoption, unified 404, og:type website), 24C client UX/state (latest-wins toggles at ALL surfaces incl. ResourceDetail inline mutations, fail-closed login preflight, per-URL chunk-reload guard), 24D responsive/print/a11y (admin prints 1 real page, card grids print URLs, forced-colors borders, mobile breadcrumb), 24E data script + importer title cleaning + tag canonicalization, 24F admin panel (ARIA tabs, inline dialog validation, coherent counters). Master table: was `fix-evidence-v3/completion-table.md` — removed in the July 21, 2026 repo deep clean; recover it from git history if a per-finding disposition is ever needed.
- **Final gate (Run24G) independently re-verified** every HIGH+MED live: R5-001..016 gates re-run in real Chromium; R5-008 link-check progress re-proven with a live run (0→230/1,806 in 60s); R5-007 journey-step repoints applied on dev (6 dangling ids, 0 orphans, second run no-op). tsc + migration-drift clean; P0 smoke 13/13 @1440+375; print audit 29/29; chunk boundary 1 auto-reload→retry card; QA `__qa_test%` net-zero.
- **Platform claim (R5-023)**: www.awesome.video hard-fails with Cloudflare 525 (edge cert valid, CF→origin TLS fails). Owner must either delete the www DNS record (clean NXDOMAIN beats a 525) or add an origin cert covering www + CF edge 301 www→apex. Documented in the completion table.
- **Wayback policy (R4-066)**: resources whose origins died stay pointed at their wayback snapshots; the data script auto-probes origins on each run and repoints only when the origin is live again (QUANTEEC repointed this run).
- **Rate limiter (R4-031)**: kept in-memory per-instance with documented math (deploy is single-instance; limits sized so N instances still bound abuse) — no shared store added by design.
- **Needs republish. Prod follow-ups after republish**: run `npx tsx scripts/run24-data-fixes-prod.ts` against the live admin API (idempotent, journaled; validated on dev). Expected: link + journey-step repoints, retitles/desc rewrites (incl. 38 GitHub-slug titles), share-tracking URL cleanup, tag canonicalization. Done-check: second run fully no-op (0 mutating).

## Print/responsive validation harness (July 21, 2026)

The Run24D print + responsive audit harnesses are now repeatable validation steps: `scripts/validation/print-audit.mjs` (49 checks — no-print/print-only pairs, shell chrome hide, print-keep-text exemption across 9 routes, PLUS a positive `content-prints` assertion (≥200 visible chars in print media) and a `pdf-not-blank` size guard on every route so a print stylesheet that blanks a page can never pass) and `scripts/validation/responsive-audit.mjs` (28 checks — profile header overlap 640–1440, wrapped tablist radius, mobile breadcrumb @375/320, forced-colors button borders, PLUS a self-seeding R4-017 dialog-overflow guard: it submits a pending resource with an unbroken ~1,950-char URL through the real API, asserts zero horizontal scroll in the view-details/approve/reject admin dialogs at 1440/768/375, then deletes the seed via the admin API). Both are registered as validation commands (`print-audit`, `responsive-audit`), wait up to 120s for the dev server on :5000 (safe to run in parallel with app startup), require `ADMIN_PASSWORD`, resolve sample resource/journey/category ids from the live API, retry admin login on 429, exit 1 on any failure, and drop evidence (PDFs/PNGs/JSON) in `/tmp/validation/<name>/`. Run them after any UI/print-stylesheet change.

**Pre-publish gate (July 21, 2026):** the deployment build command in `.replit` is now `bash scripts/pre-publish-gate.sh`, which runs typecheck (tsc) → migration-drift → print-audit → responsive-audit → `npm run build` in order. Any failure exits 1 with a `PRE-PUBLISH GATE FAILED: <step>` banner plus the last 40 log lines (naming the failing page/check), so a publish can never ship blanked print pages or broken small-screen layouts. In the publish build container (no workflow running) the script boots a temporary dev server on :5000 for the browser audits and tears it down before the vite build; in the workspace it reuses the running app. Requires `ADMIN_PASSWORD`. Step logs: `/tmp/validation/pre-publish/`. Also runnable by hand: `bash scripts/pre-publish-gate.sh` (verified end-to-end 2m17s: all 5 steps pass).

## Brand kit (July 21, 2026)

The Editorial + Crimson identity is formalized as the official awesome.video brand ("Inverted Monogram": black rx16 tile, crimson border + crimson AV, `awesome` Inter 700 + `.video` Fraunces italic 600). Everything lives in `brand/` (logo SVG/PNG, favicon set, social banners + IG/YouTube/LinkedIn templates, tokens incl. Tailwind snippet) and is generated by `node scripts/brand/build-brand-assets.mjs` — edit the script, never the outputs. All SVG text is outlined to paths (opentype.js `getPath` emits NaN coords non-deterministically, so the script uses raw font-unit glyph paths + SVG transforms only). `client/public` favicons and the OG-image footer tile in `server/routes.ts buildOgSvg` are wired to the official mark. Rules + template specs: `brand/README.md`. Spec boards live on the workspace canvas. Brand = Editorial + Crimson only; the other 4 runtime skins are product theming, not brand.

## Design-System scope (MR-DS-13)

The Awesome.Video DS contract documented in `docs/` + `HANDOFF.md` is implemented with three intentional, in-repo divergences from the canonical handoff. Every future Stage-5/Stage-6 DS sweep should treat these as architectural decisions, not per-occurrence violations:

1. **shadcn/ui primitives replace raw `.btn / .card / .chip / .input`.** The runtime surfaces use `Button`, `Card`, `Badge`, `Input` (and other shadcn primitives) styled through the `client/src/index.css @theme inline` bridge that maps `--color-*` shadcn tokens onto DS tokens (`--accent`, `--bg`, `--surface`, etc.). Searching the DOM for stray `<button>` outside `.btn/.tab/.icon-btn` is expected to return many — that is shadcn working as designed. Class-compliance audits (DS Stage 6) should compare against the shadcn-bridge surface, not the raw handoff classes.
2. **Body-level atmosphere + `.page contents` wrapper.** The `--bg-atmosphere` gradient is painted on `body` (handoff parity), and `MainLayout` wraps the chrome subtree in `<div className="page contents">` so the DS structural-class contract is satisfied without disturbing the `SidebarProvider` flex layout. The `contents` utility suppresses `.page`'s own box, so its container visuals (`position: relative`, min-height, background) are inert — atmosphere continues to come from body-level rules. If a future DS pass needs `.page` container visuals to take effect, drop the `contents` utility and re-verify the flex/peer chain.
3. **Full 5-system × 10-accent runtime switcher (May 23, 2026 — replaces prior single-personality build).** All five system skins (Editorial / Terminal / Geist / Brutalist / Swiss) are live and switchable at runtime via the picker at `/settings/theme`. Token application is CSS-attribute-driven: per-system token blocks live as `:root[data-system="..."]` selectors in `design-system.css`, and per-accent overrides live as `:root[data-accent="..."]` blocks. `applyDesignSystem(systemId, accentId)` (in `client/src/lib/design-system.ts`) only toggles the two attributes on `<html>` + persists to `localStorage` (keys `ds-system`, `ds-accent`) — no inline style writes. The `client/index.html` boot script reads both keys pre-paint and applies them before any module runs, so personality swap is FOUC-free. Default: Editorial + Crimson. Accent default per system follows the handoff's `SYSTEM_DEFAULT_ACCENT` map (editorial→crimson, terminal→matrix, geist→cyan, brutalist→amber, swiss→orange) — if the user is on a system's natural default and switches systems, the accent nudges to the new system's natural default; otherwise the explicit accent choice carries across.

### Canonical shadcn ↔ DS class mapping

| Handoff DS class | Runtime equivalent |
|---|---|
| `.btn` / `.btn.primary` / `.btn.ghost` / `.btn.icon` | `<Button variant="default|secondary|ghost|outline" />` |
| `.card` / `.card.hoverable` / `.card.glow` | `<Card />` (+ tailwind `hover:` / shadow utilities) |
| `.chip` / `.chip.accent` / `.chip.ok` / `.chip.warn` / `.chip.bad` | `<Badge variant="default|secondary|destructive|outline" />` (status variants extended ad-hoc) |
| `.input` / `.select` / `.textarea` | `<Input />` / `<Select />` / `<Textarea />` |
| `.eyebrow` | `.eyebrow` (kept literal — shadcn has no eyebrow primitive) |
| `.kbd` | `<kbd className="…" />` (kept literal — shadcn has no kbd primitive) |
| `.tabs` / `.tab` | `<Tabs />` / `<TabsTrigger />` |
| `.table` | `<Table />` (data tables only — admin/analytics surfaces) |

### Chart palette source of truth

All recharts strokes/fills route through `client/src/lib/charts/palette.ts` (`CHART_PALETTE`). The 10-slot palette mirrors DS accents (`--accent`, `--accent-2`) + DS status semantics (`#34d08c`, `#ff5c7a`, `#ffb84d`, `#5eddf2`, `#9d4edd`) verbatim from `design-system.css`. Per-recharts component literals are intentional — recharts cannot read CSS vars from prop strings — and are tagged `/* DS-OK: ... */` where they appear.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a client-server architecture. The frontend is a React-based single-page application built with Vite, utilizing `shadcn/ui` components, Tailwind CSS, and React Query for data fetching. The backend is an Express.js server providing RESTful API endpoints. Data is stored in a PostgreSQL database using Drizzle ORM, with a defined schema for resources, categories, and subcategories.

### UI/UX Decisions
- **Pure black cyberpunk theme**: Dark mode only, using OKLCH color space with vivid neon accents (pink primary, cyan accent). No shadows, no rounded corners, pure terminal aesthetic.
- JetBrains Mono monospace font used throughout.
- Zero border-radius enforced (`--radius: 0rem`).
- Mobile-optimized responsive design with WCAG AAA compliant 44x44px touch targets and a collapsible hierarchical sidebar.

### Technical Implementations
- **Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS, `shadcn/ui`, React Query for state management, Wouter for routing.
- **Backend**: Express.js, Drizzle ORM, Node Fetch for external data, Remark for Markdown parsing.
- **Data Architecture**: PostgreSQL database serves as single source of truth. `getAwesomeListFromDatabase()` method builds complete hierarchical structure from database tables (categories → subcategories → sub-subcategories with LEFT JOINs). Supports 3-level hierarchy with accurate resource counts at each level.
- **Sidebar Layout**: CSS Grid-based layout on desktop (`grid-cols-[var(--sidebar-width)_1fr]`), dynamically adjusting when collapsed.
- **Deployment**: Configured for deployment on Replit, with optimized production builds. Database must be seeded for production (`/api/admin/seed-database`).

### Feature Specifications
- **Search & Discovery**: Advanced fuzzy search across all resources with keyboard shortcut (⌘K), powered by Fuse.js.
- **AI Recommendations**: Personalized resource recommendations based on user profiles, skill levels, and learning goals (planned).
- **Authentication System**: Supports dual authentication via Replit Auth (GitHub, Google, Apple, X) and local email/password for development/admin, with secure session management and bcrypt hashing.
- **GitHub Integration**: Implemented GitHub import system for fetching raw resource URLs from public repositories, and an export system leveraging Replit GitHub OAuth to commit `awesome-lint` compliant markdown directly to GitHub.
- **Batch Enrichment System**: Claude AI integration for automated metadata extraction from resources. Features include sequential processing with configurable batch sizes, rate limiting, smart URL validation, retry logic, accurate tracking, and a dedicated admin UI for monitoring and control. Integrated web scraping extracts page metadata (title, description, Open Graph images, Twitter Cards, favicon) using Cheerio with proper error handling for missing meta tags.

## External Dependencies

### Frontend
- React ecosystem (React, React DOM)
- TanStack Query (React Query v5)
- shadcn/ui components
- Tailwind CSS
- Lucide icons

### Backend
- Express.js
- Drizzle ORM
- Node Fetch
- Remark

### Development
- TypeScript
- Vite
- ESBuild
- TSX (TypeScript execute)
