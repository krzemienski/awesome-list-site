# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,600 curated video development resources. The project uses PostgreSQL as the single source of truth for all data, providing a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. Features include AI-powered learning platform capabilities, user authentication, admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories. The business vision is to create a leading platform for video development education and resource discovery, leveraging AI for personalized learning paths and an engaged community.

**Production Status**: ✅ Production-ready as of December 4, 2025. All critical bugs fixed, database integrity verified (0 orphaned resources), comprehensive error handling implemented.

## Recent Changes

> **Full history:** see [`CHANGELOG.md`](./CHANGELOG.md) for every dated entry back to December 2025. Older "Recent Changes" entries are moved there periodically.

### Black-Box Audit Remediation — Run10 (July 15, 2026)
- **57-finding audit triaged live** (BUG-001..057): 16 fixed, 16 invalid, 10 platform (Replit feedback widget incl. CRITICAL BUG-001), 10 not-a-defect/by-design, 3 stale, 2 declined (409 register enum — new rate limiter is the compensating control; email verification — no transport). Table: `evidence/run10/findings-table.md`.
- **Fixes**: BUG-008 IP rate limiting on the whole auth cluster (`express-rate-limit`, 20/15min, layered on per-account lockout); BUG-009 HTML-tag guard on submit (client + server zod); BUG-025 check-url stops leaking moderation status (server + client UI); BUG-004 real noscript; BUG-013 mobile sidebar capped `max-w-[85vw]` (was 98% — width class wasn't winning); BUG-017 resource-title breadcrumb; BUG-019 admin-only status badge; BUG-021/029/036 title tooltips on clamped card titles; BUG-027 safe `?next=` login redirect (rejects `//` and `/\` bypasses per architect review); BUG-032 44px View Details; BUG-042 onTouched login validation; BUG-043 formatted hero count; BUG-045 guest-browse link; BUG-052 12 double-space descriptions fixed in dev (prod pending credentials).
- **Verified** (Iron Rule): tsc clean; Playwright 8/8 PASS + curl 429/400/no-status/noscript proofs (`evidence/run10/`). **Needs republish (3 server + 12 client fixes).**

### Black-Box Audit Remediation — Run9 (July 15, 2026)
- **28-finding audit triaged live** (24 new + 4 carry-overs): 11 fixed, 11 invalid, 3 not-a-defect, 2 platform (Replit feedback widget), 1 fixed-live (BUG-004 via Run8). Table: `evidence/run9/findings-table.md`.
- **Fixes**: BUG-018 tag canonicalization in BOTH `/api/tags` SQL (1,759→1,601) AND the client filter panels (Home/Category aggregate tags client-side via shared `normalizeTag()` in `client/src/lib/tags.ts` — the audit's actual repro surface; keep SQL + client rules in lockstep); BUG-011 `.trim()` submit validation; BUG-013 footer/skip-link 44px targets; BUG-016 honest local-metrics zero-state; BUG-020 journey-name breadcrumb; BUG-023 card hover; BUG-025 "Sign in" unification; BUG-026 password toggle; BUG-027 filter/sort exclusion; BUG-030 footer GitHub link. **BUG-022 AMF retitle applied directly to prod (PUT 200) — already live.**
- **Notable invalid**: BUG-024 — sidebar hover exists; audit probed the active item where `.sub-item.active` intentionally wins.
- **Security**: hardcoded prod admin password stripped from all committed verification scripts (now `process.env.PROD_ADMIN_PASSWORD`); rotation recommended (still in git history).
- **Verified** (Iron Rule): tsc clean; 9 dev Playwright/curl runs all PASS (`evidence/run9/verify-dev*-output.txt`). **Needs republish (1 server + 11 client fixes).**

### Black-Box Audit Remediation — Run8 (July 15, 2026)
- **6-finding audit triaged live post-Run7-republish**: 2 fixed, 2 invalid (CRITICAL BUG-001 invented slug URLs — app is numeric-id only; BUG-005 admin tabs work live), 1 platform (BUG-002 Replit feedback widget), 1 not-a-defect (BUG-006 = deliberate soft-404 status). Table: `evidence/run8/findings-table.md`.
- **BUG-003 root cause**: static template ETag + rotating CSP nonce → browser 304 paired cached stale-nonce HTML with fresh-nonce header, blocking all inline scripts on repeat visits. Fix: nonce'd documents never 304 (conditional headers dropped; ETag/Last-Modified stripped; `Cache-Control: no-store` on buffered HTML). **BUG-004**: `/api/journeys/:id*` NaN ids now 404 instead of 500.
- **Verified** (Iron Rule): tsc clean; dev curl proofs (slug 404, no-store/no-ETag, If-None-Match→200, assets keep ETag); prod P0 smoke desktop+mobile PASS. **Needs republish (2 server fixes).**

### Master Fix Prompt Round 4 Remediation — Run7 (July 15, 2026)
- **52-finding external audit triaged live**: audit crawled prod July 12 *pre*-republish; the July 15 republish shipped all Run5+Run6 fixes, so 15 findings were verified fixed-live on prod today. 4 fixed this run; 12 stale, 8 invalid, 5 by-design, 4 platform (incl. CRITICAL C01 GAESA infra cookie again), 3 not-a-defect, 3 declined. Full table: `evidence/run7/findings-table.md`.
- **Fixes**: R4-H05 residual — Users-tab Name-column fallback leaked raw emails for nameless users, now masked with reveal toggle; R4-M10 generic login subtitle; R4-L16 status-badge tooltip/aria; R4-L17 clickable stat cards (deep-link to admin tabs, keyboard + ARIA).
- **Verified** (Iron Rule): tsc clean; dev Playwright 4/4 + 0-leak check; prod Playwright/curl proofs for all fixed-live verdicts. **Needs republish (4 client fixes).**

### Master Fix Prompt Round 3 Remediation — Run6 (July 15, 2026)
- **55-finding external audit triaged live**: audit crawled prod July 12 *pre*-Run5-republish, so 18 findings = Run5 fixes pending republish. 3 new defects fixed; 14 stale, 7 invalid, 5 by-design, 3 platform (incl. CRITICAL C01 — GAESA is Replit-infra App Engine affinity cookie; app's `connect.sid` has HttpOnly/Secure/SameSite=Lax), 2 not-a-defect, 1 explained, 2 declined. Full table: `evidence/run6/findings-table.md`.
- **Fixes**: R3-H08 `/api/resources?sort=` now real (whitelist name-asc/name-desc/newest/oldest, 400 `invalid_sort` otherwise); R3-M25 all local-login failures return generic "Invalid email or password"; R3-L16 tag-count badge a11y label.
- **Verified** (Iron Rule): tsc clean; curl sort/login proofs on dev; prod /register + /api/auth/user re-proven live. **Needs republish (carries 18 Run5 fixes + 3 Run6 fixes).**

### Master Fix Prompt Round 2 Remediation — Run5 (July 12, 2026)
- **56-finding external audit triaged live**: 19 fixed, 35 closed without code (18 stale, 8 invalid, 2 by-design, 2 platform, 3 not-a-defect, 1 explained), 2 declined (drag-drop reorder, admin kbd shortcuts). Full table: `evidence/run5/findings-table.md`.
- **Server**: public `GET /api/tags` (1,759 aggregated metadata tags); `GET /api/admin/users?q=` filter; `GET /api/admin/users/export` CSV (formula-injection guarded, no password data).
- **Client**: admin — typed-confirm re-seed, masked emails + reveal, user search/export, enrichment stat clamps, bulk resource actions, per-tab ErrorBoundary; public — footer nav, word-boundary truncation, search pagination + cap notice, `?sort=` persistence, password strength meter, back-to-top, anon favorite/bookmark sign-in prompts, ⌘K recent searches.
- **Verified** (Iron Rule): tsc clean; curl auth/negative on all new endpoints; Playwright 17/17 PASS (`scripts/run5-verify-dev.mjs`); architect PASS. **Needs republish to reach production.**

### Master Fix Prompt Remediation — Run4 (July 12, 2026)
- **18-finding external audit triaged live**: 10 findings STALE (audit predates the July 10 republish), 6 fixed, 1 platform-injected (NEW-014 feedback badge — zero app code, Replit dev-preview only), 1 closed by user decision (NEW-002 — keeping the site dark-only by design). Full table: `evidence/run4/findings-table.md`.
- **Server**: NEW-006 non-approved resources 404 to non-admins on `/api/resources/:id` + BUG-004 companion (`?status=pending|rejected` listing now admin-only, 403) + `/related` returns empty shape for hidden ids; BUG-039 `?cursor=` alias + `nextCursor`; new `PUT /api/admin/journeys/:id`; new `DELETE /api/admin/users/:id` with `deleteUserWithCleanup` (detaches submitted/approved resources instead of deleting content, removes edit suggestions, personal data cascades).
- **Client**: Users tab delete button + confirm dialog (self excluded); "Edit in Admin" deep-links to `/admin/resources?resourceId=N` and auto-opens the edit dialog (param stripped after); search dialog shows "N matches — showing top 15"; journey descriptions rewritten to 5 unique real blurbs (dev via SQL; prod via the new PUT post-republish).
- **Verified live** (Iron Rule): tsc clean; curl auth/negative/lifecycle tests on every endpoint; Playwright sweep 8/8 PASS (`scripts/run4-verify-dev.mjs`); architect PASS after closing its two flagged leaks. **Republished + prod follow-ups DONE**: 5 journey descriptions applied via PUT, 2 `__qa_test` users deleted via the new DELETE (journals in `.local/prod-cleanup/`), NEW-006/BUG-004/BUG-039 smoke-checked live, CSP clean (0 violations on first publish with the nonce CSP).

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