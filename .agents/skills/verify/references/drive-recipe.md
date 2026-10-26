# verify-scout-drive: launch + drive awesome.video locally with chrome-devtools MCP

Scouted 2026-10-25, read-only. Every fact cites file:line or a command + its output.
Live probes ran against the already-running wave-A instance (port 5002, worktree `aw-wave-a`). I did not start or stop anything.

---

## 0. Launch (confirmed)

```
DOTENV_CONFIG_PATH=/Users/nick/Desktop/awesome-list-site/.env \
DATABASE_URL=postgresql://localhost:5432/<db> PORT=<port> NODE_ENV=development \
DISABLE_BACKGROUND_JOBS=1 ANTHROPIC_MODEL=cc/claude-opus-5 \
<VITE_* + CONTACT_* from .replit [userenv.shared]> \
./node_modules/.bin/tsx server/index.ts        # Bash run_in_background, cwd = the checkout
```
- `server/index.ts:1` loads `dotenv/config`, so `DOTENV_CONFIG_PATH` selects the .env. `vite.config.ts:2` also loads `dotenv/config`, and `vite.config.ts:194` sets `envDir` to the repo root.
- Port: `server/index.ts:670` uses `process.env.PORT`, falling back to 5000. Port 5000 is taken by macOS: `lsof` → `ControlCe 754 ... TCP *:5000 (LISTEN)`.
- DB: `server/db/index.ts:34` uses `connectionString: process.env.DATABASE_URL` and nothing else. `.replit [userenv.shared]` has **no** DATABASE_URL (checked with `sed -n '/userenv/,$p' .replit`). Always pass a local URL explicitly. Never let .env supply it: old memory `~/.claude/.../memory/local-admin-verify-recipe.md:7` says .env's URL is production Neon.
- `.replit [userenv.shared]` non-secret keys: `VITE_SITE_URL`, `ANTHROPIC_BASE_URL=https://router.hack.ski`, `ANTHROPIC_DEFAULT_*_MODEL`, `ANTHROPIC_MODEL=cc/claude-opus-5`, `CONTACT_ISSUES_URL`, `CONTACT_ENABLED=true`, `VITE_CONTACT_VARIANT=b`, `VITE_POSTHOG_HOST=https://us.i.posthog.com`, plus `VITE_AMPLITUDE_API_KEY` / `VITE_MIXPANEL_TOKEN` / `VITE_POSTHOG_KEY` (public client keys, values not copied here). There is no `VITE_GA_MEASUREMENT_ID`, so GA stays off and the consent banner names only Mixpanel/PostHog/Amplitude (`client/src/lib/analytics.ts:38-47`).
- Boot sequence in dev: no migrations run (`server/index.ts:528-536`, `markMigrationsNotRequired`). Then `registerRoutes`, the protected-page guard, og-middleware, then `setupVite` (`server/index.ts:593-597`). Vite runs in middleware mode with HMR on the same http server (`server/vite-dev.ts:11-17`). **Any Vite error calls `process.exit(1)`** (`server/vite-dev.ts:25-28`).
- Ready log line: `Serving on port <p>` (`server/index.ts:684`), followed by `Background jobs disabled (DISABLE_BACKGROUND_JOBS=1)` (`:689-691`). Without that flag, schedulers start and the enrichment watchdog fails pending jobs (`:686-701`).
- No server hot reload: `package.json:7` runs `tsx server/index.ts` without `--watch`. Restart after any `server/**` or `shared/**` edit. Client code reloads through Vite HMR. Memory: `.agents/memory/dev-server-no-watch.md:6-12`, `~/.claude/.../memory/dev-server-no-watch.md:10-13`.
- The plain `node` binary that tsx re-execs is `/Users/nick/.hermes/node/bin/node` (`ps -p 71646`).

---

## 1. Doctor checks (all read-only; run before any browser work)

| Check | Command | Expected (observed on :5002) | Source |
|---|---|---|---|
| Liveness | `curl -s localhost:$P/api/health` | `{"status":"ok"}` (no DB access) | `server/routes/domains/operations.ts:66-69` |
| DB readiness | `curl -s localhost:$P/api/health/ready` | `{"status":"ready"}`; 503 `not_ready` + `Retry-After: 1` when the DB is down | `operations.ts:74-82` |
| AI (public) | `curl -s localhost:$P/api/health/ai` | `{"status":"healthy"}` or `"unavailable"` | `operations.ts:113-131` |
| AI (admin) | same, signed in as admin | adds `available, requestCount, cacheSize, cacheHitRate, config` (`describeAnthropicConfig`, secret-free). `?deep=1` makes a **paid** Claude call: anonymous → 401, non-admin → 403 | `operations.ts:133-155`, `server/ai/claudeService.ts:536-548` |
| Build revision | `curl -s localhost:$P/api/version` | `{"revision":"<sha>+workspace"}` in the main checkout (reads `.git/HEAD` per request). **In a worktree it returns `"unknown"`**, because `.git` there is a file, not a dir (observed `{"revision":"unknown"}` on :5002). Pass `BUILD_REVISION=$(git rev-parse HEAD)` in the env to get a real marker in a worktree. | `server/version-route.ts:5-39` |
| Auth | `curl -s localhost:$P/api/auth/user` | always 200 `{"user":null,"isAuthenticated":false}` when anonymous (observed). Headers include `x-clerk-auth-status: signed-out`. 503 when a Clerk session exists but the DB lookup failed | `server/routes/domains/auth-user.ts:89-99` |
| Port is OUR process | `lsof -nP -iTCP:$P -sTCP:LISTEN -t` → PID; `lsof -a -p $PID -d cwd -Fn` | cwd must equal the intended checkout. Observed: `PID 71646 cwd=/Users/nick/Desktop/aw-wave-a port(s)=*:5002`; parent `71630 node ./node_modules/.bin/tsx server/index.ts` | command run this session |
| DB identity | `lsof -nP -a -p $PID -iTCP:5432` → local client ports; `psql -h localhost -d postgres -At -c "select datname,client_port from pg_stat_activity where client_port in (<ports>)"` | Observed ports 49239/49248 → `awesome_waves_a`. The boot log does **not** print the DB name (`server/index.ts:684`, and `server/db/index.ts` logs no connection info), so this join is the only way to confirm it. Connections are pooled and idle out after 30 s (`db/index.ts:36`); hit `/api/health/ready` first so a connection exists. | commands run this session |
| Protected guard works | `curl -s -o /dev/null -w "%{http_code} %{redirect_url}" localhost:$P/admin` | `302 http://localhost:5002/sign-in?redirect_url=%2Fadmin` (observed) | `server/index.ts:439-445, 543-556` |
| Dev doc served by Vite | `curl -s localhost:$P/ \| grep -c @vite/client` | `1` (observed). In dev, `<div id="root">` has **no** `data-home-ssr`, so Home is not SSR-hydrated in dev. Production hydration is `server/ssr.ts:387-390`. | probe |

**"React loaded twice" hazard.** A second dev instance that shares a `node_modules/.vite` dep cache rewrites the optimized deps. The other server then serves two React copies ("Invalid hook call"), and every authed gate fails at once (`.agents/memory/before-fix-proof-instance.md:8-9`). Current layout: `aw-wave-a/node_modules` and `aw-wave-b/node_modules` are real directories with 620 entries each (`ls -ld`), each with its own `.vite/deps`, so the worktrees do not share a cache with main. A `/tmp` copy with **symlinked** node_modules (the before-fix recipe) would share it; give that copy its own Vite `cacheDir` or a real `node_modules` copy. Doctor check for this in the browser: `list_console_messages` must not contain `Invalid hook call` or "more than one copy of React".

**Listener hazard.** Always address `http://localhost:<port>`, never a proxied dev hostname. The proxied host can serve the design-system artifact, even for `/api/*` (`.agents/memory/dev-listener-selection.md:6-13`).

---

## 2. Readiness: what "usable" means

The document arrives with crawler prerender markup, `#ssr-seo-content`, injected into `#root` by og-middleware (`server/og-middleware.ts:2612-2632`; observed `grep -c ssr-seo-content` = 3 on `/`, `/category/encoding-codecs`, `/resource/1`, `/sign-in`).
- The pre-boot inline script moves it into a fixed full-viewport overlay `#ssr-seo-hold` (`client/index.html:415-432`, z-index 2147483000, `data-pathname`). `main.tsx` marks it `aria-hidden` + `inert` and demotes its h1 (`client/src/main.tsx:164-174`).
- The overlay is removed when route data settles (`main.tsx:196-243`):
  - `/category|subcategory|sub-subcategory/:slug`: the query `["awesome-list-listing", level, slug]` is no longer pending.
  - `/resource/:id`: the query `["/api/resources", id]` has settled and has an observer.
  - other routes: `["awesome-list-nav"]` has data or an error.
  - A 3 s safety timeout also removes it once `#root` has children (`main.tsx:248-256`), and any pushState removes it (`:263-276`).
- **Until the hold is gone, a11y snapshots and clicks hit an inert overlay.** Readiness probe, in one `evaluate_script` call:
  ```js
  () => ({ hold: !!document.getElementById('ssr-seo-hold'),
           rootKids: document.getElementById('root').childElementCount,
           path: location.pathname })
  ```
  The page is usable when `hold === false && rootKids > 0`. Then `wait_for` a page-specific text, then `take_snapshot`. Take **new uids after the settle**: refs shift during hydration (`~/.claude/.../memory/agent-browser-settle-timing.md:14-18`).
- Window flags: `window.__HOME_SSR__` exists only on production-SSR Home (`server/ssr.ts:388`, `main.tsx:83`). `window.__awesomeListListingEarlyFetch` is a transient early fetch (`client/src/lib/static-data.ts:212`). Neither is a dev readiness signal. Use the hold probe instead.
- Skeleton testids that mean "not ready": `route-chunk-skeleton` (`App.tsx:99`), `home-skeleton` (`pages/Home.tsx:218`), `taxonomy-results-loading`, `search-results-loading`, `search-loading`.
- **Do not wait for networkidle.** Some pages hold a connection open, so networkidle never fires (`.agents/memory/headless-e2e-gotchas.md:17`). Wait for a selector or text.
- **Consent banner** (`client/src/components/ui/consent-banner.tsx`):
  - It shows on a first visit to every fresh context: `data-testid="consent-banner"`, `role` region `aria-label="Analytics consent"` (`:209-212, :253-256`).
  - Buttons: `consent-decline` "Decline" (`:283-290`) and `consent-accept` "Allow analytics" (`:292-299`). `Escape` hides it for the session without saving a choice (`:142-150`).
  - It overlays bottom-of-page buttons, including /submit's submit button ("dead click"). **Dismiss it first** (`.agents/memory/headless-e2e-gotchas.md:6-8, :21`).
  - The choice is stored in `localStorage['analytics-consent']` plus cookie `analytics-consent=granted|denied` (`client/src/lib/analytics.ts:52-76`). To skip the banner deterministically: `navigate_page` with `initScript: "try{localStorage.setItem('analytics-consent','denied')}catch{}"`. Use `'granted'` for analytics tests.
- Analytics SDKs initialize only after first paint and only with consent (`main.tsx:66-74`).
- Vite reloads every open page on **any** write inside the watched tree. Excluded paths are only `.local .cache .config .git node_modules dist _planning attached_assets .agents logs *.log` (`vite.config.ts:229-241`). Write evidence to `.local/`, `.cache/`, or `/tmp` while a browser is live. A reload during an auth flow looks like a Clerk failure (`.agents/memory/vite-workspace-watch-reload.md:6-24`).
- Catalog GETs are `Cache-Control: public, max-age=60`. After an admin write, check freshness in the **same SPA document**, not after a reload (`.agents/memory/catalog-http-cache-vs-invalidation.md:5-9`).

---

## 3. Stable handles per feature (routes: `client/src/App.tsx:635-753`)

**Global shell**
- Header: `header-brand`, `mobile-drawer-trigger` ("Toggle sidebar"), button "Sign in", `button-notifications`, `button-guest-saved` (aria "Saved resources, N on this device"), button "Theme Settings" (`components/layout/new/AppHeader.tsx:91-156`).
- Sidebar: `nav-home`, `accordion-cat-<slug>`, `row-cat-<slug>`, `toggle-cat-<slug>`, `sub-<slug>`, `expand-sub-<slug>`, `subsub-<slug>`, `sidebar-resource-count`, `sidebar-nav-error` / `-retry` / `-empty`, `nav-admin`, rail `rail-home` / `rail-<catSlug>`, button "Search resources" (`components/layout/new/AppSidebar.tsx:391-1333`).
- `button-back-to-top` (`MainLayout.tsx:74-75`).
- Toasts: `li[data-state]`, not `ol li` (`.agents/memory/headless-e2e-gotchas.md:9`).

**Home `/`** (`components/home/HomePresentation.tsx`, `pages/Home.tsx`)
- `home-stat-strip`, `home-stat-<name>`, `home-kind-strip`, `home-kind-chip-<kind>`, `list-categories`, `link-category-<slug>` (aria "<Name>, N resources"), `badge-count-<slug>`, `link-subcategory-<slug>`, `home-featured-rail`, `card-home-resource-<id>`, `home-search-form` / `input-home-search` / `button-home-search`, `link-hero-submit`, `link-hero-browse`, `home-layout-<layout>`.
- Account-only: `home-account-context`, `card-onboarding-invitation`, `link-recommendations-heading`.

**Category listing `/category/:slug`** (`pages/TaxonomyListing.tsx:602-679`)
- `input-search-resources` (aria "Search in <Name>"), `select-subcategory-filter`, `select-kind-filter`, "View mode", `chip-taxonomy-scope`, `taxonomy-results-region`, `text-results-count`, `taxonomy-results-loading`, `button-clear-taxonomy-filters`, `taxonomy-siblings`.
- Cards (`components/resource/ResourceCard.tsx`): `card-resource-<id>`, `link-resource-title-<id>`, `link-view-details-<id>`, `button-visit-<id>`, `button-suggest-edit-<id>`, `tag-pill-<id>-<tag>`, `button-more-tags-<id>`, `badge-kind-<id>`, plus `button-bookmark` / `button-favorite` (not id-scoped; scope them inside the card).

**Resource `/resource/:id`** (`pages/ResourceDetail.tsx`)
- `text-resource-title` (:737), `badge-category`, `badge-subcategory`, `badge-sub-subcategory`, `text-description`, `resource-actions` (:816), `button-visit`, `button-favorite`, `button-bookmark` (aria "Add bookmark" / "Remove bookmark", :846-849), `button-share` ("Share this resource"), `button-suggest-edit`, `button-edit-bookmark-notes`, `button-undo-bookmark-removal`, `related-resource-<id>`, `related-empty-state`, `link-url`, `tag-link-<n>`, `button-edit-admin` (admin only, :1278).
- Report link: `button-report-link` → `dialog-report-link`, `input-report-link-note`, `button-submit-report-link` (`components/resource/ReportLinkAction.tsx:97-149`).

**Search / palette**
- Opens with `press_key "Meta+K"` / `"Control+K"`, or `/` when focus is outside a field (`MainLayout.tsx:150-170`). The window event `awesome:open-search-palette` also opens it.
- Palette input: aria "Search resources, categories, and pages", placeholder "Find resources, categories, or pages…" (`components/ui/search-dialog.tsx:376-377`).
- States: `search-loading`, `search-error`, `search-no-results`, `search-offline`, `search-too-long`. Results: `search-result-<n>`, `search-view-all`, `search-result-count`, `recent-search-<n>`, `button-clear-recent-searches`, `palette-featured-<id>`.
- `/search` page: `input-search-page`, `select-search-sort`, `search-results-grid`, `text-result-count` (`pages/Search.tsx:277-289`).

**Bookmarks**
- `/bookmarks` renders `GuestBookmarks` for guests and `Bookmarks` for members (`pages/BookmarksGate.tsx:24-25`). It is not server-protected (`server/index.ts:438`).
- Guest bookmark label: "Bookmark on this device — no sign-in required" / "Remove bookmark saved on this device" (`components/resource/BookmarkButton.tsx:277-279`). Guest storage key: `localStorage['guest-bookmarks-v1']` (`lib/guestBookmarks.ts:28`).
- Guest page testids: `text-guest-save-count`, `banner-guest-signin-prompt`, `button-guest-signin`, `button-guest-create-account`, `button-guest-empty-signin`, `banner-guest-load-failed`, `text-guest-cap-notice`, region "Saved resources" (`pages/GuestBookmarks.tsx:125-269`).
- Member page (`pages/Bookmarks.tsx`): `bookmark-card-<id>` (:963), "Select all visible bookmarks", "Move to collection", "Bulk bookmark actions", "Archive: <title>", "Note: <title>".

**Submit `/submit`** (guests see a login prompt) (`pages/SubmitResource.tsx:567-933`)
- `alert-login-required` / `link-login` (guest), `alert-auth-loading`, `input-title`, `input-url`, `select-category`, `select-subcategory`, `select-subsubcategory`, `input-tags`, `input-description`, `button-submit`, `button-cancel`, `dialog-discard-confirm`.
- react-hook-form fields are flaky with `fill` because uids go stale on re-render. Set them with an `evaluate_script` that uses the native value setter + `input` + `blur` (`~/.claude/.../memory/dev-server-no-watch.md:24-27`).

**Sign-in**
- `/sign-in`: `page-sign-in` + Clerk `<SignIn routing="path">` (`pages/AuthPages.tsx:21-46`).
- `/sign-in?admin`: owner password form `form-admin-password`, `input-admin-password`, `button-admin-password-submit`, `text-admin-password-error` (`components/auth/AdminPasswordSignIn.tsx:50-70`). It POSTs `/api/auth/admin-login`, which is limited to 10 attempts / 15 min / IP and sets cookie `av_admin_session` (`server/routes/domains/auth-user.ts:47-54, 156-171`; `server/clerkAuth.ts:236`). It needs OWNER_PASSWORD, which an agent cannot type without reading the secret, so use the Clerk path below.
- Clerk test account (the usable path):
  1. Enter `cf-audit+clerk_test@awesome.video`. The local row is `user_3K1RqOtITAqqTqT62nRvvGGks9s`, role admin (DB query in §5).
  2. A new device lands on `/sign-in/client-trust` or `/sign-in/factor-one`. Find the code field by its accessible label and type `424242` with **`type_text` (sequential keys), not `fill`** (`.agents/memory/clerk-headless-ui-signin.md:8-12`).
  3. A factor chooser ("Email code to …") can appear first; click it once.
  4. Done means the URL leaves `/sign-in` on its own. Do not navigate before that or the session is lost (`analytics-browser-verification.md:11`). Then confirm by fetching `/api/auth/user` in the page → `isAuthenticated:true, user.role:"admin"`.
  5. Clerk dev talks to `*.clerk.accounts.dev` directly. A 404 on `/api/__clerk` in dev is expected (`.agents/memory/clerk-auth-migration.md:21`).
- Clerk loads lazily, only on sign-in/up pages, the account-menu hover, protected pages, or when `/api/auth/user` reports a user (`clerk-auth-migration.md:62-65`).
- Cookies are not port-scoped, so one localhost sign-in serves every port (`local-admin-verify-recipe.md:11`). Use isolatedContext when you need separation (§7).

**Admin** `/admin`, `/admin/:section`, `/admin?tab=<id>`, `/admin#<id>` (`pages/AdminDashboard.tsx:52-59, 97-104, 117-141`)
- Valid ids: overview approvals edits enrichment researcher export database resources categories subcategories subsubcategories journeys users github linkhealth digests audit research. Aliases: `link-health`, `sub-subcategories`, `sub-subcats`, `github-sync` (`shared/admin-tabs.ts:4-18`).
- An unknown section renders a 404.
- Tab triggers are `tab-<id>` (`AdminDashboard.tsx:436`). Hash changes and popstate re-sync the tab (`:137-138`), so a deep link works on load. The old note "hash nav doesn't activate" (`chrome-devtools-lighthouse-workflow.md:15`) predates this; **prefer `/admin/<id>` or clicking `tab-<id>`**.
- `subsubcategories`, `journeys`, `digests` live in the `button-admin-settings` dropdown (:367-393).
- Guard states: `admin-authorized`, `text-admin-forbidden`, `link-admin-login`, `text-session-expired` (`components/auth/AdminGuard.tsx:45-83`, `AdminDashboard.tsx:264-318`). Content: `content-overview`, `content-approvals`, …
- **Researcher tab** `/admin/researcher` (`components/admin/ResearcherTab.tsx`): `button-launch-researcher-canonical` (:638), `button-generate-brief`, "Category focus", `input-target-discoveries`, `button-toggle-advanced-researcher`, `input-research-model` / `-scout-model` / `-baseurl` / `-token`, `text-research-launch-model`, `button-confirm-launch` / `button-cancel-launch` (:1024-1026), `error-research-launch`, `button-research-details-<jobId>`, "Cancel job #<id>", `research-review-panel`, `row-research-discovery-<id>`, "Approve discovery: <title>" / "Reject discovery: <title>", `button-approve-all` → `button-confirm-approve-all`, `button-load-more-jobs`.
- **Launching a job spends real model tokens through ANTHROPIC_BASE_URL.** Ask before launching.

**Settings / theme**
- `/settings`: `card-home-layout-preference`, `card-learning-preferences`, `button-save-learning-preferences`, `card-settings-signin` (guest) (`pages/Settings.tsx:250-465`).
- `/settings/theme`: `system-picker` → `system-option-<editorial|geist>`, `accent-picker` → `accent-option-<id>`, `font-picker` → `font-option-<id>`, `text-active-preset`, `text-account-sync`, `theme-preview` (`pages/ThemeSettings.tsx:124-442`).
- Local keys: `ds-system`, `ds-accent`, `ds-font-override` (`lib/design-system.ts:69-70`, `lib/font-options.ts:44`). The DB check allows only editorial/geist (`pg_get_constraintdef`, see §5).

**Journeys** `/journeys`: `card-journey-<id>`, `button-view-journey-<id>`, `select-category-filter` (`pages/Journeys.tsx:234-461`). The page needs seed data (§5).

---

## 4. Network evidence

**Same-origin calls by feature** (client source):
- Shell: `GET /api/auth/user`, `GET /api/awesome-list/nav` (`lib/static-data.ts:242-244`)
- Home: `GET /api/tags`, `GET /api/resources/kinds/counts` (`pages/Home.tsx:584,599`)
- Category listing: `GET /api/awesome-list/listing?level=category&slug=<s>&page=N[&subcategory&kind]` (`lib/static-data.ts:205-210`); filtered: `GET /api/resources?…` (`pages/TaxonomyListing.tsx:219`)
- Resource: `GET /api/resources/:id`, `GET /api/resources/:id/related` (`pages/ResourceDetail.tsx:132,206`); report: `POST /api/resources/:id/link-report`; suggest edit: `POST /api/resources/:id/edits`
- Palette: `GET /api/resources?search=<q>&page=1&limit=24` (`search-dialog.tsx:102`); search page: `GET /api/resources?…` (`pages/Search.tsx:195`)
- Bookmark (member): `POST|DELETE /api/bookmarks/:resourceId` (`hooks/useResourceToggle.ts:339`); bulk `/api/bookmarks/bulk`; state `/api/bookmarks/:id/state`. Guest: **no network**, localStorage only; on sign-in, `GuestBookmarkMerge` POSTs `/api/bookmarks/:id` (`components/auth/GuestBookmarkMerge.tsx:89`)
- Favorite: `/api/favorites/:resourceId` (`useResourceToggle.ts:318`)
- Submit: `GET /api/resources/check-url?url=` (debounced), `POST /api/resources` (`pages/SubmitResource.tsx:250,425`). With consent granted it adds headers `x-analytics-consent: granted`, `x-mixpanel-distinct-id` (`lib/mixpanel.ts:229-236`)
- Admin: `GET /api/admin/stats` (`hooks/useAdmin.ts:39`); owner sign-in `POST /api/auth/admin-login`
- Researcher: `GET /api/researcher/jobs?limit=`, `GET /api/researcher/jobs/:id`, `GET /api/researcher/discoveries[?jobId=]`, `POST /api/researcher/start`, `POST /api/researcher/brief`, `POST /api/researcher/discoveries/:id/approve|reject`, `POST /api/researcher/discoveries/approve-all` (`ResearcherTab.tsx:272-555`); AI defaults `GET /api/health/ai` (`hooks/useAiDefaults.ts:6`)
- Theme/preferences (signed in): `/api/user/preferences` (`hooks/use-learning-preferences.ts:69-111`)

**Vendor ingestion endpoints.** Match only these. A loose regex also matches `us-assets.i.posthog.com/static/*` and same-origin `/src/lib/mixpanel.ts`. Source: `.agents/memory/analytics-browser-verification.md:10,24`.
- Mixpanel `api-js.mixpanel.com/track`: gzip body → `data=<urlencoded JSON>`. Count by distinct `$insert_id`, because Mixpanel resends persisted batches after navigation.
- Amplitude `*.amplitude.com/2/httpapi`: gzip body.
- PostHog `us.i.posthog.com/(e|i/v0/e|batch)/`: **stays at 0 in automation browsers** because of the bot filter on `navigator.webdriver`/HeadlessChrome. That is expected unless both are overridden in an initScript.
- GA `/g/collect`: not configured locally (no `VITE_GA_MEASUREMENT_ID`).
- Replit Umami `i.replit.com`: injected only on the published site.
- Before consent, there must be zero vendor requests. Wait about 15 s after an action before navigating, or Mixpanel/GA retransmit the batch (`analytics-browser-verification.md:16-22`).
- The sanitizer drops property keys that contain `email|token|secret|phone|password` (`:9`).

**Reading requests with the MCP:**
1. `list_network_requests {pageId, resourceTypes:["fetch","xhr"]}` → reqids since the last navigation. Add `includePreservedRequests:true` to see across the last 3 navigations. Beacons may show as `ping`/`other`, so include those for vendors.
2. `get_network_request {pageId, reqid}` → headers (Cookie/Set-Cookie), status, bodies. Pass `requestFilePath:"/tmp/x.network-request"` / `responseFilePath` to keep large bodies out of context.
3. Gzipped vendor bodies are binary. Decode the saved file offline (`gunzip`), then URL-decode `data=` for Mixpanel.
4. SPA navigations do not reset the list. Full navigations do.

---

## 5. Data preconditions: `awesome_waves` (SELECT only, this session)

| Query | Result |
|---|---|
| resources by status | `approved|1949`, the only status, so **no pending/rejected rows** for the Approvals/rejected views |
| categories / subcategories / sub_subcategories | 9 / 19 / 32 |
| approved per category | encoding-codecs 372, media-tools 304, players-clients 263, protocols-transport 242, intro-learning 227, infrastructure-delivery 183, standards-industry 172, general-tools 95, community-events 91 |
| first resource ids | 1 "MPEG Standards Documentation", 2 "Versatile Video Coding (VVC) Standard", 3 "Publicly Available MPEG Standards" |
| resources with non-empty `metadata.tags` | 1948 (`tags` / `resource_tags` tables: 0 / 0, so tags live in JSON metadata) |
| learning_journeys | **0**. The `/journeys`, `/journey/:id`, `/continue-learning` happy paths have no data (UNSEEDED) |
| users | `admin@example.com` admin (owner-password row, c6e7d1c6-…); `audit_noop@x.com` user; `cf-audit+clerk_test@awesome.video` admin (`user_3K1RqOtITAqqTqT62nRvvGGks9s`) |
| research_jobs | 2 rows, both `failed` (ids 1, 2, started_by the admin@example.com row) |
| research_discoveries | **0**. No review panel / approve / reject data without launching a (paid) job |
| user_bookmarks / user_favorites / bookmark_collections | 0 / 0 / 0. Member bookmark lists start empty |
| resource_edits / resource_link_reports / in_app_notifications / api_keys | 0 / 0 / 0 / 0. Edits queue, link reports, and notifications are empty |
| enrichment_jobs | 6 |
| migrations | `users.sessions_revoked_at` exists (0056); `user_preferences_theme_system_check` = editorial/geist only (0057). `drizzle.__drizzle_migrations` has 1 row, because the clone was re-baselined and the chain is not tracked (see memory `migration-chain-incomplete.md`). |

DBs present: `awesome_waves`, `awesome_waves_a`, `awesome_waves_b` (plus many older `awesome_fix_*` / `awesome_*` clones, not mine to drop). Only `awesome_waves_a` had live connections (from :5002).

Journeys that need data before they can be verified: journeys (0 rows), researcher review (0 discoveries), approvals/edits queues (0 pending), member bookmarks (0), notifications (0). Seed these on a **throwaway clone** through the real UI (submit as a user, then approve as admin), never by hand-inserting rows into a shared DB.

---

## 6. Cleanup

- **Stop by PID, never by name.** Record the PID that `lsof -nP -iTCP:$P -sTCP:LISTEN -t` reports right after launch, check its cwd, then kill it (or TaskStop the background shell you started). Note that the tsx wrapper (parent, e.g. 71630) and the node child (71646) are separate; kill the background task / parent you launched and confirm the port is free. `pkill -f tsx` would kill other agents' servers.
- **Browser:** `close_page` only the pages you opened. Each run owns its isolatedContext; do not close others' pages (`.agents/memory/browser-lease-cleanup-ownership.md:6-9`).
- **DB clones:** drop only clones you created: `dropdb -h localhost <name>` after its server is stopped. `createdb -T <template>` requires the template to have no connections (`.local/state/improvement-waves.md:10`).
- **Throwaway users** (`.agents/memory/qa-throwaway-user-teardown.md`, `jit-teardown-order.md`):
  1. Delete the Clerk user **first**, then wait past the JWT lifetime (~60–90 s). A live tab polling `/api/auth/user` re-JITs the local row otherwise.
  2. Local FK order: delete `resource_edits` where `submitted_by`; null `resources.approved_by`, `resource_edits.handled_by`, `github_sync_history.performed_by`, `enrichment_jobs.started_by`, `research_jobs.started_by`; delete `resource_audit_log` where `performed_by`; then delete `users` (which cascades bookmarks, favorites, prefs, interactions, api_keys, and **submitted resources**).
  3. Derive FK columns from information_schema rather than guessing.
  4. Use a scoped prefix `__qa_test_<gate>_%` when other gates run concurrently.
  5. Never use Clerk's fuzzy search as the delete predicate.
  6. The shared Clerk test account `cf-audit+clerk_test@…` is **not** throwaway. Do not delete it. Remove only data it created on throwaway clones.
- Do not edit files inside the watched tree mid-run (§2).

---

## 7. Side-by-side isolation

- Port/DB map (`.local/state/improvement-waves.md:8-11, 32-33`): main checkout → **5001** / `awesome_waves`; worktree A `../aw-wave-a` → **5002** / `awesome_waves_a`; B `../aw-wave-b` → **5003** / `awesome_waves_b`; C → 5004. 5000 is AirPlay.
- Observed now: only :5002 is listening (wave-a). **Main :5001 is not running**, and neither is :5003.
- Each worktree has its own real `node_modules`, so it has its own `.vite` cache (§1). A /tmp before-fix copy needs its own cache (`before-fix-proof-instance.md:5-9`). The worktree `/api/version` returns `unknown` unless `BUILD_REVISION` is passed (§1).
- One shared Chrome: cookies are not port-scoped (`local-admin-verify-recipe.md:11`), so a sign-in on :5001 bleeds into :5002. Use `new_page {url, isolatedContext:"<run-name>"}` per instance or role (guest vs admin). Pages in the same context share cookies and storage; different contexts are fully isolated (MCP `new_page` schema). Every later call passes that page's `pageId`.
- A fresh context means: consent banner shown, no guest bookmarks, signed out, and the Clerk client-trust code is likely needed at sign-in.

---

## 8. Call-by-call skeleton (chrome-devtools MCP)

1. Doctor (§1) via Bash curl + lsof + pg_stat_activity.
2. `new_page {url:"http://localhost:<P>/", isolatedContext:"guest-<run>"}` → note `pageId`.
3. `navigate_page {pageId, type:"url", url, initScript:"try{localStorage.setItem('analytics-consent','denied')}catch{}"}`, or click `consent-decline`.
4. `evaluate_script` readiness probe (§2) until `hold:false`; then `wait_for {pageId, text:["<page text>"]}`.
5. `take_snapshot` → uids → `click` / `fill`, or `press_key "Meta+K"`; `type_text` for Clerk OTP.
6. `list_network_requests {pageId, resourceTypes:["fetch","xhr"]}` → `get_network_request {pageId, reqid}` for the call the action should make.
7. `list_console_messages {pageId}`: no `Invalid hook call`, no CSP or chunk-load errors.
8. `take_screenshot` after the settle as ground truth. If it is blank or black, capture again a second way before filing (`headless-e2e-gotchas.md:11-13`).
9. Signed-in: a separate `isolatedContext:"admin-<run>"`, Clerk flow (§3), then `evaluate_script` `async()=>(await (await fetch('/api/auth/user')).json())` → role admin.
10. Cleanup (§6).

UNVERIFIED (not exercised this session): main checkout `/api/version` `+workspace` format; the admin `/api/health/ai` shape live; the Clerk OTP flow on this date; hash-deep-link tab activation live (source says it works).
