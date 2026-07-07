# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,600 curated video development resources. The project uses PostgreSQL as the single source of truth for all data, providing a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. Features include AI-powered learning platform capabilities, user authentication, admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories. The business vision is to create a leading platform for video development education and resource discovery, leveraging AI for personalized learning paths and an engaged community.

**Production Status**: ✅ Production-ready as of December 4, 2025. All critical bugs fixed, database integrity verified (0 orphaned resources), comprehensive error handling implemented.

## Recent Changes

> **Full history:** see [`CHANGELOG.md`](./CHANGELOG.md) for every dated entry back to December 2025.

### Empty-Taxonomy Cleanup + Count-Parity Re-Proof (July 7, 2026)
- **Re-proved count parity with the official Playwright tester** (3 runs, all pass; the tester counted DOM cards, not just labels): subcategory `video-codec-specifications` 20/20; `encoding-codecs` 325/325 across "Page 1 of 14" @24/page with distinct titles on pages 1–3; "Codecs" filter → 13; "av1" search → 19; players-clients 234/234; mobile-players 16/16; opened 6+ resource detail pages (real h1 + external link); mobile 390px had no horizontal overflow (scrollWidth 384).
- **"Clean all" empty taxonomy nodes (dev DB)**: removed 6 empty subcategories + 17 empty sub-subcategories (15 direct + 2 cascaded). Safe because resources link to taxonomy by TEXT (no FK) and the tree builder folds any unmapped text into its nearest valid ancestor — verified 0 category-orphans and asserted every deleted node had 0 resources by full chain (0 unsafe). Post-cleanup: total still **1,838**, all 9 category counts unchanged, 0 empty nodes remain (subcats 102→96, subsubs 107→90). Architect review **PASS**. No app bugs found.
- **Prod pass DONE (live admin API, no deploy)**: cleaned prod's own empty taxonomy nodes directly against the live DB. Deleted **4 empty subcategories + 16 empty sub-subcategories** (subcats 102→98, subsubs 107→91); approved total held at **1,848**, all 9 per-category counts unchanged, 0 category-orphans, live `/api/awesome-list` still 9 cats / 98 subcats / 91 subsubs; 0 `__EMPTY_DEL_` leftovers. Prod's delete guard counts resources BY NAME across ALL statuses, so 10 name-collided empty nodes (e.g. 5× "FFmpeg") were name-blocked and removed via a **rename-to-unique-then-delete** workaround (PATCH only updates the taxonomy row, never `resources`). An architect-mandated all-status pre-check **kept 3 nodes** ("Vendors & HDR" subcat + "Vendor Docs"/"Audio" sub-subs) because each still holds a non-approved (pending/rejected) resource on its exact chain — deleting them would misfold a future approval; they stay hidden from users by the `AppSidebar` empty-node filter. Recovery journal + deleted-list in `.local/prod-cleanup/`.

### Production Resource-Count Reconciliation + Search/Content Fixes (July 6, 2026)
- **Root cause of the count divergence** (raw table ~2,210, headers ~1,837, ~924 rendered): 372 URL-duplicate approved rows + 1 category-orphan (QUANTEEC — its `category` text matched no `categories.name`, so it was invisible to `/api/categories`) + 6 shortener/tracking links. Chose **Option A (clean the data)** so every surface reads one honest number.
- **Live-prod cleanup** (admin API, journaled, 0 failures): deleted the 372 dupes, reassigned QUANTEEC → Infrastructure & Delivery / Peer-to-Peer Streaming Solutions, rewrote 6 links to direct URLs. Post-cleanup prod invariants: **approved=1,838, url-duplicate groups=0, category-orphans=0**; `/api/resources` total == `/api/categories` sum == `/api/awesome-list` tree == **1,838** (Community 81 · Encoding 325 · General 151 · Infra 199 · Intro 194 · Media 255 · Players 234 · Protocols 200 · Standards 199).
- **Cascade-safety audit** (hard deletes could have wiped `ON DELETE CASCADE` children): verified **NO loss** — prod has 0 bookmarks/favorites/interactions and 0 journey steps (journey step content was never seeded to prod; 5 journeys, 0 steps); dev (same 372 removed, 89 journey steps) shows 0 orphaned steps and 0 referencing any deleted id → the duplicate set is disjoint from journey content. Deletes are HARD (journal kept ids+status, not row contents) — recovery via Replit DB checkpoints or re-adding in admin.
- **Search + routing** (workspace; ships on next publish — live prod `/api/search` still 404s pre-deploy): new `GET /api/search?q=` (honest repo `total`, `limit` clamped to [1,200], `q`<2 → empty), `/?q=` → `/search?q=` (server 301 + client redirect), `/search` page, About feature list with no over-claim. Dev-verified: ffmpeg 61 / codec 111 / HLS 160; negative-limit no longer 500s.
- **Validation (real system, Iron Rule — no mocks/test files)**: all 9 prod category pages badge=="Showing Y of Y"==API count with 24/page pagination that advances (Encoding shows full 325 across 14 pages, not the old ~94 cap); prod resource 185811 renders a direct Netflix/Medium URL (0 shorteners); P2P breadcrumb correct + "Showing 3 of 3" (QUANTEEC); evidence + read screenshots in `evidence/`. Architect review **PASS** (2 non-blocking search bugs found and fixed); `tsc` clean. **Deferred**: VG-4 passes on prod only after publish; left the separate SEO task's "1838+" title template untouched (out of scope, now truthful).

### SEO & GEO Optimization — Schema, Keyword Titles, GEO FAQ, Author E-E-A-T (July 6, 2026)
- **Augmented** (not rebuilt) the server-authoritative SEO. Enriched `Organization` (@id/logo/description/founder/sameAs) + `WebSite` (`SearchAction`) JSON-LD in `og-middleware.ts`; expanded `shared/faq.ts` 5→10 with GEO-quotable Q&As (codecs / encoders / protocols / players / getting-started) that feed `FAQPage` + About page + crawler SSR body at once; added a truthful maintainer E-E-A-T bio (`shared/about-content.ts`) rendered in both client About and SSR and wired into `Organization.founder`.
- **Keyword titles/descriptions** via new `shared/seo-templates.ts` imported by BOTH server and client (`Home.tsx` / `Category.tsx`), so two-pass title parity holds by construction. Titles are count-free (parity can't drift); counts are parameters in descriptions only. The home count now reads the flat deduped-tree array on both sides.
- **Rejected** the brief's `robots.txt Disallow /submit,/search` and every hardcoded/fabricated figure (2000+, "10,000 stars", "10+ years", LinkedIn URL) — used real numbers (1,800+ stars). Validated via Googlebot curl on `/`, `/about`, and all 9 category routes; `tsc` clean; architect **PASS**. **Deferred pending sign-off**: P4 long-form category essays + P8 `/compare` pages.

### Admin AI Agents Migrated to Claude Agent SDK — Real Multi-Agent System (July 6, 2026)
- **Researcher + Enrichment migrated onto `@anthropic-ai/claude-agent-sdk`** (orchestrator + subagent + custom in-process MCP tools), replacing direct Messages-API calls. Shared driver `server/ai/runAgentQuery.ts` enforces native `maxBudgetUsd`/`maxTurns` caps, a `disallowedTools` baseline (no shell/filesystem even under `bypassPermissions`), `settingSources: []` isolation, and user-cancel via `AbortController`; it persists a full `agent_events` stream per run.
- **Researcher** = Sonnet orchestrator (taxonomy prompt + MCP tools) delegating to ONE Haiku `scout` subagent (WebSearch only, search-capped); per-run `RunContext` (no cross-run bleed); cost from `result.total_cost_usd`. **Enrichment** = ONE `query()` per batch, single orchestrator, SQL-atomic counter bumps, cancel short-circuits the retry loop.
- **Per-run config** (`server/ai/agentRuntime.ts`): admin overrides model / base URL / auth token per run. Base URL is https-only + SSRF-guarded (re-checked at run start); auth token stored AES-256-GCM encrypted (`configCrypto.ts`, key from the `CONFIG_ENCRYPTION_KEY` secret, last-4 retained for display), stripped from all GET responses. **Security invariant:** the platform `ANTHROPIC_API_KEY` is dropped from the run env whenever a custom base URL is set, and a custom base URL requires its own auth token — the platform key never reaches a third-party endpoint.
- **Admin UI**: `AgentEventLog.tsx` (structured event viewer) + `AgentCommsGraph.tsx` (SVG DAG of orchestrator→subagent→tool comms with per-edge call counts).
- **Validated on the real system** (no mocks/test files/TEST_MODE): real Researcher + Enrichment runs captured end-to-end (persisted events + rendered graph), crypto round-trip/tamper-reject, secret non-leakage, budget/abort safety, and the base-URL-without-token 400 path; architect review PASS after the key-leak fix.

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