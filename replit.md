# Awesome Video Resource Viewer

## Overview

A production-ready React application for browsing and discovering over 2,600 curated video development resources. The project uses PostgreSQL as the single source of truth for all data, providing a modern, mobile-optimized user interface with advanced search and filtering capabilities, dark theme support, and Google Analytics tracking. Features include AI-powered learning platform capabilities, user authentication, admin panel, and bidirectional GitHub synchronization for `awesome-list` repositories. The business vision is to create a leading platform for video development education and resource discovery, leveraging AI for personalized learning paths and an engaged community.

**Production Status**: ✅ Production-ready as of December 4, 2025. All critical bugs fixed, database integrity verified (0 orphaned resources), comprehensive error handling implemented.

## Recent Changes

> **Full history:** see [`CHANGELOG.md`](./CHANGELOG.md) for every dated entry back to December 2025. Older "Recent Changes" entries are moved there periodically.


### Black-Box Audit Remediation — Run23 (July 20, 2026)
- **71-finding audit fully triaged** (R-01..R-14 residuals + NB-001..058 new, NB-052 merged into NB-041 by the audit; spec `attached_assets/MASTER-FIX-PROMPT-v2_1784528308962.md`): R-01..05 prod data scripts EXECUTED against live prod; 50+ code fixes verified live on dev; 8 data-fix clusters journaled for prod; 3 platform-documented (R-11 edge headers, R-13 :443, R-14 www DNS); 2 covered-by (NB-034→R-06, NB-057→NB-005). Full table: `fix-evidence-v2/completion-table.md`; per-finding evidence dirs `fix-evidence-v2/`.
- **Final gate caught a real HIGH regression**: the NB-001 chunk-failure boundary's one-shot reload guard was a boolean cleared on every error-free render — but the boundary renders error-free while Suspense is still fetching, so a blocked chunk caused an **infinite reload loop** (proven: 8 reloads/20s). Fixed with a 60s-timestamp guard (no render-time clearing; retry button stamps, not clears). After fix: exactly 1 auto-reload → styled retry card inside live chrome → recovery on 3 injected routes (`fix-evidence-v2/NB-001/`). Lesson: an error boundary's "clean render" is NOT proof the guarded resource loaded.
- **Highlights**: NB-002 learning-path generation auth+rate-limited (anon paid-Claude probe killed); NB-003/004/007/008/024 shared bounded-int validation across public+admin list endpoints (limit=-1 dump, 1e20 int8-overflow 500s → 400/404); NB-005/057 /api/health/ai deep mode admin-only; NB-006 GitHub proxy authed+token; NB-012 admin CSV real emails; NB-015 serializer on rec/learning-path sends; NB-016 feedback auth; NB-023 alias deprecation headers; NB-025 openapi.json; NB-026 rate-limit headers on public GETs; NB-046 tag-coverage endpoint + admin panel line (58% coverage visible, "Unenriched Only" path); NB-047 iostvos→ios-tvos slug + 301 class; NB-048 signup enumeration-safe; NB-049/051 405+Allow method handling; NB-058 login session-ID regeneration.
- **Data corpus** (`scripts/run23-data-fixes-prod.ts`, idempotent, admin-API): NB-013 4 dup merges + NB-043 3 twin rejects (Medium mirror, SourceForge dup, GLStephen fork); NB-014 48 truncated descs; NB-044 33 title-chrome retitles; NB-045 copied-sibling desc rewrite; NB-054 approved_at backfill (1,797 dev); NB-055 tag canonicalization (74 families/192 resources dev, curated brand-casing map). Second run fully no-op.
- **Verified** (Iron Rule): tsc clean; migration-drift clean; P0 smoke desktop@1440+mobile@375 green (home grid, category→resource→outbound, search, submit gate, zero overflow, zero page errors, journey toggle net-zero, admin approvals); chunk injection 3 routes; QA teardown net-zero (`__qa_test%` = 0).
- **Prod follow-ups DONE (July 20, 2026, post-republish)**: `scripts/run23-data-fixes-prod.ts` executed against the live admin API — 103 actions (7 dup/twin merges-rejects, 48 desc fixes, 33 retitles, sibling-desc rewrite, iostvos→ios-tvos rename, approved_at backfill 2,274, tag canonicalization 73 families/192 resources); second run fully no-op. Spot-checks live: iostvos → 301 → ios-tvos 200 h1 "iOS/tvOS" (first probe 404 was the og-middleware 60s tree cache holding the pre-rename resolution — expired on its own); 3 twins 404; /api/health/ai?deep=1 anon → 401. Journal: `evidence/run23/data-fixes-prod.json`. R-14 www DNS closed as by-design (owner declined www support).

### Black-Box Audit Remediation — Run22 (July 20, 2026)
- **51-finding black-box audit fully remediated** (BUG-001..051, spec `attached_assets/Pasted--mock-detection-protocol-…1784501760544.txt`): all 51 fixed with blocking per-finding gates VG-001..051 + VG-FINAL, evidence one dir per finding in `fix-evidence/BUG-NNN/` + `fix-evidence/final/` + `fix-evidence/completion-table.md`. Severity split: 5 HIGH, 10 MEDIUM, 34 LOW, 2 INFO.
- **Highlights**: BUG-001 PDF export real jsPDF output (silent no-op killed); BUG-002/003 header controls reachable 768–917px + card-title line-clamp fixed at 1024–1279px (clamp must live on the anchor, not the h2 — inline-block child defeats -webkit-line-clamp); BUG-006/032/033 journey progress API hardened (foreign step ids rejected, unknown journey/step → 404 not 200/500); BUG-045/046 sitemap lastmod honesty — SQL window filter omits lastmod for bulk-import bursts (>10 rows sharing the same second), journeys dated from updatedAt (1,953 URLs, 419 dated, 8 real distinct dates); BUG-049 consent banner moved before Router (dead body tab-stop gone; tab order banner→skip-link→main); BUG-050 POST /api/interactions requires auth, userId from session never body; BUG-051 GAESA cookie row: ~30-day retention, path=/, pre-consent edge origin, browser-clearing guidance.
- **Data corpus** (`scripts/run22-data-fixes-prod.ts` + `scripts/run22-link-fixes-prod.ts`, idempotent, admin-API): BUG-004/005 dead outbound links repointed (AviSynth, UT Video), BUG-028 http→https upgrades where live (broken https reverted to working http originals), BUG-029 self-listing resource 184919 rejected, BUG-018 about count refreshed, BUG-034 journey 8 step order.
- **VG-FINAL** (`fix-evidence/final/gate.md`): 6 smoke journeys desktop+mobile (home→category→resource→outbound; search→resource; journey step toggle net-zero; submit empty-desc validation + logged-out gate; admin Approvals; all six /advanced exports MD/JSON/CSV/YAML/HTML/PDF as real browser downloads with signature checks); boundary sweep 768/1024/1100/1280 zero overflow; server re-checks (canonical 301, single title/h1, og-image 200 PNG, journey 404s, anon interactions 401). Architect review PASS.
- **Verified** (Iron Rule): tsc clean; migration-drift clean; QA teardown net-zero (`__qa_test%` = 0 users/resources/journeys).
- **Needs republish. Prod follow-ups after republish**: run `scripts/run22-data-fixes-prod.ts` + `scripts/run22-link-fixes-prod.ts` (via live admin API — prod DB not agent-writable; validated end-to-end against dev via the same code path).



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
