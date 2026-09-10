# Discovered screen and state inventory

Widths for every pixel-gated state: **375, 768, 1024, 1440 CSS px**. A row is scope, not proof of a rendered or passing state. Production-only surfaces remain explicitly token-only where no governing counterpart exists. Detailed source/state analysis is in inspection/pages.md, admin.md, shell.md, and foundations.md. Capture IDs and temporary aliases are reconciled in tests/parity/inventory.json; duplicates must not count as separate proof.

## Routes

| Stable discovery ID | Route / role | Production component | Governing source counterpart | State / real data prerequisites | Classification | Re-skin/rebuild status |
|---|---|---|---|---|---|---|
| screen.home.default | / / public | client/src/pages/Home.tsx | pages.jsx home Index/Curated; home-layouts.jsx | nav + awesome-list corpus | pixel-gated | Not implemented or pixel-verified in this work |
| screen.auth.sign-in | /sign-in/*? / public/auth | client/src/App.tsx SignInPage | pages-extra.jsx Login | Clerk | pixel-gated | Not implemented or pixel-verified in this work |
| screen.auth.sign-up | /sign-up/*? / public/auth | client/src/App.tsx SignUpPage | pages-extra.jsx Login | Clerk | pixel-gated | Not implemented or pixel-verified in this work |
| screen.categories | /categories / public | client/src/pages/Categories.tsx | pages.jsx categories/listing | nav tree | pixel-gated | Not implemented or pixel-verified in this work |
| screen.category | /category/:slug / public | client/src/pages/Category.tsx | pages.jsx category | listing API category slug/page/filter/view | pixel-gated | Not implemented or pixel-verified in this work |
| screen.subcategory | /subcategory/:slug / public | client/src/pages/Subcategory.tsx | pages.jsx subcategory | listing API subcategory slug | pixel-gated | Not implemented or pixel-verified in this work |
| screen.subsubcategory | /sub-subcategory/:slug / public | client/src/pages/SubSubcategory.tsx | pages.jsx sub-subcategory | listing API leaf slug | pixel-gated | Not implemented or pixel-verified in this work |
| screen.tag | /tag/:slug / public | client/src/pages/TagLanding.tsx | pages-extra.jsx tag-related | tag resources | token-only | Not implemented or pixel-verified in this work |
| screen.resource | /resource/:id / public | client/src/pages/ResourceDetail.tsx | pages.jsx resource detail | resource id | pixel-gated | Not implemented or pixel-verified in this work |
| screen.search | /search / public | client/src/pages/Search.tsx | pages.jsx search | q/tags/page/view/filter query | pixel-gated | Not implemented or pixel-verified in this work |
| screen.advanced | /advanced / public | client/src/pages/Advanced.tsx | pages.jsx advanced | corpus + tab/sub query | pixel-gated | Not implemented or pixel-verified in this work |
| screen.submit | /submit / authenticated | client/src/pages/SubmitResource.tsx | pages-core.jsx submit/auth gate | auth + form submission | pixel-gated | Not implemented or pixel-verified in this work |
| screen.about | /about / public | client/src/pages/About.tsx | pages.jsx about | static | pixel-gated | Not implemented or pixel-verified in this work |
| screen.journeys | /journeys / public | client/src/pages/Journeys.tsx | pages.jsx learning journeys | journeys API | pixel-gated | Not implemented or pixel-verified in this work |
| screen.journey-detail | /journey/:id / public/auth interactions | client/src/pages/JourneyDetail.tsx | pages.jsx journey detail | journey id + steps/auth progress | pixel-gated | Not implemented or pixel-verified in this work |
| screen.collection | /collection/:shareId / public | client/src/pages/PublicCollection.tsx | pages-extra.jsx collection family | shareId collection | token-only | Not implemented or pixel-verified in this work |
| screen.bookmarks | /bookmarks / guest/auth | client/src/pages/BookmarksGate.tsx + Bookmarks.tsx | pages-extra.jsx bookmarks | guest storage or auth bookmarks | token-only | Not implemented or pixel-verified in this work |
| screen.profile | /profile / authenticated | client/src/pages/Profile.tsx | pages-extra.jsx profile | user profile | token-only | Not implemented or pixel-verified in this work |
| screen.contributions | /contributions / authenticated | client/src/pages/Contributions.tsx | pages-extra.jsx contributions | user contributions | token-only | Not implemented or pixel-verified in this work |
| screen.notifications | /notifications / authenticated | client/src/pages/Notifications.tsx | pages-extra.jsx settings family | user notifications | token-only | Not implemented or pixel-verified in this work |
| screen.settings | /settings / public/auth | client/src/pages/Settings.tsx | pages-core.jsx settings | preferences | pixel-gated | Not implemented or pixel-verified in this work |
| screen.theme | /settings/theme / public/auth | client/src/pages/ThemeSettings.tsx | pages-core.jsx theme | theme registry + persistence | pixel-gated | Not implemented or pixel-verified in this work |
| screen.onboarding | /onboarding / authenticated | client/src/pages/Onboarding.tsx | pages-extra.jsx onboarding | profile/preferences | token-only | Not implemented or pixel-verified in this work |
| screen.admin | /admin and /admin/:section / admin | client/src/pages/AdminDashboard.tsx | admin.jsx | admin APIs + section parameter | pixel-gated | Not implemented or pixel-verified in this work |
| screen.design-system | /design-system / public | client/src/pages/DesignSystemShowcase.tsx | design-system-showcase.jsx | design-system registry | pixel-gated | Not implemented or pixel-verified in this work |
| screen.legal | /terms, /privacy, /code-of-conduct / public | client/src/pages/Terms.tsx, Privacy.tsx, CodeOfConduct.tsx | pages-extra.jsx legal | static | token-only | Not implemented or pixel-verified in this work |
| screen.error.not-found | unknown route (and route fallback) / public | client/src/pages/not-found.tsx | pages-extra.jsx 404 | none | pixel-gated | Not implemented or pixel-verified in this work |
| screen.error.load | any route / all | client/src/App.tsx RouteFallback/ErrorPage | layout.jsx loading/error patterns | query/chunk error | token-only | Not implemented or pixel-verified in this work |

## Admin tabs

Route /admin#<tab> (and supported /admin/<tab> aliases), admin role, real authorized session and real endpoint data. Source counterparts in awesome-list-site-ds/admin.jsx are often demonstrations; bind authorized real data before admitting a pixel comparison. Production-only tabs use shared admin tokens, not invented reference panels. All rows require all four widths.

| ID | Tab | Source-counterpart status | Implementation / capture state |
|---|---|---|---|
| screen.admin.approvals | approvals | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.edits | edits | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.enrichment | enrichment | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.researcher | researcher | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.export | export | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.database | database | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.resources | resources | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.categories | categories | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.subcategories | subcategories | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.subsubcategories | subsubcategories | Production-only; token-only pending explicit source mapping | Existing production behavior preserved; authorized capture not run |
| screen.admin.journeys | journeys | Production-only; token-only pending explicit source mapping | Existing production behavior preserved; authorized capture not run |
| screen.admin.users | users | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.github | github | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.linkhealth | linkhealth | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |
| screen.admin.digests | digests | Production-only; token-only pending explicit source mapping | Existing production behavior preserved; authorized capture not run |
| screen.admin.audit | audit | admin.jsx counterpart; see admin report | Existing production behavior preserved; authorized capture not run |

## Additional genuine states and missing product surfaces

| Stable ID / family | Route / access | Production / governing source | Required state and data | Classification / width | Status |
|---|---|---|---|---|---|
| app.home.curated | /; public | Home.tsx / home-layouts.jsx Curated | Persisted Curated selection; same approved resources and genuine featured flags | pixel-gated / all four | Missing production layout |
| app.home.kinds | /; public | Home.tsx / home-layouts.jsx AV_KINDS | Each of the actual supported kinds; honest unknown values for unclassified data | pixel-gated / all four | Missing kind storage/control |
| app.shell.default | every shell route; public/user/admin | AppHeader, AppSidebar, AppFooter / layout.jsx, sidebar-variants.jsx | Role-aligned identity; expanded and collapsed state; real nav counts | pixel-gated / all four | Not remediated |
| app.shell.palette | supported keyboard shortcut and trigger; public | search-dialog / layout.jsx command palette | Open with focus, typed results and empty result state | pixel-gated / all four | Not compared |
| app.shell.mobile-drawer | /; public | AppSidebar + Sheet / layout.jsx MobileDrawer | Open drawer, submenu/L3, Escape/return focus | pixel-gated / 375; closed/tablet behavior at 768/1024/1440 | Not compared |
| app.sidebar.expanded / collapsed / l3 | category route; public | AppSidebar / sidebar-variants.jsx | 280/240px expanded, 56px rail, L3 expanded, persisted state | pixel-gated / all four where source supports state | Not remediated |
| app.search.results / empty | /search; public | Search / pages.jsx search source | Real query with results / real query with zero results | pixel-gated / all four | Not compared |
| app.submit.validation / success / error | /submit; signed-out/user | SubmitResource / pages.jsx submit | Genuine form validation; authorized throwaway submission and cleanup for success | pixel-gated / all four | Not exercised |
| app.resource.edit-suggestion | /resource/:id; user | suggest-edit-dialog / canonical dialog patterns | Existing approved resource; create/edit/error/unsaved state | pixel-gated if concrete source mapped, otherwise token-only / all four | Not exercised |
| app.admin.resource.create / edit / delete | /admin#resources; admin | GenericCrudManager / admin.jsx Resources | Real authorized account; throwaway data only; inline errors, cancellation, persistence and cleanup | pixel-gated / all four | No mutations or captures run |
| app.admin.queue.detail / approve / reject | /admin#approvals; admin | PendingResources / admin.jsx Approvals | Genuine pending data, separate audit-safe actions and cleanup | pixel-gated / all four | Not exercised |
| app.theme.system / accent / font | /settings/theme; public | ThemeSettings + theme-provider / design-systems.jsx | All 5 systems, 10 accents, invalid/denied storage, font override | pixel-gated Editorial × Crimson; other systems smoke/token-only / all four | Preserved, not reverified |
| contact.disabled | configured placements; public | No new implementation / explicit execution brief | VITE_CONTACT_VARIANT unset or invalid; server endpoint separately disabled | behavioral smoke / all four | Not implemented or exercised |
| contact.a | footer; public | AppFooter / footer email and repository issue links | Configuration-derived, real email and repository destinations | requested screenshot / all four | Missing implementation; unavailable destination must block |
| contact.b | modal; public with abuse controls | Additive form and /api/contact / explicit execution brief | Separate server enablement, validation, rate limiting, real persistence or delivery | requested screenshot and real submission / all four | Missing implementation; never fake success |
| contact.c | configured placement; public | GitHub Discussions / actual platform-supported integration or embed | Real configured repository with Discussions capability | requested screenshot / all four | Capability and destination unverified |
| contact.d | /resource/:id; authorized contributor | Existing suggest-edit-dialog and edit-suggestion queue | Reuse real resource edit queue; visible result and persisted suggestion with cleanup | requested screenshot and real action / all four | Existing queue present; flag-gated variant not implemented |
| contact.e | command palette; public | search-dialog / “Contact maintainers” action | Supported configured destination; no default-on action | requested screenshot / all four | Missing implementation |
| artifact.showcase / anatomy | registered design-system artifact; public | artifacts/awesome-video-design-system / design-system.html | Actual registered artifact, not mockup; Editorial × Crimson | pixel-gated / all four | Existing artifact not remediated |
| artifact.docs.* | actual artifact navigation; public | artifacts/awesome-video-design-system / docs.html actual chapter routes | Each of 21 authored reference chapters; missing actual chapters remain visible blockers | pixel-gated / all four | Missing counterpart mapping/capture |
| reference.standalone.* | historical vendor entries | index.standalone.html and Awesome.Video - Standalone.html | Historical source provenance only; modular source governs requested features | reference-only, not a substitute parity baseline | Preserved unchanged from archive |
| app.loading / error / not-found | relevant route state | ErrorBoundary, ErrorPage, Skeleton, not-found / source error patterns when present | Real load/failure state; no fabricated API response | token-only unless concrete pixel counterpart exists / all four | Not exercised |

## Route aliases

/login,/register,/forgot-password,/reset-password,/auth/login,/auth/register,/signup -> Clerk; /explore -> /search; /resource -> /search; /category/:slug/:subSlug -> /subcategory/:subSlug; /tag -> /categories; /category -> /; /subsubcategory/:slug -> /sub-subcategory/:slug; /journey -> /journeys; /favorites -> /profile?tab=favorites; /account -> /profile

## Evidence limits

The initial smoke screenshot caught crawler prerender content before the client was ready and is **not** a baseline. A second direct browser capture awaited the actual list-categories element and rendered nine real category cards with resource teasers. Neither screenshot proves pixel parity, keyboard accessibility, authentication, or four-width coverage. A helper follow-up returned unrelated media-site routes and no requested local documentation; that report and its remote screenshot claims are excluded entirely.
