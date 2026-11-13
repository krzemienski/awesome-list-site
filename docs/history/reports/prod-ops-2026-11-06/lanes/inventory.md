# Inventory lane — awesome.video feature map (code-only)

> Layout chosen by me (the lane brief gave the column set, not a template). Source: checkout of origin/main `6cb1a93e`, read-only. No production contact, no app run.
> Method: `grep` of every `app.<verb>(` registration under `server/`, reading the registrar files, `client/src/App.tsx`, `shared/admin-tabs.ts`, `server/jobs/*`, `server/index.ts`, `.replit`.
> Line numbers are the registration line (`file:line`). "Guard" is what the route list shows; `isAuthenticated` + `isAdmin` are the Clerk/admin-cookie middlewares passed into each registrar. Global middleware (`/api` backstop limiter `routes.ts:279-289`, host/apex redirect `index.ts:264`, contract guard `server/contracts/`) applies to everything and is not repeated per row.
> **UNVERIFIED**: no handler body was executed. Where a row says "per code" it is from reading the handler, not from a run. Client-caller claims come from `grep` of `client/src` + `shared`, so a caller built from a dynamic string would be missed.
> Write paths are all `write path, deferred` under the lane rules: nothing here was invoked.

Paths: `S`=`server/routes/domains/`, `C`=`client/src/`.

## 1. Feature table

### 1A. Public discovery and content (visitor)

| ID | Feature | Aud | R/W | Client entry | Server endpoints | Code | Guard | Notes |
|---|---|---|---|---|---|---|---|---|
| INV-001 | Home page (SSR + SPA) with hero, featured, layout preference | visitor | R | `/` (`C pages/Home.tsx`, `components/home/*`) | GET `/api/home` | `S home-feed.ts:49`; SSR data `server/home-ssr-data.ts`; `handleSSR` `index.ts:637` | public, limiter | Home layout choice is stored client-side (`use-home-layout.ts`); not checked whether also synced server-side |
| INV-002 | Category index | visitor | R | `/categories` (`pages/Categories.tsx`, `TaxonomyListing.tsx`) | GET `/api/categories`, `/api/awesome-list/nav` | `S catalog-contributions.ts:1306`; `S export-link-health.ts:1705` | public | Counts single-sourced from DB per memory note |
| INV-003 | Category page (+ legacy `/category/:slug/:sub` redirect) | visitor | R | `/category/:slug` (`pages/Category.tsx`) | GET `/api/resources?category=`, `/api/awesome-list/listing` | `S catalog-contributions.ts:198`; `S export-link-health.ts:1798` | public, `resourceReadLimiter` | SSR meta in `og-middleware.ts:1268` |
| INV-004 | Subcategory page | visitor | R | `/subcategory/:slug` (`pages/Subcategory.tsx`) | GET `/api/subcategories`, `/api/awesome-list/listing` | `S catalog-contributions.ts:1356`; `og-middleware.ts:1482` | public | `/subcategory` bare redirects to `/categories` |
| INV-005 | Sub-subcategory page (+ `/subsubcategory/:slug` alias redirect) | visitor | R | `/sub-subcategory/:slug` (`pages/SubSubcategory.tsx`) | GET `/api/sub-subcategories`, `/api/awesome-list/listing` | `S catalog-contributions.ts:1399`; `og-middleware.ts:1566,2498` | public | `-scN` suffix slug rewrite at `og-middleware.ts:2501` |
| INV-006 | Tag landing page | visitor | R | `/tag/:slug` (`pages/TagLanding.tsx`) | GET `/api/tags`, `/api/resources?tag=` | `S catalog-contributions.ts:1334`; `og-middleware.ts:1359` | public | Only tags with ≥ `TAG_LANDING_MIN_RESOURCES` appear in sitemap (`non-api.ts`) |
| INV-007 | Resource list / filter API (kind, category, tag, status, paging) | visitor | R | used by every listing page | GET `/api/resources`, `/api/resources/kinds/counts` | `S catalog-contributions.ts:198,489` | public, `resourceReadLimiter` | 405 stubs for other verbs at `S operations.ts:170-199` |
| INV-008 | Resource detail page | visitor | R | `/resource/:id` (`pages/ResourceDetail.tsx`; wired as `ResourcePage` `App.tsx:915`) | GET `/api/resources/:id(\d+)`, `/api/resource/:id(\d+)`, `/api/resources/:id/related` | `S catalog-contributions.ts:718,719,721`; `og-middleware.ts:1652` | public | `/api/resource/:id` (singular) has no client caller (see orphans) |
| INV-009 | Full-text search page | visitor | R | `/search` (`pages/Search.tsx`, `components/search/*`); legacy `/explore`, `/resource` redirect here | GET `/api/search` | `S catalog-contributions.ts:548` | public, `resourceReadLimiter` | Home `?q=` legacy redirect `App.tsx:788` |
| INV-010 | Command palette (⌘K) incl. search + contact entry | visitor | R | global, `components/search/SearchEntryButton.tsx`, `components/contact/contact-palette-item.tsx` | GET `/api/search` | client only plus INV-009 | public | Contact item shown only when contact enabled |
| INV-011 | Duplicate-URL pre-check on submit | visitor/member | R | `/submit` form | GET `/api/resources/check-url` | `S catalog-contributions.ts:646` | public, limiter | Public read of "does this URL exist" |
| INV-012 | Advanced explorer (category explorer, community metrics, export tools UI) | visitor | R | `/advanced` (`pages/Advanced.tsx`) | GET `/api/awesome-list`, `/api/categories` | `S export-link-health.ts:1527` | public | Shown to visitors even though the "export tools" widget names admin-ish exports; whether the widget calls admin endpoints is **not verified** |
| INV-013 | Learning journeys list + detail | visitor | R | `/journeys`, `/journey/:id` (`pages/Journeys.tsx`, `JourneyDetail.tsx`); `/journey` redirects to `/journeys` | GET `/api/journeys`, `/api/journeys/:id` | `S journeys-recommendations.ts:81,178`; `og-middleware.ts:1872` | public | |
| INV-014 | Recommendations page (rule/engine based) | visitor | R | `/recommendations` (`pages/Recommendations.tsx`, `components/ai/RecommendationCard.tsx`) | GET `/api/recommendations`, `/api/recommendations/init` | `S journeys-recommendations.ts:672,644` | public (per registration; no auth middleware) | `recommendation-engine.ts` showed no AI/embedding reference in a grep, so GET path looks non-paid; **not run**. `/init` has no client caller |
| INV-015 | Public shared collection page | visitor | R | `/collection/:shareId` (`pages/PublicCollection.tsx`) | GET `/api/public/collections/:shareId` | `S user-features.ts:510`; `og-middleware.ts:340,708` | public | Share link produced by INV-040 |
| INV-016 | Static legal/about pages | visitor | R | `/about`, `/terms`, `/privacy`, `/code-of-conduct` | none (SPA/SSR) | `App.tsx:916-919`; `components/legal/LegalPolicyPage.tsx` | public | |
| INV-017 | Design-system showcase | visitor | R | `/design-system` (`pages/DesignSystemShowcase.tsx`) | none | `App.tsx:964` | public | Routed in production, no nav entry found (see orphans) |
| INV-018 | Theme / design-system settings | visitor | R/W (local) | `/settings/theme` (`pages/ThemeSettings.tsx`), theme boot | none | `App.tsx:963` | public | Stored in browser |
| INV-019 | Guest bookmarks (local) + merge into account on sign-in | visitor→member | R/W (local, then server on merge) | `/bookmarks` (`BookmarksGate.tsx`, `GuestBookmarks.tsx`, `components/auth/GuestBookmarkMerge.tsx`) | POST `/api/bookmarks/bulk` on merge | `S user-features.ts:490` | requireAuth for the server leg | Merge sends writes on first sign-in |
| INV-020 | Link-health public summary | visitor | R | no client caller | GET `/api/link-health/summary` | `S link-remediation.ts:62` | public | Orphan candidate |
| INV-021 | Dead-link (404) telemetry beacon | visitor | W (log only) | client route monitor (`C lib/route-monitor.ts:53`, `apiFetch` with keepalive on a dead route) | POST `/api/telemetry/dead-link` | `S catalog-contributions.ts:607` | public, unauthenticated | Only writes a log line (204). No DB write. Reachable by anyone |

### 1B. Machine-readable / SEO / infra (visitor, bots, system)

| ID | Feature | Aud | R/W | Client entry | Server endpoints | Code | Guard | Notes |
|---|---|---|---|---|---|---|---|---|
| INV-030 | Sitemap (categories, subcategories, paginated listings, tag landings, journeys, resources) | bot | R | none | GET `/sitemap.xml` | `server/routes/non-api.ts:700` (`generateSitemap`) | public | DB-driven |
| INV-031 | robots.txt and llms.txt | bot | R | none | static `/robots.txt`, `/llms.txt` | `client/public/robots.txt`, `client/public/llms.txt` | public | Static files, no route registration found |
| INV-032 | security.txt (RFC 9116) | bot | R | none | GET `/.well-known/security.txt`, `/security.txt` | `non-api.ts:687,689` | public | 503-ish text if no validated contact configured (`non-api.ts:669`) |
| INV-033 | Open Graph image (SVG + PNG) | bot/social | R | none | GET `/og-image.svg`, `/og-image.png` | `non-api.ts:701,702`; CORP header `:694` | public | PNG render per request |
| INV-034 | SSR + OG/meta injection for every entity route | bot/visitor | R | none | middleware on all non-/api GETs | `server/og-middleware.ts` (2.7k lines; `ogInjectionMiddleware` mounted `index.ts:625`), `server/ssr.ts`, `server/seo-content.ts` | public | Also handles canonical redirects (`og-middleware.ts:2222-2540`), noindex for admin/auth flows (`:899,903`) and 404 status |
| INV-035 | Server-side protected-page guard (cookie-presence redirect before SPA shell) | visitor | R | `/profile`, `/bookmarks`, etc. | middleware | `index.ts:576-600` region (Audit-2 BUG-045 comment) | n/a | Described in comment; exact path list **not enumerated** |
| INV-036 | Host canonicalisation (apex/www redirect) | system | R | none | middleware | `index.ts:264-285` | n/a | uses `PUBLIC_SITE_URL` |
| INV-037 | Clerk frontend-API proxy | system | R/W (proxied) | Clerk SDK | `/api/__clerk/*` | `index.ts:142`; `server/middleware/clerkProxyMiddleware.ts:27` | proxy | Forwards sign-in traffic to Clerk |
| INV-038 | Health / readiness / version | system | R | none | GET `/api/health`, `/api/health/live`, `/api/health/ready`, `/api/version` | `S operations.ts:68,72,76`; `server/version-route.ts:51` | public | `/api/version` has no client caller; used by deploy proof |
| INV-039 | OpenAPI document + Swagger-style docs | developer | R | none | GET `/api/openapi.json`, `/api/docs` | `S operations.ts:206,211`; `server/openapi.ts` | public | No in-app link found |

### 1C. Auth and account (member)

| ID | Feature | Aud | R/W | Client entry | Server endpoints | Code | Guard | Notes |
|---|---|---|---|---|---|---|---|---|
| INV-050 | Sign in / sign up (Clerk) + legacy auth path redirects | visitor | W (Clerk) | `/sign-in/*?`, `/sign-up/*?`; `/login`, `/register`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/login`, `/auth/register` redirect | `/api/__clerk/*` | `App.tsx:858-868`; `pages/AuthPages.tsx` | Clerk | |
| INV-051 | Current user | member | R | app-wide `useAuth` | GET `/api/auth/user`; GET `/api/auth/me` (deprecated alias, `Deprecation` header); GET `/api/auth/status` | `S auth-user.ts:93,111,195` | session read | `/api/auth/me` and `/api/auth/status` have no client caller |
| INV-052 | Owner/admin password login | admin | W (cookie) | `components/auth/AdminPasswordSignIn.tsx` | POST `/api/auth/admin-login` | `S auth-user.ts:164`; `adminLoginLimiter` | public, rate-limited (10/900s shared per memory note) | **Off-limits** in this run: sets session cookie |
| INV-053 | Admin logout | admin | W | admin menu | POST `/api/auth/admin-logout` | `S auth-user.ts:186` | cookie | **Sign-out: never in any lane** |
| INV-054 | Sign out all devices | member/admin | W | `components/profile/AccountSecurityCard.tsx` | POST `/api/auth/logout-all` | `S auth-user.ts:128` | requireAuth | **Sign-out: never in any lane**; revokes all owner sessions |
| INV-055 | `/logout` route | member | W | `App.tsx:860` (`Logout` component) | via Clerk | `App.tsx:860` | n/a | **Never visit** |
| INV-056 | Profile (overview, favorites tab, settings, name/avatar edit) | member | R/W | `/profile` (`pages/Profile.tsx`), `/account` and `/favorites` redirect to it | GET `/api/user/progress`; PATCH `/api/user/profile` | `S user-features.ts:723,616` | requireAuth (`AuthGuard`) | |
| INV-057 | Account deletion request / cancel | member | W | `components/profile/AccountSecurityCard.tsx` | POST/DELETE `/api/user/deletion-request` | `S user-features.ts:666,691` | requireAuth | Sets a pending deletion; whether a job later hard-deletes: **not traced** |
| INV-058 | Personal API keys | member | R/W | `components/profile/ApiKeysCard.tsx` | GET/POST `/api/user/api-keys`, DELETE `/api/user/api-keys/:id` | `S user-features.ts:588,532,600` | requireAuth | Key shown once; feeds INV-070 |
| INV-059 | Onboarding / learning preferences | member | R/W | `/onboarding` (`pages/Onboarding.tsx`, `components/onboarding/learning-preferences-form.tsx`), `/settings` | GET/PUT/DELETE `/api/user/preferences` | `S user-features.ts:885,912,1071` | requireAuth | Preferences feed recommendations |
| INV-060 | Settings page | member | R/W | `/settings` (`pages/Settings.tsx`) | preferences + notification-preferences | `App.tsx:965` | requireAuth (per page) | |

### 1D. Member engagement

| ID | Feature | Aud | R/W | Client entry | Server endpoints | Code | Guard | Notes |
|---|---|---|---|---|---|---|---|---|
| INV-070 | Public read API with optional/required API key | developer | R | none in-app (docs/OpenAPI) | GET `/api/public/resources`, `/api/public/resources/:id`, `/api/public/categories`, `/api/public/tags`, `/api/public/me` | `server/api/public.ts:182,299,374,427,453` | keyed tiers: `optionalApiKey` (anon standard tier), `requireApiKey` for `/me`; own limiter; CORS `publicApiCors` `index.ts:185` | Read-only; usage unknown from code |
| INV-071 | Bookmarks (add/remove, notes, state, list) | member | R/W | `ResourceCard`, `BookmarkButton.tsx`, `BookmarkNotesDialog.tsx`, `/bookmarks` (`pages/Bookmarks.tsx`) | POST/DELETE `/api/bookmarks/:resourceId`, GET `/api/bookmarks`, PATCH `/api/bookmarks/:resourceId/state` | `S user-features.ts:161,208,222,471` | requireAuth | See memory note on remove bug |
| INV-072 | Favorites | member | R/W | `FavoriteButton.tsx`, profile favorites tab | POST/DELETE `/api/favorites/:resourceId`, GET `/api/favorites` | `S user-features.ts:114,135,149` | requireAuth | |
| INV-073 | Collections (create, rename, reorder, add/remove items, delete) | member | R/W | `/bookmarks` or profile collections UI | GET/POST `/api/collections`, PUT `/api/collections/reorder`, PATCH/DELETE `/api/collections/:collectionId`, POST/DELETE `/api/collections/:collectionId/items/:resourceId` | `S user-features.ts:307,327,342,358,377,390,419` | requireAuth | |
| INV-074 | Publish / unpublish collection (shareable link) | member | W | collection menu | POST/DELETE `/api/collections/:collectionId/publish` | `S user-features.ts:445,458` | requireAuth | Makes data publicly readable via INV-015 |
| INV-075 | Learning journey progress (start, mark step, resume) | member | R/W | `/journey/:id`, `/continue-learning` (`pages/ContinueLearning.tsx`, `components/learning/ContinueLearningPreview.tsx`) | POST `/api/journeys/:id/start`, PUT/GET `/api/journeys/:id/progress`, GET `/api/user/journeys`, GET `/api/user/continue-learning` | `S journeys-recommendations.ts:226,250,311`; `S user-features.ts:1362,1397` | requireAuth | |
| INV-076 | Personalised AI recommendations | member | R/W | `/recommendations` (signed-in) | POST `/api/recommendations` | `S journeys-recommendations.ts:727` | requireAuth + `aiLimiter` | ~~Paid AI call~~ LEAD CORRECTION: no AI call — server/recommendation-engine.ts imports no AI client (rule-based); only rate-limited by aiLimiter per request (reaches `generateRecommendations`; provider call path **not traced**) |
| INV-077 | Recommendation feedback (thumbs) | member | W | `RecommendationCard.tsx` | POST/GET `/api/recommendations/feedback`; PUT/POST `/api/recommendations/:resourceId/feedback` | `S journeys-recommendations.ts:788,850,873,911` | requireAuth | Four routes; PUT and POST on `:resourceId/feedback` overlap |
| INV-078 | Interaction tracking (views/clicks) | member | W | resource pages | POST `/api/interactions` | `S journeys-recommendations.ts:955` | requireAuth | Feeds recommendations |
| INV-079 | In-app notifications (list, mark read, mark all) | member | R/W | `/notifications` (`pages/Notifications.tsx`), header bell | GET `/api/notifications`, PATCH `/api/notifications/:id/read`, POST `/api/notifications/read-all` | `server/api/notifications.ts:132,149,167` | requireAuth | |
| INV-080 | Notification / digest preferences | member | R/W | `components/notifications/NotificationPreferencesCard.tsx` | GET/PUT/PATCH `/api/notification-preferences`, GET `/api/digests/preview` | `server/api/notifications.ts:66,112,117,123` | requireAuth | Opt-in drives INV-120 |
| INV-081 | Digest unsubscribe (email link, no login) | visitor | R/W | link in email (not an app route) | GET `/unsubscribe/digest/:token` (page), POST (apply) | `server/api/notifications.ts:175,189` | token | No client caller by design; apply is a write via token |
| INV-082 | Submit a resource | member | W | `/submit` (`pages/SubmitResource.tsx`) | POST `/api/resources`, POST `/api/submit` | `S catalog-contributions.ts:949,950` | requireAuth + `submissionLimiter` | Creates a pending resource; admin approval needed |
| INV-083 | Suggest an edit | member | W | `components/ui/suggest-edit-dialog.tsx` on resource page | POST `/api/resources/:id/edits` | `S catalog-contributions.ts:1037` | requireAuth | Creates pending edit |
| INV-084 | My contributions (submissions + edits, withdraw) | member | R/W | `/contributions` (`pages/Contributions.tsx`) | GET `/api/user/contributions`, POST `/api/user/contributions/:kind(resource\|edit)/:id/withdraw`, GET `/api/user/submissions`, DELETE `/api/user/submissions/:id` | `S user-features.ts:1123,1352,1219,1357` | requireAuth | `/api/user/submissions` has no client caller (legacy of `/contributions`) |
| INV-085 | Report a broken link | member | R/W | `components/resource/ReportLinkAction.tsx` | GET/POST `/api/resources/:id/link-report` | `S link-reports.ts:55,65` | requireAuth | Feeds INV-107 |

### 1E. Contact, consent, analytics (visitor)

| ID | Feature | Aud | R/W | Client entry | Server endpoints | Code | Guard | Notes |
|---|---|---|---|---|---|---|---|---|
| INV-090 | Public config (contact flags) | visitor | R | app boot | GET `/api/config` | `S contact.ts:169` | public | Tells the client whether the form is on |
| INV-091 | Contact dialog, **variant b** | visitor | W | footer link, palette item, resource action (`components/contact/contact-dialog.tsx`, `contact-footer.tsx`, `contact-resource-action.tsx`) | POST `/api/contact` | `S contact.ts:192`; `server/public-contact.ts` | `contactAvailable` (CONTACT_ENABLED), same-origin check, `contactLimiter`, zod body | Stores a submission with HMAC IP hash; unauthenticated. `VITE_CONTACT_VARIANT=b` selects UI |
| INV-092 | Consent banner (decline clears PostHog + attribution) | visitor | W (local) | `components/ui/consent-banner.tsx` | none | client; `hooks/use-analytics.tsx` | n/a | Gates analytics below |
| INV-093 | Analytics (Amplitude, Mixpanel, PostHog, GA) | visitor | W (3rd party) | `hooks/use-analytics.tsx`, `main.tsx` | none (client to vendor) | env `VITE_*` keys in `.replit` | consent | Suppressed when `navigator.webdriver` true per lane rules. GA id not set in `.replit` |
| INV-094 | Offline page state | visitor | R | `components/layout/OfflinePageState.tsx` | none | | | |

### 1F. Admin content management (admin)

Admin shell: `/admin` and `/admin/:section` (`App.tsx:947,956`) → `pages/AdminDashboard.tsx`. Tab ids in `shared/admin-tabs.ts:4-7` (18 ids): overview, approvals, edits, enrichment, researcher, export, database, resources, categories, subcategories, subsubcategories, journeys, users, github, linkhealth, digests, audit, research. Visible tab strip (`AdminDashboard.tsx` `CANONICAL_TABS`) shows 15; `subsubcategories`, `journeys`, `digests` live under a Settings menu / sub-section (not fully traced).

| ID | Feature | Aud | R/W | Client entry | Server endpoints | Code | Guard | Notes |
|---|---|---|---|---|---|---|---|---|
| INV-100 | Admin overview + stats | admin | R | tab `overview` (`AdminOverview.tsx`, `AdminStats.tsx`) | GET `/api/admin/stats` | `S admin-content.ts:171` | admin | Session probe used by lanes |
| INV-101 | Approvals queue (approve / reject / unapprove, bulk) | admin | R/W | tab `approvals` (`PendingResources.tsx`) | GET `/api/admin/pending-resources`, `/api/resources/pending`; POST `/api/admin/resources/:id/approve`, `/reject`, `/unapprove`, `/bulk/approve`, `/bulk/reject`; PUT `/api/resources/:id/approve`, `/reject` (older duplicates) | `S admin-content.ts:523,537,572,616,921,953`; `S catalog-contributions.ts:953,972,1008` | admin | Two parallel approve/reject API families; the `/api/resources/:id/approve|reject` PUTs and `/api/resources/pending` have no client caller found |
| INV-102 | Edit-suggestion queue | admin | R/W | tab `edits` (`PendingEdits.tsx`, `RecentResourceEdits.tsx`) | GET `/api/admin/resource-edits`, `/recent`; POST `/api/admin/resource-edits/:id/approve`, `/reject` | `S admin-content.ts:1188,1211,1221,1281` | admin | Approve writes to the live resource |
| INV-103 | Resource CRUD (create, edit, delete, bulk delete, set kind, feature) | admin | R/W | tab `resources` (`ResourceManager.tsx`) | GET/POST `/api/admin/resources`, PUT/DELETE `/api/admin/resources/:id`, PATCH `/:id/kind`, PATCH `/:id/featured`, POST `/bulk/delete` | `S admin-content.ts:1026,1098,649,888,801,843,983` | admin | Public cache invalidation on write (`publicCache`, skill `public-cache-freshness`) |
| INV-104 | Category / subcategory / sub-subcategory CRUD | admin | R/W | tabs `categories`, `subcategories`, `subsubcategories` (`CategoryManager.tsx`, `SubcategoryManager.tsx`, `SubSubcategoryManager.tsx`) | GET/POST `/api/admin/{categories,subcategories,sub-subcategories}`, PATCH/DELETE `…/:id` | `S admin-content.ts:1408-1872` | admin | Taxonomy edits change public navigation |
| INV-105 | User management (list, export CSV, rename, role change, delete, link Clerk) | admin | R/W | tab `users` (`UsersTab.tsx`) | GET `/api/admin/users`, `/users/export`; PATCH `/:id/name`; PUT `/:id/role`; DELETE `/:id`; POST `/:id/link-clerk` | `S admin-content.ts:200,242,298,335,376,421` | admin | Role change and delete are privileged. `/link-clerk` has no client caller. Screenshots must mask names/emails |
| INV-106 | Audit log viewer | admin | R | tab `audit` (`AuditTab.tsx`) | GET `/api/admin/audit-logs` | `S admin-content.ts:445` | admin | |
| INV-107 | Link reports review (user-reported dead links) | admin | R/W | tab `linkhealth` → `LinkReportsPanel.tsx` | GET `/api/admin/link-reports`; PATCH `/api/admin/link-reports/:resourceId/:reporter` | `S link-reports.ts:103,136` | admin | |
| INV-108 | Journeys admin (edit journey, steps CRUD, reorder) | admin | R/W | tab `journeys` (`JourneyStepsManager.tsx`) | GET `/api/admin/journeys`, PUT `/:id`, GET/POST `/:id/steps`, PATCH/DELETE `/:journeyId/steps/:stepId`, POST `/:id/steps/reorder` | `S journeys-recommendations.ts:339,368,394,413,461,513,547` | admin | |
| INV-109 | Contact submissions inbox | admin | R | admin (contact component `ContactSubmissions.tsx`) | GET `/api/admin/contact-submissions` | `S contact.ts:231` | admin | Contains visitor PII; read-only here. Purged by INV-122 |

### 1G. Admin operations: AI, sync, link health, backups (admin / system)

| ID | Feature | Aud | R/W | Client entry | Server endpoints | Code | Guard | Notes |
|---|---|---|---|---|---|---|---|---|
| INV-110 | AI batch enrichment (start, list, detail, events, cancel) | admin | R/W | tab `enrichment` (`BatchEnrichmentPanel.tsx`) | POST `/api/enrichment/start`; GET `/api/enrichment/jobs`, `/jobs/:id`, `/jobs/:id/events`; DELETE `/jobs/:id` | `S ai-jobs.ts:76,133,162,196,213` | admin | **Paid AI call** (Anthropic via `server/ai/enrichmentService.ts`). Writes metadata onto resources |
| INV-111 | Enrichment suggestion backfill | admin | W | no client caller | POST `/api/admin/enrichment/backfill-suggestions` | `S ai-jobs.ts:253` | admin | Orphan candidate; possibly paid AI |
| INV-112 | Enrichment coverage stats | admin | R | tab `enrichment` | GET `/api/admin/enrichment/coverage` | `S export-link-health.ts:1377` | admin | |
| INV-113 | AI Researcher (start run, config, brief, jobs, events, cancel) | admin | R/W | tabs `researcher` and `research` (`ResearcherTab.tsx`, `ResearchWorkspace.tsx`, `ResearchRunView.tsx`, `ResearchLaunchGuide.tsx`) | POST `/api/researcher/start`; GET `/config`, `/brief`, `/jobs`, `/jobs/:id`, `/jobs/:id/events`; DELETE `/jobs/:id` | `S ai-jobs.ts:340,510,540,551,576,587,604` | admin | **Paid, multi-step agent run** (`server/ai/researchService.ts`, `agentRuntime.ts`). Discovers new resources |
| INV-114 | Researcher discoveries review (approve one / all, reject) | admin | R/W | `ResearchRunDiscoveries.tsx`, `useDiscoveryReview.tsx` | GET `/api/researcher/discoveries`; POST `/discoveries/approve-all`, `/:id/approve`, `/:id/reject` | `S ai-jobs.ts:621,637,657,681` | admin | Approve inserts live resources |
| INV-115 | Claude URL analyser | admin | W | resource form helper (single caller) | POST `/api/claude/analyze` | `S admin-content.ts:1321` | admin + `aiLimiter` | **Paid AI call** per click |
| INV-116 | AI health | admin/system | R | tab `enrichment`/ops | GET `/api/health/ai` (`?deep=1` is admin-only) | `S operations.ts:115` | public shallow; deep needs admin | Shallow response public: availability only |
| INV-117 | GitHub sync: configure, import, export, status, history, queue | admin | R/W | tab `github` (`GitHubSyncPanel.tsx`, `GitHubImportPreview.tsx`) | POST `/api/github/configure`, `/import`, `/export`, `/process-queue`; GET `/sync-status`, `/sync-status/:id`, `/sync-history`, `/awesome-lists`, `/search`; POST `/api/admin/import-github` | `S export-link-health.ts:183,211,294,627,431,501,519,1990,2007,1301` | admin | **Export commits to the list repo** (GitHub token). `/configure`, `/process-queue`, `/awesome-lists`, `/search` have no client caller. Export runs a pre-export link check unless `EXPORT_LINK_CHECK=off` (`github/syncService.ts:1169`) |
| INV-118 | Data exports (markdown/JSON/CSV/OPML) | admin | R | tab `export` (`ExportTab.tsx`) | POST `/api/admin/export`; GET `/api/admin/export-csv`, `/export-opml`, `/export-json` | `S export-link-health.ts:648,695,736,825` | admin | Read-only downloads except POST `/export`, which builds the markdown (check whether it also pushes: **not traced**). JSON export once leaked hashes per memory note |
| INV-119 | Database backups (list, create) | admin | R/W | tab `database` (`DatabaseBackupPanel.tsx`, `DatabaseTab.tsx`) | GET/POST `/api/admin/database-backups` | `S export-link-health.ts:1032,1055`; `server/backup/databaseBackup.ts` | admin | Create writes a backup. **No restore endpoint found in routes**; restore deferred anyway |
| INV-120 | Digest queue health + hourly digest email run | admin/system | R | tab `digests` (`DigestQueueHealth.tsx`) | GET `/api/admin/digests/health`; scheduler `digestScheduler.ts` | `server/api/notifications.ts:199`; `server/services/digestService.ts:1196-1206` | admin | **Sends email** hourly for opted-in users via `sendTransactionalEmail` (`server/email.ts:121`). See jobs |
| INV-121 | Link health scan (run now, cancel, status, history, broken list) | admin/system | R/W | tab `linkhealth` (`LinkHealthDashboard.tsx`, `LinkHealthTrendChart.tsx`) | POST `/api/admin/link-health/run`, DELETE `/api/admin/link-health/jobs/:id`; GET `/status`, `/history`, `/broken-links`; legacy POST `/api/admin/check-links`, POST `/api/admin/validate`, GET `/api/admin/validation-status` | `S export-link-health.ts:1184,1201,1172,1224,1236,1134,1082,1152` | admin | Outbound HTTP to every resource URL. **A completed scan auto-applies remediation in prod** (INV-123) |
| INV-122 | Contact retention purge | system | W | none | scheduler `contactRetentionScheduler.ts` | `server/jobs/contactRetentionScheduler.ts` | n/a | Hourly; deletes submissions older than `retention_days` (default 180) in batches of 500, max 20 batches |
| INV-123 | Link remediation: plan, apply, ignore | admin/system | R/W | tab `linkhealth` → `LinkRemediationPanel.tsx` | GET `/api/admin/link-health/remediation`; POST `/remediation/apply`; POST `/resources/:id/ignore` | `S link-remediation.ts:72,80,85`; `server/services/linkRemediation.ts:365` | admin | **Archives (hides) or restores or rewrites URLs on live resources.** Auto-run in prod after every scan (`linkHealthService.ts:386`). Breaker: refuses if > 2% of scanned catalog (`MAX_ARCHIVE_SHARE`, floor 10) |
| INV-124 | Seed / clear & re-seed from source repo | admin | W | tab `database` | POST `/api/admin/seed-database` | `S export-link-health.ts:1253`; `server/seed.ts` | admin | **Destructive** with `clearExisting`. Also fires automatically at boot if categories and resources are both 0 (`routes.ts:419+`) |
| INV-125 | Maintenance one-offs (backfill approvedAt, canonicalise tags) | admin | W | none | POST `/api/admin/maintenance/backfill-approved-at`, `/canonicalize-tags` | `S export-link-health.ts:1409,1449` | admin | Orphan candidates (only archived scripts call them) |
| INV-126 | Operations health panel | admin | R | admin ops | GET `/api/admin/operations/health` | `S operations.ts:85` | admin | |

### 1H. Background / boot (system)

| ID | Feature | Aud | R/W | Entry | Code | Notes |
|---|---|---|---|---|---|---|
| INV-130 | Production migrations runner | system | W (schema) | boot (prod only) | `server/index.ts:564`; `server/migrate.ts` | Process exits if it fails. Dev skips |
| INV-131 | Link health scheduler | system | W | boot | `server/jobs/linkHealthScheduler.ts`; `index.ts:753` | First tick 60 s after boot, then every 10 min checks if last scan is older than `LINK_HEALTH_INTERVAL_HOURS` (prod 24). 0 = off, only recovers interrupted jobs |
| INV-132 | Auto remediation after scan | system | W | inside scan completion | `server/services/linkHealthService.ts:386`; `linkRemediation.ts:64` | Only when `LINK_HEALTH_REMEDIATION=apply` (prod sets it) |
| INV-133 | Digest scheduler | system | W (email) | boot | `server/jobs/digestScheduler.ts`; `index.ts:754` | 15 s after boot, then hourly, `limit: 20` per cycle; multi-instance safe via claim (workerId) |
| INV-134 | Contact retention scheduler | system | W | boot | `server/jobs/contactRetentionScheduler.ts`; `index.ts:755` | 30 s after boot, then hourly. Skipped in tests |
| INV-135 | Orphan job watchdog | system | W | `runBackgroundInitialization` | `server/jobs/orphanJobWatchdog.ts:156,186`; `routes.ts:419-430` | At startup marks pending/processing enrichment jobs `failed` ("orphaned by restart"); periodic sweep with 5 min threshold. A second deployment sharing the DB must set `DISABLE_BACKGROUND_JOBS=1` |
| INV-136 | Auto-seed on empty DB | system | W | `runBackgroundInitialization` | `server/routes.ts:419+` | Only when 0 categories and 0 resources |
| INV-137 | Resource kind backfill | system | W | every boot | `routes.ts` (after auto-seed) | Fills NULL `kind` only, never overwrites |
| INV-138 | SSR renderer prewarm | system | R | boot | `server/index.ts:705-715` | |
| INV-139 | Public catalog cache | system | R/W | request path | `server/cache/publicCache.ts`; `server/db/index.ts` (`runInTransaction`/`afterCommit`) | Invalidated on admin writes; see skill `public-cache-freshness` |

## 2. Write paths (non-GET) — catalogue of deferred actions

Every row is `write path, deferred`. "Effect" is from reading the handler registration and its callee names, not from running it.

| Feature | Method path | Effect | Class |
|---|---|---|---|
| Admin login | POST `/api/auth/admin-login` | Sets owner session cookie | session |
| Admin logout | POST `/api/auth/admin-logout` | Ends session | **sign-out, banned** |
| Sign out all | POST `/api/auth/logout-all` | Revokes every session of the user | **sign-out, banned** |
| Dead-link beacon | POST `/api/telemetry/dead-link` | Log line only | log |
| Contact form | POST `/api/contact` | DB row in contact submissions | DB (visitor PII) |
| Digest unsubscribe | POST `/unsubscribe/digest/:token` | Turns digests off for a user | DB |
| Submit resource | POST `/api/resources`, `/api/submit` | Pending resource row | DB |
| Suggest edit | POST `/api/resources/:id/edits` | Pending edit row | DB |
| Withdraw contribution | POST `/api/user/contributions/:kind/:id/withdraw`; DELETE `/api/user/submissions/:id` | Withdraws own item | DB |
| Report link | POST `/api/resources/:id/link-report` | Link report row | DB |
| Bookmarks | POST/DELETE `/api/bookmarks/:resourceId`, PATCH `/:resourceId/state`, POST `/bulk` | Bookmark rows | DB |
| Favorites | POST/DELETE `/api/favorites/:resourceId` | Favorite rows | DB |
| Collections | POST `/api/collections`; PUT `/reorder`; PATCH/DELETE `/:collectionId`; POST/DELETE `/:collectionId/items/:resourceId`; POST/DELETE `/:collectionId/publish` | Collection rows; publish makes public share link | DB |
| API keys | POST `/api/user/api-keys`; DELETE `/api/user/api-keys/:id` | Mint / revoke key | DB (credential) |
| Profile / prefs | PATCH `/api/user/profile`; PUT/DELETE `/api/user/preferences` | User row / prefs | DB |
| Account deletion | POST/DELETE `/api/user/deletion-request` | Pending deletion flag | DB |
| Journeys (member) | POST `/api/journeys/:id/start`; PUT `/api/journeys/:id/progress` | Progress rows | DB |
| Recommendations | POST `/api/recommendations` | Generates recommendations | DB only (LEAD CORRECTION: engine is rule-based, no AI client) |
| Rec feedback | POST `/api/recommendations/feedback`; PUT/POST `/api/recommendations/:resourceId/feedback`; POST `/api/interactions` | Feedback/interaction rows | DB |
| Notifications | PUT/PATCH `/api/notification-preferences`; PATCH `/api/notifications/:id/read`; POST `/api/notifications/read-all` | Prefs / read flags | DB |
| Approvals | POST `/api/admin/resources/:id/approve|reject|unapprove`, `/bulk/approve|reject|delete`; PUT `/api/resources/:id/approve|reject` | Changes public visibility | DB (live site) |
| Edit approvals | POST `/api/admin/resource-edits/:id/approve|reject` | Applies edit to live resource | DB (live site) |
| Resource CRUD | POST `/api/admin/resources`; PUT/DELETE `/api/admin/resources/:id`; PATCH `/:id/kind`, `/:id/featured` | Live catalog edits | DB (live site) |
| Taxonomy CRUD | POST/PATCH/DELETE `/api/admin/categories`, `/subcategories`, `/sub-subcategories` | Live navigation edits | DB (live site) |
| User admin | PATCH `/api/admin/users/:id/name`; PUT `/:id/role`; DELETE `/:id`; POST `/:id/link-clerk` | Privilege / account changes | DB |
| Link reports | PATCH `/api/admin/link-reports/:resourceId/:reporter` | Resolve report | DB |
| Journeys admin | PUT `/api/admin/journeys/:id`; POST `/:id/steps`; PATCH/DELETE `/:journeyId/steps/:stepId`; POST `/:id/steps/reorder` | Live journey content | DB (live site) |
| Enrichment | POST `/api/enrichment/start`; DELETE `/api/enrichment/jobs/:id`; POST `/api/admin/enrichment/backfill-suggestions` | Job row, Claude calls, writes resource metadata | **paid AI** (+DB) |
| Researcher | POST `/api/researcher/start`; DELETE `/api/researcher/jobs/:id`; POST `/discoveries/approve-all`, `/discoveries/:id/approve|reject` | Agent run, discovery rows, inserts resources on approve | **paid AI** (+DB live) |
| Claude analyze | POST `/api/claude/analyze` | One model call | **paid AI** |
| GitHub | POST `/api/github/configure`, `/import`, `/export`, `/process-queue`; POST `/api/admin/import-github` | Store config; import from GitHub into DB; export commits to list repo | **GitHub commit / import** |
| Export build | POST `/api/admin/export` | Build markdown export (push behaviour not traced) | file / possibly GitHub |
| Backups | POST `/api/admin/database-backups` | Create DB backup | backup |
| Validate / link check | POST `/api/admin/validate`, `/check-links`, `/link-health/run`; DELETE `/link-health/jobs/:id` | Outbound HTTP scan; job rows. Completion triggers remediation in prod | scan → **remediation** |
| Remediation | POST `/api/admin/link-health/remediation/apply`; POST `/api/admin/link-health/resources/:id/ignore` | Archive / restore / rewrite URL on live resources; ignore flag | **link remediation apply** |
| Seed | POST `/api/admin/seed-database` | Seed or clear-and-reseed | **seed** |
| Maintenance | POST `/api/admin/maintenance/backfill-approved-at`, `/canonicalize-tags` | Bulk data updates | DB |
| Digest cycle | scheduler only (no POST route) | Emails opted-in users | **email** |
| Clerk proxy | `/api/__clerk/*` (all verbs) | Auth traffic to Clerk | session |

## 3. Orphan candidates

Method: `grep -F` of the path fragment across `client/src`, `shared`, `client/public`, `scripts`. Confidence is medium: dynamic path construction would hide a caller.

**Endpoints with no client caller found**

| Endpoint | Code | Comment |
|---|---|---|
| GET `/api/resource/:id` (singular alias) | `S catalog-contributions.ts:719` | Alias of `/api/resources/:id` |
| GET `/api/auth/me` | `S auth-user.ts:111` | Marked deprecated (`Deprecation` header) |
| GET `/api/auth/status` | `S auth-user.ts:195` | |
| GET `/api/link-health/summary` | `S link-remediation.ts:62` | Public, no UI |
| GET `/api/recommendations/init` | `S journeys-recommendations.ts:644` | |
| GET `/api/resources/pending` | `S catalog-contributions.ts:953` | Admin; admin UI uses `/api/admin/pending-resources` |
| PUT `/api/resources/:id/approve`, `/reject` | `S catalog-contributions.ts:972,1008` | Admin UI uses the `/api/admin/resources/:id/...` POST family (grep of `client/src` for `/approve` outside `admin/` paths finds only the researcher discovery calls) |
| GET `/api/user/submissions`, DELETE `/api/user/submissions/:id` | `S user-features.ts:1219,1357` | Superseded by `/api/user/contributions` |
| POST `/api/admin/users/:id/link-clerk` | `S admin-content.ts:421` | |
| POST `/api/admin/enrichment/backfill-suggestions` | `S ai-jobs.ts:253` | Possibly paid AI |
| POST `/api/admin/maintenance/backfill-approved-at`, `/canonicalize-tags` | `S export-link-health.ts:1409,1449` | Only archived scripts reference them |
| POST `/api/github/configure`, POST `/api/github/process-queue`, GET `/api/github/awesome-lists`, GET `/api/github/search` | `S export-link-health.ts:183,627,1990,2007` | GitHub panel does not call them |
| GET `/api/version`, `/api/openapi.json`, `/api/docs` | `server/version-route.ts:51`; `S operations.ts:206,211` | Intentional external consumers; `/api/docs` and OpenAPI have no in-app link |
| GET/POST `/unsubscribe/digest/:token` | `server/api/notifications.ts` | Email-link target; not an orphan |

**Client pages/routes with no nav entry found** (grep of `components/layout` links: `/admin`, `/bookmarks`, `/terms`, `/privacy`, `/code-of-conduct`, `/about`, `/profile`, `/notifications`, `/settings`, `/settings/theme`, `/sitemap`)

| Route | Comment |
|---|---|
| `/design-system` | Showcase routed in production (`App.tsx:964`) |
| `/advanced` | No layout link matched; may be linked from Home or footer (not checked beyond `components/layout`) |
| `/onboarding` | Reached by redirect flow, not nav |
| `/continue-learning`, `/journeys`, `/recommendations`, `/submit`, `/contributions` | No match in `components/layout`; likely linked from Home, profile menu or sidebar (`components/layout/new/*` was only name-grepped). Treat as **unverified**, not proven orphans |
| `/logout` | Route exists (`App.tsx:860`); banned to visit |

Also dead-looking: `/explore`, `/resource` (bare), `/tag` (bare), `/category` (bare), `/subcategory` (bare), `/sub-subcategory` (bare), `/journey` (bare) are redirect-only routes.

## 4. Env flags

Source: `.replit` `[userenv.*]` plus `grep process.env` over `server/` and `import.meta.env` over `client/src`. "Prod value" is only what `.replit` declares; Replit Secrets are not visible from code, so secrets show "secret (not visible)".

| Flag | Where read | Switches | Default | Prod value |
|---|---|---|---|---|
| `LINK_HEALTH_INTERVAL_HOURS` | `server/jobs/linkHealthScheduler.ts:10` | Hours between automatic full link scans; 0 = off | 24 | `24` (`.replit [userenv.production]`) |
| `LINK_HEALTH_REMEDIATION` | `server/services/linkRemediation.ts:65` | `apply` = after every completed scan, archive dead links / restore / rewrite moved URLs automatically; anything else = plan only | plan | **`apply`** |
| `CONTACT_ENABLED` | `server/config.ts:167` | Master switch for POST `/api/contact` | false (must equal `"true"`) | `true` (shared) |
| `VITE_CONTACT_VARIANT` | client (9 uses) | Which contact UI variant shows | none | `b` (shared) |
| `CONTACT_ISSUES_URL` | `server/config.ts` contact block | Issues link for contact destinations | blank | `https://github.com/krzemienski/awesome-video/issues` |
| contact `retention_days` (YAML, not env) | `server/config.ts:159,175` | Days before submissions are purged | 180 | not in `.replit` |
| `DISABLE_BACKGROUND_JOBS` | `server/index.ts:741` | `1` skips background init, orphan watchdog and all three schedulers | unset | unset in `.replit` (Secrets not visible) |
| `EXPORT_LINK_CHECK` | `server/github/syncService.ts:1169` | `off` skips the pre-export link check | on | unset |
| `NODE_ENV` | many | Production: runs migrations, static SSR, secure cookies | n/a | production at runtime |
| `PORT` | `server/index.ts:722` | Listen port | 5000 | platform |
| `PUBLIC_SITE_URL` | `index.ts:269,427`; others | Canonical host / URLs | `https://awesome.video` | not in `.replit` |
| `REPLIT_PUBLISH_IMAGE_TRIM` | `.replit` | Replit publish image trimming | none | `1` (production) |
| `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_{FABLE,HAIKU,OPUS,SONNET}_MODEL` | `server/ai/anthropicConfig.ts` etc. | Where paid AI calls go and which model | n/a | `https://router.hack.ski`; `cc/claude-sonnet-5` etc. (shared, so **also applies in prod**). The `.replit` also sets a `cc/claude-fable-5` mapping; memory note says Fable is forbidden for agent runs, this is the app's own config |
| `OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_*` | `server/ai/embeddingService.ts` etc. | Embeddings / OpenAI fallback | n/a | secret (not visible) |
| `ADMIN_PASSWORD` / `OWNER_PASSWORD` | `server/passwordUtils.ts`, `auth-user.ts` | Owner password login | n/a | secret (not visible) |
| `SESSION_SECRET` | `server/config.ts:163` | Session signing and HMAC for contact IP hash | n/a | secret (not visible) |
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL` | `server/clerkAuth.ts`, `index.ts:53,452` | Auth provider | n/a | secrets (per memory note, prod Clerk key dead; do not touch) |
| `GITHUB_TOKEN`, `GITHUB_PUSH_TOKEN`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `GITHUB_REPO_URL` | `server/github/*` | Credentials / target for sync | n/a | secrets / Replit GitHub integration |
| `CONFIG_ENCRYPTION_KEY` | `server/ai/configCrypto.ts` | Encrypts stored researcher config | n/a | secret |
| `DATABASE_URL` | `server/db` | Postgres | n/a | secret |
| `SEED_SOURCE_URL`, `AWESOME_RAW_URL` | `server/seed.ts`, `server/github` | Source of seed / import | repo default | unset |
| `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | object storage | Replit object storage | n/a | platform |
| `VITE_SITE_URL`, `VITE_SITE_TITLE`, `VITE_SITE_DESCRIPTION`, `VITE_DEFAULT_THEME` | client/SSR | Site metadata and default theme | n/a | `https://awesome.video`, `Awesome Video`, description, `dark` |
| `VITE_AMPLITUDE_API_KEY`, `VITE_MIXPANEL_TOKEN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_GA_MEASUREMENT_ID` | `hooks/use-analytics.tsx`, `main.tsx` | Analytics vendors | none | Amplitude, Mixpanel, PostHog set (shared, so on in prod); GA unset. (Memory note: these `.replit` keys are PRODUCTION projects.) Values intentionally not copied here |
| `REPLIT_DEPLOYMENT`, `REPLIT_GIT_COMMIT_SHA`, `GITHUB_SHA`, `BUILD_REVISION` | `server/version-route.ts` | Build identity for `/api/version` | n/a | platform |
| `WEBSITE_URL`, `MIXPANEL_TOKEN` | server | Misc site URL / server-side Mixpanel | n/a | unset in `.replit` |

## 5. Gaps in this inventory (nothing exercised)

- Handler bodies were not run. R/W and "paid AI" labels come from names, middleware and registration, not from observed behaviour.
- `S operations.ts` also contains 405 fallbacks and a catch-all `/api` 404; not counted as features.
- Digest sending: confirmed there is an hourly job and a shared `sendTransactionalEmail`; not confirmed what provider or whether it is configured in prod.
- POST `/api/admin/export`: whether it only builds a file or also pushes to GitHub was not traced.
- Admin tabs `journeys`, `digests`, `subsubcategories` are not in the 15-entry visible strip; `AdminDashboard.tsx:118` maps them to a "Settings" menu section (labels Journeys, Digests, Sub-Subcats); the menu markup was not read.
- Several member pages (`/journeys`, `/recommendations`, `/submit`, `/contributions`) may have nav links outside `components/layout`; orphan status is unproven.
- Replit Secrets cannot be seen from code, so which optional integrations (OpenAI, email transport, GitHub token) are live in production is unknown.
