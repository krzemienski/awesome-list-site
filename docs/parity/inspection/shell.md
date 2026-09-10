# Phase 0 shell inspection (read-only)

## Scope and evidence
- No workspace files changed; no tests, browser, server, product edits, or env/secrets read.
- `client/src` inventory: 179 files; all were byte-streamed and hashed into `client-src-read.jsonl` (complete_read=true), with SHA256/bytes/lines. Assigned ownership excludes `client/src/components/admin/**` and `client/src/components/ui/**`; all remaining component files were streamed contiguously into `assigned-components-full.txt` (1,066,702 bytes / 26,052 lines).
- Full source comparisons completed for `/tmp/design-parity-bundle-7zbnza_9/layout.jsx` (626 lines, 28,608 bytes, SHA256 `911f165b50f94d6b3930b2761545606105a9a4ba9727ed443a0681b039b3e76a`), `sidebar-variants.jsx` (522 / 22,229 / `86ae99e167f07d7679672b4224fdfc758424224603c3de5459b7cdc9aba39e95`), and `home-layouts.jsx` (243 / 15,173 / `c91a2a679670684b4182b3c6015544265373e01cf2ee96efc778975a2257b4f2`).
- Instructions/context fully read: `replit.md`, `attached_assets/Pasted--identity-You-are-the-lead-frontend-engineer-design-sys_1789019554318.txt`, `.local/tasks/verified-app-design-parity-archive-review.md`.
- No read limitations for those documents, assigned component stream, or three comparison files. This is source inspection only; functionality is not proven.

## Current shell inventory
- `client/src/components/layout/new/MainLayout.tsx`: `SidebarProvider` shell, responsive default sidebar (>=1024 open), skip link, grain/page wrapper, header then sidebar/content row, main landmark, footer, optional injected search dialog, back-to-top.
- `AppHeader.tsx`: sticky 56/60px header; mobile drawer trigger; config/data-derived BrandMark plus AWESOME.VIDEO wordmark (wordmark hidden below lg); responsive breadcrumbs (full md+, current-only mobile, ellipsis menu); header search trigger with `/` and icon-only <520px; theme, notifications, authenticated avatar menu, guest bookmark badge, sign-in redirect, logout alert. Preserves `data-testid`s and ARIA labels.
- `AppSidebar.tsx`: shadcn sidebar expanded/collapsed icon rail and mobile sheet; quick navigation; Browse/Categories count/resource state; recursive category > subcategory > sub-subcategory accordion, active deep-link expansion and scroll-into-view; loading skeleton, retry error, empty wrapper; admin-only links; About footer. Category filtering excludes metadata/empty top-level nodes.
- `BrandMark.tsx`: shared inline SVG geometry from `lib/brand-mark`, accent-driven stroke/glyph and fixed tile fill.
- `SearchFilters.tsx`: desktop 256px facet rail and mobile left Sheet; collapsible long facet groups; tags search/24-item cap with selected-first ordering; active chips; clear actions; 44px controls.
- Other assigned components include auth guards/tracker/merge, resource cards/bookmark/favorite/notes/view modes, learning/profile/onboarding/notification cards, SEO/error, AI recommendation, and continue-learning surfaces; these are reusable behavior surfaces, not shell chrome. `assigned-components-full.txt` is the contiguous stream evidence.

## Reference comparison
- Reference `layout.jsx` has full-width header brand + right search/nav/user cluster, command palette (keyboard navigation/Escape), expanded desktop sidebar, full four-column responsive footer, and mobile drawer with search/categories.
- Reference `sidebar-variants.jsx` adds persisted collapse state (56px icon rail), L1/L2/L3 connectors and +N indicators, auto-open active paths, optional sidebar search, source identity footer.
- Reference `home-layouts.jsx` defines hero-less Index (stats, kind strip, taxonomy grid, recent rail, contribute CTA) and Curated (featured cards, recent rows, category cards), responsive 2-column-to-1-column layouts.
- Production has already adapted core shell geometry and behavior, but intentionally diverges: shadcn/sidebar APIs, full header breadcrumbs/auth controls, route/API-driven categories, 44px accessibility targets, no source-level reference `go()` model, and compact footer rather than reference's four-column footer. Do not treat these as proven parity without screenshots/behavior evidence.

## Implementation guide (later phases; gated on baseline)
1. Baseline first: establish real-data captures and explicit screen/state inventory; do not edit product code until baseline and read ledger are accepted.
2. Preserve APIs, Clerk/auth flows, analytics, all existing `data-testid`s, ARIA/focus semantics, and 44px touch targets. Do not copy reference demo data or inert controls.
3. Shell parity targets: compare header brand/search/control placement; sidebar expanded/rail/drawer and L3 affordances; footer information architecture; palette and search placement. Resolve brief breakpoint contract (375/768/1024/1440) against existing shadcn responsive behavior rather than assuming reference CSS.
4. Config branding must remain data/config-derived (`awesome-list.config.yaml` and nav/database); reference placeholders (`AV_*`, static totals, sample identity) are not production sources.
5. Search behavior includes header trigger, `/`, Cmd/Ctrl-K, dialog injection, filter rail/sheet, and tag/active-filter states. Preserve deep links and analytics.
6. Empty/loading/error wrappers are first-class states: nav skeleton/retry/error/empty, resource/search empty, auth gates, drawer closed/open, and logout alert require separate evidence.
7. Later implementation phases are blocked until baseline evidence exists; this inspection makes no functionality claim.

## Missing/blocked expectations
- No env files, credentials, or secrets inspected.
- No browser/server execution and no runtime/API/auth functionality verification performed by request.
- No parity screenshots or pixel measurements exist from this read-only phase.
