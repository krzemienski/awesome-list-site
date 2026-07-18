# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,600 curated video development resources. The project uses PostgreSQL as the single source of truth for all data, providing a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. Features include AI-powered learning platform capabilities, user authentication, admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories. The business vision is to create a leading platform for video development education and resource discovery, leveraging AI for personalized learning paths and an engaged community.

**Production Status**: ✅ Production-ready as of December 4, 2025. All critical bugs fixed, database integrity verified (0 orphaned resources), comprehensive error handling implemented.

## Recent Changes

> **Full history:** see [`CHANGELOG.md`](./CHANGELOG.md) for every dated entry back to December 2025. Older "Recent Changes" entries are moved there periodically.

### Black-Box Audit Remediation — Run19 (July 18, 2026)
- **50-finding audit triaged live** (BUG-001..050, `attached_assets/REPORT_1784366713776.md`): 30 fixed (code), 5 fixed code+data (BUG-003/007/009/013/025), 3 data-fix only (BUG-032/037/043 — dev applied, prod journaled), 12 fixed-prior re-verified live (BUG-010/018/019/020/021/023/031/036/038/042/046/048). Full ledger: `artifacts/remediation-2026-07/completion-ledger.md`; per-finding evidence (after-verification.json + screenshots): `artifacts/remediation-2026-07/BUG-NNN/`.
- **Highlights**: BUG-001 early-fetch of /api/awesome-list from inline index.html script (content paints without waiting for bundle); BUG-002 submit auth-check states labeled (verifying/error+Retry/login gate); BUG-003/007/048 taxonomy dedup — 16 dup sub-subcat groups merged to canonical slugs (idempotent script), dup pages tombstoned, sitemap↔DB exact parity; BUG-013/038 case-insensitive dup-title guard (409) + retitle sweep to 0 dup groups; BUG-015 suggested edits now get background Claude analysis; BUG-011 /search empty-query = paginated full-catalog browse; BUG-012 tag popover full list + type-to-filter; BUG-040 approval dialog only linkifies well-formed http(s) URLs; BUG-047 admin stats poll 30s + focus refetch (badge tracks reality); BUG-022 /settings hub public (links-only); BUG-029 404 crumb "Not found" instead of title-cased slug; BUG-050 mobile action buttons keep labels at 375px.
- **Verified** (Iron Rule): tsc clean; migration-drift clean; P0 smoke 12/12 (desktop@1440 + mobile@375, zero page errors); admin live checks via authed Playwright (malformed-URL dialog probe, Run Link Check DS-primary color, 30s badge polling observed, GitHub failures surfaced "31 failed" no green-wash); QA teardown net-zero (`__qa_test*` users/resources = 0, probe resource 187106 + edits 53–55 removed).
- **Needs republish. Prod follow-ups after republish**: run `scripts/run19-data-fixes-prod.ts`, `scripts/run19-retitle-dup-titles.ts`, `scripts/run19-dedupe-subsubcats.ts` (idempotent, via live admin API — prod DB not agent-writable; all validated end-to-end against dev via the same code path). Run17/18 carry-overs still pending on prod: `scripts/run17-data-fixes-prod.ts`, `scripts/run18-data-fixes-prod.ts` + one GitHub export re-run.

### Black-Box Audit Remediation — Run18 / Run2 audit (July 17, 2026)
- **60 new findings + run-1 regression debt triaged live** (NB-001..060, `attached_assets/MASTER-FIX-PROMPT-R2_1784326227101.md`; regression verdicts `attached_assets/REGRESSION-REPORT_1784326236172.md`): NB — 46 fixed, 9 data-fix (dev applied, prod journaled), 1 partial (NB-039 withdraw needs a new server endpoint), 1 platform-partial (NB-030 edge cacheability). Regression — 17 fixed this run, 6 fixed-prior via prod data scripts, 2 by-design (BUG-009 masked CSV, BUG-035 slug stability), 1 invalid (BUG-056 bot-block), 4 platform (BUG-006/021/038/050), 2 partial carry-over (BUG-023 crumb menu, BUG-024 cold-load perf), 1 cannot-verify (BUG-027). Full table: `evidence/run18/findings-table.md`; rationales: `evidence/run18/triage.md`.
- **Highlights**: NB-028/BUG-020 auth-check retry storm killed (bounded backoff; forced-500 → 3 req/20s + error banner; real 401 → 1 req + login gate); NB-004 search palette fits 812×375 with visible keyboard selection; NB-002 mobile drawer focus trap; NB-006 PDF export always gives feedback; NB-010/011/012 exports escaped + tags honored; NB-007/042 recommendations actually use skill/goals/types with consistent reasons; NB-013 exact-match search boost; NB-009 dot-path soft-404 fixed; NB-021 print stylesheet; NB-023 global cursor/hover affordances; BUG-007/008 admin stat-card filter + tab↔URL history sync; BUG-018/019 strict URL validation + field-level tag errors; BUG-049 native validation attrs on auth forms.
- **Data corpus** (`scripts/run18-data-fixes-prod.ts`, idempotent, admin-API): 216 GitHub " - owner/repo" suffixes stripped, ~99 brand titles re-cased, 43 placeholder descriptions cleared, dead/rotten links repointed (185380, 185228 Dolby successor, 187178), FFmpeg near-dups retitled, filename titles renamed; all sweeps 0 in dev; second run all no-ops.
- **Verified** (Iron Rule): tsc clean; migration-drift clean; P0 smoke 12/12 (desktop@1440 + mobile@375); NB-021/023 live probes (print media + hover states incl. home-card accent border); QA teardown net-zero (`__qa_test*` = 0).
- **Needs republish. Prod follow-ups after republish**: run `scripts/run18-data-fixes-prod.ts` (NB-008/014/015/016/027/043/046/049/052 via live admin API — prod DB not agent-writable; validated end-to-end against dev via the same code path). Run17 carry-overs still pending on prod: `scripts/run17-data-fixes-prod.ts` + one GitHub export re-run.

### Black-Box Audit Remediation — Run17 (July 17, 2026)
- **63-finding audit triaged live** (BUG-001..063, `attached_assets/MASTER-FIX-PROMPT_1784308214696.md`): 39 fixed + 10 fixed-prior (prod stale at audit), 6 data-fix (dev applied, prod journaled), 2 by-design (BUG-009 masked CSV = PII policy, BUG-035 slug stability), 2 invalid (BUG-021 WAF artifact, BUG-056 curl-UA bot-block), 2 platform (BUG-006 Cloudflare-on-OIDC — app-side `/login?error=oauth` toast landed; BUG-050 GAESA cookie), 1 partial (BUG-053 limit clamped). Full table: `evidence/run17/findings-table.md`; rationales: `evidence/run17/triage.md`.
- **Highlights**: BUG-001 pending-approvals table de-clipped (actions reachable); BUG-003/016 journey progress group-aware (logical steps, completedAt fires); BUG-023 breadcrumb ellipsis collapse below lg; BUG-024 taxonomy SPA nav 364/281ms; BUG-043 honest "popular picks" copy for zero-preference recommendations; BUG-051 single HSTS header; BUG-052 back/forward scroll restore; BUG-054 Origin-mismatch rejection on mutations.
- **Verified** (Iron Rule): tsc clean; migration-drift clean; P0 smoke 12/12 (desktop@1440 + mobile@375); submit-flow live probes (https-only URL, 10-tag cap, dirty-Cancel confirm, logged-out gate); QA teardown net-zero (`__qa_test*` = 0 across users/resources/journeys, probe 187104 removed).
- **Needs republish. Prod follow-ups after republish**: run `scripts/run17-data-fixes-prod.ts` (BUG-004/026/047/057/061/062 via live admin API — journey 8 dead/dup steps, ~65 placeholder descriptions, "FFmpeg Mastery" title, truncated 186159, Smart TV casing/`:zap:`); validated end-to-end against dev via the same code path (`evidence/run17/data-fixes-dev.json`). Then re-run one GitHub export (run16 carry-over).

### Real GitHub Export Proven End-to-End (July 17, 2026)
- **Commit landed on the public repo**: real (non-dry-run) export run via the live production admin API pushed commit `f74430d` ("Initial awesome list export", 2,302 approved resources) to `krzemienski/awesome-video` through the Replit GitHub connection — blob/tree/commit/ref-update all verified working.
- **Post-commit bug found & fixed**: after the commit, `exportToGitHub` marked resources synced via `Promise.all` of 2,302 individual `updateResource` calls, exhausting the pg pool ("timeout exceeded when trying to connect") so the sync-history row and queue `completed` status were never written. Replaced with a single bulk `markResourcesSynced` UPDATE (`inArray`, chunked at 5k) — validated in dev: 1,822 rows in 0.9s.
- **Needs republish**: prod still runs the old per-resource path; after republish, re-run one export from the admin GitHub sync panel so `github_sync_history` records a completed export (expected diff ~0/0/0 since the commit content is already live).

### Black-Box Audit Remediation — Run16 (July 17, 2026)
- **96-finding audit triaged live** (BUG-001..096): 79 fixed + 2 fixed-prior (BUG-021 rate limiters, BUG-075 stat-card nav), 4 invalid (BUG-018 labeled selects, BUG-053 counts reconcile, BUG-076 terminology, BUG-082 Escape works), 4 data-fix (BUG-003 QA row 188454 prod-only, BUG-007 wayback repoint, BUG-054 FFmpeg casing, BUG-056 Hybrik description — dev applied, prod journaled), 5 by-design (BUG-055/068/069/089/093), 1 platform (BUG-092 GAESA edge cookie), 1 declined (BUG-096 — mitigated by BUG-002 cache). Full table: `evidence/run16/findings-table.md`; decision rationales: `evidence/run16/triage-decisions.md`.
- **Highlights**: BUG-001 server-side HTTPS-only URL validation; BUG-002 /api/awesome-list server cache + ETag/304 (cold 152ms → warm 13ms → 304 3ms); BUG-013 journey steps editor groups the up-to-3-rows-per-step storage shape into logical step cards; BUG-035 resources table sorting/page-size/first-last; BUG-041/084 real audit-log pagination + actor resolution; BUG-044 SQL LIKE wildcard escaping; BUG-015 failed GitHub sync jobs surfaced with error messages.
- **Verified** (Iron Rule): tsc clean; migration-drift clean; P0 smoke 12/12 (desktop@1440 + mobile@375); admin live checks 7/7 (Escape-close, journey grouping via journey 7, users-table containment @375/@768); BUG-018 authed label probe PASS; QA teardown net-zero (probe resources + research jobs 23–29 removed, `__qa_test` count 0).
- **Needs republish. Prod follow-ups after republish**: run `scripts/run16-data-fixes-prod.ts` (BUG-003/007/054/056 via live admin API — prod DB not agent-writable). Journaled caveat: login/global rate limiters are per-instance in-memory under autoscale (BUG-021/096).

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