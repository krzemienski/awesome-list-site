# Discovered screen and state inventory

Widths for every pixel-gated state: **375, 768, 1024, 1440 CSS px**. A row is scope, not proof of a rendered or passing state. Production-only surfaces remain explicitly token-only where no governing counterpart exists. Detailed source/state analysis is in inspection/pages.md, admin.md, shell.md, and foundations.md. Capture IDs and temporary aliases are reconciled in tests/parity/inventory.json; duplicates must not count as separate proof.

## Routes

| Stable discovery ID | Route / role | Production component | Governing source counterpart | State / real data prerequisites | Classification | Re-skin/rebuild status |
|---|---|---|---|---|---|---|
| screen.home.default | / / public | client/src/pages/Home.tsx | pages.jsx home Index/Curated; home-layouts.jsx | nav + awesome-list corpus | pixel-gated | Not implemented or pixel-verified in this work |
| screen.auth.sign-in | /sign-in/*? / public/auth | client/src/App.tsx SignInPage | pages-extra.jsx Login | Clerk | pixel-gated | Normal-app real-Nick authentication functional PASS: sign-in, admin API 200, reload retention, readiness-aware cache-bypass token refresh, UI sign-out/API 401, and protected-route return. This is not pixel proof. |
| screen.auth.sign-up | /sign-up/*? / public/auth | client/src/App.tsx SignUpPage | pages-extra.jsx Login | Clerk | pixel-gated | Covered only as the real disposable identity setup prerequisite for the normal-auth functional lane; not pixel-verified. |
| screen.categories | /categories / public | client/src/pages/Categories.tsx | pages.jsx categories/listing | nav tree | pixel-gated | Not implemented or pixel-verified in this work |
| screen.category | /category/:slug / public | client/src/pages/Category.tsx | pages.jsx category | listing API category slug/page/filter/view | pixel-gated | Not implemented or pixel-verified in this work |
| screen.subcategory | /subcategory/:slug / public | client/src/pages/Subcategory.tsx | pages.jsx subcategory | listing API subcategory slug | pixel-gated | Not implemented or pixel-verified in this work |
| screen.subsubcategory | /sub-subcategory/:slug / public | client/src/pages/SubSubcategory.tsx | pages.jsx sub-subcategory | listing API leaf slug | pixel-gated | Not implemented or pixel-verified in this work |
| screen.tag | /tag/:slug / public | client/src/pages/TagLanding.tsx | pages-extra.jsx tag-related | tag resources | token-only | Not implemented or pixel-verified in this work |
| screen.resource | /resource/:id / public | client/src/pages/ResourceDetail.tsx | pages.jsx resource detail | resource id | pixel-gated | Focused guest breadcrumb ancestor-disclosure behavior [PASS](evidence/integration-shell/task565-breadcrumb-disclosure-2026-09-13/REPORT.md) at 768/1024; trigger intentionally absent at 375/1440. This is not a fresh four-width full pixel-resource PASS. |
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
| screen.admin | /admin and /admin/:section / admin | client/src/pages/AdminDashboard.tsx | admin.jsx | real Clerk-admin session + section parameter | pixel-gated | Targeted real-Nick `/admin`, hash Research, and direct Research UI/status/axe/action contracts PASS at 375/1440. The separately injected-abort cold read-only diagnostic remains FAIL; it is not a release gate or an auth regression. Broader all-tab pixel/real-data work remains open. |
| screen.design-system | /design-system / public | client/src/pages/DesignSystemShowcase.tsx | design-system-showcase.jsx | design-system registry | token-only | Retained live-token/component evidence; no canonical full-page counterpart, so it is not a pixel PASS |
| screen.legal | /terms, /privacy, /code-of-conduct / public | client/src/pages/Terms.tsx, Privacy.tsx, CodeOfConduct.tsx | pages-extra.jsx legal | static | token-only | Not implemented or pixel-verified in this work |
| screen.error.not-found | unknown route (and route fallback) / public | client/src/pages/not-found.tsx | pages-extra.jsx 404 | none | pixel-gated | Not implemented or pixel-verified in this work |
| screen.error.load | any route / all | client/src/App.tsx RouteFallback/ErrorPage | layout.jsx loading/error patterns | query/chunk error | token-only | Not implemented or pixel-verified in this work |

## Admin tabs

Canonical admin tab navigation is `/admin#<tab>`; do not presume that an
`/admin/<tab>` client deep link is an HTTP-200 transport alias without a
separate status check. Admin rows require an admin role, real authorized session
and real endpoint data. Source counterparts in awesome-list-site-ds/admin.jsx
are often demonstrations; bind authorized real data before admitting a pixel
comparison. Production-only tabs use shared admin tokens, not invented reference
panels. All rows require all four widths.

| ID | Tab | Source-counterpart status | Implementation / capture state |
|---|---|---|---|
| screen.admin.overview | overview | admin.jsx counterpart; see admin report | Targeted real-Nick candidate at 375/1440: HTTP 200, selected active panel, settled serious/critical axe clear, scoped Settings navigation and New-entry dialog PASS. Separately injected-abort read-only diagnostic FAIL is retained without an exception; not a pixel/all-tab acceptance. |
| screen.admin.approvals | approvals | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.edits | edits | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.enrichment | enrichment | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.researcher | researcher | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.research | research | admin.jsx counterpart; canonical hash panel is `tab-research` / `content-research` | Real-Nick `/admin#research` and supported `/admin/research` both returned HTTP 200 with selected review panel and settled serious/critical axe clear at 375/1440. Canonical user-facing form remains the hash URL. Separately injected-abort read-only diagnostic FAIL and broader real-data/pixel acceptance remain open. |
| screen.admin.export | export | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.database | database | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.resources | resources | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.categories | categories | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.subcategories | subcategories | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.subsubcategories | subsubcategories | Production-only; token-only pending explicit source mapping | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate panel capture pending |
| screen.admin.journeys | journeys | Production-only; token-only pending explicit source mapping | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate panel capture pending |
| screen.admin.users | users | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.github | github | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.linkhealth | linkhealth | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |
| screen.admin.digests | digests | Production-only; token-only pending explicit source mapping | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate panel capture pending |
| screen.admin.audit | audit | admin.jsx counterpart; see admin report | Retained authorized `/admin` production baseline at 375/1440 is route-level only; candidate and active-panel capture pending |

## Additional genuine states and missing product surfaces

| Stable ID / family | Route / access | Production / governing source | Required state and data | Classification / width | Status |
|---|---|---|---|---|---|
| app.home.index | /; public | Home.tsx / home-layouts.jsx Index | Index layout with the frozen public category/resource source snapshot | pixel-gated / all four | **PASS** in the current selected Nick matrix: **0.1606 / 0.1053 / 0.1738 / 0.1603%** at 375/768/1024/1440. [Evidence](../../tests/parity/baseline/2026-09-14T16-23-53-893Z-1807/results.json). This is selected-row evidence, not a full inventory claim. |
| app.home.curated | /; public | Home.tsx / home-layouts.jsx Curated | Persisted Curated selection; same approved resources and genuine featured flags | pixel-gated / all four | **PASS** in the current selected Nick matrix: **0.1846 / 0.1977 / 0.2197 / 0.2037%** at 375/768/1024/1440. [Evidence](../../tests/parity/baseline/2026-09-14T16-23-53-893Z-1807/results.json). This is selected-row evidence, not a full inventory claim. |
| app.home.kinds | /; public | Home.tsx / home-layouts.jsx AV_KINDS | Each of the actual supported kinds; honest unknown values for unclassified data | pixel-gated / all four | Missing kind storage/control |
| app.shell.default | every shell route; public/user/admin | AppHeader, AppSidebar, AppFooter / layout.jsx, sidebar-variants.jsx | Role-aligned identity; expanded and collapsed state; real nav counts | pixel-gated / all four | The broad every-route desktop/rail shell assertion remains historical and is distinct from the current selected Home Index/Curated/Drawer/Palette matrix. It has no current all-route pixel claim. [Current evidence limits](evidence/integration-shell/task565-final-evidence-2026-09-13.md#authoritative-current-status) |
| app.shell.palette | supported keyboard shortcut and trigger; public | search-dialog / layout.jsx command palette | Open with focus, typed results and empty result state | pixel-gated / all four | **PASS** in the current selected Nick matrix: **0.4140 / 0.3748 / 0.3185 / 0.3755%** at 375/768/1024/1440. [Evidence](../../tests/parity/baseline/2026-09-14T16-23-53-893Z-1807/results.json). This is selected-row evidence, not a full inventory claim. |
| app.shell.mobile-drawer | /; public | AppSidebar + Sheet / layout.jsx MobileDrawer | Open drawer <=1024; closed desktop at 1440; submenu/L3, Escape/return focus | pixel-gated / all four | **PASS** in the current selected Nick matrix: **0.4176 / 0.3091 / 0.2364 / 0.1603%** at 375/768/1024/1440. [Evidence](../../tests/parity/baseline/2026-09-14T16-23-53-893Z-1807/results.json). This is selected-row evidence, not a full inventory claim. |
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
| artifact.docs.* | actual artifact navigation; public | artifacts/awesome-video-design-system / docs.html actual chapter routes | Each of 21 authored reference chapters | pixel-gated / all four | 21 route mappings and retained four-width captures exist; pixel disposition is downstream artifact-docs work |
| reference.standalone.* | historical vendor entries | index.standalone.html and Awesome.Video - Standalone.html | Historical source provenance only; modular source governs requested features | reference-only, not a substitute parity baseline | Preserved unchanged from archive |
| app.loading / error / not-found | relevant route state | ErrorBoundary, ErrorPage, Skeleton, not-found / source error patterns when present | Real load/failure state; no fabricated API response | token-only unless concrete pixel counterpart exists / all four | Not exercised |

## Route aliases

/login,/register,/forgot-password,/reset-password,/auth/login,/auth/register,/signup -> Clerk; /explore -> /search; /resource -> /search; /category/:slug/:subSlug -> /subcategory/:subSlug; /tag -> /categories; /category -> /; /subsubcategory/:slug -> /sub-subcategory/:slug; /journey -> /journeys; /favorites -> /profile?tab=favorites; /account -> /profile

## Evidence limits

The initial smoke screenshot caught crawler prerender content before the client was ready and is **not** a baseline. A second direct browser capture awaited the actual list-categories element and rendered nine real category cards with resource teasers. Neither screenshot proves pixel parity, keyboard accessibility, authentication, or four-width coverage. A helper follow-up returned unrelated media-site routes and no requested local documentation; that report and its remote screenshot claims are excluded entirely.

## Current Task 565 integration state

The authoritative current status is
[`task565-final-evidence-2026-09-13.md`](evidence/integration-shell/task565-final-evidence-2026-09-13.md#authoritative-current-status).
Historical appendix material must not override it.

- The user-approved exact-tree Home SSR scope is implemented for anonymous
  public Home only. Its bootstrap contains public data only, excludes
  dehydrated auth, fetches auth fresh after hydration, preserves theme and
  legacy Curated/consent behavior, clears the fallback within four seconds, and
  verifies exact configured Clerk CSP without a wildcard. Signed-in and
  request-query paths remain SPA paths; no auth bypass is introduced.
- The mandatory **normal, unintercepted Lighthouse at 82** gate now belongs to
  **Task 572**. The latest real production-build 5105 evidence is historical
  **71/60/68, median 68 FAIL**, because it predates final auth, CSP, and
  recovery fixes:
  [`normal-lighthouse/fixed-3cold/`](evidence/integration-shell/retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold/).
  The local development Clerk configuration differs from the published live-key
  baseline, so deployment-equivalent measurement environment/permission is
  required. That is not a waiver, does not authorize publication, and 82
  remains required.
- Tailwind’s current source-root fix is `source(none)` with only client
  HTML/source roots, replacing workspace-default scanning of cache, retained
  logs, and skills. Current typecheck, production build, and bundle budget pass
  with **194.5 KiB** initial gzip and unchanged caps.
- Completion validation’s final responsive and Design System checks pass:
  responsive **58/0** and Design System **284/0** in the
  [retained audit log](evidence/integration-shell/retained-controls/completion-responsive-design-system-2026-09-14.log).
  The source fixes cover unused `use-theme`, actual-opener Escape focus,
  forced-colors cookie-border scope, settled non-vacuous DS account Home `h1`,
  and Tailwind `source(...)` parser support. Type, parser, and full canonical
  cheap checks pass. This does not claim every platform gate is green: external
  `code_review` timed out twice at 600 seconds and is **not PASS**; the parent
  will submit an audited infrastructure exception, not a hidden validation
  waiver or performance claim. The audit-only route-settle and actual-focus
  return timing fixes do not alter normal pixel geometry, so no pixel rerun is
  asserted.
- The current selected Nick 16-row matrix at
  [`2026-09-14T16-23-53-893Z-1807`](../../tests/parity/baseline/2026-09-14T16-23-53-893Z-1807/results.json)
  passes all 16 selected Home Index, Home Curated, Drawer, and Palette rows at
  375/768/1024/1440 under the 0.5% ceiling. It records clean source commit
  `a4a7586776406e1dd27936a8a2af6f9dac911035`, frozen 9-category,
  1,817-resource source data; no app/reference API failures; and equal
  actual/expected hashes across attempts 1/2 for every row. The run-owned
  admin Nick identity was deleted locally and in Clerk with no errors, while
  existing identities were retained. Its `full: false` selected-row diagnostic
  (`gatePassed: false` at aggregate scope) is not a full inventory, full-suite,
  all-screen, or all-resource claim;
  retained visitor token-only evidence is valid but not new pixel evidence.
- All **17** retained functional/public dispositions are closed with the
  canonical reachable-state proof. This remains neither an identical-default
  DOM assertion nor a blanket data-snapshot/pixel acceptance.
- Real-Nick targeted admin UI/status/settled-axe/action coverage is functional
  evidence, not admin all-tab/full pixel evidence. The separate cold
  read-only diagnostic injects aborts for exact Clerk `/v1/environment` and
  Worker operations and remains FAIL without an exception; it is not a release
  gate, does not contradict the normal-app auth PASS, and has no admin
  exception or allowance.
- The real normal-app auth lane is PASS: sign-in/admin API 200, reload identity
  retention, readiness-aware real cache-bypass token refresh/API 200, UI
  sign-out/API 401, protected-route sign-in return, and created-identity-only
  teardown all passed. No authentication change is made or proposed; it is
  functional auth evidence, not a pixel pass.
- The common-state proof at
  `evidence/integration-shell/task565-common-state-proof-2026-09-13/` proves
  every reviewed control is a real functional route/disclosure/rail control in
  its reachable state. It proves **no stateful functional removal**, not an
  identical default DOM: the canonical default responsive/account-context
  states intentionally differ from the retained production default.
- The current normal-auth real-Nick admin-shell capture
  [`summary.json`](evidence/integration-shell/retained-controls/current-admin-shell/summary.json)
  passes all six checks at **375/768/1024/1440**: four widths captured,
  `admin-authorized`, footer absent, no horizontal overflow, the `1400px`
  admin measure token, and created-identity teardown. Its four screenshots are
  **token-only shell geometry evidence, not an admin-body pixel pass**.
- Historical parent verification, before scoped-CSS, sidebar, and Home-SSR
  changes, confirms paired, equal-hash attempt 1/2 stability in both
  `actualCaptureStability` and `expectedCaptureStability` for all 16 Home
  Index, Home Curated, Drawer, and current Palette width captures:
  [run 2007](../../tests/parity/baseline/2026-09-13T20-07-16-398Z-10626/results.json),
  [run 2011](../../tests/parity/baseline/2026-09-13T20-11-05-577Z-10961/results.json),
  [run 2039 — excluding its old Palette row](../../tests/parity/baseline/2026-09-13T20-39-52-532Z-13171/results.json),
  and [run 2147 — current Palette](../../tests/parity/baseline/2026-09-13T21-47-29-470Z-9558/results.json).
  This is retained historical per-scope provenance, not a fresh 16-row
  pixel/stability, pixel-parity, or full-suite claim.

The functional and admin-shell evidence gaps named above are closed, and the
current selected 16-row Nick visual matrix passes. Task 565 is ready for parent
completion review; the mandatory deployment-equivalent normal, unintercepted
Lighthouse measurement at **82** is now owned by Task 572. The retained 5105
median-68 result remains historical FAIL rather than fresh final-gate evidence.
This inventory does not claim a full suite, full inventory, all-screen, or
all-resource pixel pass, and the Task 572 environment/permission decision does
not authorize automatic publication.
