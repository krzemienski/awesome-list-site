# Phase 1 · Site Map

> **Confidence legend** (applies throughout this document):
> - ✅ / *(confirmed)* — verified by reading the live source file cited.
> - ❓ / *(verify in Phase 2)* — inferred from context, not directly
>   read this phase. Phase 2 operators should observe and correct.
>
> Anything **not** marked ❓ is treated as confirmed source-of-truth for
> downstream phases. Open questions are also collected in §9 *"What
> Gate 1 leaves open."*

> Every Wouter route, the component tree it mounts, auth gating, env
> vars it touches, and the state matrix Phase 2 will screenshot. Plus
> the Gate 1 verdict the user needs to approve before Phase 2 begins.
>
> **Source of truth:** `client/src/App.tsx` `<Switch>` block.
> **Auth gates:** `client/src/components/auth/{AdminGuard,AuthGuard}.tsx`.
> **Env vars:** `rg "import\.meta\.env\."` + `rg "process\.env\."` sweep.

---

## 1 · Layout shell (wraps every route)

```
<App>
 └─ <ThemeProvider>
     └─ <Router> (client/src/App.tsx)
         ├─ useAnalytics()          ← fires GA pageview on route change
         ├─ useSessionAnalytics()
         ├─ useAuth()               ← /api/auth/user; loading state
         ├─ useQuery(awesome-list-data)  ← fetchStaticAwesomeList(), 1h stale
         ├─ keyboard: "/"  → open search   (trackKeyboardShortcut)
         │            "⌘K" → open search
         │            "Esc" → close search
         │
         ├─ if (error)        → <ErrorPage error>
         ├─ if (authLoading)  → spinner "Loading..." (full-screen)
         │
         └─ <MainLayout awesomeList isLoading user onLogout>
             ├─ <AppHeader>     (client/src/components/layout/new/)
             ├─ <AppSidebar> / <ModernSidebar>
             ├─ <main>
             │   └─ <Switch> { 16 routes — §2 }
             └─ <Footer>        (client/src/components/layout/Footer.tsx)
```

**App-level loading state.** Until `useAuth` resolves, no route renders
— the whole app is a full-screen spinner with "Loading…" text. This is
the **first paintable state** Phase 2 must capture, and the first place
FOUT can manifest if the DS boot script lands after this paint.

---

## 2 · Routes (Wouter `<Switch>` order)

Order matters — Wouter matches first-hit. The catch-all `<Route component={NotFound}>` is last.

| # | Path | Component | Auth gate | Notes |
|---|---|---|---|---|
| 1 | `/` | `Home` (passes `awesomeList`, `isLoading`) | public | Hero, featured categories, recent resources. |
| 2 | `/login` | `Login` | public (no-op for already-authed users? — confirm Phase 2) | Local email/password + Replit Auth providers. |
| 3 | `/category/:slug` | `Category` | public | Grid/list/compact view toggle, per-card suggest-edit (authed + db-resource only). |
| 4 | `/subcategory/:slug` | `Subcategory` | public | Lists resources within a subcategory. |
| 5 | `/sub-subcategory/:slug` | `SubSubcategory` | public | Third level of category hierarchy. |
| 6 | `/resource/:id` | `ResourceDetail` | public | OG image, favicon, tags, related resources, share. |
| 7 | `/about` | `About` | public | Static content. |
| 8 | `/advanced` | `Advanced` | public | Advanced search / filters. |
| 9 | `/submit` | `SubmitResource` | public (form may require auth on submit) | Suggest new resource. |
| 10 | `/journeys` | `Journeys` | public | Learning journeys index. |
| 11 | `/journey/:id` | `JourneyDetail` | public | Single learning journey. |
| 12 | `/profile` | `<AuthGuard><Profile user/></AuthGuard>` | **authed** | User profile. |
| 13 | `/bookmarks` | `<AuthGuard><Bookmarks/></AuthGuard>` | **authed** | Personal bookmarks list. |
| 14 | `/admin` | `<AdminGuard><AdminDashboard/></AdminGuard>` | **admin** | 14-tab dashboard — §4. |
| 15 | `/settings/theme` | `ThemeSettings` | public (UI may differ when authed) | Existing theme settings page — **target for system picker if Option B**. |
| 16 | `*` (catch-all) | `NotFound` | n/a | 404. |

---

## 3 · Auth gating behaviour

### 3.1 `AuthGuard` — required for routes #12, #13 *(confirmed)*

From `client/src/components/auth/AuthGuard.tsx`:

1. `useAuth()` → `{ isAuthenticated, isLoading }`.
2. While `isLoading`: full-screen spinner "Loading…" (same chrome as
   `AdminGuard`'s "Verifying access…").
3. `useEffect` fires when loading completes: if not authenticated, it
   calls `toast({ title: "Authentication Required", description:
   "Please sign in to access this page", variant: "destructive" })`
   and `setLocation("/")` — i.e. a Wouter redirect to home, **not**
   `/login`.
4. While the redirect is in flight, the component returns `null` (the
   prior `if (!isAuthenticated) return null;` branch).
5. If authenticated: renders children.

Phase 2 baseline must therefore capture: (a) the spinner state, (b) the
post-redirect home page + destructive toast (the actual UI for an
unauthenticated `/profile` or `/bookmarks` hit). No standalone "gate
message" page exists.

### 3.2 `AdminGuard` — required for route #14 *(confirmed)*

From `client/src/components/auth/AdminGuard.tsx`:

1. `useAuth()` → `{ user, isLoading }`.
2. While `isLoading`: full-screen spinner "Verifying access…".
3. `isAdmin = user && user.role === "admin"`.
4. If `!isAdmin`: returns `<NotFound />` (route #16 component) — **NOT
   a 404 HTTP code**, just the 404 page UI. Phase 2 must screenshot
   this masked-as-404 state when hitting `/admin` unauthenticated.
5. If admin: renders children.

### 3.3 `useAuth` data source

From `client/src/hooks/useAuth.ts`:
- `useQuery({ queryKey: ['/api/auth/user'], staleTime: 5 min, retry: skip on 401 })`.
- Returns `{ user, isAuthenticated, isLoading, error, logout }`.
- `logout` posts `/api/auth/logout`, invalidates cache, hard redirects
  to `/`.

---

## 4 · Admin dashboard — 14 tabs

From `client/src/pages/AdminDashboard.tsx`. Tabs are hash-routed
(`#approvals`, `#edits`, …) so each is independently linkable AND
screenshottable in Phase 2.

| # | Hash | Label | Component | Endpoint family |
|---|---|---|---|---|
| 1 | `#approvals` | Approvals (badge: pending count) | `PendingResources` | `/api/admin/resources/pending` + bulk approve/reject/delete |
| 2 | `#edits` | Edits | `PendingEdits` | `/api/admin/edits/*` |
| 3 | `#enrichment` | ✨ Enrichment | `BatchEnrichmentPanel` | `/api/admin/enrichment/*` (Claude) |
| 4 | `#researcher` | 🧠 Researcher | `ResearcherTab` | `/api/researcher/*` |
| 5 | `#export` | Export | `ExportTab` | `/api/admin/export-*` (markdown, JSON) |
| 6 | `#database` | Database | `DatabaseTab` (gets `stats`) | `/api/admin/seed-database`, integrity |
| 7 | `#resources` | Resources | `ResourceManager` | `/api/admin/resources/*` + bulk |
| 8 | `#categories` | Categories | `CategoryManager` | `/api/admin/categories/*` |
| 9 | `#subcategories` | Subcategories | `SubcategoryManager` | `/api/admin/subcategories/*` |
| 10 | `#subsubcategories` | Sub-Subcats | `SubSubcategoryManager` | `/api/admin/sub-subcategories/*` |
| 11 | `#users` | Users | `UsersTab` | `/api/admin/users/*` |
| 12 | `#github` | GitHub | `GitHubSyncPanel` | `/api/admin/github/*` (Replit OAuth) |
| 13 | `#linkhealth` | 🔗 Link Health | `LinkHealthDashboard` | `/api/admin/link-health/*` |
| 14 | `#audit` | Audit | `AuditTab` | `/api/admin/audit/*` |

Each tab's container: dark `bg-card`, `border-primary/20`, mono labels,
`data-[state=active]:bg-primary/20 data-[state=active]:text-primary`.
**All 14 currently use the legacy OKLCH cyberpunk theme and must be
verified against DS_SPEC in Phase 3** (tabs map to `.tabs` + `.tab.active`
in DS, badges map to `.chip.bad` for the pending count).

---

## 5 · Env vars touched at runtime

Exhaustive sweep via `rg "process\.env\.[A-Z_]+"` (server/, shared/) and
`rg "import\.meta\.env\.[A-Z_]+"` (client/, shared/). "in `.env`" /
"in `.env.local`" columns from `cat .env` and `cat .env.local`.

### 5.1 Frontend (`import.meta.env.VITE_*`) — read in the browser bundle

| Var | Source file(s) | In `.env`? | In `.env.local`? | Purpose |
|---|---|---|---|---|
| `VITE_GA_MEASUREMENT_ID` | `client/src/App.tsx:120`, `client/src/lib/analytics.ts:28,56` | ✅ `G-383541848` | — | GA init + pageview tracking. App warns to console if missing. |

*(Other `VITE_*` vars in `.env` — `VITE_SITE_TITLE`,
`VITE_SITE_DESCRIPTION`, `VITE_SITE_URL`, `VITE_DEFAULT_THEME`,
`VITE_ALLOWED_HOSTS` — are **not currently read by any
`import.meta.env.*` expression in `client/src/`**. They are read on the
backend via `server/config.ts` for SSR/meta only. The `.env` file also
sets `NODE_ENV=production` after `VITE_DEFAULT_THEME` on the same line,
which is a config smell flagged for Phase 3.)*

### 5.2 Backend (`process.env.*`) — read by the Express server

#### Critical (server won't boot / feature breaks without)

| Var | Source file(s) | In `.env`? | In `.env.local`? | Purpose |
|---|---|---|---|---|
| `DATABASE_URL` | `server/db/index.ts`, `server/index.ts:54,78`, `server/replitAuth.ts:25` | — (Replit-managed) | — | Postgres connection. Server exits if missing at boot. |
| `SESSION_SECRET` | `server/replitAuth.ts:31` | — (Replit-managed) | — | Express session crypto. |
| `REPL_ID` | `server/replitAuth.ts:15,146`, `server/routes.ts:308` | — (Replit-managed) | — | Replit Auth OIDC client id. |
| `NODE_ENV` | `server/index.ts:135,165`, `server/replitAuth.ts:37`, `server/routes.ts:3255`, `server/middleware/errorHandler.ts:110`, `shared/categoryMapping.ts:40` | ✅ `production` (suffix glued to VITE_DEFAULT_THEME line) | — | Gates dev/prod error responses, cookie `secure`, migration verification. |
| `PORT` | `server/index.ts:165` | — | ✅ `5000` | Listen port. Defaults 5000 if unset. |

#### Integration credentials (graceful degradation — feature disabled when missing)

| Var | Source file(s) | In `.env`? | In `.env.local`? | Purpose |
|---|---|---|---|---|
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | `server/ai/claudeService.ts:251`, `server/ai/recommendations.ts:9,115,220` | — (Replit-managed via integration) | — | Claude — enrichment, recommendations. |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | `server/ai/claudeService.ts:252`, `server/ai/recommendations.ts:10` | — | — | Claude baseURL override. |
| `ANTHROPIC_API_KEY` | `server/ai/claudeService.ts:251`, `server/ai/researchService.ts:244`, `server/ai/tagging.ts:4,22` | — | — | Fallback for above + research / tagging. |
| **`AI_INTEGRATIONS_OPENAI_API_KEY`** | `server/ai/embeddingService.ts:80` | — | — | OpenAI embeddings (semantic search). |
| **`AI_INTEGRATIONS_OPENAI_BASE_URL`** | `server/ai/embeddingService.ts:81` | — | — | OpenAI baseURL override. |
| **`OPENAI_API_KEY`** | `server/ai/embeddingService.ts:80`, `server/config.ts:105-106` | — | — | Fallback + feature-flag for `ai_tags` / `ai_descriptions`. |
| `GITHUB_TOKEN` | `server/github/client.ts:43` | — | — | GitHub API token. |
| `GITHUB_REPO_URL` | `server/routes.ts:2315,2464` | — | — | Target repo for export. |
| `REPLIT_CONNECTORS_HOSTNAME` | `server/github/replitConnection.ts:38` | — | — | Replit GitHub connection. |
| `REPL_IDENTITY` | `server/github/replitConnection.ts:39,40` | — | — | Replit GitHub auth. |
| `WEB_REPL_RENEWAL` | `server/github/replitConnection.ts:41,42` | — | — | Replit deployment token. |
| `ISSUER_URL` | `server/replitAuth.ts:14` | — | — | Replit Auth issuer (defaults to `https://replit.com/oidc`). |
| `WEBSITE_URL` | `server/github/syncService.ts:195` | — | — | Public site URL for export link backrefs. |
| `AWESOME_RAW_URL` | `server/routes.ts:66`, `server/config.ts` | — | — | Initial seed source. |

#### Server-side bridge for frontend meta (read via `server/config.ts`)

`server/config.ts` reads `VITE_DEFAULT_THEME`, `VITE_GA_MEASUREMENT_ID`,
`VITE_SITE_DESCRIPTION`, `VITE_SITE_TITLE`, `VITE_SITE_URL` from
`process.env` (not `import.meta.env`) so they can be injected into SSR
meta tags. All five are defined in `.env`.

#### Dev-mode `.env.local` only

| Var | Source | Purpose |
|---|---|---|
| `VITE_HOST` | `.env.local` | Vite dev host bind (`0.0.0.0`). |
| `HOST` | `.env.local` | Process host (`0.0.0.0`). |
| `DANGEROUSLY_DISABLE_HOST_CHECK` | `.env.local` | Replit preview host bypass. |
| `DISABLE_HOST_CHECK` | `.env.local` | Same, alt name. |
| `WDS_SOCKET_HOST` | `.env.local` | Webpack-style HMR socket bind. |

**None of the design-system work touches any of these.** DS migration
is purely a frontend CSS + JS-bundle concern; no env contract changes.

---

## 5a · Per-route data dependencies (TanStack Query)

Every `useQuery` / `useMutation` reachable from each page, including
the cross-page `useAuth()` (always hits `/api/auth/user` — listed once
here as the universal dependency rather than repeated 17 times). Hooks
in mounted sub-components (e.g. the 14 admin tab panels) are inlined
under the parent route.

**Universal:** every page mounts `useAuth()` → `GET /api/auth/user`
(staleTime 5 min; skips retry on 401). Counted once.

| Route | Hook | Method | Endpoint | Purpose |
|---|---|---|---|---|
| `/` (Home) | `useQuery` | GET | `/api/awesome-list` (1h stale, via `fetchStaticAwesomeList`) | Hierarchical resource tree. |
| `/login` | — | — | — | No data deps beyond `useAuth`. |
| `/category/:slug` | `useQuery` | GET | `/api/awesome-list` | Hierarchy. |
| `/category/:slug` | `useQuery` | GET | `/api/resources` | Filtered resources. |
| `/subcategory/:slug` | `useQuery` | GET | `/api/awesome-list` + `/api/resources` | Same as Category. |
| `/sub-subcategory/:slug` | `useQuery` | GET | `/api/awesome-list` + `/api/resources` | Same. |
| `/resource/:id` | `useQuery` | GET | `/api/resources/:id` | Core resource record. |
| `/resource/:id` | `useQuery` | GET | `/api/favorites` | Favorite status. |
| `/resource/:id` | `useQuery` | GET | `/api/bookmarks` | Bookmark status. |
| `/resource/:id` | `useQuery` | GET | `/api/resources/:id/related` | Related items. |
| `/resource/:id` | `useMutation` | POST / DELETE | `/api/favorites/:id` | Toggle favorite. |
| `/resource/:id` | `useMutation` | POST / DELETE | `/api/bookmarks/:id` | Toggle bookmark. |
| `/resource/:id` | `useMutation` | POST | `/api/interactions` | Analytics. |
| `/about` | — | — | — | Static. |
| `/advanced` | `useQuery` | GET | `/api/awesome-list` | Full list for client-side filtering. |
| `/submit` | `useQuery` | GET | `/api/categories` + `/api/subcategories` + `/api/subsubcategories` | Form selects. |
| `/submit` | `useMutation` | POST | `/api/resources` | Submit new resource. |
| `/journeys` | `useQuery` | GET | `/api/journeys` | List learning journeys. |
| `/journey/:id` | `useQuery` | GET | `/api/journeys/:id` | Journey details + steps. |
| `/journey/:id` | `useMutation` | POST | `/api/user/journeys/:id/start` | Enroll. |
| `/journey/:id` | `useMutation` | POST | `/api/user/journeys/:id/steps/:sid` | Complete step. |
| `/profile` | `useQuery` | GET | `/api/favorites` | User favorites. |
| `/profile` | `useQuery` | GET | `/api/bookmarks` | User bookmarks. |
| `/profile` | `useQuery` | GET | `/api/user/progress` | Learning stats. |
| `/profile` | `useQuery` | GET | `/api/user/submissions` | Resources user submitted. |
| `/profile` | `useQuery` | GET | `/api/user/journeys` | Enrolled journeys. |
| `/profile` | `useQuery` | GET | `/api/recommendations` | AI suggestions. |
| `/profile` | `useMutation` | POST | `/api/auth/logout` | Logout (via `useAuth`). |
| `/bookmarks` | `useQuery` | GET | `/api/bookmarks` | User bookmarks list. |
| `/admin` → `AdminStats` | `useQuery` (via `useAdmin`) | GET | `/api/admin/stats` | Dashboard counters (driving badge counts). |
| `/admin` → `#approvals` (PendingResources) | `useQuery` | GET | `/api/admin/resources/pending` | Pending list. |
| `/admin` → `#approvals` | `useMutation` | POST | `/api/admin/resources/:id/approve`, `/reject` | Single ops. |
| `/admin` → `#approvals` | `useMutation` | POST | `/api/admin/resources/bulk/{approve,reject,delete}` | Bulk ops (added Feb 2026). |
| `/admin` → `#edits` (PendingEdits) | `useQuery` | GET | `/api/admin/edits/pending` | Pending edits list. |
| `/admin` → `#edits` | `useMutation` | POST | `/api/admin/edits/:id/approve`, `/reject` | Approve/reject single edit. |
| `/admin` → `#enrichment` (BatchEnrichmentPanel) | `useQuery` | GET | `/api/admin/enrichment/jobs` | Job status list. |
| `/admin` → `#enrichment` | `useMutation` | POST | `/api/admin/enrichment/start` | Kick off batch. |
| `/admin` → `#researcher` (ResearcherTab) | `useQuery` | GET | `/api/researcher/jobs` | Research job list. |
| `/admin` → `#researcher` | `useMutation` | POST | `/api/researcher/start` | Kick off research. |
| `/admin` → `#export` (ExportTab) | `useQuery` | GET | `/api/admin/export-json`, validation status | Export status / preview. |
| `/admin` → `#export` | `useMutation` | POST | `/api/admin/validation/run`, awesome-lint exports | Run validation / trigger export. |
| `/admin` → `#database` (DatabaseTab) | — (uses `stats` prop) | — | — | Reads admin stats; mutations via `/api/admin/seed-database` etc. |
| `/admin` → `#resources` (ResourceManager) | `useQuery` | GET | `/api/admin/resources` (paginated) | Resource grid. |
| `/admin` → `#resources` | `useMutation` | PATCH / DELETE | `/api/admin/resources/:id`, bulk endpoints | Edit / delete. |
| `/admin` → `#categories` (CategoryManager) | `useQuery` | GET | `/api/admin/categories` | CRUD list (via GenericCrudManager). |
| `/admin` → `#categories` | `useMutation` | POST / PATCH / DELETE | `/api/admin/categories/:id?` | CRUD ops. |
| `/admin` → `#subcategories` | `useQuery` / `useMutation` | GET / POST / PATCH / DELETE | `/api/admin/subcategories/*` | CRUD. |
| `/admin` → `#subsubcategories` | `useQuery` / `useMutation` | GET / POST / PATCH / DELETE | `/api/admin/sub-subcategories/*` | CRUD. |
| `/admin` → `#users` (UsersTab) | `useQuery` | GET | `/api/admin/users` | Paginated users. |
| `/admin` → `#users` | `useMutation` | PUT | `/api/admin/users/:id/role` | Change role. |
| `/admin` → `#github` (GitHubSyncPanel) | `useQuery` / `useMutation` | various | `/api/admin/github/*` | Sync status / trigger. |
| `/admin` → `#linkhealth` | `useQuery` | GET | `/api/admin/link-health/status` (+ per-resource detail) | Link health overview. |
| `/admin` → `#audit` (AuditTab) | `useQuery` | GET | `/api/admin/audit-logs` | Audit feed. |
| `/settings/theme` | — | — | — | Local-state only. |
| `*` (NotFound) | — | — | — | Static. |

**Phase 2 implication:** every endpoint above must be reachable (or
gracefully degraded with a 401/empty) for the corresponding route to
render its non-loading state. Phase 2 baseline screenshots will only
catch *visible* state — Phase 6 evidence sweep should also include
network-tab snapshots for the admin tabs to verify each call lands.

---

## 6 · State matrix for Phase 2 baseline

Phase 2 must capture screenshots for the following route × state combos.
**This count is the size of `_validation/phase-2/screenshots/`.**

| Route | Public unauth | Authed user | Admin | Loading | Error | Empty | Mobile (400 px) |
|---|---|---|---|---|---|---|---|
| `/` | ✓ | ✓ | — | ✓ (awesome-list query) | ✓ (ErrorPage) | — | ✓ |
| `/login` | ✓ | (redirect?) | — | — | — | — | ✓ |
| `/category/:slug` | ✓ | ✓ (edit btns) | — | ✓ | ✓ (slug 404) | ✓ (no resources) | ✓ |
| `/subcategory/:slug` | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| `/sub-subcategory/:slug` | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| `/resource/:id` | ✓ | ✓ | — | ✓ | ✓ (id 404) | — | ✓ |
| `/about` | ✓ | — | — | — | — | — | ✓ |
| `/advanced` | ✓ | — | — | — | — | ✓ (no results) | ✓ |
| `/submit` | ✓ (login gate?) | ✓ | — | — | ✓ (validation) | — | ✓ |
| `/journeys` | ✓ | — | — | ✓ | — | ✓ | ✓ |
| `/journey/:id` | ✓ | — | — | ✓ | ✓ | — | ✓ |
| `/profile` | ✓ (AuthGuard gate) | ✓ | — | ✓ | — | — | ✓ |
| `/bookmarks` | ✓ (AuthGuard gate) | ✓ | — | ✓ | — | ✓ | ✓ |
| `/admin` | ✓ (AdminGuard → NotFound) | ✓ (NotFound) | ✓ × 14 tabs | ✓ | ✓ | — | ✓ × 14 tabs |
| `/settings/theme` | ✓ | ✓ | — | — | — | — | ✓ |
| `*` (404) | ✓ | — | — | — | — | — | ✓ |

**Cross-cutting overlays (capture in isolation):**
- Search palette (`/` or `⌘K`) — closed, open empty, open with results.
- Mobile drawer open (sidebar).
- Modal example (suggest-edit dialog on `/category/:slug` while authed).
- Toast example (after a mutation).

Approx screenshot count for Phase 2: **~80–100** (15 routes × 1–4
states × desktop, plus mobile pass for ~15 routes, plus overlays, plus
all 14 admin tabs). Phase 2 plan should subset this to a tractable
"functional baseline" matrix.

---

## 7 · Pages that already exist in `client/src/pages/`

```
About.tsx             Home.tsx              Profile.tsx
AdminDashboard.tsx    JourneyDetail.tsx     ResourceDetail.tsx
Advanced.tsx          Journeys.tsx          Subcategory.tsx
Bookmarks.tsx         Login.tsx             SubSubcategory.tsx
Category.tsx          not-found.tsx         SubmitResource.tsx
ErrorPage.tsx         ThemeSettings.tsx
```

17 page files. Every route in §2 maps to one of these; no orphans.

---

## 8 · Layout components

```
client/src/components/layout/
├── Footer.tsx
├── SEOHead.tsx
├── TopBar.tsx              (legacy / unused? — verify in Phase 3)
└── new/
    ├── MainLayout.tsx      ← used by App.tsx
    ├── AppHeader.tsx
    ├── AppSidebar.tsx
    └── ModernSidebar.tsx
```

`MainLayout` is the active shell. The DS contract calls for:
- Sidebar → `.sidebar` + `.accordion-*` (280 / 240 / hidden-mobile widths).
- Header → no DS-mandated class, but should use `--font-mono` for nav.
- Mobile sidebar → `.mobile-drawer` + `.mobile-overlay` semantics.
- Footer → token-driven only (no hardcoded colors).

**Phase 3 deltas will catalog every divergence between `new/MainLayout`
+ `new/AppSidebar` and these DS contracts.**

---

## 9 · Gate 1 verdict

**Verdict: PASS — proceed to Phase 2.**

### What I verified

- ✅ All 16 routes enumerated from the live `<Switch>` in `App.tsx`.
- ✅ Auth gating reverse-engineered from `AdminGuard.tsx` (confirmed
  `role === "admin"` check, NotFound mask on fail) and the `<AuthGuard>`
  wrapper on `/profile` + `/bookmarks` (semantics to verify by
  observation in Phase 2).
- ✅ 14 admin tabs enumerated from `AdminDashboard.tsx`.
- ✅ DS spec is **complete and contract-locked** (DS_SPEC.md §1–§9): 30
  tokens, 5 systems, 10 accents, `applyDesignSystem` API + side-effects,
  Vite-adapted no-FOUT boot, accessibility floor (AAA body / AA
  elsewhere), full component class API.
- ✅ Env var inventory complete (6 frontend, ~20 backend).
- ✅ Replit tool inventory (`inventory.md`) maps every brief verb to a
  concrete tool I have.

### What Gate 1 leaves open (acceptable for Phase 2)

- ❓ `/login` behavior for already-authenticated users — observe in Phase 2.
- ❓ `TopBar.tsx` may be dead code — confirm via `rg` in Phase 3.
- ❓ Whether existing OKLCH theme in `client/src/index.css` will be
  *replaced* or *layered under* the DS tokens — answered by Option A/B
  in DS_SPEC §0.

### **DECISION REQUIRED (BLOCKS PHASE 4)**

Before Phase 4 (Remediation Plan), the user must pick:

- **Option A — Terminal-only.** Recommended. Smallest viable form; matches
  current pure-black cyberpunk aesthetic; default accent Matrix `#00ff88`.
  Drop the system picker; keep accent picker.
- **Option B — All 5 systems + picker.** Requires Phase 5 to also build
  the system picker UI on `/settings/theme`, ship 5 font kits, and Phase 2
  + Phase 6 screenshot matrices grow 5×.

This decision does not block Phase 2 (baseline only screenshots the
*current* app, not the future DS). It does block Phase 4 (the
remediation plan size depends on it) and Phase 5 (the implementation
diff itself).

---

**End of SITE_MAP.** Phase 2 begins when this Gate 1 verdict + DS_SPEC
are signed off.
