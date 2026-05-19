# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,600 curated video development resources. The project uses PostgreSQL as the single source of truth for all data, providing a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. Features include AI-powered learning platform capabilities, user authentication, admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories. The business vision is to create a leading platform for video development education and resource discovery, leveraging AI for personalized learning paths and an engaged community.

**Production Status**: ✅ Production-ready as of December 4, 2025. All critical bugs fixed, database integrity verified (0 orphaned resources), comprehensive error handling implemented.

## Recent Changes

> **Full history:** see [`CHANGELOG.md`](./CHANGELOG.md) for every dated entry back to December 2025.

### Task #43 — Re-validation Gate after Tasks #36–#42 Remediation (May 19, 2026)
- **Verdict: PIXEL-PERFECT PARITY: ACHIEVED.** 93/93 master rows route to PASS-or-CARVE-OUT with **0 FAIL**. All four evidence channels complete: code citation, multi-breakpoint visual, functional smoke, functional click-path.
- **Multi-breakpoint visual harness**: installed Chromium 1208 under existing Playwright 1.58.0; ran `scripts/audit-after-task43.mjs` in two 6-route batches → **36 fresh `_after.jpg` captures** across 12 routes (`/`, `/about`, `/login`, `/settings/theme`, `/submit`, `/not-a-real-route`, `/category/encoding-codecs`, `/category/community-events`, `/category/general-tools`, `/advanced`, `/journeys`, `/journey/6`) × 3 breakpoints (400 / 768 / 1280). Saved to `screenshots/audit/{landing,category,advanced-journeys}/*_{400,768,1280}_after.jpg`. Manifest with per-capture pass/fail in `evidence/functional/_after_task43/capture_manifest.json` (visual_ok: 36/36, console-warnings: 0).
- **Functional click-path harness**: `scripts/audit-clickpath-task43.mjs` → 8 click-path screenshots + `clickpath_results.json` confirming: theme picker switches `Active: Cyberpunk` → `Active: Limes` after click (MR-DS-01/02/16 all PASS in one trace), search dialog opens via `Cmd+K` AND via `/` keydown (MR-DS-03 PASS), Advanced tabs switch (selected tab text = "Export" after click — MR-AJ-02 original PARTIAL claim disproven), Category page renders 113 "View Details" buttons (MR-CT-01 PASS), Login wrong-creds toast wired in source at `Login.tsx:83`.
- **Per-row Second-pass verdict table** in `_planning/AUDIT_REPORT.md` Appendix G.1: 93 rows across §3.1–§3.6 + §4 with columns `Master ID | Original | Second-pass verdict | Code citation | Visual/functional evidence`. Every row's cited file re-grepped against current source.
- **DS 11-stage re-audit** in `_planning/AUDIT_DS_STRUCTURAL_AFTER.md`: ✅ PASS all 11 stages. Stage-5 hex/color scans clean; Stage-10 = 55 `[data-system=...]` selectors (≥15 baseline); CHART_PALETTE source-of-truth in place.
- **Console-log channel**: across all 36 Playwright captures, zero React-key warnings and zero `data-replit-metadata` injector warnings (MR-CH-05 PASS at scale, not just on the home route).
- **Curl smoke**: 10 page routes + 3 API endpoints all HTTP 200 (`evidence/functional/_after_task43/route_smoketest_after.txt`).
- **MR-XO-09 RETIRED**: the methodology carve-out filed in the first revision of this gate (deferring full breakpoint sweep + Playwright re-run) was retired in this revision because the deferred work was completed via the new harness. Follow-up task #44 marked obsolete via `markFollowUpTaskObsolete`. Follow-up #45 (journey-steps content seed, MR-XO-01 closure) remains live.

### Editorial + Crimson — Pixel-Perfect Alignment to Claude Design Handoff (May 19, 2026)
- **Audit vs `/tmp/handoff/.../uploads/01..21.png`**: identified that WP-4 over-applied Fraunces italic eyebrows/hero accents to Home/About/Login, while the reference renders plain bold Inter for all page headings (Editorial is a token system only).
- **Home (`Home.tsx`)**: removed `// Indexed · Atlas` eyebrow + giant Fraunces italic "awesome.video" hero; replaced numbered `<ol>` row list with 3×3 `<Card>` grid (icon + count badge + plain bold title + 1-line description preview). Added empty-state card with "Clear filters" CTA when `filteredCategories` is empty. AI Recommendations heading switched to plain bold Inter.
- **About (`About.tsx`)**: removed `// About the project` eyebrow + Fraunces italic "About **Awesome Video**"; now plain bold "About" h1 with crimson Sparkles icon. Stripped `font-display font-medium tracking-tight` from all five section `CardTitle`s.
- **Login (`Login.tsx`)**: removed `// Authentication` eyebrow + Fraunces italic "Welcome **back**"; now plain bold "Welcome back" centered. Default-admin block rebuilt as plain tiny text under separator (was an eyebrow-styled surface card).
- **Sidebar brand (`AppSidebar.tsx:129`)**: `font-display text-base font-medium tracking-tight` → `font-sans text-sm font-semibold tracking-tight` (plain bold Inter per reference).
- **Theme Settings (`ThemeSettings.tsx`)**: full rebuild from 10-accent token swatch picker → Font picker (6 fonts: Inter / DM Sans / Source Sans 3 / IBM Plex Sans / JetBrains Mono / System Default, each with live sample-text preview) + Color Theme picker (6 presets: Cyberpunk / Limes / Black & Pink / Flat Pink / Purples / Flat Purples, each with primary/secondary/accent swatch row). Both grids properly wrapped in `role="radiogroup"` with aria-labels.
- **theme-provider re-wiring (`theme-provider.tsx`)**: re-enabled `applyFont(activeFont)` effect (writes `--font-sans` globally). Added scoped accent applier effect that writes ONLY `--accent` and `--accent-2` from `activeTheme.dark.primary` — Editorial atmosphere (bg, surface ladder, text ladder, radii, shadows) stays locked. Default theme remains `cyberpunk` per existing localStorage key, but only its primary color leaks into the DS layer.

### Editorial + Crimson Design System — WP-3 Layout/Header/Sidebar + WP-4 Pages (May 19, 2026)
- **WP-3 Layout/Header/Sidebar**: `AppHeader.tsx` — search trigger now a `rounded-lg` surface chip with crimson-tinted hover/focus border + eyebrow-styled `kbd`; header bg uses `color-mix(var(--bg) 85%)` for blur+transparency; breadcrumb map switched from `Fragment` to `flatMap` to eliminate the Replit dev-injector `data-replit-metadata` warning. `AppSidebar.tsx` — brand line + `SidebarGroupLabel`s adopt the `.eyebrow` class. `MainLayout` already correct from WP-1.
- **WP-4 Pages (Home / About / Login)**: hero rebuilds with eyebrow + Fraunces h1 + crimson italic accent; surfaces switched to design-system tokens; default-credentials block converted to a real surface card; mobile-fetch reliability hardened with `AbortController` timeout + retry + typed error messages in `static-data.ts`.

## Design-System scope (MR-DS-13)

The Awesome.Video DS contract documented in `docs/` + `HANDOFF.md` is implemented with three intentional, in-repo divergences from the canonical handoff. Every future Stage-5/Stage-6 DS sweep should treat these as architectural decisions, not per-occurrence violations:

1. **shadcn/ui primitives replace raw `.btn / .card / .chip / .input`.** The runtime surfaces use `Button`, `Card`, `Badge`, `Input` (and other shadcn primitives) styled through the `client/src/index.css @theme inline` bridge that maps `--color-*` shadcn tokens onto DS tokens (`--accent`, `--bg`, `--surface`, etc.). Searching the DOM for stray `<button>` outside `.btn/.tab/.icon-btn` is expected to return many — that is shadcn working as designed. Class-compliance audits (DS Stage 6) should compare against the shadcn-bridge surface, not the raw handoff classes.
2. **Body-level atmosphere + `.page contents` wrapper.** The `--bg-atmosphere` gradient is painted on `body` (handoff parity), and `MainLayout` wraps the chrome subtree in `<div className="page contents">` so the DS structural-class contract is satisfied without disturbing the `SidebarProvider` flex layout. The `contents` utility suppresses `.page`'s own box, so its container visuals (`position: relative`, min-height, background) are inert — atmosphere continues to come from body-level rules. If a future DS pass needs `.page` container visuals to take effect, drop the `contents` utility and re-verify the flex/peer chain.
3. **Single-personality Editorial+Crimson build.** Only the `editorial` skin is wired into `client/index.html`'s boot script (`data-system="editorial" data-accent="crimson"`), and `applyDesignSystem` is exported for future re-use but never called at boot. The other four system skin blocks remain in `design-system.css` as cheap dead code per the handoff (do-not-strip), and the per-system fonts stay in the Google Fonts request for zero-round-trip flip.

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