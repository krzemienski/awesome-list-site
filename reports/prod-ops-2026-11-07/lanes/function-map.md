# function-map: every function, its entry points, nav reach, effects, inventory rows and HTTP contracts

Lane `function-map`, prod-ops 2026-11-07. Code-only analysis of `origin/main` 1cd25ab0 (= production at 20:2xZ). No browser, no production call, no write outside this file. Built on the 07b codemap (`prod-primary/.../lanes/codemap.md`, 95 functions). Path prefixes in the tables: `C:` = `client/src/`, `S:` = `server/`, `SD:` = `server/routes/domains/`. Server route cells are `file:line` of the Express registration. The `tier` column is blank for the lead.

## 0. Method, and what was verified

1. **Codemap vs current code.** All 67 `file:line` route citations in the codemap resolve to the same route registration today (script run against a regex index of 210 registrations; 67/67, 0 drift). Client route lines (`App.tsx:849-965`), the 18 admin tab ids (`shared/admin-tabs.ts:4-7`) and the scheduler wiring (`server/index.ts:773-776`) were re-read. App diff since 60e07dcf is only the dev CSP lines in `server/index.ts`, as the lead said.
2. **Route index.** Every `app.<verb>(...)` registration under `server/routes/**`, `server/api/**` and `server/version-route.ts` = **210** (203 under `/api`, 7 outside: 2 unsubscribe, security.txt x2, sitemap, og-image x2). The `/api/__clerk` proxy is `app.use`, not a contract.
3. **Denominators.** The 760 rows are `reports/prod-audit-2026-10-26/INVENTORY.md` (613 C22 admin/member rows + 66 C6-PC + 63 C6-PS + 19 C6-AX, minus the 1 C6-PC row inside C22; the lead's `inventory.md` is a different 100-row feature list). The "196 HTTP contracts" is a count only (`C7-IMPLEMENT.prompt.md:2`, `STATUS.md:41`); no itemised list exists in the repo. At the pinned SHA 130e5829 the same regex finds 200 registrations (193 under `/api`); today 210 (203). The 10 added since: `qa-rows` x2, `link-health/remediation` x3, `link-health/summary`, `admin/logs`, `admin/usage`, `link-clerk`, `ops/run-due-jobs`. So the 196 cannot be reproduced exactly; **this file reconciles against the 210 current registrations** and reports the delta to 196 in section 4.
4. **Retire rule.** "Retire: no live function" = no caller in `client/src`, `shared`, `scripts` or a server job, and not an external-by-design interface (public API, health/version/docs, unsubscribe, cron, OpenAPI). Caller scan = string match of the path head and tail over `client/src` and `shared`; dynamic paths built from template strings were checked by hand (steps, items, withdraw, link-reports all have callers).
5. **Nav clicks** are counted on desktop (>= tablet) from Home `/`, by reading `AppHeader.tsx`, `AppSidebar.tsx`, `AppFooter.tsx`, `Home.tsx`, `Settings.tsx`, `Profile.tsx`, `AdminDashboard.tsx`. The header nav (`Browse, Submit, About, Docs, Admin`) has class `hide-tablet` (`AppHeader.tsx:107`); at tablet and phone widths add 1 click (open the drawer, whose nav lists Home, Browse, Submit, About, Admin and the More links, `AppSidebar.tsx:954-984,1190-1235`).

## 0.1 Findings the lead should know before tiering

- **Recommendations can spend money (contradicts the 11-06 "rule-based, no AI" correction).** The file the lead checked, `server/recommendation-engine.ts` (502 lines), has **no importer anywhere** (dead file). The live engine is `server/ai/recommendationEngine.ts` (imported at `routes.ts:37`). For any signed-in user with activity (views, bookmarks, ratings or completed resources) and Anthropic configured it calls `generateClaudeRecommendations` (`recommendationEngine.ts:553-556`), which calls `createStructuredMessage` (`server/ai/recommendations.ts:407-465`). Cold-start users and the anonymous GET use the popularity path (`recommendationEngine.ts:376-440`). `POST /api/recommendations` has `aiLimiter` (10 per 15 min). Cost per call and whether prod has the key are not visible from code. **F-MACC-11 is therefore outward/paid for members.**
- **`/api/claude/analyze` is admin-only** (`admin-content.ts:1321`: `isAuthenticated, isAdmin, aiLimiter`), but its only client caller sits inside the member-facing Suggest Edit dialog (`suggest-edit-dialog.tsx:375`), shown only when `isAdminUser` (`:781`). The codemap lists it under F-MCON-02 as a member path; it is admin-only (F-ACUR-09).
- **`POST /api/admin/export` only builds markdown** (audit row, `text/markdown` download, no GitHub push: `export-link-health.ts:649-695`). Closes the open item in 11-06 `inventory.md` section 5.
- **Hidden writes** (unchanged): `POST /api/telemetry/dead-link` (log line only, F-RESIL-01) and `POST /api/interactions` (one DB row per signed-in resource view, F-TEL-06).
- **`OPS_CRON_TOKEN` unset in prod** (logs lane F-LOGS-2): F-JOB-05 returns 503, so jobs rely on in-process timers (F-JOB-01..04).
- **Codemap changes**: F-AOPS-12 (schedulers) is split into F-JOB-01..07; F-AOPS-02 is split into F-AOPS-02 (audit) and new F-AOPS-13 (contact inbox, rendered at `AuditTab.tsx:549` behind "Tools"); new F-AUTH-10 (Clerk proxy), F-OBS-01 (first-party telemetry incl. `documentTemplate` DOC counters, `operationalTelemetry.ts:206`), F-XCUT-01 (pseudo-function for the 27 cross-cutting UX/a11y rows). 95 -> 105 functions. F-AOPS-08 (`/api/admin/logs`, `/usage`) is not vestigial: they are the ops/agent endpoints this run's design added; they have no UI by design.

## 1. Function table (105 functions)

| id | function | audience | client entry | server routes (file:line) | nav clicks from home | paid/outward effect | inventory rows (count; ids) | HTTP contracts (count) | guard paths | tier |
|---|---|---|---|---|---|---|---|---|---|---|
| F-DISC-01 | Home dashboard (SSR for anonymous, SPA otherwise) | visitor, member | C:pages/Home.tsx (App.tsx:849,788); C:components/home/HomePresentation.tsx; C:components/home/use-home-layout.ts; SSR C:entry-server.tsx:20, S:home-ssr-data.ts:41, S:ssr.ts:360 | SD:home-feed.ts:49 | 0 (landing) | none | 9; C6-PC 026-027,029-035 | 1 | C:pages/Home.tsx; C:components/home/**; C:entry-server.tsx; S:home-ssr-data.ts; S:ssr.ts; S:seo-content.ts (renderHomeContent:349); SD:home-feed.ts; S:og-middleware.ts (home meta :650) | |
| F-DISC-02 | Categories index | visitor | C:pages/Categories.tsx (App.tsx:883) | none | 1 (header Browse, AppHeader.tsx:107) | none | 2; C6-PC 036-037 | 0 | C:pages/Categories.tsx; C:pages/TaxonomyListing.tsx; S:seo-content.ts (renderCategoriesContent:501); S:og-middleware.ts (:1189) | |
| F-DISC-03 | Category page and shared taxonomy listing template (filters, facets, views, pagination) | visitor | C:pages/Category.tsx (App.tsx:878); C:pages/TaxonomyListing.tsx; C:components/ui/advanced-filter.tsx | none | 1 (Home category tile HomePresentation.tsx:442, or sidebar) | none | 9; C6-PC 038-046 | 0 | C:pages/Category.tsx; C:pages/TaxonomyListing.tsx; C:components/ui/advanced-filter.tsx; S:seo-content.ts (renderTaxonomyContent:366); S:og-middleware.ts (:1243) | |
| F-DISC-04 | Subcategory page | visitor | C:pages/Subcategory.tsx (App.tsx:902); C:pages/TaxonomyListing.tsx | none | 1 (Home subcategory link HomePresentation.tsx:515) or 2 (sidebar expand, click) | none | 0 | 0 | C:pages/Subcategory.tsx; C:pages/TaxonomyListing.tsx; S:og-middleware.ts (:1457) | |
| F-DISC-05 | Sub-subcategory page | visitor | C:pages/SubSubcategory.tsx (App.tsx:905,906) | none | 3 (sidebar: expand category, open subcategory disclosure, click; AppSidebar.tsx:556) | none | 0 | 0 | C:pages/SubSubcategory.tsx; C:pages/TaxonomyListing.tsx; S:og-middleware.ts (:1541,:2477-2501) | |
| F-DISC-06 | Tag landing page | visitor | C:pages/TagLanding.tsx (App.tsx:882) | none | 2 (open a resource, click a tag chip, ResourceDetail.tsx:1221); also sitemap and README anchors (C:lib/legacy-readme-anchor.ts) | none | 5; C6-MB 080; C6-PC 047-050 | 0 | C:pages/TagLanding.tsx; shared/tagNormalize.ts; S:og-middleware.ts (:1334); S:routes/non-api.ts (sitemap tag URLs) | |
| F-DISC-07 | Resource detail page, outward link, related resources | visitor, member | C:pages/ResourceDetail.tsx (ResourcePage App.tsx:909); C:components/resource/** | SD:catalog-contributions.ts:718,721 | 1 (Home resource card) | outward: visitor clicks the resource URL (third-party site); signed-in view writes one interaction row (hidden write) | 7; C6-PC 051-053,056,059-061 | 2 | C:pages/ResourceDetail.tsx; C:components/resource/**; SD:catalog-contributions.ts (:718-721); S:seo-content.ts (renderResourceContent:520); S:og-middleware.ts (:1627); S:services/relatedResources.ts | |
| F-DISC-08 | About page | visitor | C:pages/About.tsx (App.tsx:910); shared/about-content.ts | none | 1 (header About AppHeader.tsx:110, footer :112) | none | 3; C6-PS 039-041 | 0 | C:pages/About.tsx; shared/about-content.ts; shared/static-page-heads.ts; S:og-middleware.ts (:941-1090) | |
| F-DISC-09 | Terms, Privacy, Code of conduct | visitor | C:pages/Terms.tsx, Privacy.tsx, CodeOfConduct.tsx (App.tsx:911-913); C:components/legal/LegalPolicyPage.tsx | none | 1 (footer AppFooter.tsx:113-115) | none | 1; C6-PS 042 | 0 | C:pages/Terms.tsx; C:pages/Privacy.tsx; C:pages/CodeOfConduct.tsx; C:components/legal/**; shared/static-page-heads.ts | |
| F-DISC-10 | Sidebar (desktop, rail, mobile drawer) | visitor, member, admin | C:components/layout/new/AppSidebar.tsx (1359 lines); C:components/layout/new/MainLayout.tsx | none | 0 desktop; 1 on mobile (toggle drawer) | none | 8; C6-PC 003,008-014 | 0 | C:components/layout/new/AppSidebar.tsx; C:components/layout/new/MainLayout.tsx; C:components/ui/sidebar.tsx | |
| F-DISC-11 | Legacy and bare-prefix redirects (client and server mirror) | visitor | C:App.tsx:863-938 (explore, resource, category/:slug/:subSlug, tag, category, subcategory, sub-subcategory, subsubcategory, journey, favorites, account); C:lib/legacy-readme-anchor.ts | none | no nav entry (direct URL only) | none | 1; C6-PC 064 | 0 | C:App.tsx; C:lib/legacy-readme-anchor.ts; S:og-middleware.ts (:2222-2540) | |
| F-DISC-12 | SSR, meta, canonical, JSON-LD, sitemap, robots, OG image, security.txt | visitor, crawler | S:ssr.ts:360 (handleSSR, "/" only, anonymous); S:og-middleware.ts:2151 (all other pages); S:seo-content.ts; S:routes/non-api.ts:687-702; mounts S:index.ts:645,657; static client/public/robots.txt, llms.txt | S:routes/non-api.ts:687,689,700,701,702 | 1 (footer Sitemap link AppFooter.tsx:120); crawlers direct | none (OG PNG render per request is CPU) | 2; C6-PS 052,062 | 5 | S:ssr.ts; S:og-middleware.ts; S:seo-content.ts; S:routes/non-api.ts; S:home-ssr-data.ts; C:components/layout/SEOHead.tsx; shared/static-page-heads.ts; client/public/robots.txt; client/public/llms.txt | |
| F-DISC-13 | App shell: header, footer, breadcrumb, skip link, back-to-top, account menu, auth-error banner | visitor, member, admin | C:components/layout/new/AppHeader.tsx; AppFooter.tsx; PageBreadcrumb.tsx; MainLayout.tsx; C:App.tsx:830-840 | none | 0 | none | 11; C6-PC 001-002,005-007,015-019; C6-PS 063 | 0 | C:components/layout/new/AppHeader.tsx; C:components/layout/new/AppFooter.tsx; C:components/layout/new/PageBreadcrumb.tsx; C:components/layout/new/MainLayout.tsx; C:App.tsx | |
| F-DISC-14 | Catalog read APIs (system function behind every listing) | system | n/a (consumed by F-DISC-01..07, F-SRCH-*) | SD:catalog-contributions.ts:198,489,1306,1334,1356,1399; SD:export-link-health.ts:1528,1706,1727 | n/a | none | 0 | 9 | SD:catalog-contributions.ts; SD:export-link-health.ts (awesome-list routes :1528-1727); S:repositories/**; S:cache/publicCache.ts; S:services/public-discovery.ts; S:db/index.ts | |
| F-SRCH-01 | Command palette (button, Cmd/Ctrl+K, "/") | visitor | C:components/ui/search-dialog.tsx:378; C:components/search/SearchEntryButton.tsx; C:components/layout/new/MainLayout.tsx:172-184 | none | 1 (header search pill AppHeader.tsx:101) or 0 (keyboard) | none | 6; C6-PC 004,021-025 | 0 | C:components/ui/search-dialog.tsx; C:components/search/**; C:components/layout/new/AppHeader.tsx | |
| F-SRCH-02 | Search page (query, results grid, empty and error states) | visitor | C:pages/Search.tsx:223 (App.tsx:904); C:components/search/** | none | 1 (Home search field + Enter, HomePresentation.tsx:630) or 2 (palette "View all") | none | 5; C6-PS 001-002,007,009,011 | 0 | C:pages/Search.tsx; C:components/search/**; S:seo-content.ts (renderSearchContent:443); S:og-middleware.ts (:1134) | |
| F-SRCH-03 | Search filters and facets | visitor | C:components/search/SearchFilters.tsx; C:components/search/facet-options.ts | none | 2 (Search page, open filters) | none | 3; C6-PS 004-006 | 0 | C:components/search/SearchFilters.tsx; C:components/search/facet-options.ts; C:pages/Search.tsx | |
| F-SRCH-04 | Search sort, pagination, URL sync | visitor | C:pages/Search.tsx (Paginator, ?q ?sort ?page) | none | 2 (Search page) | none | 2; C6-PS 003,008 | 0 | C:pages/Search.tsx; C:components/ui/paginator.tsx | |
| F-SRCH-05 | Search typo suggestion (fuzzy) | visitor | C:pages/Search.tsx:316 | none | 2 (Search page, zero-hit query) | none | 1; C6-PS 010 | 0 | C:pages/Search.tsx; SD:catalog-contributions.ts (:548 search) | |
| F-SRCH-06 | Home search field | visitor | C:pages/Home.tsx; C:components/home/HomePresentation.tsx:623-630 | none | 0 (on Home) | none | 1; C6-PC 028 | 0 | C:components/home/HomePresentation.tsx; C:pages/Home.tsx | |
| F-SRCH-07 | Search backend and hostile-input handling (markup scrub, overlong, rate limit) | visitor, system | C:App.tsx:693 (scrubber); C:pages/Search.tsx (queryTooLong) | SD:catalog-contributions.ts:548 | n/a (API; via ?q= URLs) | none | 0 | 1 | SD:catalog-contributions.ts (:548); C:App.tsx (ScrubbedParamsNotice); S:repositories/**; S:index.ts (rate limit/backstop) | |
| F-RESIL-01 | 404 page, route suggestions, dead-link beacon | visitor | C:pages/not-found.tsx (App.tsx:965, :797); C:lib/route-monitor.ts:53 | SD:catalog-contributions.ts:607 | no nav entry (direct URL only) | hidden write: server log line only (204, no DB row) | 1; C6-PC 063 | 1 | C:pages/not-found.tsx; C:lib/route-monitor.ts; SD:catalog-contributions.ts (:607); S:og-middleware.ts (notFoundMeta:380) | |
| F-RESIL-02 | Offline state | visitor | C:components/layout/OfflinePageState.tsx; C:hooks/use-online-status.ts; C:App.tsx:830-840 | none | n/a (induced state) | none | 0 | 0 | C:components/layout/OfflinePageState.tsx; C:hooks/use-online-status.ts; C:lib/queryClient.ts | |
| F-RESIL-03 | Lazy-route and chunk-load recovery | visitor | C:App.tsx:60-64 (retryFailedRouteImports, lazyRoute), :317 (RouteErrorBoundary) | none | n/a (induced state) | none | 1; C6-PC 062 | 0 | C:App.tsx; C:main.tsx; vite.config.ts; S:vite.ts | |
| F-RESIL-04 | Error cards and Retry (StatePanel, ErrorPage, ErrorBoundary) | visitor | C:components/layout/StatePanel.tsx; C:pages/ErrorPage.tsx; C:components/ErrorBoundary.tsx | none | n/a (induced state) | none | 0 | 0 | C:components/layout/StatePanel.tsx; C:pages/ErrorPage.tsx; C:components/ErrorBoundary.tsx | |
| F-RESIL-05 | Slow-network fallback (skeletons, RouteFallback, SSR hold) | visitor | C:App.tsx (RouteFallback); C:main.tsx:196-243 (SSR hold overlay) | none | n/a (induced state) | none | 0 | 0 | C:App.tsx; C:main.tsx; C:styles/** | |
| F-RESIL-06 | Health, version, OpenAPI, docs | system, developer | S:routes/domains/operations.ts:68-76,115,206,211; S:version-route.ts:51 | S:version-route.ts:51; SD:operations.ts:68,72,76,115,206,211 | no nav entry (direct URL only; header "Docs" links to the GitHub repo, not /api/docs) | /api/health/ai?deep=1 (admin) calls the Anthropic API (paid, one test call) | 2; C6-PS 053,056 | 7 | SD:operations.ts; S:version-route.ts; S:openapi.ts; S:health.ts; S:contracts/openapiGenerator.ts | |
| F-RESIL-07 | API fallbacks: 405 stubs, unknown /api 404, backstop limiter | visitor, system | S:routes/domains/operations.ts:170-290 (ALL /api/resources/:id at :189); S:routes.ts:250-293 | SD:operations.ts:189 | no nav entry (direct URL only) | none | 0 | 1 | SD:operations.ts; S:routes.ts; S:middleware/rateLimit.ts | |
| F-TEL-01 | Consent banner and footer "Cookie settings" | visitor | C:components/ui/consent-banner.tsx | none | 0 (banner on first load); 1 (footer Cookie settings) | none | 1; C6-PC 020 | 0 | C:components/ui/consent-banner.tsx; C:lib/analytics.ts | |
| F-TEL-02 | Vendor events after consent (GA4, Mixpanel, PostHog, Amplitude) | visitor, member | C:lib/analytics.ts; C:lib/analytics-dispatch.ts; C:hooks/use-analytics.tsx; C:main.tsx | none | 0 (automatic) | outward: browser sends events to 3 vendors (GA id unset); server also sends sign_up_completed and resource_submitted to Mixpanel (S:lib/mixpanelServer.ts, consent header) | 0 | 0 | C:lib/analytics*.ts; C:lib/posthog.ts; C:lib/mixpanel.ts; C:lib/amplitude.ts; C:hooks/use-analytics.tsx; S:lib/mixpanelServer.ts; .replit (VITE_* keys) | |
| F-TEL-03 | Replit/Umami cookieless page views | visitor | C:lib/analytics.ts (Replit half) | none | 0 (automatic) | outward: page view beacon to Replit | 0 | 0 | C:lib/analytics.ts; C:main.tsx | |
| F-TEL-04 | Admin and QA suppression of analytics | admin | C:lib/analytics.ts (umami.disabled marker) | none | 0 (automatic) | none | 0 | 0 | C:lib/analytics.ts; C:hooks/use-analytics.tsx | |
| F-TEL-05 | Web vitals, api_performance and error events (client) | visitor | C:hooks/use-analytics.tsx; C:lib/queryClient.ts | none | 0 (automatic) | outward (consent-gated) | 0 | 0 | C:hooks/use-analytics.tsx; C:lib/queryClient.ts | |
| F-TEL-06 | Server-recorded interactions (view rows that feed recommendations) | member | C:pages/ResourceDetail.tsx (trackUserInteraction) | SD:journeys-recommendations.ts:955 | 1 (open any resource while signed in) | hidden write: one DB row per signed-in resource view | 0 | 1 | SD:journeys-recommendations.ts (:955); C:pages/ResourceDetail.tsx | |
| F-OBS-01 | First-party operational telemetry, request logging, log sinks | system, admin | S:ops/operationalTelemetry.ts (documentTemplate:206, clientClass:222, recordDocumentRequest:229); S:index.ts:536-570; S:lib/logger.ts; S:lib/logSink*.ts; S:ops/processHandlers.ts | none | 0 (automatic); shown in Overview System health | outward: Axiom log sink if configured (S:lib/logSinkAxiom.ts) | 0 | 0 | S:ops/**; S:lib/logger.ts; S:lib/logSink*.ts; S:index.ts (:536-570) | |
| F-AUTH-01 | Sign-up (Clerk) | visitor | C:pages/AuthPages.tsx (App.tsx:853); C:components/auth/ClerkRuntime.tsx | none | 3 (account menu, Sign in, Clerk sign-up link) | outward: Clerk creates the identity; server emits sign_up_completed to Mixpanel (clerkAuth.ts:148) | 1; C6-PS 047 | 0 | C:pages/AuthPages.tsx; C:components/auth/**; S:clerkAuth.ts; C:lib/clerk-appearance.ts | |
| F-AUTH-02 | Sign-in (Clerk) | visitor | C:pages/AuthPages.tsx (App.tsx:852) | none | 2 (account menu > Sign in, AppHeader.tsx:135) | outward: Clerk | 2; C6-PS 046,061 | 0 | C:pages/AuthPages.tsx; C:components/auth/**; S:clerkAuth.ts; C:lib/clerk-appearance.ts | |
| F-AUTH-03 | Owner/admin password sign-in and admin sign-out | admin | C:components/auth/AdminPasswordSignIn.tsx (on /sign-in?admin, AuthPages.tsx:56-67); C:components/auth/AdminGuard.tsx:67 link | SD:auth-user.ts:163,182 | no nav entry from Home (direct URL /sign-in?admin, or "Admin login" link on /admin when signed out) | sets owner session cookie; shared login rate limit 10 per 900 s | 5; C6-PS 048; SH 005-008 | 2 | C:components/auth/AdminPasswordSignIn.tsx; C:components/auth/AdminGuard.tsx; SD:auth-user.ts; S:passwordUtils.ts (no importer found); S:clerkAuth.ts | |
| F-AUTH-04 | Sign-out and sign out all devices | member, admin | C:App.tsx:854 (/logout); C:components/layout/new/AppHeader.tsx:152; C:hooks/useAuth.ts; C:components/profile/AccountSecurityCard.tsx | SD:auth-user.ts:127 | 2 (account menu > Sign out) | revokes ALL sessions of the account (never click on prod owner) | 3; C6-MB 004; C6-PS 050; SH 004 | 1 | C:hooks/useAuth.ts; C:pages/AuthPages.tsx; SD:auth-user.ts; C:components/layout/new/AppHeader.tsx | |
| F-AUTH-05 | Session persistence, current user, stale-session gate | member, admin | C:components/auth/StaleSessionGate.tsx; C:hooks/useAuth.ts | SD:auth-user.ts:92 | 0 (automatic) | none | 1; C6-PS 049 | 1 | C:hooks/useAuth.ts; C:components/auth/**; SD:auth-user.ts; S:clerkAuth.ts | |
| F-AUTH-06 | Protected-route guards (client AuthGuard/AdminGuard, server cookie guard) | visitor, member, admin | C:components/auth/AuthGuard.tsx, AdminGuard.tsx; C:pages/BookmarksGate.tsx; App.tsx:925-928,941,950,960; S:index.ts:490-501 (PROTECTED_PAGE_PATTERNS), :602-617 | none | no nav entry (direct URL only) | none | 5; C6-PS 051; SH 009-012 | 0 | C:components/auth/AuthGuard.tsx; C:components/auth/AdminGuard.tsx; C:pages/BookmarksGate.tsx; S:index.ts (:490-617) | |
| F-AUTH-07 | Legacy auth redirects keeping validated ?next= | visitor | C:App.tsx:856-862 (LegacyAuthRedirect:609) | none | no nav entry (direct URL only) | none | 0 | 0 | C:App.tsx | |
| F-AUTH-08 | Password reset (Clerk flow from sign-in) | visitor | Clerk widget in C:pages/AuthPages.tsx | none | 3 (account menu > Sign in > Forgot password) | outward: Clerk sends email | 0 | 0 | C:pages/AuthPages.tsx; C:lib/clerk-appearance.ts | |
| F-AUTH-09 | API authorization contract (401 anon, 403 non-admin on every protected route) | system | n/a | none | n/a (API) | none | 0 | 0 | S:clerkAuth.ts; S:routes.ts (:296-400); S:middleware/**; SD:*.ts (guard args) | |
| F-AUTH-10 | Clerk frontend-API proxy | system | S:index.ts:155; S:middleware/clerkProxyMiddleware.ts:27 | none | 0 (automatic) | outward: proxies sign-in traffic to Clerk | 0 | 0 | S:middleware/clerkProxyMiddleware.ts; S:index.ts (:155) | |
| F-MCON-01 | Submit a resource (form, URL pre-check, draft) | member | C:pages/SubmitResource.tsx (App.tsx:915) | SD:catalog-contributions.ts:646,949 | 1 (header Submit AppHeader.tsx:108) | server emits resource_submitted to Mixpanel (consent header); creates a pending resource row | 5; C6-MB 045-049 | 2 | C:pages/SubmitResource.tsx; C:styles/pages/submit.css; SD:catalog-contributions.ts (:646,:949; handler :912 mixpanel); shared/schema.ts | |
| F-MCON-02 | Suggest an edit dialog | member | C:components/ui/suggest-edit-dialog.tsx (ResourceDetail.tsx, ResourceCard.tsx) | SD:catalog-contributions.ts:1037 | 2 (open resource, Suggest edit) | creates a pending edit row | 1; C6-PC 057 | 1 | C:components/ui/suggest-edit-dialog.tsx; SD:catalog-contributions.ts (:1037); C:pages/ResourceDetail.tsx | |
| F-MCON-03 | My contributions (list, filter, withdraw) | member | C:pages/Contributions.tsx (App.tsx:926) | SD:user-features.ts:1123,1352 | 3 (account menu > Profile > Your contributions, Profile.tsx:918); also after submit (SubmitResource.tsx:618) | withdraw writes DB | 5; C6-MB 010,041-044 | 2 | C:pages/Contributions.tsx; SD:user-features.ts (:1123,:1352) | |
| F-MCON-04 | Bookmarks library (add/remove, notes, state, bulk, list) | member | C:pages/Bookmarks.tsx; C:pages/BookmarksGate.tsx (App.tsx:927); C:components/resource/BookmarkButton.tsx, BookmarkNotesDialog.tsx; C:hooks/useResourceToggle.ts | SD:user-features.ts:161,208,222,471,490 | 2 (account menu > Bookmarks) | DB writes | 11; C6-MB 009,016,023-025,027-031; C6-PC 055 | 5 | C:pages/Bookmarks.tsx; C:pages/BookmarksGate.tsx; C:components/resource/Bookmark*.tsx; C:hooks/useResourceToggle.ts; C:lib/bookmarkRestore.ts; SD:user-features.ts (:161-222,:471,:490) | |
| F-MCON-05 | Favorites (button, profile tab) | member | C:components/resource/FavoriteButton.tsx; list C:pages/Profile.tsx (?tab=favorites) | SD:user-features.ts:114,135,149 | 1 (heart on any card) ; 3 (account menu > Profile > Favorites tab) | DB writes | 2; C6-MB 008; C6-PC 054 | 3 | C:components/resource/FavoriteButton.tsx; C:hooks/useResourceToggle.ts; SD:user-features.ts (:114-149) | |
| F-MCON-06 | Guest bookmarks (localStorage, cap 50) | visitor | C:pages/GuestBookmarks.tsx; C:hooks/useResourceToggle.ts | none | 2 (account menu > Saved resources, only after a guest save) | none (browser only) | 1; C6-PC 066 | 0 | C:pages/GuestBookmarks.tsx; C:hooks/useResourceToggle.ts; C:pages/BookmarksGate.tsx | |
| F-MCON-07 | Guest-bookmark merge on sign-in | member | C:components/auth/GuestBookmarkMerge.tsx | none | 0 (automatic after sign-in) | DB writes (bulk bookmark rows) | 2; C6-MB 001,032 | 0 | C:components/auth/GuestBookmarkMerge.tsx; SD:user-features.ts (:490) | |
| F-MCON-08 | Collections (create, rename, reorder, items, publish) | member | C:pages/Bookmarks.tsx (collections UI) | SD:user-features.ts:307,327,342,358,377,390,419,445,458 | 3 (account menu > Bookmarks > collections) | DB writes; publish makes a public link (F-MCON-09) | 7; C6-MB 017-022,026 | 9 | C:pages/Bookmarks.tsx; SD:user-features.ts (:307-458) | |
| F-MCON-09 | Public shared collection | visitor | C:pages/PublicCollection.tsx (App.tsx:922) | SD:user-features.ts:510 | no nav entry (share link only) | none | 1; C6-PC 065 | 1 | C:pages/PublicCollection.tsx; SD:user-features.ts (:510); S:og-middleware.ts (:683) | |
| F-MCON-10 | Report a broken link | member | C:components/resource/ReportLinkAction.tsx | SD:link-reports.ts:55,65 | 2 (open resource, Report broken link) | creates a link-report row (admin queue F-AOPS-07) | 1; C6-PC 058 | 2 | C:components/resource/ReportLinkAction.tsx; SD:link-reports.ts (:55,:65) | |
| F-MACC-01 | Profile (tabs, name edit, progress) | member | C:pages/Profile.tsx:173 (App.tsx:925) | SD:user-features.ts:616,723 | 2 (account menu > Profile) | DB write on name edit | 3; C6-MB 002-003,005 | 2 | C:pages/Profile.tsx; SD:user-features.ts (:616,:723) | |
| F-MACC-02 | Account deletion request and withdraw | member | C:components/profile/AccountSecurityCard.tsx | SD:user-features.ts:666,691 | 3 (account menu > Profile > Security tab) | sets a pending-deletion flag only; no job hard-deletes (admin delete calls Clerk, F-AOPS-01) | 3; C6-MB 011,014-015 | 2 | C:components/profile/AccountSecurityCard.tsx; SD:user-features.ts (:666,:691); S:lib/clerkAccountDeletion.ts | |
| F-MACC-03 | Personal API keys | member | C:components/profile/ApiKeysCard.tsx | SD:user-features.ts:532,588,600 | 3 (account menu > Profile > Security tab) | DB credential row; key shown once | 2; C6-MB 012-013 | 3 | C:components/profile/ApiKeysCard.tsx; SD:user-features.ts (:532-600); S:apiKeyUtils.ts | |
| F-MACC-04 | Settings hub, home layout, learning preferences | member (guest sees sign-in) | C:pages/Settings.tsx:88 (App.tsx:959); C:components/onboarding/learning-preferences-form.tsx | SD:user-features.ts:885,912,1071 | 2 (account menu > Settings) | DB writes | 7; C6-MB 058-063; C6-PS 045 | 3 | C:pages/Settings.tsx; C:components/onboarding/**; C:hooks/use-learning-preferences.ts; SD:user-features.ts (:885-1071); shared/onboarding-values.ts | |
| F-MACC-05 | Notifications inbox, notification preferences, digest preview | member | C:pages/Notifications.tsx (App.tsx:928); C:components/notifications/NotificationPreferencesCard.tsx | S:api/notifications.ts:65,111,116,122,131,148,166 | 2 (account menu > Notifications) | DB writes; opt-in feeds the email digest (F-JOB-02) | 7; C6-MB 050-056 | 7 | C:pages/Notifications.tsx; C:components/notifications/**; S:api/notifications.ts; S:services/digestService.ts | |
| F-MACC-06 | Digest unsubscribe page (email link, token) | visitor (token) | server HTML S:api/notifications.ts:175,189 | S:api/notifications.ts:175,189 | no nav entry (email link only) | DB write (turns digests off) | 1; C6-MB 057 | 2 | S:api/notifications.ts; S:services/digestService.ts | |
| F-MACC-07 | Onboarding (5 steps) | member | C:pages/Onboarding.tsx (App.tsx:960) | none | 1 (Home "Continue setup"/"Choose preferences", Home.tsx:343, member with onboarding open); else direct URL | DB writes | 8; C6-MB 066-073 | 0 | C:pages/Onboarding.tsx; C:components/onboarding/**; SD:user-features.ts (:912); shared/onboarding-values.ts | |
| F-MACC-08 | Journeys list | visitor, member | C:pages/Journeys.tsx (App.tsx:916) | SD:journeys-recommendations.ts:81 | 1 (sidebar "Learning Journeys" AppSidebar.tsx:801; mobile 2) | none (start is F-MACC-09) | 3; C6-MB 033; C6-PS 023-024 | 1 | C:pages/Journeys.tsx; SD:journeys-recommendations.ts (:81); S:seo-content.ts (renderJourneysContent:621); S:og-middleware.ts (:889) | |
| F-MACC-09 | Journey detail, enrol, step progress | visitor read, member write | C:pages/JourneyDetail.tsx (App.tsx:917) | SD:journeys-recommendations.ts:178,226,250,311 | 2 (Journeys, click a journey) | DB writes | 7; C6-MB 034-035; C6-PS 025-029 | 4 | C:pages/JourneyDetail.tsx; SD:journeys-recommendations.ts (:178-311); S:seo-content.ts (renderJourneyContent:638); S:og-middleware.ts (:1851) | |
| F-MACC-10 | Continue learning (page and Home preview) | member | C:pages/ContinueLearning.tsx (App.tsx:918); C:components/learning/ContinueLearningPreview.tsx:96; C:hooks/useContinueLearning.ts | SD:user-features.ts:1362,1397 | 1 (Home preview link, member with history) | none | 6; C6-MB 006,036; C6-PS 030-033 | 2 | C:pages/ContinueLearning.tsx; C:components/learning/**; C:hooks/useContinueLearning.ts; SD:user-features.ts (:1362,:1397) | |
| F-MACC-11 | Recommendations page, panel, feedback | visitor (popular), member (personalised) | C:pages/Recommendations.tsx (App.tsx:903); C:components/ui/ai-recommendations-panel.tsx; C:hooks/useAIRecommendations.ts, useRecommendationFeedback.ts | SD:journeys-recommendations.ts:672,727,850,873 | 1 (Home heading link Home.tsx:387 or "Browse recommendations" :417) | PAID for members with any activity: POST /api/recommendations -> S:ai/recommendationEngine.ts:555 -> S:ai/recommendations.ts:407 -> Anthropic (cold-start users and anonymous GET are rule-based); aiLimiter 10 per 15 min | 10; C6-MB 007,037-040; C6-PS 034-038 | 4 | C:pages/Recommendations.tsx; C:components/ui/ai-recommendations-panel.tsx; C:hooks/useAIRecommendations.ts; C:hooks/useRecommendationFeedback.ts; SD:journeys-recommendations.ts (:672-955); S:ai/recommendationEngine.ts; S:ai/recommendations.ts; S:ai/anthropicConfig.ts | |
| F-MACC-12 | Advanced tools (explorer, metrics, export, recommendations tabs) | visitor | C:pages/Advanced.tsx (App.tsx:914); C:components/ui/category-explorer.tsx, community-metrics.tsx, export-tools.tsx | none | 1 (sidebar "Advanced" AppSidebar.tsx:802) | none (client-side downloads) | 12; C6-PS 012-022,060 | 0 | C:pages/Advanced.tsx; C:components/ui/category-explorer.tsx; C:components/ui/community-metrics.tsx; C:components/ui/export-tools.tsx | |
| F-MACC-13 | Theme settings and design-system showcase | visitor, member | C:pages/ThemeSettings.tsx (App.tsx:957); C:pages/DesignSystemShowcase.tsx (App.tsx:958); C:lib/design-system.ts | none | 1 (sidebar Theme AppSidebar.tsx:803) ; 2 for /design-system (ThemeSettings.tsx:156) | none (/design-system driven by user-level awesome-ds-verify skill) | 4; C6-MB 064-065; C6-PS 043-044 | 0 | C:pages/ThemeSettings.tsx; C:pages/DesignSystemShowcase.tsx; C:lib/design-system.ts; C:lib/font-options.ts; client/public/ds/design-system.js; C:styles/** | |
| F-MACC-14 | Public read API with API key | developer | S:api/public.ts:182,299,374,427,453 | S:api/public.ts:182,299,374,427,453 | no nav entry (key + docs only) | none | 2; C6-MB 074; C6-PS 055 | 5 | S:api/public.ts; S:apiKeyUtils.ts; S:middleware/publicApiCors.ts; S:index.ts (:198) | |
| F-MACC-15 | Contact dialog (variant b) and public config | visitor | C:components/contact/*.tsx (contact-dialog, contact-footer, contact-palette-item, contact-resource-action) | SD:contact.ts:169,192 | 1 (footer, if CONTACT_ENABLED) | DB row with HMAC IP hash; purged by F-JOB-03 | 1; C6-PS 054 | 2 | C:components/contact/**; SD:contact.ts; S:public-contact.ts; S:config.ts (:159-175) | |
| F-ACUR-01 | Admin shell and tab routing | admin | C:pages/AdminDashboard.tsx:43 (App.tsx:941,950); shared/admin-tabs.ts:4-7 (18 ids; 15 strip tabs + 3 via Settings menu) | SD:admin-content.ts:171 | 1 (header Admin AppHeader.tsx:112) | none | 19; SH 001-003,013-020,036-042,044 | 1 | C:pages/AdminDashboard.tsx; shared/admin-tabs.ts; C:components/auth/AdminGuard.tsx; SD:admin-content.ts (:171) | |
| F-ACUR-02 | Overview tab and operations health panel | admin | C:components/admin/AdminOverview.tsx:322; AdminStats.tsx | SD:operations.ts:85 | 1 (default tab) | none | 16; OV 001-015; SH 021 | 1 | C:components/admin/AdminOverview.tsx; C:components/admin/AdminStats.tsx; SD:operations.ts (:85); S:ops/operationalTelemetry.ts | |
| F-ACUR-03 | Approvals queue (approve, reject, bulk) | admin | C:components/admin/PendingResources.tsx | SD:admin-content.ts:523,537,572,921,953 | 2 (Admin, Approvals tab) | writes the live catalog (public visibility) | 26; AP 001-025; SH 022 | 5 | C:components/admin/PendingResources.tsx; SD:admin-content.ts (:523-572,:921,:953); S:cache/publicCache.ts | |
| F-ACUR-04 | Edit-suggestion queue | admin | C:components/admin/PendingEdits.tsx; RecentResourceEdits.tsx | SD:admin-content.ts:1188,1211,1221,1281 | 2 (Admin, Edits tab) | approve writes the live resource | 23; ED 001-022; SH 023 | 4 | C:components/admin/PendingEdits.tsx; C:components/admin/RecentResourceEdits.tsx; SD:admin-content.ts (:1188-1281) | |
| F-ACUR-05 | Resources manager (CRUD, filter, kind, featured, bulk delete) | admin | C:components/admin/ResourceManager.tsx; GenericCrudManager.tsx | SD:admin-content.ts:649,801,843,888,983,1026,1098 | 2 (Admin, Resources tab) | writes the live catalog; invalidates public cache | 76; RM 001-074; SH 028,043 | 7 | C:components/admin/ResourceManager.tsx; C:components/admin/GenericCrudManager.tsx; SD:admin-content.ts (:649-1098); S:cache/publicCache.ts; S:db/index.ts | |
| F-ACUR-06 | Categories manager | admin | C:components/admin/CategoryManager.tsx; configs/category-config.ts | SD:admin-content.ts:1408,1435,1471,1513 | 2 (Admin, Categories tab) | writes live navigation | 24; CAT 001-023; SH 029 | 4 | C:components/admin/CategoryManager.tsx; C:components/admin/configs/category-config.ts; SD:admin-content.ts (:1408-1513) | |
| F-ACUR-07 | Subcategories manager | admin | C:components/admin/SubcategoryManager.tsx | SD:admin-content.ts:1557,1580,1638,1703 | 2 (Admin, Subcategories tab) | writes live navigation | 26; SC 001-025; SH 030 | 4 | C:components/admin/SubcategoryManager.tsx; C:components/admin/configs/subcategory-config.ts; SD:admin-content.ts (:1557-1703) | |
| F-ACUR-08 | Sub-subcategories manager | admin | C:components/admin/SubSubcategoryManager.tsx (inside subcategories tab, id subsubcategories) | SD:admin-content.ts:1747,1767,1823,1872 | 3 (Admin, Settings menu, Sub-Subcats AdminDashboard.tsx:413) | writes live navigation | 26; SSC 001-026 | 4 | C:components/admin/SubSubcategoryManager.tsx; C:components/admin/configs/subsubcategory-config.ts; SD:admin-content.ts (:1747-1872) | |
| F-ACUR-09 | AI URL analyser (admin only) | admin | C:components/ui/suggest-edit-dialog.tsx:375 (button shown only when isAdminUser, :781) | SD:admin-content.ts:1321 | 3 (open resource, Suggest edit, Analyze with AI; plus confirm) | PAID: one Anthropic call per click (claudeService.analyzeURL) | 0 | 1 | C:components/ui/suggest-edit-dialog.tsx; SD:admin-content.ts (:1321); S:ai/claudeService.ts; S:ai/anthropicConfig.ts | |
| F-AOPS-01 | Users tab (list, export, rename, role, delete) | admin | C:components/admin/UsersTab.tsx | SD:admin-content.ts:200,242,298,335,376 | 2 (Admin, Users tab) | role change and delete are privileged; delete calls Clerk (S:lib/clerkAccountDeletion.ts) | 26; SH 031; US 001-025 | 5 | C:components/admin/UsersTab.tsx; SD:admin-content.ts (:200-421); S:lib/clerkAccountDeletion.ts; S:lib/clerkAccountLink.ts | |
| F-AOPS-02 | Audit log tab | admin | C:components/admin/AuditTab.tsx:549 | SD:admin-content.ts:445 | 2 (Admin, Audit tab) | none | 18; AU 001-017; SH 034 | 1 | C:components/admin/AuditTab.tsx; SD:admin-content.ts (:445) | |
| F-AOPS-13 | Contact submissions inbox | admin | C:components/admin/ContactSubmissions.tsx (rendered at AuditTab.tsx:549 behind "Tools") | SD:contact.ts:231 | 3 (Admin, Audit tab, Tools) | shows visitor PII (masked reply-to) | 10; AU 018-027 | 1 | C:components/admin/ContactSubmissions.tsx; SD:contact.ts (:231) | |
| F-AOPS-03 | Export tab (JSON, CSV, OPML, markdown) | admin | C:components/admin/ExportTab.tsx | SD:export-link-health.ts:649,696,737,826 | 2 (Admin, Export tab) | read-only downloads; POST /api/admin/export builds markdown only (audit row, no GitHub push, export-link-health.ts:649-695) | 10; EX 012-020; SH 026 | 4 | C:components/admin/ExportTab.tsx; SD:export-link-health.ts (:649-826); S:github/formatter.ts | |
| F-AOPS-04 | Database backups panel (list, create) | admin | C:components/admin/DatabaseBackupPanel.tsx (rendered at ExportTab.tsx:866) | SD:export-link-health.ts:1033,1056 | 2 (Admin, Export tab) | pg_dump to private storage; scheduled copy is F-JOB-04 | 3; EX 025-027 | 2 | C:components/admin/DatabaseBackupPanel.tsx; SD:export-link-health.ts (:1033,:1056); S:backup/databaseBackup.ts; S:backup/scheduledBackup.ts | |
| F-AOPS-05 | Database tab (stats, seed, clear and re-seed) | admin | C:components/admin/DatabaseTab.tsx | SD:export-link-health.ts:1254 | 2 (Admin, Database tab) | DESTRUCTIVE with clearExisting; fetches the source GitHub list (third-party) | 15; DB 001-014; SH 027 | 1 | C:components/admin/DatabaseTab.tsx; SD:export-link-health.ts (:1254); S:seed.ts | |
| F-AOPS-06 | Link health dashboard, scan runs, legacy validate/check-links | admin | C:components/admin/LinkHealthDashboard.tsx; LinkHealthTrendChart.tsx; validation controls in ExportTab.tsx | SD:export-link-health.ts:1083,1135,1153,1173,1185,1202,1225,1237 | 2 (Admin, Link Health tab) | outward: HTTP to every resource URL; a completed scan auto-applies remediation in prod (F-AOPS-07) | 39; EX 001-011,021-024; LH 001-014,023-030,032; SH 033 | 8 | C:components/admin/LinkHealthDashboard.tsx; C:components/admin/LinkHealthTrendChart.tsx; SD:export-link-health.ts (:1083-1237); S:services/linkHealthService.ts | |
| F-AOPS-07 | Link remediation plan/apply/ignore and reader link reports | admin | C:components/admin/LinkRemediationPanel.tsx:496; LinkReportsPanel.tsx:498 (inside Link Health tab) | SD:link-remediation.ts:72,80,92; SD:link-reports.ts:103,136 | 2 (Admin, Link Health tab) | archives, restores or rewrites URLs on live resources; breaker refuses over 2 percent of catalog | 9; LH 015-022,031 | 5 | C:components/admin/LinkRemediationPanel.tsx; C:components/admin/LinkReportsPanel.tsx; SD:link-remediation.ts; SD:link-reports.ts; S:services/linkRemediation.ts | |
| F-AOPS-08 | Admin logs and usage APIs (no UI) | admin (agent/API) | none (no client caller) | SD:admin-logs.ts:140; SD:admin-usage.ts:163 | no nav entry (API only) | none | 0 | 2 | SD:admin-logs.ts; SD:admin-usage.ts; S:lib/logSinkStorage.ts | |
| F-AOPS-09 | Digests tab (queue health) | admin | C:components/admin/DigestQueueHealth.tsx | S:api/notifications.ts:198 | 3 (Admin, Settings menu, Digests AdminDashboard.tsx:415) | none | 7; DG 001-007 | 1 | C:components/admin/DigestQueueHealth.tsx; S:api/notifications.ts (:198) | |
| F-AOPS-10 | GitHub sync tab (import, export, status, history, dry-run preview) | admin | C:components/admin/GitHubSyncPanel.tsx:386; GitHubImportPreview.tsx | SD:export-link-health.ts:212,295,432,520,1302 | 2 (Admin, GitHub tab) | outward: Octokit import/export; export COMMITS to the list repo (GITHUB token) | 24; GH 001-023; SH 032 | 5 | C:components/admin/GitHubSyncPanel.tsx; C:components/admin/GitHubImportPreview.tsx; SD:export-link-health.ts (:184-628,:1302); S:github/** | |
| F-AOPS-11 | QA row cleanup (agent tool, no UI) | admin (agent) | none | SD:qa-cleanup.ts:165,209 | no nav entry (API only; scripts/prod-check/checks/tier2.ts calls it) | deletes QA rows | 0 | 2 | SD:qa-cleanup.ts; scripts/prod-check/checks/tier2.ts | |
| F-ARES-01 | Researcher tab: brief, config, launch | admin | C:components/admin/ResearcherTab.tsx; ResearchLaunchGuide.tsx; ResearchRunConfigSummary.tsx; C:hooks/useResearcherConfig.ts | SD:ai-jobs.ts:340,510,540 | 2 (Admin, Researcher tab) | PAID: multi-turn agent run via @anthropic-ai/claude-agent-sdk (ai/researchService.ts, runAgentQuery.ts) plus web fetches | 25; RS 001-024; SH 025 | 3 | C:components/admin/ResearcherTab.tsx; C:components/admin/ResearchLaunchGuide.tsx; SD:ai-jobs.ts (:340-540); S:ai/researchService.ts; S:ai/runAgentQuery.ts; S:ai/researchRunConfig.ts; S:ai/webResearch.ts | |
| F-ARES-02 | Research runs: list, view, events, cancel | admin | C:components/admin/ResearchRunView.tsx; ResearchPhaseTimeline.tsx; AgentEventLog.tsx; AgentCommsGraph.tsx; CancelResearchRunDialog.tsx | SD:ai-jobs.ts:551,576,587,604 | 3 (Admin, Researcher tab, a run) | cancel stops a paid run | 19; RS 025-035,042-046,051-053 | 4 | C:components/admin/ResearchRunView.tsx; C:components/admin/ResearchPhaseTimeline.tsx; C:components/admin/AgentEventLog.tsx; SD:ai-jobs.ts (:551-604) | |
| F-ARES-03 | Research discoveries review (approve, reject, approve all) | admin | C:components/admin/ResearchRunDiscoveries.tsx; useDiscoveryReview.tsx | SD:ai-jobs.ts:621,637,657,681 | 3 (Admin, Researcher tab, discoveries) | approve inserts live resources | 10; RS 036-041,047-050 | 4 | C:components/admin/ResearchRunDiscoveries.tsx; C:components/admin/useDiscoveryReview.tsx; SD:ai-jobs.ts (:621-681); S:ai/researchDedup.ts | |
| F-ARES-04 | Research workspace tab | admin | C:components/admin/ResearchWorkspace.tsx (195 lines) | none | 2 (Admin, Research tab) | none | 10; RW 001-009; SH 035 | 0 | C:components/admin/ResearchWorkspace.tsx | |
| F-ARES-05 | Batch enrichment tab (start, jobs, events, cancel, coverage) | admin | C:components/admin/BatchEnrichmentPanel.tsx:1246 | SD:ai-jobs.ts:76,133,162,196,213; SD:export-link-health.ts:1378 | 2 (Admin, Enrichment tab) | PAID: Anthropic calls per resource (ai/enrichmentService.ts) plus URL scraping; writes resource metadata | 32; EN 001-031; SH 024 | 6 | C:components/admin/BatchEnrichmentPanel.tsx; SD:ai-jobs.ts (:76-213); SD:export-link-health.ts (:1378); S:ai/enrichmentService.ts; S:ai/urlScraper.ts | |
| F-ARES-06 | Admin journeys and steps manager | admin | C:components/admin/JourneyStepsManager.tsx | SD:journeys-recommendations.ts:339,368,394,413,461,513,547 | 3 (Admin, Settings menu, Journeys AdminDashboard.tsx:414) | writes live journeys | 29; JN 001-029 | 7 | C:components/admin/JourneyStepsManager.tsx; SD:journeys-recommendations.ts (:339-547) | |
| F-JOB-01 | Link health scheduler and auto-remediation after scan | system | S:jobs/linkHealthScheduler.ts:20-44 (60 s after boot, tick 10 min, scan if last older than LINK_HEALTH_INTERVAL_HOURS, prod 24); S:services/linkHealthService.ts | none | n/a | outward HTTP to every resource URL; LINK_HEALTH_REMEDIATION=apply rewrites live rows | 0 | 0 | S:jobs/linkHealthScheduler.ts; S:services/linkHealthService.ts; S:services/linkRemediation.ts; S:index.ts (:773) | |
| F-JOB-02 | Digest scheduler and email send | system | S:jobs/digestScheduler.ts:37-49 (hourly, limit 20); S:services/digestService.ts:1196; S:email.ts:121 | none | n/a | EMAIL: sendTransactionalEmail via @replit/connectors-sdk to opted-in users | 0 | 0 | S:jobs/digestScheduler.ts; S:services/digestService.ts; S:email.ts | |
| F-JOB-03 | Contact retention purge | system | S:jobs/contactRetentionScheduler.ts:48-52 (30 s after boot, hourly; batch 500, max 20) | none | n/a | deletes contact rows older than retention_days (180) | 0 | 0 | S:jobs/contactRetentionScheduler.ts; S:config.ts (:159-175); S:repositories/** | |
| F-JOB-04 | Scheduled DB backup with advisory lock and pruning | system | S:jobs/backupScheduler.ts:30-34 (2 min after boot, every 30 min); S:backup/scheduledBackup.ts:112 (due after 24 h) | none | n/a | pg_dump to private storage; prune old backups | 0 | 0 | S:jobs/backupScheduler.ts; S:backup/scheduledBackup.ts; S:backup/databaseBackup.ts; S:backup/databaseBackup.ts | |
| F-JOB-05 | External cron endpoint run-due-jobs | system | SD:ops-cron.ts:129 (Bearer OPS_CRON_TOKEN; 503 while unset in prod, logs lane F-LOGS-2) | SD:ops-cron.ts:129 | n/a | triggers F-JOB-01..04 work from outside | 0 | 1 | SD:ops-cron.ts; S:clerkAuth.ts (secretsMatch) | |
| F-JOB-06 | Orphan job watchdog (enrichment, research, GitHub sync) | system | S:jobs/orphanJobWatchdog.ts:156,186,243 (startup sweep, 60 s periodic, 5 min threshold) | none | n/a | marks stuck jobs failed | 0 | 0 | S:jobs/orphanJobWatchdog.ts; S:routes.ts (:419-430) | |
| F-JOB-07 | Boot sequence: migrations, auto-seed, kind backfill, SSR prewarm | system | S:index.ts (runMigrations in prod, prewarmSSRRenderer:731); S:migrate.ts; S:routes.ts:419+ | none | n/a | schema writes; auto-seed only when DB empty | 0 | 0 | S:migrate.ts; S:routes.ts; S:index.ts; S:seed.ts; migrations/** | |
| F-XCUT-01 | Cross-cutting UX/a11y sweeps (keyboard, reduced motion, targets, contrast, offline, real touch) | all | pseudo-function: re-drives every page | none | n/a | none | 27; C6-AX 001-019; C6-MB 075-079; C6-PS 057-059 | 0 | tier follows the pages swept; guards: C:index.css; C:styles/**; C:components/ui/** | |

## 1.1 Surface registries (SSR templates, DOC counters, admin tabs, background jobs, public API)

### 1.1.1 SSR and meta templates (which code renders what for a crawler or first paint)

Only `/` is server-rendered into React markup (`S:ssr.ts:360` `handleSSR`; it falls through to the SPA shell when the request has a `__session*` or `av_admin_session` cookie or any query other than a valid `?layout=`). Every other page gets the SPA shell with per-route head tags, JSON-LD and crawler-readable body content injected by `ogInjectionMiddleware` (`S:og-middleware.ts:2151`, mounted `S:index.ts:645`; `handleSSR` mounted `:657`, production only, `renderHome` in `C:entry-server.tsx:20`).

| path pattern | meta resolver (`S:og-middleware.ts`) | body renderer (`S:seo-content.ts`) | function |
|---|---|---|---|
| `/` | :650 | renderHomeContent :349; React SSR via `S:home-ssr-data.ts:41` | F-DISC-01 |
| `/categories` | :1189 | renderCategoriesContent :501 | F-DISC-02 |
| `/category/:slug` | :1243 | renderTaxonomyContent :366 | F-DISC-03 |
| `/subcategory/:slug` | :1457 | renderTaxonomyContent :366 | F-DISC-04 |
| `/sub-subcategory/:slug` | :1541 (alias `-scN` rewrite :2477-2501, `/subsubcategory/` :2464) | renderTaxonomyContent :366 | F-DISC-05 |
| `/tag/:slug` | :1334 | renderTaxonomyContent :366 | F-DISC-06 |
| `/resource/:id` | :1627 | renderResourceContent :520, renderResourceBoot :613 | F-DISC-07 |
| `/search` | :1134 | renderSearchContent :443 | F-SRCH-02 |
| `/journeys`, `/journey/:id` | :889, :1851 | renderJourneysContent :621, renderJourneyContent :638 | F-MACC-08, F-MACC-09 |
| `/collection/:shareId` | :683 | none | F-MCON-09 |
| `/about`, `/advanced`, `/submit` | :941 | renderStaticPageContent :708 | F-DISC-08, F-MACC-12, F-MCON-01 |
| other entries of `staticPageHeads` (terms, privacy, code-of-conduct, settings, profile ...) | :1096 | renderStaticPageContent :708 | F-DISC-09 and the member pages |
| `/sign-in`, `/sign-up`, `/sign-in/*` | :1099, :878 (noindex) | none | F-AUTH-01/02 |
| `/admin`, `/admin/:section` | :874 (noindex; same ids as `shared/admin-tabs.ts`) | none | F-ACUR-01 |
| unknown path | notFoundMeta :380 (HTTP 404) | none | F-RESIL-01 |
| canonical and legacy redirects (case, `-scN`, bare prefixes, tag aliases, nested `/category/a/b`) | :2222-2540 | n/a | F-DISC-11 |
| `/sitemap.xml`, `/og-image.svg|png`, `/security.txt`, `/.well-known/security.txt` | `S:routes/non-api.ts:700,701,702,689,687` | n/a | F-DISC-12 |
| `/robots.txt`, `/llms.txt` | static files `client/public/` (no route) | n/a | F-DISC-12 |

### 1.1.2 First-party DOC counters (`documentTemplate`, `S:ops/operationalTelemetry.ts:206`; recorded at `S:index.ts:562`)

Label `DOC:<template>:<human|bot-search|bot-ai|bot-other>:<Nxx>`. Templates map to functions as follows; every page not listed collapses into `other`, which is why `other` is not a usable per-page number.

| template | matches | function |
|---|---|---|
| home | `/` | F-DISC-01 |
| category / subcategory / subsubcategory | `/category/`, `/subcategory/`, `/sub-subcategory/` prefixes | F-DISC-03 / 04 / 05 |
| resource | `/resource/` | F-DISC-07 |
| search | `/search` | F-SRCH-02 |
| tag | `/tag/` | F-DISC-06 |
| journey / journeys | `/journey/`, `/journeys` | F-MACC-09 / 08 |
| collection | `/collection/` | F-MCON-09 |
| other | everything else (`/categories`, about, terms, privacy, advanced, submit, recommendations, continue-learning, profile, settings, sign-in, admin, 404s, `/sitemap.xml`) | F-DISC-02, 08, 09, F-MACC-*, F-AUTH-*, F-ACUR-01, F-RESIL-01, F-DISC-12 |

Gap for tiering: `/categories` and `/submit` have no template of their own. A 3-line addition to `DOC_TEMPLATE_PREFIXES` would separate them (not done; this lane writes nothing else).

### 1.1.3 Admin tab registry (`shared/admin-tabs.ts:4-7`, 18 ids; render map `C:pages/AdminDashboard.tsx:495-579`; strip `CANONICAL_TABS` :44-52 has 15)

Aliases (`shared/admin-tabs.ts:15-20`): `link-health` -> linkhealth, `sub-subcategories` and `sub-subcats` -> subsubcategories, `github-sync` -> github. Deep links: `/admin/:section`, `#tab`, `?tab=`. The SSR middleware accepts the same 18 ids (`og-middleware.ts:874`).

| tab id | where in the UI | component | functions | clicks from Home |
|---|---|---|---|---|
| overview | strip (default) | AdminOverview, AdminStats | F-ACUR-02 | 1 |
| approvals | strip | PendingResources | F-ACUR-03 | 2 |
| edits | strip | PendingEdits, RecentResourceEdits | F-ACUR-04 | 2 |
| enrichment | strip | BatchEnrichmentPanel | F-ARES-05 | 2 |
| researcher | strip | ResearcherTab (+ ResearchRunView, discoveries) | F-ARES-01/02/03 | 2 (runs 3) |
| export | strip | ExportTab (+ DatabaseBackupPanel :866, validation controls) | F-AOPS-03, F-AOPS-04, F-AOPS-06 | 2 |
| database | strip | DatabaseTab | F-AOPS-05 | 2 |
| resources | strip | ResourceManager | F-ACUR-05 | 2 |
| categories | strip | CategoryManager | F-ACUR-06 | 2 |
| subcategories | strip | SubcategoryManager | F-ACUR-07 | 2 |
| subsubcategories | Settings menu "Sub-Subcats" (:413); highlights Subcategories | SubSubcategoryManager | F-ACUR-08 | 3 |
| journeys | Settings menu "Journeys" (:414); no strip tab selected | JourneyStepsManager | F-ARES-06 | 3 |
| users | strip | UsersTab | F-AOPS-01 | 2 |
| github | strip | GitHubSyncPanel, GitHubImportPreview | F-AOPS-10 | 2 |
| linkhealth | strip | LinkHealthDashboard (+ LinkRemediationPanel :496, LinkReportsPanel :498, LinkHealthTrendChart) | F-AOPS-06, F-AOPS-07 | 2 |
| digests | Settings menu "Digests" (:415); no strip tab selected | DigestQueueHealth | F-AOPS-09 | 3 |
| audit | strip | AuditTab (+ ContactSubmissions behind "Tools", :549) | F-AOPS-02, F-AOPS-13 (3) | 2 |
| research | strip | ResearchWorkspace | F-ARES-04 | 2 |

No admin tab calls `/api/admin/logs`, `/api/admin/usage`, `/api/admin/qa-rows` (no UI, F-AOPS-08/11).

### 1.1.4 Background jobs (all started at `S:index.ts:766-777` after `server.listen`, skipped when `DISABLE_BACKGROUND_JOBS=1`)

| job | function | start and cadence | work | lock or guard | outward | flag |
|---|---|---|---|---|---|---|
| link health | F-JOB-01 | first tick 60 s after boot (`linkHealthScheduler.ts:43`), then every 10 min (`:44`); scan starts only if the last one is older than the interval (`linkHealthService.ts:158`) | scan all resource URLs; completion triggers remediation (`linkHealthService.ts:386`, `linkRemediation.ts:64`) | `pg_advisory_xact_lock(5116, 7)` (`linkHealthService.ts:185,343,409`) | HTTP to every resource URL; rewrites or archives live rows | `LINK_HEALTH_INTERVAL_HOURS` (24 in prod; 0 = off), `LINK_HEALTH_REMEDIATION=apply` (prod) |
| digest | F-JOB-02 | 15 s after boot, hourly (`digestScheduler.ts:37-49`); `runDigestCycle` = recover stale, enqueue due, dispatch up to 20, clean retention (`digestService.ts:1191-1206`) | per-user digest jobs and in-app notifications | claim by workerId | email via `sendTransactionalEmail` (`email.ts:121`, Replit connectors) | none; opt-in per user |
| contact retention | F-JOB-03 | 30 s after boot, hourly (`contactRetentionScheduler.ts:50-52`) | delete submissions older than `retention_days` (180), 500 per batch, 20 batches max | none | none | `CONTACT_ENABLED`, config `retention_days` |
| scheduled backup | F-JOB-04 | 2 min after boot, every 30 min (`backupScheduler.ts:7-8,32-34`); acts when the newest backup is older than 24 h (`scheduledBackup.ts:28`) | `pg_dump`, keep 14 days and never fewer than the newest 3 (`:29-30,37-41`) | `pg_try_advisory_lock(5117, 1)` on its own connection (`:27,112-130`); skips when backup storage is not configured | writes to private object storage | none |
| external cron | F-JOB-05 | called from outside every ~15 min by design (`ops-cron.ts:129`) | link scan if due, digest cycle, contact purge, scheduled backup | Bearer `OPS_CRON_TOKEN`, 503 while unset (unset in prod today) | triggers the above | `OPS_CRON_TOKEN` |
| orphan watchdog | F-JOB-06 | once at boot, then every 60 s (`orphanJobWatchdog.ts:187,243`; started by `routes.ts:430` `runBackgroundInitialization`) | fail enrichment, research and GitHub-sync jobs stuck over 5 min; stale pending over 7 days | none | none | skipped with `DISABLE_BACKGROUND_JOBS` |
| boot | F-JOB-07 | at start: `runMigrations` in prod (`index.ts`), `prewarmSSRRenderer` (`:731`), then auto-seed when categories and resources are both 0, kind backfill (`routes.ts:419+`) | schema, seed, backfill | process exits if migrations fail | seed fetches the source list | none |

Not scheduled (admin-triggered only): enrichment (F-ARES-05), researcher (F-ARES-01), GitHub import/export (F-AOPS-10), seed (F-AOPS-05). The 11-06 note "GitHub sync last ran 2026-07-20" is consistent with that: nothing starts it automatically. There is no retention job for notifications other than the digest cycle cleanup.

### 1.1.5 Public API (`S:api/public.ts`)

`GET /api/public/resources` :182, `/resources/:id` :299, `/categories` :374, `/tags` :427, `/me` :453 (requires a key). CORS `publicApiCors` (`S:index.ts:198`), optional key tier for anonymous callers, own limiter. Keys come from F-MACC-03; consumption row is C6-MB-074. None of the five has a client caller; the contract is external. `GET /api/public/collections/:shareId` (`user-features.ts:510`) is a different, UI-backed route owned by F-MCON-09.

## 2. Retire: no live function

### 2.1 Inventory rows (1 of 760)

| row | what it tests | why no live function |
|---|---|---|
| C6-MB-081 | "Member API aliases/compatibility": canonical and legacy contribution/bookmark/recommendation routes (`/api/submit`, `/api/user/submissions`, `/api/user/submissions/:id`, `/api/recommendations/feedback`, `/api/interactions`) | 4 of its 5 routes are in the retire list below; the 5th (`/api/interactions`) is live and is already covered by F-TEL-06 and the F-DISC-07 view write. No user surface calls the others. |

No other row maps to a removed feature. Rows that look retire-worthy for **usage** reasons (edit queue ED-01..22, contact inbox AU-18..27, visitor link reports LH-15..22/31, 259 rows in `stop-validating.md`) still test live code, so they stay mapped to F-ACUR-04, F-AOPS-13 and F-AOPS-07; retiring them is a tiering decision, not a dead-code finding.

### 2.2 HTTP contracts (23 of 210)

| # | contract | file:line | evidence it has no live function |
|---|---|---|---|
| 1 | POST /api/admin/users/:id/link-clerk | SD:admin-content.ts:421 | no caller in client/src or scripts; JIT-reconcile admin tool (admin-content.ts:415 comment) |
| 2 | POST /api/admin/resources/:id(\\d+)/unapprove | SD:admin-content.ts:616 | no caller in client/src; only docs/API.md |
| 3 | POST /api/admin/enrichment/backfill-suggestions | SD:ai-jobs.ts:253 | no caller anywhere (client, scripts, docs) |
| 4 | GET /api/auth/me | SD:auth-user.ts:110 | deprecated alias of /api/auth/user (Deprecation header); only docs/API.md |
| 5 | GET /api/auth/status | SD:auth-user.ts:191 | no client caller; only docs/API.md |
| 6 | GET /api/resource/:id(\\d+) | SD:catalog-contributions.ts:719 | singular alias of GET /api/resources/:id; no caller |
| 7 | POST /api/submit | SD:catalog-contributions.ts:950 | alias of POST /api/resources (same handler, catalog-contributions.ts:949-950); client posts /api/resources (SubmitResource.tsx:470) |
| 8 | GET /api/resources/pending | SD:catalog-contributions.ts:953 | legacy; admin UI uses /api/admin/pending-resources; no caller |
| 9 | PUT /api/resources/:id/approve | SD:catalog-contributions.ts:972 | legacy duplicate of POST /api/admin/resources/:id/approve; no caller |
| 10 | PUT /api/resources/:id/reject | SD:catalog-contributions.ts:1008 | legacy duplicate of POST /api/admin/resources/:id/reject; no caller |
| 11 | POST /api/github/configure | SD:export-link-health.ts:184 | no caller (GitHubSyncPanel does not call it); docs/API.md only |
| 12 | GET /api/github/sync-status/:id | SD:export-link-health.ts:502 | no caller (panel uses sync-status and sync-history) |
| 13 | POST /api/github/process-queue | SD:export-link-health.ts:628 | no caller; docs/API.md only |
| 14 | POST /api/admin/maintenance/backfill-approved-at | SD:export-link-health.ts:1410 | one-off; no caller (only archived scripts per 11-06 inventory) |
| 15 | POST /api/admin/maintenance/canonicalize-tags | SD:export-link-health.ts:1450 | one-off; no caller |
| 16 | GET /api/github/awesome-lists | SD:export-link-health.ts:1905 | no caller; docs/API.md only |
| 17 | GET /api/github/search | SD:export-link-health.ts:1922 | no caller; docs/API.md only |
| 18 | GET /api/recommendations/init | SD:journeys-recommendations.ts:644 | no caller anywhere |
| 19 | POST /api/recommendations/feedback | SD:journeys-recommendations.ts:788 | client uses GET /api/recommendations/feedback and PUT /:resourceId/feedback (useRecommendationFeedback.ts:93,153); no POST caller |
| 20 | POST /api/recommendations/:resourceId/feedback | SD:journeys-recommendations.ts:911 | same: client sends PUT only; POST duplicate |
| 21 | GET /api/link-health/summary | SD:link-remediation.ts:62 | public, no UI caller; only README.md mentions it. Keep if an external badge uses it (owner call) |
| 22 | GET /api/user/submissions | SD:user-features.ts:1219 | superseded by /api/user/contributions (Contributions.tsx:463); only docs/API.md |
| 23 | DELETE /api/user/submissions/:id | SD:user-features.ts:1357 | superseded by POST .../contributions/:kind/:id/withdraw; no caller |

Counted as live although no UI calls them (external-by-design or agent tooling, not retire): `/api/public/*` x5 (F-MACC-14), `/api/health/live`, `/health/ready`, `/api/openapi.json`, `/api/docs`, `/api/version` (F-RESIL-06), `GET/POST /unsubscribe/digest/:token` (email link), `POST /api/ops/run-due-jobs` (external cron), `/api/admin/qa-rows` x2 (scripts/prod-check), `/api/admin/logs`, `/api/admin/usage` (ops agents). Caveat: the path-head string scan misses a caller that builds the path from a variable; the 23 were also checked against `scripts/`, `docs/API.md` and README.

### 2.3 Dead server modules (no function; not a contract, not a row)

Import-graph scan of `server/**` and `shared/**` (relative and `@shared/` imports, plus string search over `scripts/`, `package.json`, `.replit`, `client/src`): modules with **no importer and no script reference**.

| file | lines | note |
|---|---|---|
| `server/recommendation-engine.ts` | 502 | the rule-based engine the 11-06 correction cited; unused. Live engine is `server/ai/recommendationEngine.ts` |
| `server/ai/embeddingService.ts` | 387 | only user of the `openai` package |
| `server/ai/tagging.ts` | 119 | calls `createStructuredMessage`; no caller |
| `server/ai/test-blurhash.ts` | 48 | ad-hoc script inside `server/` |
| `server/awesome-video-parser-clean.ts` | 449 | no importer; `scripts/build-static.ts:11` imports a different, missing `../server/awesome-video-parser` |
| `server/passwordUtils.ts` | 89 | not imported by `auth-user.ts`; owner login uses `clerkAuth.ts` helpers |
| `server/ssr-dev.ts` | 64 | dev entry is `server/vite-dev.ts` (index.ts:653) |
| `server/repositories/{AuditLogRepository,FavoriteRepository,SubcategoryRepository,SubSubcategoryRepository}.ts` | 213/156/240/227 | classes with no importer (routes use `storage`/other repositories) |
| `server/cli/{parse-list,seedJourneys,seedJourneyStepsForExisting}.ts` | 176/511/368 | manual CLIs (not wired to package.json scripts); `seedJourneys` calls Claude (`claudeService`) |

### 2.4 Live functions with no nav path from Home (direct URL, email link, API or automatic only)

F-DISC-11 (redirects), F-RESIL-01 (404), F-RESIL-06/07 (health, docs, API fallbacks), F-AUTH-03 (owner password, except the "Admin login" link on a signed-out `/admin`), F-AUTH-06/07 (guards, legacy auth URLs), F-MCON-09 (public collection, share link), F-MACC-06 (unsubscribe, email link), F-MACC-14 (public API), F-AOPS-08/11 (agent APIs), F-JOB-01..07 and F-OBS-01 (automatic), F-AUTH-10 (proxy). `/design-system` (F-MACC-13) is 2 clicks via Theme > link, but is not in the header, sidebar or footer. `/advanced` is in the sidebar "More" list only (`AppSidebar.tsx:802`), so the 11-06 "no nav entry" note for it is out of date (it is 1 click on desktop, 2 on mobile).

### 2.5 Functions with 0 inventory rows (coverage gap for the lead's tiering)

| id | function | contracts |
|---|---|---|
| F-DISC-04 | Subcategory page | 0 |
| F-DISC-05 | Sub-subcategory page | 0 |
| F-DISC-14 | Catalog read APIs (system function behind every listing) | 9 |
| F-SRCH-07 | Search backend and hostile-input handling (markup scrub, overlong, rate limit) | 1 |
| F-RESIL-02 | Offline state | 0 |
| F-RESIL-04 | Error cards and Retry (StatePanel, ErrorPage, ErrorBoundary) | 0 |
| F-RESIL-05 | Slow-network fallback (skeletons, RouteFallback, SSR hold) | 0 |
| F-RESIL-07 | API fallbacks: 405 stubs, unknown /api 404, backstop limiter | 1 |
| F-TEL-02 | Vendor events after consent (GA4, Mixpanel, PostHog, Amplitude) | 0 |
| F-TEL-03 | Replit/Umami cookieless page views | 0 |
| F-TEL-04 | Admin and QA suppression of analytics | 0 |
| F-TEL-05 | Web vitals, api_performance and error events (client) | 0 |
| F-TEL-06 | Server-recorded interactions (view rows that feed recommendations) | 1 |
| F-OBS-01 | First-party operational telemetry, request logging, log sinks | 0 |
| F-AUTH-07 | Legacy auth redirects keeping validated ?next= | 0 |
| F-AUTH-08 | Password reset (Clerk flow from sign-in) | 0 |
| F-AUTH-09 | API authorization contract (401 anon, 403 non-admin on every protected route) | 0 |
| F-AUTH-10 | Clerk frontend-API proxy | 0 |
| F-ACUR-09 | AI URL analyser (admin only) | 1 |
| F-AOPS-08 | Admin logs and usage APIs (no UI) | 2 |
| F-AOPS-11 | QA row cleanup (agent tool, no UI) | 2 |
| F-JOB-01 | Link health scheduler and auto-remediation after scan | 0 |
| F-JOB-02 | Digest scheduler and email send | 0 |
| F-JOB-03 | Contact retention purge | 0 |
| F-JOB-04 | Scheduled DB backup with advisory lock and pruning | 0 |
| F-JOB-05 | External cron endpoint run-due-jobs | 1 |
| F-JOB-06 | Orphan job watchdog (enrichment, research, GitHub sync) | 0 |
| F-JOB-07 | Boot sequence: migrations, auto-seed, kind backfill, SSR prewarm | 0 |

Reading: the 760-row inventory is a UI interaction list. It has no rows for the background jobs (F-JOB-*), the SSR-only paths, telemetry/analytics vendors (F-TEL-02..05), the Clerk proxy, the admin AI analyser (F-ACUR-09), the ops/agent APIs, and the shared template functions F-DISC-04/05 (their rows sit under the shared taxonomy template F-DISC-03). Their validation must come from the 210 contracts, Tier 1 checks or code-change triggers, not from rows.

## 3. Dependency versions (from `package-lock.json`; declared range from `package.json` where it differs)

| package | locked | used by / note |
|---|---|---|
| react, react-dom | 18.3.1 | client (F-DISC-*); `@types/react` 18.3.31 |
| vite | 7.3.7 | build and dev server (`server/vite-dev.ts`); `@vitejs/plugin-react` 4.7.0; tailwindcss 4.3.3 |
| express | 4.22.3 (declared ^4.21.2) | server; `express-rate-limit` 8.7.1 |
| drizzle-orm / drizzle-kit | 0.45.4 / 0.31.11 | all DB access; migrations via `server/migrate.ts` |
| pg | 8.20.0 (pinned) | pool (`server/db/index.ts`), rate-limit store, backup lock and restore |
| @neondatabase/serverless, ws | 0.10.4, 8.22.0 | declared; **no import found** in `server/`, `client/src/`, `shared/`, `scripts/` (memory says the Neon endpoint is dead) |
| @clerk/react | 6.18.1 | client auth (F-AUTH-01/02) |
| @clerk/express, @clerk/backend, @clerk/shared, @clerk/themes | 2.1.83, 3.26.2, 4.41.1, 2.4.57 | server session verification, proxy, appearance |
| posthog-js | 1.438.21 | client analytics (F-TEL-02); no `posthog-node` |
| mixpanel-browser | 2.84.0 | client analytics; server Mixpanel events are plain HTTP (`server/lib/mixpanelServer.ts`), no package |
| @amplitude/analytics-browser | 2.48.1 | client analytics; also locked: session-replay-browser 1.51.5, unified 1.1.43, plugin-autocapture-browser 1.30.4, plugin-page-view-tracking-browser 2.11.24, plugin-web-vitals-browser 1.2.7, plugin-network-capture-browser 1.10.24 |
| Google Analytics (gtag) | no npm package | `gtag.js` injected by `client/src/lib/analytics.ts:1-30`; `VITE_GA_MEASUREMENT_ID` is unset in `.replit` |
| @anthropic-ai/sdk | 1.3.0 | `server/ai/anthropicConfig.ts`, `claudeService.ts`, `recommendations.ts`, `tagging.ts` (F-MACC-11, F-ACUR-09) |
| @anthropic-ai/claude-agent-sdk | 0.3.310 | `server/ai/runAgentQuery.ts` for enrichment and researcher (F-ARES-01/05) |
| openai | 6.49.0 (declared ^6.46.0) | only `server/ai/embeddingService.ts` (dead file) |
| @octokit/rest, @octokit/request-error | 22.0.1, 7.1.2 | GitHub sync (F-AOPS-10, `server/github/client.ts`) |
| @replit/connectors-sdk | 0.4.3 | email transport `server/email.ts:8` (digest, F-JOB-02) and GitHub connection |
| cheerio, sharp, blurhash | 1.2.0, 0.35.5, 2.0.5 | URL scraping in enrichment/researcher (`server/ai/urlScraper.ts`) |
| wouter, @tanstack/react-query, zod | 3.13.0, 5.104.5, 4.6.7 | client routing, data fetching, schemas/contracts |
| typescript, tsx, esbuild | 5.6.3, 4.23.15, 0.25.12 | `npm run build` = tsc + lint:guards + vite client + vite ssr + esbuild server |

Background-job packages: none beyond the above. The schedulers are plain `setTimeout`/`setInterval` (`server/jobs/*.ts`); there is no queue library and no cron package, and `pg_dump` is spawned from `server/backup/databaseBackup.ts:41`.

## 4. Totals and reconciliation

### 4.1 Functions

| group | count |
|---|---|
| F-DISC | 14 |
| F-SRCH | 7 |
| F-RESIL | 7 |
| F-TEL | 6 |
| F-OBS | 1 |
| F-AUTH | 10 |
| F-MCON | 10 |
| F-MACC | 15 |
| F-ACUR | 9 |
| F-AOPS | 12 |
| F-ARES | 6 |
| F-JOB | 7 |
| F-XCUT | 1 |
| **total functions** | **105** |

Against the 07b codemap (95): 95, minus F-AOPS-12, plus F-AOPS-13, F-JOB-01..07, F-OBS-01, F-AUTH-10 and F-XCUT-01 = 105. F-XCUT-01 is a pseudo-function (a row bucket, not code); F-JOB-05 is the only job with an HTTP contract.

### 4.2 Inventory rows (denominator 760 = `prod-audit-2026-10-26/INVENTORY.md`)

| bucket | rows |
|---|---|
| mapped to a function | 759 |
| retire: no live function | 1 |
| unmapped | 0 |
| **sum** | **760** |

By source prefix: C22 admin/member rows 613 (AP 25, AU 27, C6-MB 81, C6-PC 1, CAT 23, DB 14, DG 7, ED 22, EN 31, EX 27, GH 23, JN 29, LH 32, OV 15, RM 74, RS 53, RW 9, SC 25, SH 44, SSC 26, US 25), plus C6-PC 65, C6-PS 63, C6-AX 19 = 760. All 613 ids in `c22-retier-rows-v2.tsv` are in INVENTORY.md. 27 rows map to the pseudo-function F-XCUT-01 (19 C6-AX, C6-PS-057..059, C6-MB-075..079); their real tier follows the pages they sweep.

### 4.3 HTTP contracts

| bucket | contracts |
|---|---|
| mapped to a function | 187 |
| retire: no live function | 23 |
| unmapped | 0 |
| **sum = current registrations** | **210** (203 `/api`, 7 other) |

Against the stated denominator of 196: that number is not itemised anywhere and cannot be reproduced. The same regex gives 200 registrations (193 `/api`) at the audit SHA 130e5829 and 210 (203) today; 10 were added since (section 0, item 3). Treat **210** as the current denominator. Of today's 210, 187 map to a live function and 23 to retire. Of the 10 post-audit additions, 8 are live (`qa-rows` x2, `remediation` x3, `admin/logs`, `admin/usage`, `run-due-jobs`) and 2 are in the retire list (`link-health/summary`, `link-clerk`).

Functions with at least one contract: 59 of 105. Functions with neither inventory rows nor contracts (validate by code-change trigger only): 20 (F-DISC-04, F-DISC-05, F-RESIL-02, F-RESIL-04, F-RESIL-05, F-TEL-02, F-TEL-03, F-TEL-04, F-TEL-05, F-OBS-01, F-AUTH-07, F-AUTH-08, F-AUTH-09, F-AUTH-10, F-JOB-01, F-JOB-02, F-JOB-03, F-JOB-04, F-JOB-06, F-JOB-07).

## Appendix A. Contract to function map (210 registrations)

| method | path | file:line | function |
|---|---|---|---|
| GET | /api/notification-preferences | S:api/notifications.ts:65 | F-MACC-05 |
| PUT | /api/notification-preferences | S:api/notifications.ts:111 | F-MACC-05 |
| PATCH | /api/notification-preferences | S:api/notifications.ts:116 | F-MACC-05 |
| GET | /api/digests/preview | S:api/notifications.ts:122 | F-MACC-05 |
| GET | /api/notifications | S:api/notifications.ts:131 | F-MACC-05 |
| PATCH | /api/notifications/:id/read | S:api/notifications.ts:148 | F-MACC-05 |
| POST | /api/notifications/read-all | S:api/notifications.ts:166 | F-MACC-05 |
| GET | /unsubscribe/digest/:token | S:api/notifications.ts:175 | F-MACC-06 |
| POST | /unsubscribe/digest/:token | S:api/notifications.ts:189 | F-MACC-06 |
| GET | /api/admin/digests/health | S:api/notifications.ts:198 | F-AOPS-09 |
| GET | /api/public/resources | S:api/public.ts:182 | F-MACC-14 |
| GET | /api/public/resources/:id | S:api/public.ts:299 | F-MACC-14 |
| GET | /api/public/categories | S:api/public.ts:374 | F-MACC-14 |
| GET | /api/public/tags | S:api/public.ts:427 | F-MACC-14 |
| GET | /api/public/me | S:api/public.ts:453 | F-MACC-14 |
| GET | /api/admin/stats | SD:admin-content.ts:171 | F-ACUR-01 |
| GET | /api/admin/users | SD:admin-content.ts:200 | F-AOPS-01 |
| GET | /api/admin/users/export | SD:admin-content.ts:242 | F-AOPS-01 |
| PATCH | /api/admin/users/:id/name | SD:admin-content.ts:298 | F-AOPS-01 |
| PUT | /api/admin/users/:id/role | SD:admin-content.ts:335 | F-AOPS-01 |
| DELETE | /api/admin/users/:id | SD:admin-content.ts:376 | F-AOPS-01 |
| POST | /api/admin/users/:id/link-clerk | SD:admin-content.ts:421 | retire |
| GET | /api/admin/audit-logs | SD:admin-content.ts:445 | F-AOPS-02 |
| GET | /api/admin/pending-resources | SD:admin-content.ts:523 | F-ACUR-03 |
| POST | /api/admin/resources/:id(\\d+)/approve | SD:admin-content.ts:537 | F-ACUR-03 |
| POST | /api/admin/resources/:id(\\d+)/reject | SD:admin-content.ts:572 | F-ACUR-03 |
| POST | /api/admin/resources/:id(\\d+)/unapprove | SD:admin-content.ts:616 | retire |
| PUT | /api/admin/resources/:id | SD:admin-content.ts:649 | F-ACUR-05 |
| PATCH | /api/admin/resources/:id(\\d+)/kind | SD:admin-content.ts:801 | F-ACUR-05 |
| PATCH | /api/admin/resources/:id(\\d+)/featured | SD:admin-content.ts:843 | F-ACUR-05 |
| DELETE | /api/admin/resources/:id | SD:admin-content.ts:888 | F-ACUR-05 |
| POST | /api/admin/resources/bulk/approve | SD:admin-content.ts:921 | F-ACUR-03 |
| POST | /api/admin/resources/bulk/reject | SD:admin-content.ts:953 | F-ACUR-03 |
| POST | /api/admin/resources/bulk/delete | SD:admin-content.ts:983 | F-ACUR-05 |
| GET | /api/admin/resources | SD:admin-content.ts:1026 | F-ACUR-05 |
| POST | /api/admin/resources | SD:admin-content.ts:1098 | F-ACUR-05 |
| GET | /api/admin/resource-edits | SD:admin-content.ts:1188 | F-ACUR-04 |
| GET | /api/admin/resource-edits/recent | SD:admin-content.ts:1211 | F-ACUR-04 |
| POST | /api/admin/resource-edits/:id/approve | SD:admin-content.ts:1221 | F-ACUR-04 |
| POST | /api/admin/resource-edits/:id/reject | SD:admin-content.ts:1281 | F-ACUR-04 |
| POST | /api/claude/analyze | SD:admin-content.ts:1321 | F-ACUR-09 |
| GET | /api/admin/categories | SD:admin-content.ts:1408 | F-ACUR-06 |
| POST | /api/admin/categories | SD:admin-content.ts:1435 | F-ACUR-06 |
| PATCH | /api/admin/categories/:id | SD:admin-content.ts:1471 | F-ACUR-06 |
| DELETE | /api/admin/categories/:id | SD:admin-content.ts:1513 | F-ACUR-06 |
| GET | /api/admin/subcategories | SD:admin-content.ts:1557 | F-ACUR-07 |
| POST | /api/admin/subcategories | SD:admin-content.ts:1580 | F-ACUR-07 |
| PATCH | /api/admin/subcategories/:id | SD:admin-content.ts:1638 | F-ACUR-07 |
| DELETE | /api/admin/subcategories/:id | SD:admin-content.ts:1703 | F-ACUR-07 |
| GET | /api/admin/sub-subcategories | SD:admin-content.ts:1747 | F-ACUR-08 |
| POST | /api/admin/sub-subcategories | SD:admin-content.ts:1767 | F-ACUR-08 |
| PATCH | /api/admin/sub-subcategories/:id | SD:admin-content.ts:1823 | F-ACUR-08 |
| DELETE | /api/admin/sub-subcategories/:id | SD:admin-content.ts:1872 | F-ACUR-08 |
| GET | /api/admin/logs | SD:admin-logs.ts:140 | F-AOPS-08 |
| GET | /api/admin/usage | SD:admin-usage.ts:163 | F-AOPS-08 |
| POST | /api/enrichment/start | SD:ai-jobs.ts:76 | F-ARES-05 |
| GET | /api/enrichment/jobs | SD:ai-jobs.ts:133 | F-ARES-05 |
| GET | /api/enrichment/jobs/:id | SD:ai-jobs.ts:162 | F-ARES-05 |
| GET | /api/enrichment/jobs/:id/events | SD:ai-jobs.ts:196 | F-ARES-05 |
| DELETE | /api/enrichment/jobs/:id | SD:ai-jobs.ts:213 | F-ARES-05 |
| POST | /api/admin/enrichment/backfill-suggestions | SD:ai-jobs.ts:253 | retire |
| POST | /api/researcher/start | SD:ai-jobs.ts:340 | F-ARES-01 |
| GET | /api/researcher/config | SD:ai-jobs.ts:510 | F-ARES-01 |
| GET | /api/researcher/brief | SD:ai-jobs.ts:540 | F-ARES-01 |
| GET | /api/researcher/jobs | SD:ai-jobs.ts:551 | F-ARES-02 |
| GET | /api/researcher/jobs/:id | SD:ai-jobs.ts:576 | F-ARES-02 |
| GET | /api/researcher/jobs/:id/events | SD:ai-jobs.ts:587 | F-ARES-02 |
| DELETE | /api/researcher/jobs/:id | SD:ai-jobs.ts:604 | F-ARES-02 |
| GET | /api/researcher/discoveries | SD:ai-jobs.ts:621 | F-ARES-03 |
| POST | /api/researcher/discoveries/approve-all | SD:ai-jobs.ts:637 | F-ARES-03 |
| POST | /api/researcher/discoveries/:id/approve | SD:ai-jobs.ts:657 | F-ARES-03 |
| POST | /api/researcher/discoveries/:id/reject | SD:ai-jobs.ts:681 | F-ARES-03 |
| GET | /api/auth/user | SD:auth-user.ts:92 | F-AUTH-05 |
| GET | /api/auth/me | SD:auth-user.ts:110 | retire |
| POST | /api/auth/logout-all | SD:auth-user.ts:127 | F-AUTH-04 |
| POST | /api/auth/admin-login | SD:auth-user.ts:163 | F-AUTH-03 |
| POST | /api/auth/admin-logout | SD:auth-user.ts:182 | F-AUTH-03 |
| GET | /api/auth/status | SD:auth-user.ts:191 | retire |
| GET | /api/resources | SD:catalog-contributions.ts:198 | F-DISC-14 |
| GET | /api/resources/kinds/counts | SD:catalog-contributions.ts:489 | F-DISC-14 |
| GET | /api/search | SD:catalog-contributions.ts:548 | F-SRCH-07 |
| POST | /api/telemetry/dead-link | SD:catalog-contributions.ts:607 | F-RESIL-01 |
| GET | /api/resources/check-url | SD:catalog-contributions.ts:646 | F-MCON-01 |
| GET | /api/resources/:id(\\d+) | SD:catalog-contributions.ts:718 | F-DISC-07 |
| GET | /api/resource/:id(\\d+) | SD:catalog-contributions.ts:719 | retire |
| GET | /api/resources/:id/related | SD:catalog-contributions.ts:721 | F-DISC-07 |
| POST | /api/resources | SD:catalog-contributions.ts:949 | F-MCON-01 |
| POST | /api/submit | SD:catalog-contributions.ts:950 | retire |
| GET | /api/resources/pending | SD:catalog-contributions.ts:953 | retire |
| PUT | /api/resources/:id/approve | SD:catalog-contributions.ts:972 | retire |
| PUT | /api/resources/:id/reject | SD:catalog-contributions.ts:1008 | retire |
| POST | /api/resources/:id/edits | SD:catalog-contributions.ts:1037 | F-MCON-02 |
| GET | /api/categories | SD:catalog-contributions.ts:1306 | F-DISC-14 |
| GET | /api/tags | SD:catalog-contributions.ts:1334 | F-DISC-14 |
| GET | /api/subcategories | SD:catalog-contributions.ts:1356 | F-DISC-14 |
| GET | /api/sub-subcategories | SD:catalog-contributions.ts:1399 | F-DISC-14 |
| GET | /api/config | SD:contact.ts:169 | F-MACC-15 |
| POST | /api/contact | SD:contact.ts:192 | F-MACC-15 |
| GET | /api/admin/contact-submissions | SD:contact.ts:231 | F-AOPS-13 |
| POST | /api/github/configure | SD:export-link-health.ts:184 | retire |
| POST | /api/github/import | SD:export-link-health.ts:212 | F-AOPS-10 |
| POST | /api/github/export | SD:export-link-health.ts:295 | F-AOPS-10 |
| GET | /api/github/sync-status | SD:export-link-health.ts:432 | F-AOPS-10 |
| GET | /api/github/sync-status/:id | SD:export-link-health.ts:502 | retire |
| GET | /api/github/sync-history | SD:export-link-health.ts:520 | F-AOPS-10 |
| POST | /api/github/process-queue | SD:export-link-health.ts:628 | retire |
| POST | /api/admin/export | SD:export-link-health.ts:649 | F-AOPS-03 |
| GET | /api/admin/export-csv | SD:export-link-health.ts:696 | F-AOPS-03 |
| GET | /api/admin/export-opml | SD:export-link-health.ts:737 | F-AOPS-03 |
| GET | /api/admin/export-json | SD:export-link-health.ts:826 | F-AOPS-03 |
| GET | /api/admin/database-backups | SD:export-link-health.ts:1033 | F-AOPS-04 |
| POST | /api/admin/database-backups | SD:export-link-health.ts:1056 | F-AOPS-04 |
| POST | /api/admin/validate | SD:export-link-health.ts:1083 | F-AOPS-06 |
| POST | /api/admin/check-links | SD:export-link-health.ts:1135 | F-AOPS-06 |
| GET | /api/admin/validation-status | SD:export-link-health.ts:1153 | F-AOPS-06 |
| GET | /api/admin/link-health/status | SD:export-link-health.ts:1173 | F-AOPS-06 |
| POST | /api/admin/link-health/run | SD:export-link-health.ts:1185 | F-AOPS-06 |
| DELETE | /api/admin/link-health/jobs/:id | SD:export-link-health.ts:1202 | F-AOPS-06 |
| GET | /api/admin/link-health/history | SD:export-link-health.ts:1225 | F-AOPS-06 |
| GET | /api/admin/link-health/broken-links | SD:export-link-health.ts:1237 | F-AOPS-06 |
| POST | /api/admin/seed-database | SD:export-link-health.ts:1254 | F-AOPS-05 |
| POST | /api/admin/import-github | SD:export-link-health.ts:1302 | F-AOPS-10 |
| GET | /api/admin/enrichment/coverage | SD:export-link-health.ts:1378 | F-ARES-05 |
| POST | /api/admin/maintenance/backfill-approved-at | SD:export-link-health.ts:1410 | retire |
| POST | /api/admin/maintenance/canonicalize-tags | SD:export-link-health.ts:1450 | retire |
| GET | /api/awesome-list | SD:export-link-health.ts:1528 | F-DISC-14 |
| GET | /api/awesome-list/nav | SD:export-link-health.ts:1706 | F-DISC-14 |
| GET | /api/awesome-list/listing | SD:export-link-health.ts:1727 | F-DISC-14 |
| GET | /api/github/awesome-lists | SD:export-link-health.ts:1905 | retire |
| GET | /api/github/search | SD:export-link-health.ts:1922 | retire |
| GET | /api/home | SD:home-feed.ts:49 | F-DISC-01 |
| GET | /api/journeys | SD:journeys-recommendations.ts:81 | F-MACC-08 |
| GET | /api/journeys/:id | SD:journeys-recommendations.ts:178 | F-MACC-09 |
| POST | /api/journeys/:id/start | SD:journeys-recommendations.ts:226 | F-MACC-09 |
| PUT | /api/journeys/:id/progress | SD:journeys-recommendations.ts:250 | F-MACC-09 |
| GET | /api/journeys/:id/progress | SD:journeys-recommendations.ts:311 | F-MACC-09 |
| GET | /api/admin/journeys | SD:journeys-recommendations.ts:339 | F-ARES-06 |
| PUT | /api/admin/journeys/:id | SD:journeys-recommendations.ts:368 | F-ARES-06 |
| GET | /api/admin/journeys/:id/steps | SD:journeys-recommendations.ts:394 | F-ARES-06 |
| POST | /api/admin/journeys/:id/steps | SD:journeys-recommendations.ts:413 | F-ARES-06 |
| PATCH | /api/admin/journeys/:journeyId/steps/:stepId | SD:journeys-recommendations.ts:461 | F-ARES-06 |
| DELETE | /api/admin/journeys/:journeyId/steps/:stepId | SD:journeys-recommendations.ts:513 | F-ARES-06 |
| POST | /api/admin/journeys/:id/steps/reorder | SD:journeys-recommendations.ts:547 | F-ARES-06 |
| GET | /api/recommendations/init | SD:journeys-recommendations.ts:644 | retire |
| GET | /api/recommendations | SD:journeys-recommendations.ts:672 | F-MACC-11 |
| POST | /api/recommendations | SD:journeys-recommendations.ts:727 | F-MACC-11 |
| POST | /api/recommendations/feedback | SD:journeys-recommendations.ts:788 | retire |
| GET | /api/recommendations/feedback | SD:journeys-recommendations.ts:850 | F-MACC-11 |
| PUT | /api/recommendations/:resourceId/feedback | SD:journeys-recommendations.ts:873 | F-MACC-11 |
| POST | /api/recommendations/:resourceId/feedback | SD:journeys-recommendations.ts:911 | retire |
| POST | /api/interactions | SD:journeys-recommendations.ts:955 | F-TEL-06 |
| GET | /api/link-health/summary | SD:link-remediation.ts:62 | retire |
| GET | /api/admin/link-health/remediation | SD:link-remediation.ts:72 | F-AOPS-07 |
| POST | /api/admin/link-health/remediation/apply | SD:link-remediation.ts:80 | F-AOPS-07 |
| POST | /api/admin/link-health/resources/:id/ignore | SD:link-remediation.ts:92 | F-AOPS-07 |
| GET | /api/resources/:id/link-report | SD:link-reports.ts:55 | F-MCON-10 |
| POST | /api/resources/:id/link-report | SD:link-reports.ts:65 | F-MCON-10 |
| GET | /api/admin/link-reports | SD:link-reports.ts:103 | F-AOPS-07 |
| PATCH | /api/admin/link-reports/:resourceId/:reporter | SD:link-reports.ts:136 | F-AOPS-07 |
| GET | /api/health | SD:operations.ts:68 | F-RESIL-06 |
| GET | /api/health/live | SD:operations.ts:72 | F-RESIL-06 |
| GET | /api/health/ready | SD:operations.ts:76 | F-RESIL-06 |
| GET | /api/admin/operations/health | SD:operations.ts:85 | F-ACUR-02 |
| GET | /api/health/ai | SD:operations.ts:115 | F-RESIL-06 |
| ALL | /api/resources/:id | SD:operations.ts:189 | F-RESIL-07 |
| GET | /api/openapi.json | SD:operations.ts:206 | F-RESIL-06 |
| GET | /api/docs | SD:operations.ts:211 | F-RESIL-06 |
| POST | /api/ops/run-due-jobs | SD:ops-cron.ts:129 | F-JOB-05 |
| GET | /api/admin/qa-rows | SD:qa-cleanup.ts:165 | F-AOPS-11 |
| DELETE | /api/admin/qa-rows/:table/:id | SD:qa-cleanup.ts:209 | F-AOPS-11 |
| POST | /api/favorites/:resourceId | SD:user-features.ts:114 | F-MCON-05 |
| DELETE | /api/favorites/:resourceId | SD:user-features.ts:135 | F-MCON-05 |
| GET | /api/favorites | SD:user-features.ts:149 | F-MCON-05 |
| POST | /api/bookmarks/:resourceId | SD:user-features.ts:161 | F-MCON-04 |
| DELETE | /api/bookmarks/:resourceId | SD:user-features.ts:208 | F-MCON-04 |
| GET | /api/bookmarks | SD:user-features.ts:222 | F-MCON-04 |
| GET | /api/collections | SD:user-features.ts:307 | F-MCON-08 |
| POST | /api/collections | SD:user-features.ts:327 | F-MCON-08 |
| PUT | /api/collections/reorder | SD:user-features.ts:342 | F-MCON-08 |
| PATCH | /api/collections/:collectionId | SD:user-features.ts:358 | F-MCON-08 |
| DELETE | /api/collections/:collectionId | SD:user-features.ts:377 | F-MCON-08 |
| POST | /api/collections/:collectionId/items/:resourceId | SD:user-features.ts:390 | F-MCON-08 |
| DELETE | /api/collections/:collectionId/items/:resourceId | SD:user-features.ts:419 | F-MCON-08 |
| POST | /api/collections/:collectionId/publish | SD:user-features.ts:445 | F-MCON-08 |
| DELETE | /api/collections/:collectionId/publish | SD:user-features.ts:458 | F-MCON-08 |
| PATCH | /api/bookmarks/:resourceId/state | SD:user-features.ts:471 | F-MCON-04 |
| POST | /api/bookmarks/bulk | SD:user-features.ts:490 | F-MCON-04 |
| GET | /api/public/collections/:shareId | SD:user-features.ts:510 | F-MCON-09 |
| POST | /api/user/api-keys | SD:user-features.ts:532 | F-MACC-03 |
| GET | /api/user/api-keys | SD:user-features.ts:588 | F-MACC-03 |
| DELETE | /api/user/api-keys/:id | SD:user-features.ts:600 | F-MACC-03 |
| PATCH | /api/user/profile | SD:user-features.ts:616 | F-MACC-01 |
| POST | /api/user/deletion-request | SD:user-features.ts:666 | F-MACC-02 |
| DELETE | /api/user/deletion-request | SD:user-features.ts:691 | F-MACC-02 |
| GET | /api/user/progress | SD:user-features.ts:723 | F-MACC-01 |
| GET | /api/user/preferences | SD:user-features.ts:885 | F-MACC-04 |
| PUT | /api/user/preferences | SD:user-features.ts:912 | F-MACC-04 |
| DELETE | /api/user/preferences | SD:user-features.ts:1071 | F-MACC-04 |
| GET | /api/user/contributions | SD:user-features.ts:1123 | F-MCON-03 |
| GET | /api/user/submissions | SD:user-features.ts:1219 | retire |
| POST | /api/user/contributions/:kind(resource/edit)/:id/withdraw | SD:user-features.ts:1352 | F-MCON-03 |
| DELETE | /api/user/submissions/:id | SD:user-features.ts:1357 | retire |
| GET | /api/user/journeys | SD:user-features.ts:1362 | F-MACC-10 |
| GET | /api/user/continue-learning | SD:user-features.ts:1397 | F-MACC-10 |
| GET | /.well-known/security.txt | S:routes/non-api.ts:687 | F-DISC-12 |
| GET | /security.txt | S:routes/non-api.ts:689 | F-DISC-12 |
| GET | /sitemap.xml | S:routes/non-api.ts:700 | F-DISC-12 |
| GET | /og-image.svg | S:routes/non-api.ts:701 | F-DISC-12 |
| GET | /og-image.png | S:routes/non-api.ts:702 | F-DISC-12 |
| GET | /api/version | S:version-route.ts:51 | F-RESIL-06 |
