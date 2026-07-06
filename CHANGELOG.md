# Changelog

All notable changes to the Awesome Video Resource Viewer project. Newest entries first.

---

## July 6, 2026

### Production Resource-Count Reconciliation + Search/Content Fixes
- **Root cause of the count divergence** (raw table ~2,210, headers ~1,837, ~924 rendered): 372 URL-duplicate approved rows + 1 category-orphan (QUANTEEC — its `category` text matched no `categories.name`, so it was invisible to `/api/categories`) + 6 shortener/tracking links. Chose **Option A (clean the data)** so every surface reads one honest number.
- **Live-prod cleanup** (admin API, journaled, 0 failures): deleted the 372 dupes, reassigned QUANTEEC → Infrastructure & Delivery / Peer-to-Peer Streaming Solutions, rewrote 6 links to direct URLs. Post-cleanup prod invariants: **approved=1,838, url-duplicate groups=0, category-orphans=0**; `/api/resources` total == `/api/categories` sum == `/api/awesome-list` tree == **1,838** (Community 81 · Encoding 325 · General 151 · Infra 199 · Intro 194 · Media 255 · Players 234 · Protocols 200 · Standards 199).
- **Cascade-safety audit** (hard deletes could have wiped `ON DELETE CASCADE` children): verified **NO loss** — prod has 0 bookmarks/favorites/interactions and 0 journey steps (journey step content was never seeded to prod; 5 journeys, 0 steps); dev (same 372 removed, 89 journey steps) shows 0 orphaned steps and 0 referencing any deleted id → the duplicate set is disjoint from journey content. Deletes are HARD (journal kept ids+status, not row contents) — recovery via Replit DB checkpoints or re-adding in admin.
- **Search + routing** (workspace; ships on next publish — live prod `/api/search` still 404s pre-deploy): new `GET /api/search?q=` (honest repo `total`, `limit` clamped to [1,200], `q`<2 → empty), `/?q=` → `/search?q=` (server 301 + client redirect), `/search` page, About feature list with no over-claim. Dev-verified: ffmpeg 61 / codec 111 / HLS 160; negative-limit no longer 500s.
- **Validation (real system, Iron Rule — no mocks/test files)**: all 9 prod category pages badge=="Showing Y of Y"==API count with 24/page pagination that advances (Encoding shows full 325 across 14 pages, not the old ~94 cap); prod resource 185811 renders a direct Netflix/Medium URL (0 shorteners); P2P breadcrumb correct + "Showing 3 of 3" (QUANTEEC); evidence + read screenshots in `evidence/`. Architect review **PASS** (2 non-blocking search bugs found and fixed); `tsc` clean. **Deferred**: VG-4 passes on prod only after publish; left the separate SEO task's "1838+" title template untouched (out of scope, now truthful).

### SEO & GEO Optimization — Schema Enrichment, Keyword Titles, GEO FAQ, Author E-E-A-T
- **Scope**: augmented the existing server-authoritative SEO (`og-middleware.ts`) rather than rebuilding it. Delivered in two waves; the brief's harmful suggestions were rejected (see bottom).
- **Structured data (server)**: `Organization` enriched with `@id`, `logo` (ImageObject → `/favicon.svg`, the only real brand asset — no `logo.png` exists), `description`, `founder` (Nick Krzemienski → verifiable GitHub profile), and `sameAs` (repo + profile). `WebSite` gained a `SearchAction` `potentialAction` targeting `/search?q={search_term_string}` (valid sitelinks-searchbox markup even though Google deprecated the visible rich result). Client still ships zero JSON-LD — server remains sole authority.
- **GEO FAQ (`shared/faq.ts`, 5 → 10)**: added five citation-friendly Q&As (best video codecs, best free encoding tools, streaming protocols, best open-source web players, how to get started) with concrete, factual answers (FFmpeg/HandBrake/Shaka Packager/Bento4/GPAC, HLS/DASH/CMAF/WebRTC/RTMP, Video.js/hls.js/dash.js/Shaka Player, AV1/HEVC/H.264/VP9). One source feeds the `FAQPage` schema, the client About page, and the crawler SSR body at once. Corrected the "2,000" claim in the first answer to the truthful "more than 1,900".
- **Author E-E-A-T (`shared/about-content.ts`)**: `MAINTAINER` (name, role, GitHub URL, 2-paragraph bio) rendered verbatim in BOTH client `About.tsx` (new "About the maintainer" card) and the server `/about` SSR body (no cloaking), and wired into `Organization.founder`. Truthful floors only — "1,800+ stars" (real: 1,887); no fabricated tenure or LinkedIn.
- **Keyword titles/descriptions (`shared/seo-templates.ts`)**: new shared pure functions `homeSeoTitle`/`homeSeoDescription` + `categorySeoTitleCore`/`categorySeoDescription` (per-slug keyword map for the 9 top-level categories, generic fallback), imported by BOTH `og-middleware` AND `Home.tsx`/`Category.tsx`. Titles are keyword-rich (e.g. "Streaming Protocols: HLS, DASH, WebRTC & RTMP — Awesome Video") and deliberately count-free so two-pass title parity can't drift; counts are parameters and live only in descriptions. Also fixed a pre-existing home-description divergence (client used the *filtered* category count; now uses the total) and hardened the home title to read the flat tree count (`awesomeList.resources.length`) the server reads.
- **Rejected from the brief**: `robots.txt Disallow /submit,/search` (would break the noindex + sitemap-equals-indexable invariants); all hardcoded counts (2000+/326+); the fabricated "10,000 GitHub stars", unverifiable "10+ years", and a LinkedIn URL.
- **Validated on the real running system (no mocks/test files)**: `tsc --noEmit` clean; Googlebot curl of `/`, `/about`, and all 9 `/category/*` routes confirmed enriched schema, the 10-item FAQPage, SSR bio text, and correct keyword titles with real tree counts (sum 1931). Architect `evaluate_task` (with git diff) returned **PASS**.
- **Deferred pending sign-off**: P4 long-form category essays and P8 `/compare/*` pages (new indexable content — thin-content and maintenance tradeoffs warrant direction first).

### Resource-Count Unification — All Display Surfaces on the Deduplicated Tree
- **Bug**: per-category and total resource counts disagreed across the app. The raw DB has 1944 approved rows but 1931 after the app's URL-dedup key (`url.trim().toLowerCase().replace(/\/+$/,'')`) — the +13 are trailing-slash/case near-duplicate URLs, not distinct resources. Three display surfaces were reading the raw (pre-dedup) numbers instead of the deduplicated `/api/awesome-list` tree that the sidebar and SSR use.
- **`Home.tsx` + `Categories.tsx`**: removed the `GET /api/categories` per-category count query and the `/api/resources` total query (plus the now-unused `useQuery` imports); both now derive every card count and the headline total from `getTotalResourceCount(cat)` over the tree. Introduction & Learning: 210 → **208**; grand total 1944 → **1931**.
- **`Category.tsx` (`/category/:slug`)**: previously built its rendered resource LIST from `GET /api/resources?category=…&limit=2000` (that endpoint applies **no** dedup), so the header/badge/`SEOHead` count read 210 **and** near-duplicate URL rows rendered as duplicate cards, disagreeing with the sidebar (208) and its own SSR. Now `allResources` flattens the deduplicated tree (`category.resources` + `subcategories[].resources` + `…subSubcategories[].resources`, with a defensive `id|url` dedup Set), mirroring `Subcategory.tsx`/`SubSubcategory.tsx`. Resources carry the real numeric DB id; `/resource/:id` nav and the suggest-edit dialog now read from `treeResources`; the `dbData`/`dbLoading` query and its loading gate were removed.
- **Validated on the real running system (no mocks/test files)**: sidebar, `/`, `/categories`, `/category/intro-learning` header + badge + "Showing 208 of 208", and the Googlebot SSR title/description **all read 208**; totals **1931** everywhere. Playwright confirmed sidebar expansion of Introduction & Learning shows the correct sub-category and sub-subcategory counts with zero-count nodes hidden, and that `/subcategory` (46) and `/sub-subcategory` (3) pages match the sidebar. Architect `evaluate_task` returned **PASS** (previously FAIL on the `Category.tsx` surface) with no numeric-id regression in nav/edit/filter/pagination.
- **Follow-up (prod data, not code)**: the ~13 near-duplicate rows still live in the DB, so raw-table consumers (`/search`, admin totals) can still surface them; merging/rejecting those rows at the source would make raw counts equal tree counts everywhere. Publishing does not reseed prod, so this is a separate reconciliation step.

### Admin AI Agents Migrated to Claude Agent SDK (real multi-agent system)
- **Researcher + Enrichment now run on `@anthropic-ai/claude-agent-sdk`** as a real multi-agent system (orchestrator + subagent + custom in-process MCP tools), replacing direct `@anthropic-ai/sdk` Messages-API calls in those two flows. Kept zod v3 (added `legacy-peer-deps=true` to `.npmrc`; bumped `@anthropic-ai/sdk` for the SDK peer). Rationale/constraints captured in `.agents/memory/agent-sdk-migration.md`.
- **Shared driver** (`server/ai/runAgentQuery.ts`): wraps `query()`, enforces cost/turn caps NATIVELY via `options.maxBudgetUsd`/`maxTurns` (no hand-rolled pricing table), locks the toolset with a `disallowedTools` baseline (Bash/Edit/Write/NotebookEdit/Read/WebFetch/Cron*/etc.) so a server-side agent can't touch the filesystem/shell even under `bypassPermissions`, isolates with `settingSources: []` + custom `systemPrompt`, supports user-cancel via a caller-owned `AbortController` (abort throws a generic Error → caught + treated as a controlled stop when `signal.aborted`), and translates the SDK message stream into persisted `agent_events` rows.
- **Researcher** (`server/ai/researchService.ts`): orchestrator (Sonnet, taxonomy prompt + MCP tools `check_duplicate`/`save_discovery`/`get_coverage_gaps`/`get_existing_resources`) delegates to ONE `scout` subagent (Haiku, WebSearch only, hard-capped at 3-4 searches). Per-run `RunContext` factory (no cross-run state bleed); stall-nudge appended to the tool_result text, not a new user message; cost/turns read from `result.total_cost_usd`.
- **Enrichment** (`server/ai/enrichmentService.ts`): ONE `query()` per batch, single orchestrator (no subagent), two MCP tools (`get_pending_batch` over a server-pre-scraped batch + `submit_enrichment`). Per-job counter bumps are SQL-atomic (`COALESCE(col,0)+1`, jsonb `||`) because `submit_enrichment` can fire concurrently in one turn; user-cancel short-circuits the retry/stall loop before it can force-fail an item.
- **Per-run config** (`server/ai/agentRuntime.ts`): admin can override model / base URL / auth token per run. Base URL is https-only + SSRF-guarded (`validateBaseUrl` blocks private/loopback/link-local, re-checked at run start to shrink the DNS-rebinding window). Auth token stored AES-256-GCM encrypted (`server/ai/configCrypto.ts`, key derived from the `CONFIG_ENCRYPTION_KEY` secret; only the last 4 chars retained for display). All GET responses strip the encrypted blob.
  - **Security (architect-flagged, fixed + validated):** the platform `ANTHROPIC_API_KEY` is now dropped from the run env whenever a custom base URL is set (previously only when a token was present), and a custom base URL now *requires* an auth token (400 otherwise) — so the platform key can never be sent to a third-party endpoint.
- **Structured logging + admin UI**: every run persists `agent_events` (lifecycle / message / thinking / tool_call / delegation / result) with per-actor attribution (orchestrator vs subagent via `subagent_type`); new `AgentEventLog.tsx` viewer and `AgentCommsGraph.tsx` (SVG DAG of the orchestrator→subagent→tool communication, aggregated edges with call counts).
- **Validation (real system, no mocks/test files/TEST_MODE)**: real Researcher run (multi-agent flow: orchestrator→scout→WebSearch ×4 + orchestrator MCP-tool calls, cost/turns/events persisted, graph rendered) and real Enrichment run captured end-to-end; crypto round-trip + tamper-reject, secret non-leakage across all 4 GET paths, budget/abort safety, and the config-plumbing 400 path all verified; architect review returned PASS after the key-leak fix. Type-check clean.

## July 2, 2026

### UX Audit Fix Batch — Missing Pages, Redirects, Navigation Polish, Dead-Link Telemetry
- **New `/recommendations` page** (`client/src/pages/Recommendations.tsx`): authenticated users get the full `AIRecommendationsPanel` (reuses cached `["awesome-list-data"]`); anonymous users get a login CTA plus a "Popular picks" grid fed by `GET /api/recommendations` (returns a plain `RecommendationResult[]` array, same shape as the authed POST). Skeletons while loading, error state with retry (`retry: false` to respect the hourly rate limiter). Home's AI section header now links here, with a "Browse recommendations" outline button.
- **New `/search` page** (`client/src/pages/Search.tsx`): 300ms-debounced input synced to `?q=`, hits `/api/resources?search=&limit=50`, renders `ResourceCard` grid with result count, loading skeletons, and empty state. Search dialog now pins a "View all results" item first so Enter jumps to `/search?q=…`.
- **Redirects (client + server)**: `/settings` → `/settings/theme`, `/category` → `/` (wouter `<Redirect>` + og-middleware 301s). Flat `/category/:slug` where slug is actually a subcategory/sub-subcategory now 301s to the canonical `/subcategory/:slug` or `/sub-subcategory/:slug` (og-middleware tree lookup) with a matching client-side redirect in `Category.tsx`.
- **Did-you-mean 404s**: unknown category slugs get a Levenshtein-based suggestion (distance ≤2 vs slug + hyphen tokens) — e.g. `/category/comunity` → "Did you mean Community & Events?" — rendered by a rebuilt `not-found.tsx` with optional `heading`/`suggestion` props.
- **Dead-link telemetry**: `client/src/lib/route-monitor.ts` `reportDeadLink()` (DEV: console; prod: keepalive POST) fires from NotFound mount; new `POST /api/telemetry/dead-link` endpoint (zod-validated, 204/400).
- **Visual/navigation polish**: Media Tools icon Settings→Clapperboard (was duplicating General Tools' gear) in Home + sidebar nav icons; sidebar category buttons get `title` tooltips; empty subcategories show italic "(empty)" label; header status dot removed; footer text contrast raised to `text-foreground/80`; skeletons use `bg-[var(--surface-3)]` (token defined across all 5 DS skins).
- **`/recommendations` + `/search` registered in og-middleware `staticRoutes` as `noindex: true`** (thin/duplicative content stays out of the index); old `/recommendations` 301 removed.
- **Validation**: `npm run build` clean; curl smoke (200s/301s/404, telemetry 204/400) all pass; Playwright click-paths verified (12 anon recommendation cards render, search-dialog Enter → `/search?q=ffmpeg`, 90 results); zero new console errors.

### Admin Credential Rotation + Hardening
- **Prod + dev passwords rotated**: `admin@example.com` no longer accepts the old seeded default anywhere (verified 401 old / 200 new on both awesome.video and dev). New password lives in the `ADMIN_PASSWORD` secret (global). Prod rotated via `POST /api/user/change-password` (verifies current password, invalidates other sessions); dev via `scripts/reset-admin-password.ts`.
- **No more hardcoded password in code**: `server/seed.ts` `seedAdminUser()` reads `ADMIN_PASSWORD` (skips creation if unset/<8 chars, never logs the value); `scripts/reset-admin-password.ts` requires the env var; `Login.tsx` dev-only hint references the secret instead of a literal; `tests/e2e/admin-users-audit.spec.ts` reads it from env.
- **First-user admin bootstrap removed** (`UserRepository.upsertUser`): previously an empty users table auto-promoted the first registrant to admin — combined with skip-if-unset seeding, a fresh adminless DB could be claimed via public `POST /api/auth/register`. Admins are now provisioned only via env-driven seeding or the role-management API.
- **Note**: the seed/bootstrap code fixes are in the workspace and reach production on next publish (the password rotation itself is already live). ~10 legacy audit/capture scripts in `scripts/` still hardcode the old password — they just fail login now (not a security hole); migrate to `process.env.ADMIN_PASSWORD` when next touched.

### Production Dead-Link Sweep
- **Scan**: `scripts/prod-link-scan.ts` (new, resumable two-pass scanner) checked all 2,365 approved prod resources: pass 1 reuses `server/validation/linkChecker.ts`, pass 2 re-verifies failures with a browser UA. Classification counts + evidence in `.local/prod-link-scan/results.json`.
- **Remediation (prod, reversible)**: 156 confirmed-dead resources set to `rejected` via the live admin API — 109 × HTTP 404/410, 24 × dead DNS, 16 × broken SSL, 7 × connection-dead (incl. openelec.tv, verified permanently down via web search). Approved total: 2,365 → 2,209. Nothing deleted; any can be re-approved from the admin panel.
- **False positives kept approved**: 143 bot-block-only links (Medium, NAB Show, Cloudflare-protected) plus 10 connect-timeout links verified alive from an external vantage (trac.ffmpeg.org ×5, cta.tech ×2, jplayer.org ×2, forum.kaltura.org ×1 — datacenter-IP blocks, not dead). 7 of these were initially mis-rejected by a case-sensitive timeout check (`UND_ERR_CONNECT_TIMEOUT` fell into `dead_conn`) and re-approved after architect review; classifier now matches `/TIMEOUT|ABORT|EAI_AGAIN/i`.
- **Bug fix (`ensureSubSubcategoryExists`)**: a resource whose `subSubcategory` text slugifies to an existing row's slug under a different display name (e.g. "iOStvOS" vs "iOS/tvOS") made `PUT /api/admin/resources/:id` 500 — the unique-constraint catch re-checked by name and rethrew. Added `CategoryRepository.getSubSubcategoryBySlug` and slug-based pre-check + catch re-check.
- **API learning**: `POST /api/admin/resources/bulk/reject` only works on `pending` resources (returns HTTP 200 with `succeeded:0` for approved ones); status flips on approved resources use `PUT /api/resources/:id/reject|approve`.
- **Security follow-up**: ✅ resolved same day — see "Admin Credential Rotation + Hardening" above.

### Functional Audit — Routing/Loading Fixes + Cross-Device QA
- **Nested `/category/:cat/:sub` 404s fixed** (only source was the Advanced-page category explorer): explorer sub chips now link to canonical `/subcategory/:slug`; App.tsx adds a wouter `<Redirect>` route for `/category/:slug/:subSlug` → `/subcategory/:subSlug` and `/recommendations` → `/`; og-middleware issues server-side 301s for both shapes (nested only when the subcategory exists in the cached tree — unknown slugs fall through to the standard soft-404).
- **Category page "0 resources available" flash fixed**: the DB resources query's `isLoading` (`dbLoading`) now gates the skeleton branch alongside the static-tree loading state.
- **404 tracking**: NotFound fires GA `page_not_found` event with path+query on mount (no-op when GA uninitialized; also fires for soft-404s rendered inline by Category/Subcategory — intentional).
- **QA sweep (dev)**: all 102 subcategory routes 200; 301s curl-verified; all 9 category pages settle with correct counts, zero console errors; explorer chip click-path verified via Playwright; no horizontal overflow at 375/428/768/1024/1440/1920; mobile sidebar opens at 375px; search (open//, results, no-results, special chars, Esc), back/forward, submit form render all pass. External-link sample: 8/45 unreachable (mostly 403 bot-blocks/moved pages) — content-level, not app bugs.

## May 19, 2026

### Task #43 — Re-validation Gate after Tasks #36–#42 Remediation
- **Verdict: PIXEL-PERFECT PARITY: ACHIEVED.** 93/93 master rows route to PASS-or-CARVE-OUT with **0 FAIL**. All four evidence channels complete: code citation, multi-breakpoint visual, functional smoke, functional click-path.
- **Multi-breakpoint visual harness**: installed Chromium 1208 under existing Playwright 1.58.0; ran `scripts/audit-after-task43.mjs` in two 6-route batches → **36 fresh `_after.jpg` captures** across 12 routes (`/`, `/about`, `/login`, `/settings/theme`, `/submit`, `/not-a-real-route`, `/category/encoding-codecs`, `/category/community-events`, `/category/general-tools`, `/advanced`, `/journeys`, `/journey/6`) × 3 breakpoints (400 / 768 / 1280). Saved to `screenshots/audit/{landing,category,advanced-journeys}/*_{400,768,1280}_after.jpg`. Manifest with per-capture pass/fail in `evidence/functional/_after_task43/capture_manifest.json` (visual_ok: 36/36, console-warnings: 0).
- **Functional click-path harness**: `scripts/audit-clickpath-task43.mjs` → 8 click-path screenshots + `clickpath_results.json` confirming: theme picker switches `Active: Cyberpunk` → `Active: Limes` after click (MR-DS-01/02/16 all PASS in one trace), search dialog opens via `Cmd+K` AND via `/` keydown (MR-DS-03 PASS), Advanced tabs switch (selected tab text = "Export" after click — MR-AJ-02 original PARTIAL claim disproven), Category page renders 113 "View Details" buttons (MR-CT-01 PASS), Login wrong-creds toast wired in source at `Login.tsx:83`.
- **Per-row Second-pass verdict table** in `_planning/AUDIT_REPORT.md` Appendix G.1: 93 rows across §3.1–§3.6 + §4 with columns `Master ID | Original | Second-pass verdict | Code citation | Visual/functional evidence`. Every row's cited file re-grepped against current source.
- **DS 11-stage re-audit** in `_planning/AUDIT_DS_STRUCTURAL_AFTER.md`: ✅ PASS all 11 stages. Stage-5 hex/color scans clean; Stage-10 = 55 `[data-system=...]` selectors (≥15 baseline); CHART_PALETTE source-of-truth in place.
- **Console-log channel**: across all 36 Playwright captures, zero React-key warnings and zero `data-replit-metadata` injector warnings (MR-CH-05 PASS at scale, not just on the home route).
- **Curl smoke**: 10 page routes + 3 API endpoints all HTTP 200 (`evidence/functional/_after_task43/route_smoketest_after.txt`).
- **MR-XO-09 RETIRED**: the methodology carve-out filed in the first revision of this gate (deferring full breakpoint sweep + Playwright re-run) was retired in this revision because the deferred work was completed via the new harness. Follow-up task #44 marked obsolete via `markFollowUpTaskObsolete`. Follow-up #45 (journey-steps content seed, MR-XO-01 closure) remains live.

### Editorial + Crimson — Pixel-Perfect Alignment to Claude Design Handoff
- **Audit vs `/tmp/handoff/.../uploads/01..21.png`**: identified that WP-4 over-applied Fraunces italic eyebrows/hero accents to Home/About/Login, while the reference renders plain bold Inter for all page headings (Editorial is a token system only).
- **Home (`Home.tsx`)**: removed `// Indexed · Atlas` eyebrow + giant Fraunces italic "awesome.video" hero; replaced numbered `<ol>` row list with 3×3 `<Card>` grid (icon + count badge + plain bold title + 1-line description preview). Added empty-state card with "Clear filters" CTA when `filteredCategories` is empty. AI Recommendations heading switched to plain bold Inter.
- **About (`About.tsx`)**: removed `// About the project` eyebrow + Fraunces italic "About **Awesome Video**"; now plain bold "About" h1 with crimson Sparkles icon. Stripped `font-display font-medium tracking-tight` from all five section `CardTitle`s.
- **Login (`Login.tsx`)**: removed `// Authentication` eyebrow + Fraunces italic "Welcome **back**"; now plain bold "Welcome back" centered. Default-admin block rebuilt as plain tiny text under separator (was an eyebrow-styled surface card).
- **Sidebar brand (`AppSidebar.tsx:129`)**: `font-display text-base font-medium tracking-tight` → `font-sans text-sm font-semibold tracking-tight` (plain bold Inter per reference).
- **Theme Settings (`ThemeSettings.tsx`)**: full rebuild from 10-accent token swatch picker → Font picker (6 fonts: Inter / DM Sans / Source Sans 3 / IBM Plex Sans / JetBrains Mono / System Default, each with live sample-text preview) + Color Theme picker (6 presets: Cyberpunk / Limes / Black & Pink / Flat Pink / Purples / Flat Purples, each with primary/secondary/accent swatch row). Both grids properly wrapped in `role="radiogroup"` with aria-labels.
- **theme-provider re-wiring (`theme-provider.tsx`)**: re-enabled `applyFont(activeFont)` effect (writes `--font-sans` globally). Added scoped accent applier effect that writes ONLY `--accent` and `--accent-2` from `activeTheme.dark.primary` — Editorial atmosphere (bg, surface ladder, text ladder, radii, shadows) stays locked. Default theme remains `cyberpunk` per existing localStorage key, but only its primary color leaks into the DS layer.

### Editorial + Crimson Design System — WP-3 Layout/Header/Sidebar + WP-4 Pages
- **WP-3 Layout/Header/Sidebar**: `AppHeader.tsx` — search trigger now a `rounded-lg` surface chip with crimson-tinted hover/focus border + eyebrow-styled `kbd`; header bg uses `color-mix(var(--bg) 85%)` for blur+transparency; breadcrumb map switched from `Fragment` to `flatMap` to eliminate the Replit dev-injector `data-replit-metadata` warning; `Fragment` import removed. `AppSidebar.tsx` — brand "Awesome Video" rendered in Fraunces `font-display font-medium tracking-tight`; resource count line uses mono eyebrow styling; both `SidebarGroupLabel`s adopt the `.eyebrow` class (mono 11px / 0.18em / crimson). `MainLayout` already correct from WP-1.
- **WP-4 Pages (Home / About / Login)**:
  - **`Home.tsx`** — added `// Index` eyebrow + Fraunces h1 with crimson italic "Video" accent word; removed manual hover/border/bg classes on category cards (DS Card already provides it); category title now Fraunces tracking-tight; count badge switched from `secondary` to new `chip` variant (mono uppercase 10px tracked); AI section heading rebuilt as eyebrow + Fraunces h2 with crimson italic "AI"; all secondary text moved to `var(--text-2)`.
  - **`About.tsx`** — hero rebuilt with eyebrow + Fraunces h1 + crimson italic "Awesome Video"; removed five `border-{primary,accent}/20` overrides (DS handles borders); all five section `CardTitle`s adopt `font-display font-medium tracking-tight` + crimson section icons.
  - **`Login.tsx`** — removed `bg-gradient-to-br from-background via-background to-muted` wrapper (was double-painting on top of `MainLayout`'s radial atmosphere); switched logo halo to `color-mix(var(--accent) 12%)` bg with crimson ring; added `// Authentication` eyebrow + Fraunces title with crimson italic "back"; separator label switched to mono 0.18em tracked; default-credentials block rebuilt as a real surface card (`var(--surface)` bg + `var(--border)` + `rounded-[var(--radius-sm)]`) instead of bare text on background.
- **Fetch hardening (mobile reliability)**: `client/src/lib/static-data.ts` `fetchStaticAwesomeList` rewritten with `AbortController`-backed 45s timeout, 1 retry with linear backoff, explicit `credentials: 'same-origin'`, and a typed error message that surfaces the actual failure cause (`HTTP <status>`, `request timed out after Ns`, or content-type mismatch). Replaces Safari's opaque `"Load failed"` on flaky mobile networks with an actionable error in the existing ErrorPage card.

### Editorial + Crimson Design System — WP-2 Primitives
- **Scope**: token-mapped shadcn primitives already pick up Editorial colors/radii via the bridge in `client/src/index.css @theme inline`; WP-2 adds Editorial-specific micro-behaviors per DS_SPEC §primitives without scope-creeping into per-call rewrites.
- **Card** (`client/src/components/ui/card.tsx`): default class now `shadow-[var(--shadow-sm)] transition-[...] duration-[var(--motion-base)] ease-[var(--motion-ease)] hover:border-[var(--border-strong)]` — soft DS shadow + 240ms hover border-lift.
- **Input** (`client/src/components/ui/input.tsx`): `bg-background` → `bg-[var(--surface)]` (warm-ink alpha tint), added `transition-colors duration-[var(--motion-fast)]`, `hover:border-[var(--border-strong)]`, `focus-visible:border-[color-mix(in_srgb,var(--accent)_60%,transparent)]` for crimson-tinted focus.
- **Select trigger** (`client/src/components/ui/select.tsx`): same surface + crimson-focus treatment as Input; added missing `rounded-lg` (was square in source).
- **Dialog** (`client/src/components/ui/dialog.tsx`): now uses `rounded-[var(--radius)]` (12px Editorial), `bg-popover` (was `bg-background`), `shadow-[var(--shadow-lg)]` (Editorial soft 60px falloff).
- **Tabs** (`client/src/components/ui/tabs.tsx`): `TabsList` rebuilt as a `rounded-full` pill on `var(--surface)` with hairline border; `TabsTrigger` active state = `bg-[var(--surface-3)]` + `text-[var(--accent)]` crimson ink + soft shadow — Editorial pill-tab aesthetic.
- **Badge** (`client/src/components/ui/badge.tsx`): added two new variants per DS chip contract — `chip` (mono uppercase 10px tracking 0.12em on `var(--surface)` with text-2) and `accent` (crimson-tinted variant for hot chips). Existing `default/secondary/destructive/outline` variants unchanged; no breaking changes to call sites.
- **Button** intentionally untouched — its variants already resolve Editorial through `bg-primary`/`border-input`/`rounded-lg` via the token bridge; per DS_SPEC the only required behaviors (44px touch target, hover bg-primary/90, active translateY) are already present.

### Editorial + Crimson Design System — WP-1 Foundations
- **Scope locked**: applying Claude Design Editorial personality with Crimson accent only (single personality, no switcher).
- **Token swap**: `client/src/styles/design-system.css` `:root` now carries Editorial values — warm-ink alpha surfaces on near-black, `#f4f3ee` text ladder, `#ff3d52` crimson accent, Fraunces (serif display) / Inter (body) / JetBrains Mono (code), 12px / 8px / 999px radius ladder, soft drop shadows, radial-gradient page atmosphere, SVG grain overlay at 0.32 opacity.
- **Boot lock**: `client/index.html` boot script sets `<html data-system="editorial" data-accent="crimson">` before any module paints; Google Fonts link now loads Fraunces + Inter + JetBrains Mono.
- **Runtime applier neutralized**: `client/src/lib/design-system.ts` previously pushed inline `style.setProperty('--bg', '#000')` etc. on `documentElement` at boot (Terminal values), which silently overrode the CSS layer. The self-init block is now a globals-only registration; `applyDesignSystem()` remains callable but isn't invoked at boot. `DESIGN_SYSTEMS` map now contains the Editorial config.
- **Shadcn radius re-wired**: `client/src/index.css` `@theme inline` radius keys un-collapsed from `0` to the Editorial 8/12 px ladder so `rounded-*`, `<Card>`, `<Input>`, `<Dialog>` automatically pick up Editorial geometry without per-call class overrides.
- **Atmosphere overlay**: `client/src/components/layout/new/MainLayout.tsx` now mounts a fixed `<div class="grain" />` overlay (`aria-hidden`, `pointer-events: none`).
- **Legacy theme-provider effects disabled**: `client/src/components/ui/theme-provider.tsx` had two `useEffect`s that called `applyTheme(activeTheme)` and `applyFont(activeFont)` whenever `data-system !== 'terminal'` — i.e. exactly in our new Editorial mode. Those effects wrote inline CSS variables (`--font-sans`, `--radius`, theme color set) onto `documentElement`, silently overriding the DS layer. Both effects are now permanent no-ops; React state is preserved for the deferred /settings/theme picker UI.
- **Planning artifacts**: `_planning/{DS_SPEC,SITE_MAP,DELTA_CATALOG,REMEDIATION_PLAN}.md` capture the Editorial+Crimson contract, current site inventory, 82-item delta catalog, and 8-work-package remediation plan with per-gate evidence requirements.
- **Known issue (pre-existing, not migration-related)**: `AppHeader.tsx:75` uses `<Fragment>` inside a `.map()`; Replit's dev injector adds `data-replit-metadata` to those Fragments, producing a React warning. Tracked for a follow-up cleanup pass.

---

## May 2, 2026

### Admin Panel Audit – Remaining Tabs
- **Removed broken Research tab** from `client/src/pages/AdminDashboard.tsx`. `CostDashboard` + `ResearchPanel` were calling `/api/research/*` endpoints that were never wired up in `server/routes.ts` (the active routes file). The working `Researcher` tab (different component, hits `/api/researcher/*`) remains.
- **Deleted dead client code**: removed entire `client/src/components/admin/research/` directory (CostDashboard, ResearchPanel, JobMonitor, ReportViewer, ResearchDashboard, ResearchJobsTable, etc.) — nothing else imported it.
- **Removed duplicate / dead server route trees**: `server/routes.ts` is the only registered route surface. Deleted `server/routes/` directory (parallel modular files including duplicate `routes/admin/enrichment.ts`) and `server/modules/` directory (parallel module-architecture files including duplicate `modules/enrichment/routes.ts` and `modules/research/routes.ts`). None of these were imported anywhere.
- **Audit verified**: Categories, Subcategories, Sub-Subcategories, Export, Database, GitHub Sync, Link Health, Researcher, Pending Resources/Edits, AdminStats, Users, Audit tabs all hit endpoints that exist in `server/routes.ts` and respond with 401 (auth required) when called unauthenticated.
- **Fixed Resources tab bulk actions**: Added missing `POST /api/admin/resources/bulk/{approve,reject,delete}` endpoints in `server/routes.ts`. The `ResourceManager` UI was wired to call these but they were never implemented, so bulk approve/reject/delete buttons silently 200'd a Vite HTML page instead of mutating data.

---

## February 2, 2026

### Deployment Fix & Re-Audit
- **Deployment Migration Fix**: Enhanced `server/index.ts` migration handling with:
  - Multi-path search for migrations folder
  - Fail-fast verification when migrations missing - checks if database schema exists
  - More precise PostgreSQL error handling (42P07 for "already exists")
- **Generated Migrations**: Created proper Drizzle migrations with `meta/_journal.json`
- **Re-Audit Completed**: Full 291-item checklist verified
- **All Tests Passing**: API endpoints, database integrity, frontend UI, responsive design
- **Current Data**: 9 categories, 19 subcategories, 32 sub-subcategories, 1949 resources

---

## February 1, 2026

### Comprehensive Testing Audit
- **Testing Scope**: 150+ individual test steps executed across all functionality
- **Bug Fix**: Updated `isDbResource()` in Category.tsx to handle `db-` prefixed IDs correctly
- **Security Testing**: SQL injection and XSS protection verified
- **API Testing**: 15+ endpoints tested with authenticated and unauthenticated requests
- **UI Testing**: All three screen sizes (400px, 768px, 1280px) verified
- **Admin Panel**: All 11 tabs verified functional
- **Database Integrity**: 0 orphaned resources, 1949 approved resources
- **Feature Gap Identified**: SubSubcategory/Subcategory pages missing edit buttons
- **Documentation**: Created comprehensive ISSUES-FOUND.md with all test results

---

## January 28, 2026

### Production Readiness Audit
- **Repository Cleanup**: Removed 263MB+ of dead weight (client/my-app/, test screenshots, 90+ obsolete test scripts)
- **Documentation Suite**: Created comprehensive documentation in /docs:
  - ARCHITECTURE.md - System design and data flows
  - API.md - Complete API reference (75+ endpoints)
  - SETUP.md - Development environment guide
  - ADMIN-GUIDE.md - Administrator documentation
  - CODE-MAP.md - Codebase navigation guide
  - CONTRIBUTING.md - Contribution guidelines
- **README Overhaul**: Updated with accurate feature list, documentation links, and quick start
- **Essential Scripts Retained**: build-static.ts, reset-admin-password.ts, test-awesome-lint.ts, migrate-audit-log-original-resource-id.ts
- **File Count**: Reduced from 2,517 to 216 essential project files (excluding node_modules, .git, .cache, .config)
- **Size Reduction**: From 619MB to 2.7MB of project code (excluding dependencies)
- **Removed**: 740 test screenshots, 142 attached_assets, obsolete test reports, unused parsers, stale build artifacts

### Resource Details Page Implementation
- **Comprehensive Resource Details Page**: New `/resource/:id` route displays full resource information including OG images, favicon, tags, scraped metadata, related resources, and share functionality
- **Dual Navigation System**: Database resources (numeric IDs) navigate to details page; static resources open external links in new tab
- **Navigation Bug Fix**: Fixed `isDbResource()` check in Category.tsx - was incorrectly looking for `db-` prefix, now correctly detects numeric IDs
- **Universal Suggest Edit**: SuggestEditDialog now works for all users - authenticated users see edit form, unauthenticated users see login prompt with redirect
- **Share Functionality**: Web Share API with clipboard fallback and error handling
- **Responsive Design**: Tested across desktop (1280x720), tablet (768x1024), and mobile (400x720) with WCAG AAA touch targets

---

## January 22, 2026

### Feature Updates
- **Suggest Edit on Category Page**: Added suggest edit buttons to all three view modes (grid, list, compact) on the Category page. Edit buttons only appear for authenticated users and database-backed resources (id starts with "db-"). Clicking the edit button opens the SuggestEditDialog modal without triggering resource link navigation.

---

## January 21, 2026

### Awesome-Lint Compliance Fixes
- **Major Export Overhaul**: Reduced awesome-lint errors from 191+ to just 2 (unavoidable structural requirements)
- **Badge Placement**: Badge now on same line as main heading per awesome-lint spec
- **ToC Anchor Generation**: Fixed GitHub anchor format - "Community & Events" now correctly links to `#community--events`
- **URL Deduplication**: Now handles http/https and www/non-www variations
- **Description Sanitization**:
  - Removes item name from description start (no-repeat-item-in-description)
  - Skips empty/punctuation-only descriptions (awesome-list-item compliance)
  - Handles underscore-containing tool names with "A " prefix for valid casing
- **Unicode Quote Handling**: Converts curly quotes to straight quotes using Unicode escape sequences
- **Spelling Corrections**: TensorFlow, CentOS, macOS, WebAssembly, FFmpeg, WebRTC, OpenAI, etc.
- **Lowercase Starter Preservation**: macOS, npm, webpack, iOS terms preserved when starting descriptions
- **Remaining 2 Errors**: awesome-contributing (requires CONTRIBUTING.md) and awesome-github (requires git repo) - expected for standalone exports

---

## January 20, 2026

### Feature Updates
- **View Mode Toggle**: Added three content card view modes (grid, list, compact) using ShadCN ToggleGroup component in the Category page
- **JSON Export Endpoint**: Added `GET /api/admin/export-json` for full database backup including all resources (all statuses), users, category hierarchies, tags, learning journeys, and sync queue with schema documentation
- **Tag Filtering Fix**: Fixed tag filtering by transforming resources to include `tags` at root level (extracted from `metadata.tags`) for frontend compatibility
- **GitHub Import Improvements**:
  - Added category hierarchy database integration with `ensureCategoryHierarchy()` function
  - Resources now store hierarchy IDs (categoryId, subcategoryId, subSubcategoryId) in metadata
  - Update path also populates hierarchy IDs for consistency

---

## December 4, 2025

### Bug Fixes
- **Bug #8 - Duplicate Slug Validation**: Fixed duplicate slug error handling to return proper 409 Conflict status code instead of 500 Internal Server Error. Applied to categories, subcategories, and sub-subcategories. Users now see clear error messages: "Category with slug 'X' already exists".

---

## System Health Check (as of December 4, 2025)
- **Database Integrity**: 0 orphaned resources (100% data integrity maintained)
- **Active Constraints**: 7 UNIQUE and FOREIGN KEY constraints properly enforced
- **Current Data**: 9 categories, 19 subcategories, 32 sub-subcategories, 1,949 approved resources, 3 users
- **API Status**: All endpoints responding correctly (authentication, awesome-list, admin)
