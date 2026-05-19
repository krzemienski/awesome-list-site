# SPEC_v6.md — Awesome Video · Product & Design System Spec

**Status:** Authoritative product/design contract for the Editorial + Crimson migration.
**Audience:** Engineers (frontend, backend, DevOps), designers reviewing parity, QA building evidence matrices.
**Locked decisions:** single personality (Editorial), single accent (Crimson), no system switcher, dark-only, English-only.
**Source of truth artifacts that this doc supersedes for product detail:** `_planning/SITE_MAP.md`, `_planning/DELTA_CATALOG.md`, `_planning/REMEDIATION_PLAN.md` (those remain valid for migration ordering and per-token diffs; this doc is the *what we ship*).
**Source of truth for DS tokens & primitives:** `_planning/DS_SPEC.md` (canonical Editorial+Crimson contract). This doc cites it; it does not re-derive it.

---

## 0. Reading guide

This spec is organised by **surface**, not by file. For every surface you will find:

1. **Purpose** — one sentence, user-facing.
2. **Information architecture** — routes, breadcrumbs, navigation contracts.
3. **Functional contract** — every interactive element, every data fetch, every mutation, every keyboard shortcut.
4. **State contract** — loading / empty / error / unauthenticated / unauthorized / no-permission / success / partial-failure variants.
5. **Design contract** — exact Editorial+Crimson treatment, mapped to DS primitives, tokens, and motion.
6. **Acceptance criteria** — falsifiable checks suitable for a per-cell evidence matrix.
7. **Endpoints** — the precise HTTP calls each surface depends on.

When a section says "see §X", X is a section number in this document.

---

## 1. Product overview

**Awesome Video** is a curated, searchable directory of video-development resources (codecs, players, encoders, protocols, infrastructure, SDKs, learning material). It transforms the community-curated GitHub "Awesome List" pattern into a first-class, accessible web product with:

- **Browsing** — a 3-level taxonomy (Category → Subcategory → Sub-subcategory) over ~1,949 approved resources spread across 9 categories, 19 subcategories, 32 sub-subcategories.
- **Discovery** — global ⌘K fuzzy search (Fuse.js) and an Advanced page with multi-tag/AND/OR filters, sort, and export.
- **Personalisation** — bookmarks, favourites, AI-generated learning journeys, AI-powered "what should I read next" recommendations.
- **Community contribution** — public "Submit resource" form, suggest-edit on any resource, full admin review queues (Pending Resources, Pending Edits).
- **Admin operations** — 14 admin tabs covering CRUD, queues, AI batch enrichment (Claude), automated researcher discovery, bidirectional GitHub sync (awesome-lint compliant), link health monitoring, audit log, user/role management, database operations, and export.
- **Distribution** — Awesome-list-compliant markdown export back to GitHub via Replit GitHub OAuth.

The product is **dark-only** by deliberate decision (the source DS handoff has no light-mode tokens; the current product was already dark-locked).

---

## 2. Stack & runtime contract

| Concern | Implementation |
|---|---|
| Frontend framework | React 18.3 + TypeScript |
| Build tool | Vite 5.4 (`@tailwindcss/vite`) |
| Router | wouter 3.3 |
| Data layer | TanStack Query v5 |
| Styling | Tailwind v4 + shadcn/ui (Radix primitives) |
| Icons | `lucide-react` (default stroke 1.5 via DS) |
| Backend framework | Express on Node, single port 5000, Vite middleware in dev |
| ORM | Drizzle |
| Database | PostgreSQL (Neon-compatible) |
| Auth | Passport.js — Replit OIDC + local email/password |
| AI integrations | Anthropic Claude (enrichment, recommendations, researcher) via Replit AI Integrations |
| External | GitHub REST API for sync, Replit GitHub OAuth for commits |
| Analytics | Google Analytics 4 (`VITE_GA_MEASUREMENT_ID`) |
| Workflow | `npm run dev` workflow named **`Start application`** |
| Required env | `REPL_ID`, `DATABASE_URL`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `VITE_GA_MEASUREMENT_ID`, `ISSUER_URL` |

**Non-negotiable runtime invariants:**

- A single Express process serves both the JSON API and the Vite-built SPA. **Do not** add a separate Vite dev server or proxy.
- The PostgreSQL database is the single source of truth. The legacy static JSON path is removed.
- `<html data-system="editorial" data-accent="crimson">` is set in the boot script in `client/index.html` *before* any JS module paints, to guarantee no Terminal/Matrix flash.
- The Editorial token block in `client/src/styles/design-system.css :root` is the only place where token values are defined. Components must read tokens — never hard-code hex.

---

## 3. Editorial + Crimson design system — quick reference

Full canonical contract lives in `_planning/DS_SPEC.md`. The cheat sheet below is what every page in this document is built from.

### 3.1 Token cheat sheet

| Layer | Token | Value |
|---|---|---|
| Background | `--bg` | `#000000` |
| Background (popover) | `--bg-2` | `#0a0a0a` |
| Surface (card rest) | `--surface` | `rgba(244,243,238,0.025)` |
| Surface 2 (card hover) | `--surface-2` | `rgba(244,243,238,0.05)` |
| Surface 3 (active pill) | `--surface-3` | `rgba(244,243,238,0.08)` |
| Border | `--border` | `rgba(244,243,238,0.08)` |
| Border strong | `--border-strong` | `rgba(244,243,238,0.16)` |
| Hairline | `--hairline` | `rgba(244,243,238,0.06)` |
| Ink primary | `--text` | `#f4f3ee` |
| Ink secondary | `--text-2` | `rgba(244,243,238,0.66)` |
| Ink tertiary | `--text-3` | `rgba(244,243,238,0.4)` |
| Ink disabled | `--text-4` | `rgba(244,243,238,0.22)` |
| Accent (crimson) | `--accent` | `#ff3d52` |
| Accent secondary | `--accent-2` | `#b84dff` |
| OK | `--ok` | `#34d08c` |
| Warn | `--warn` | `#ffb84d` |
| Bad / destructive | `--bad` | `#ff5c7a` |

| Font role | Token | Family |
|---|---|---|
| Display | `--font-display` | Fraunces (variable) |
| Body | `--font-body` | Inter |
| Mono | `--font-mono` | JetBrains Mono |

Body feature settings: `"ss01", "cv11", "tnum"`.

| Geometry | Value |
|---|---|
| `--radius` | 12px (Card, Dialog, primary surfaces) |
| `--radius-sm` | 8px (Input, Select, Button, small surfaces) |
| `--radius-pill` | 999px (chips, Tabs pill list) |
| `--border-w` | 1px |

| Shadow | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow` | `0 6px 24px -8px rgba(0,0,0,0.5)` |
| `--shadow-lg` | `0 24px 60px -20px rgba(0,0,0,0.7)` |
| `--shadow-accent` | `0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 12px 36px -12px color-mix(in srgb, var(--accent) 40%, transparent)` |

| Motion | Value |
|---|---|
| Fast (hover/colour) | 160 ms |
| Base (card lift, bg) | 220 ms `cubic-bezier(0.2,0.65,0.3,1)` |
| Drawer slide | 280 ms |
| Accordion | 320 ms `cubic-bezier(0.2,0.65,0.3,1)` |

| Breakpoint | Value | Behaviour |
|---|---|---|
| Mobile | ≤768 px | Sidebar hidden behind drawer, header 56 px |
| Compact | ≤1024 px | Sidebar narrows to 240 px |
| Desktop | ≥1280 px | Full sidebar 280 px |

### 3.2 Atmosphere

- `.page` carries `--bg-atmosphere` — a soft top-anchored radial gradient.
- `.grain` is a fixed SVG noise overlay at `opacity: 0.32`, `pointer-events: none`, `aria-hidden`.
- Both are mounted once in `client/src/components/layout/new/MainLayout.tsx`. No page must add or duplicate them.

### 3.3 Primitive contract (the only contract pages may rely on)

| Primitive | DS rule |
|---|---|
| Button | `rounded-lg` (8 px), 44 px min touch target on mobile, primary = crimson bg + black ink, hover lifts −1 px, active translates +1 px |
| Card | `rounded-xl` (12 px), `--shadow-sm` rest, hover border lifts to `--border-strong` (240 ms), optional `.hoverable` translates −2 px and bumps to `--surface-2` |
| Input / Textarea / Select | `--surface` bg, 8 px radius, `border-input` rest, hover `--border-strong`, focus `color-mix(--accent 60%)` |
| Dialog | 12 px radius, `--bg-2` bg, `--shadow-lg`, 4 px backdrop blur, `Escape` closes |
| Tabs (pill list) | `--surface` rounded-full container with hairline; active tab = `--surface-3` bg + crimson ink + soft shadow |
| Badge `chip` | mono uppercase 10 px, tracking 0.12 em, surface bg, text-2 ink |
| Badge `accent` | crimson-tinted variant for hot/important chips |
| Eyebrow (`.eyebrow`) | mono 11 px, tracking 0.18 em, **crimson** ink, weight 700 |
| Display heading | Fraunces 500, tracking −0.02 em, leading 1.04; `em` inside renders **crimson italic** |
| Kbd | mono 10.5 px, hairline border, `--surface` bg, 4 px radius |
| Toast | 12 px radius, `--bg-2` bg, optional crimson accent stripe for destructive |
| Sidebar item active | 2 px crimson bar on left with 8 px glow, ink → `--text`, bg → `color-mix(--accent 8%)` |
| Status dot | `--ok` / `--warn` / `--bad`; `.live-dot` pulses in crimson |

### 3.4 Editorial-only skins

```css
[data-system="editorial"] .display-h em,
[data-system="editorial"] .serif-italic { color: var(--accent); }
[data-system="editorial"] .eyebrow { color: var(--accent); font-weight: 700; }
```

These are *automatic* — pages don't need to know about them. Pages just use `<em>` inside a display heading or apply `.eyebrow` and Editorial does the rest.

---

## 4. Information architecture

### 4.1 Public routes

| # | Path | Component | Purpose |
|---|---|---|---|
| 1 | `/` | `Home` | Landing — taxonomy explorer + AI recs |
| 2 | `/about` | `About` | Project description, features, stack, credits |
| 3 | `/advanced` | `Advanced` | Power-user search, filters, metrics, export |
| 4 | `/login` | `Login` | Local email/password + OAuth providers |
| 5 | `/submit` | `SubmitResource` | Submit a new resource (auth-gated) |
| 6 | `/category/:slug` | `Category` | Category browse with grid/list/compact view modes |
| 7 | `/subcategory/:slug` | `Subcategory` | Subcategory browse |
| 8 | `/sub-subcategory/:slug` | `SubSubcategory` | Tertiary browse |
| 9 | `/resource/:id` | `ResourceDetail` | Full resource profile + related |
| 10 | `/journeys` | `Journeys` | List AI-generated learning journeys |
| 11 | `/journey/:id` | `JourneyDetail` | Stepper for a single journey |
| 12 | `/settings/theme` | `ThemeSettings` | Legacy theme picker — deferred, see §5.13 |
| 13 | `*` | `NotFound` | 404 |

Global `ErrorPage` is shown when `awesome-list` fetch hard-fails.

### 4.2 Protected routes

| # | Path | Guard | Purpose |
|---|---|---|---|
| 14 | `/profile` | `AuthGuard` | User profile (account, learning prefs) |
| 15 | `/bookmarks` | `AuthGuard` | Saved resources |
| 16 | `/admin` | `AdminGuard` | 14-tab admin console |

### 4.3 Breadcrumb contract

The header (`AppHeader.tsx`) computes breadcrumbs from the URL:

- `/` → no breadcrumb.
- `/category/<slug>` → `Home / <Category Name>`.
- `/subcategory/<slug>` → `Home / <Parent Category> / <Subcategory>`.
- `/sub-subcategory/<slug>` → `Home / <Parent Category> / <Parent Subcategory> / <Sub-Sub>`.
- `/resource/:id` → `Home / <Category> / <Resource Title (truncated)>`.
- All admin routes → `Home / Admin / <Tab Name>`.
- All other routes → `Home / <Page Name>`.

Crumb separators are slash glyphs at `--text-3`. The current crumb is `--text`, all others `--text-2`. Crumbs use `font-mono` size 13. Click on any crumb is a `wouter` `Link`.

### 4.4 Sidebar navigation contract

Sidebar (`AppSidebar.tsx`) has three groups, each labelled with an `.eyebrow`:

1. **`// Browse`** — Home, About, Advanced.
2. **`// Personal`** (auth-gated) — Bookmarks, Profile, Submit Resource.
3. **`// Taxonomy`** — every Category with its Subcategories and Sub-subcategories, each level collapsible. Active node shows the 2 px crimson bar + glow; hover translates +2 px.

Footer of sidebar shows the brand block: **Fraunces** "Awesome Video" + a mono eyebrow with the live resource count ("`// 1,949 resources`"). On `≤768 px` the entire sidebar lives behind a mobile drawer triggered by a hamburger in the header.

---

## 5. Public pages — page-by-page PRD

### 5.1 `/` — Home

**Purpose.** Land users with a clear declarative hero, then offer immediate access to all 9 top-level categories and AI-powered next-step suggestions.

**Layout (top → bottom).**

1. **Hero block.**
   - Eyebrow: `// Index`.
   - Display heading: Fraunces 500, 48 px desktop / 30 px mobile, tracking −0.02 em, leading 1.04 — *"Awesome <em>Video</em> Resources"* (the word `Video` is rendered as crimson italic via the `[data-system="editorial"] .display-h em` skin).
   - Sub-copy: Inter 16 px / 14 px mobile, `--text-2`, max-width 42 ch — e.g. *"Explore N categories with M curated resources for engineers building the modern video stack."*
2. **Advanced filter strip** (`AdvancedFilter.tsx`).
   - Multi-select tag chips (top 30 tags by count) using the `chip` Badge variant; selected state uses the `accent` chip variant.
   - Sort dropdown (Select primitive) with: Default, Name A–Z, Name Z–A, Count high→low, Count low→high.
3. **Category grid.**
   - Responsive: 1 col / 2 col @ 640 / 3 col @ 1024.
   - Card: Fraunces title (medium), crimson icon (`lucide-react` map per category — `FileText`, `Server`, `Code`, `Play`, `Settings`, `Package`, `Layers`, `Users`), `chip` count badge top-right, optional first-resource description truncated 100 chars.
   - Click → `/category/:slug`. Whole card is the link; touch target full card area, min 88 px tall on mobile.
   - Hover: border lifts to `--border-strong`, shadow upgrades to `--shadow`, 220 ms.
4. **AI Recommendations block** (`AIRecommendationsPanel.tsx`).
   - Eyebrow: `// Personalized`.
   - Heading: *"<em>AI</em>-Powered Recommendations"* with crimson italic on `AI`.
   - **Authed:** full panel — skill-level chips (Beginner/Intermediate/Advanced), preferred-categories multi-select, learning-goal textarea, time-commitment slider, "Generate" primary button → ranked list of resources with a crimson **match %** badge and AI rationale paragraph. Each rec has Visit, Bookmark, "Tell me why" actions.
   - **Unauthed:** small `Card` with a `LogIn` icon, two-line copy, primary CTA "Login to get started" → `/login`.

**State contract.**

| State | Trigger | Treatment |
|---|---|---|
| Loading | Initial fetch | Skeleton tiles in category grid (9), eyebrow + hero static |
| Empty (filter) | Selected tags match 0 categories | Render empty grid + chip with "Clear filters" ghost button |
| Error (hard) | `awesome-list` fetch throws | Whole route replaced by `ErrorPage` (see §5.14) |
| Unauth (AI rec) | `isAuthenticated=false` | Show login CTA card instead of full panel |

**Data.**
- Read: `GET /api/awesome-list` (whole tree; cached 1 h).
- Read (auth only): `GET /api/recommendations`, `GET /api/recommendations/init`.
- Write (auth only): `POST /api/recommendations` (regenerate), `POST /api/recommendations/feedback`.

**Endpoints used: `GET /api/awesome-list`, `GET /api/auth/user`, `GET /api/recommendations` (auth), `POST /api/recommendations` (auth).**

**Acceptance.**
- AC-H1 hero `<em>Video</em>` renders crimson italic without inline color override.
- AC-H2 first paint shows `data-system="editorial"` (no Terminal flash).
- AC-H3 9 categories visible with non-zero counts and resource preview text where present.
- AC-H4 tap target on a category card ≥ 88 px in 375 px viewport.
- AC-H5 sort dropdown applies without page reload; query string is unchanged (state is local).
- AC-H6 unauthenticated user sees AI login CTA, not the panel.

---

### 5.2 `/about` — About

**Purpose.** Explain the product, the feature set, the stack, the credits.

**Layout.**
1. Hero — eyebrow `// About the project`, display heading *"About <em>Awesome Video</em>"*, sub-copy at `--text-2`.
2. Section "**What is this?**" — single `Card`, Rocket icon in crimson, two paragraphs.
3. Section "**Features**" — 8-tile grid (`Card` per tile), one Lucide icon per tile in crimson, label + short description.
4. Section "**Technology Stack**" — two columns of dot-prefixed tech items (React, Tailwind, shadcn/ui, Fuse.js, Framer Motion, TypeScript) with one-line role caption.
5. Section "**Accessibility First**" — 6 bullet rows with crimson dot markers (Heading structure, keyboard nav, contrast, ARIA, motion prefs, screen reader).
6. Section "**Credits**" — 3 link cards (Awesome List community, shadcn/ui, Tailwind) — each card has crimson icon + label + caption; hover lifts border to crimson.

**Design notes.**
- Every `CardTitle` uses Fraunces medium tracking-tight.
- No `border-{primary,accent}/20` overrides — DS Card carries the border.
- All section icons in `var(--accent)`.
- Credit-link hover: `border` → `color-mix(--accent 60%)`, 160 ms.

**Endpoints used:** *(none)*.

**Acceptance.**
- AC-A1 Hero italic word "Awesome Video" renders crimson.
- AC-A2 No remaining `text-primary` / `border-primary` / `bg-gradient` in source after migration.

---

### 5.3 `/advanced` — Advanced search / metrics / export

**Purpose.** Power-user surface. Multi-tab.

**Tabs (DS Tabs pill list).**

1. **Explorer** — real-time stats cards (Total Categories, Total Resources, Unique Tags), each card showing a large Fraunces number on a `--surface` card with eyebrow label. Below: full taxonomy explorer (collapsible tree).
2. **Metrics** — Engagement charts (resource view counts, click-through rate, bookmark counts) rendered as neutral-ink line/area charts with crimson active points. (Charts re-skinned per DELTA C-08; chart palette is `--text-2` lines + crimson highlight.)
3. **Export** — Format selector (Markdown, JSON, CSV, PDF, HTML, YAML) as a chip group; primary "Download" button. PDF/HTML/Markdown exports include the awesome-lint-compliant header.
4. **AI Recommendations** — full AI rec panel mirrored from Home (auth-gated).

**State.** Each tab independently shows loading skeleton; "No results" empty for Metrics if no events; download error toast on Export failure.

**Endpoints used:** `GET /api/awesome-list`, `GET /api/interactions` (metrics), `POST /api/admin/export` (export — public-safe formats only), `GET /api/recommendations` (auth).

---

### 5.4 `/login` — Login

**Purpose.** Authenticate via local credentials or OAuth providers; redirect to `/admin` (or original `?redirect=` target) on success.

**Layout (centered).**
1. Halo: 48 px crimson-tinted disc (`color-mix(--accent 12%)` bg, crimson ring) wrapping `LogIn` lucide icon.
2. Eyebrow: `// Authentication`.
3. Display heading: Fraunces 500, 30 px — *"Welcome <em>back</em>"*.
4. Sub-copy: "Sign in to access the admin dashboard." (`--text-2`).
5. Form:
   - Email field (Mail icon inside Input, autoComplete `email`).
   - Password field (Lock icon inside Input, autoComplete `current-password`).
   - **Sign in** primary Button (full width, disabled state shows "Signing in…").
6. Separator with mono uppercase label "Or continue with" on `--bg-2` chip.
7. Two-column OAuth grid: **Google** (Chrome icon) and **GitHub**. Both call `/api/login` (Replit OIDC). The button labels show the provider name; outline variant.
8. Default-admin surface card (a real `Card` with `--surface` bg) — for dev convenience: `admin@example.com / admin123` + warn-coloured "Change password after first login" note.

**Behaviour.**
- Local login submits `POST /api/auth/local/login` with `credentials: 'include'`. On 200, pre-warms the React Query cache for `['/api/auth/user']`, invalidates, re-warms, fires a success toast, then **hard navigates** (`window.location.href = '/admin'`) to ensure the session cookie is in flight for subsequent requests.
- OAuth: both buttons redirect to `/api/login` (Replit OIDC handles provider choice on its end).
- Failure: red toast with backend message, form remains, fields not cleared.

**Form validation.**
- Zod schema: `email` valid email; `password` ≥ 8 chars.
- React-hook-form via shadcn `<Form>`; errors render in `<FormMessage>` below each input.

**State contract.**

| State | Trigger | Treatment |
|---|---|---|
| Default | Initial | Empty form, focused on email |
| Loading | Submitting | Inputs disabled, button shows "Signing in…", spinner |
| Validation error | Zod fail | Per-field `<FormMessage>` in `--bad` |
| Auth fail | 401 | Destructive toast "Login failed" with backend reason |
| Network fail | Throw | Destructive toast "An error occurred during login. Please try again." |
| Success | 200 | Success toast, hard nav to `/admin` |

**Endpoints used:** `POST /api/auth/local/login`, `GET /api/login` (OAuth redirect).

**Acceptance.**
- AC-L1 No `bg-gradient-to-br` wrapper (eliminates double-paint over MainLayout atmosphere).
- AC-L2 Italic "back" renders crimson.
- AC-L3 OAuth buttons keyboard-focusable, focus ring crimson.
- AC-L4 Default-admin block uses `--surface` bg + `--border` (no bare text on `--bg`).
- AC-L5 Separator label and credentials labels use ≥ `--text-2` for AA contrast.

---

### 5.5 `/submit` — Submit resource

**Purpose.** Let any authenticated user propose a new resource. Auto-routed to Admin's **Approvals** queue.

**Layout.**
- **Unauth:** empty-state card — eyebrow `// Contribute`, display heading *"Submit a <em>resource</em>"*, sub-copy explaining why login is required, primary CTA → `/login?redirect=/submit`.
- **Auth:** form Card with fields:
  - **URL** (Input, validated http/https; `GET /api/resources/check-url` on blur returns existing-resource flag so users see "Already in directory" before submitting).
  - **Title** (Input, max 120 chars).
  - **Description** (Textarea, max 240 chars; live counter, JetBrains Mono per DS textarea rule).
  - **Category** (Select, populated from `/api/categories`).
  - **Subcategory** (cascading Select, depends on chosen Category).
  - **Sub-subcategory** (optional cascading Select).
  - **Tags** (multi-input Chip field; comma- or enter-separated; max 8).
  - **Submit** primary button.

**Behaviour.** On `POST /api/resources` (auth required) the resource is stored with `status='pending'`; user sees a success toast and is bumped to `/profile` with the submission visible under "Your submissions".

**State contract.** Loading, validation errors per field, "URL already exists" inline warning, success toast, network-error toast.

**Endpoints used:** `GET /api/categories`, `GET /api/subcategories`, `GET /api/sub-subcategories`, `GET /api/resources/check-url`, `POST /api/resources`.

---

### 5.6 `/category/:slug` — Category browse

**Purpose.** Render all resources for a category with three view modes and inline tools.

**Layout.**
1. Crumbs (header).
2. Eyebrow `// Category`.
3. Display heading: Fraunces medium, the category name with the operative noun rendered as crimson italic (e.g. *"Encoding & <em>Codecs</em>"*).
4. Lede paragraph: `--text-2`, one-line description from DB.
5. Toolbar row:
   - **View mode toggle** (`ToggleGroup`): Grid · List · Compact. Active state = `--surface-3` bg + crimson ink.
   - **Tag filter chips** (`chip` variant; selected → `accent` chip).
   - **Sort Select** (Default / Newest / A–Z / Most-tagged).
   - **Search-in-category** Input (filters in-memory; debounced 200 ms).
6. Resource list — paginated/virtualised on >100 items:
   - **Grid mode**: 1/2/3-col responsive `Card.hoverable` with title, description, tag chip row, external-link icon button, optional "Suggest edit" icon (auth + db-backed only), bookmark/favorite icon buttons.
   - **List mode**: full-width rows with left-aligned thumbnail (favicon), title + description inline, right-side chips and actions.
   - **Compact mode**: single-line rows, mono 13 px, no description, just title + tag chip + actions.
7. Subcategories quick-links rail at bottom — each as a pill `chip` linking to `/subcategory/:slug`.

**Important interaction rules.**
- Clicking the resource card body navigates to **`/resource/:id`** (db-backed) or opens the external URL in a new tab (static legacy entries; legacy detection: `id` is purely numeric → db). The Suggest Edit and Bookmark buttons must `e.stopPropagation()` to avoid triggering the card link.
- The view-mode toggle persists in `localStorage` per category slug.

**State contract.**

| State | Treatment |
|---|---|
| Loading | 12 skeleton cards in current grid layout |
| Empty | Eyebrow + display "No resources match." + clear-filters ghost button |
| Filtered-empty | Same as above with "Showing 0 of N" mono counter |
| Resource not in DB | External link only; no `/resource/:id` route |
| Authed | Bookmark + Suggest-Edit icons enabled |
| Unauthed | Same icons rendered but click triggers login dialog |

**Endpoints used:** `GET /api/awesome-list` (rehydrate from cache), `GET /api/resources?categoryId=…` (fallback if cache absent), `POST /api/bookmarks/:resourceId`, `POST /api/favorites/:resourceId`, `POST /api/resources/:id/edits` (suggest edit dialog).

**Acceptance.**
- AC-C1 view-mode change ≤ 1 frame, no layout flash.
- AC-C2 chip filter chip selection updates count badge instantly.
- AC-C3 sticky toolbar on scroll (mobile and desktop).
- AC-C4 keyboard: `[` and `]` cycle view modes; `Esc` clears search; `Tab` reaches every action.

---

### 5.7 `/subcategory/:slug` and `/sub-subcategory/:slug`

Identical contract to §5.6 but with deeper breadcrumb path, scoped resource list, and a back-link chip in the toolbar that returns to the parent.

---

### 5.8 `/resource/:id` — Resource detail

**Purpose.** Single-resource profile with everything we know plus related content.

**Layout (desktop two-column ≥1024 px).**
- **Left column (8 cols).**
  - Crumbs.
  - Eyebrow `// Resource`.
  - Display heading: Fraunces medium, the resource title; first salient word/phrase rendered as crimson italic when possible.
  - Quick-action toolbar: `Visit` (primary crimson, opens in new tab + tracks `POST /api/interactions`), `Share` (Web Share API → clipboard fallback), `Bookmark`, `Favorite`. All 44 px tall.
  - Description (full text, Inter body, leading 1.6).
  - Tag row (chips).
  - **Open Graph card** — OG image (`metadata.og.image`), site name, OG description in a bordered `Card`.
  - **Scraped metadata accordion** — Title, Description, OG image URL, Twitter card, Favicon, Canonical, Last fetched timestamp (mono). Each row hairline-separated.
  - **Source category breadcrumb** — link chips back to Category / Subcategory / Sub-subcategory.
  - **Admin shortcut** (admin-only) — outline button "Edit in Admin" → `/admin?tab=resources&id=:id`.
- **Right column (4 cols).**
  - **Related resources** (top 6 by relevance) as `Card.hoverable` mini-rows. Each row shows a crimson match-strength chip.

**Mobile (≤768 px).** Single column; right rail flows under main content.

**Behaviour.**
- `Share` button uses `navigator.share` first; if unavailable, copies URL and shows success toast.
- `Bookmark`/`Favorite` are optimistic; rollback on mutation failure.
- `Suggest Edit` button is *always visible* — for unauthed users it shows a login-required dialog with redirect; for authed users it opens `SuggestEditDialog` with the resource's fields prefilled.

**State contract.**

| State | Treatment |
|---|---|
| Loading | Skeleton hero + skeleton metadata block + 6 skeleton related rows |
| Not found (404) | Empty-state Card with "Resource not found" + back-to-category button |
| Error | Inline error Card with retry |

**Endpoints used:** `GET /api/resources/:id`, `GET /api/resources/:id/related` (derived in client when route is absent), `POST /api/interactions`, `POST /api/bookmarks/:resourceId`, `DELETE /api/bookmarks/:resourceId`, `POST /api/favorites/:resourceId`, `DELETE /api/favorites/:resourceId`, `POST /api/resources/:id/edits`.

---

### 5.9 `/journeys` — Learning journeys

**Purpose.** List AI-generated learning paths (sequences of resources around a topic).

**Layout.**
- Eyebrow `// Curated paths`, display heading *"Learning <em>journeys</em>"*, sub-copy.
- 3-col grid of `Card.hoverable`:
  - Crimson icon (BookOpen/Compass/GraduationCap depending on level).
  - Display title (Fraunces medium).
  - Description (`--text-2`, 2-line clamp).
  - Mono row: step count chip + estimated minutes chip + difficulty chip (accent variant).
  - Start button (primary) → `/journey/:id`.
- "Generate your own journey" callout at bottom — eyebrow + primary CTA opens a dialog with topic + skill + time inputs; submits `POST /api/learning-paths/generate`.

**Endpoints used:** `GET /api/journeys`, `GET /api/learning-paths/suggested`, `POST /api/learning-paths`, `POST /api/learning-paths/generate`.

---

### 5.10 `/journey/:id` — Journey detail (stepper)

**Purpose.** Walk a user through a multi-step learning sequence with per-step resources.

**Layout.**
- Hero — eyebrow `// Journey`, display title, lede.
- Progress strip — N step dots (`.dot` per DS); current step shows the crimson 2 px bar; completed steps show `--ok` dot.
- Per-step `Card`:
  - Step eyebrow `// Step <n> of <N>`.
  - Step title (Fraunces medium).
  - Step description.
  - Resource list (cards) for this step.
  - Actions: **Mark complete** (primary), **Skip** (ghost), **Bookmark all in step** (ghost icon).
- Floating CTA on completion: success toast "Journey complete." + `/journeys` back link.

**Behaviour.**
- `POST /api/journeys/:id/start` on first visit if user has not started.
- `PUT /api/journeys/:id/progress` on each step state change (optimistic).
- Toast on per-step completion.

**Endpoints used:** `GET /api/journeys/:id`, `GET /api/journeys/:id/progress`, `POST /api/journeys/:id/start`, `PUT /api/journeys/:id/progress`.

---

### 5.11 `*` — Not found (404)

**Layout (centred).**
- Eyebrow `// 404`.
- Display heading *"Page not <em>found</em>"*.
- Sub-copy: "The page you're looking for does not exist or was moved."
- Primary CTA → `/`.
- Secondary ghost CTA → "Search" (opens ⌘K palette).

---

### 5.12 Global error page (`ErrorPage`)

Shown when `awesome-list-data` query hard-fails (network/JSON/HTTP non-2xx).

**Layout.** Centred `Card`, max-width 28 rem.
- `AlertCircle` icon in `--bad` left of `CardTitle` "Something went wrong".
- Body: "We encountered an error while loading the awesome list:" + the actual error message inside a mono `--surface` rounded block (post-WP-4 the message includes the precise cause: `HTTP <status>`, `request timed out after Ns`, or `Invalid JSON…`).
- Footer: **Retry** ghost (reloads page), **Visit Awesome Lists** primary (external).

**Implementation note.** `fetchStaticAwesomeList` performs 2 attempts (45 s timeout each, linear back-off) with `AbortController` cleanup before throwing; the surfaced error message is the actionable, typed string — never Safari's opaque "Load failed".

---

### 5.13 `/settings/theme` — Theme settings (legacy, deferred)

**Status.** Out of scope for Editorial migration. The legacy multi-system picker lives here. The runtime applier was neutralised in WP-1 (`client/src/lib/design-system.ts` self-init is a no-op, `ui/theme-provider.tsx` `applyTheme/applyFont` effects are permanent no-ops) so this page can be visited without side-effects on Editorial mode. UI is left as-is until a future "Accent showcase" or full removal decision (DELTA D-08).

---

## 6. Protected pages

### 6.1 `/profile` — User profile

**Purpose.** Manage account preferences and view contribution history.

**Layout (two-column desktop, single column mobile).**
- Left (8 cols):
  - Account `Card` — avatar (initials), email (mono), provider chip (Replit/GitHub/Google/Local), member-since date.
  - Preferences `Card` — name Input, display name Input, skill-level Select, preferred-categories multi-select (chip grid), AI personalization toggle, email-on-approval toggle, **Save** primary.
  - Danger zone `Card` — bordered `--bad`, "Delete my account" outline-bad button (confirmation dialog).
- Right (4 cols):
  - Stats `Card` — bookmarks count, submissions count, edits suggested, journey steps completed.
  - "Your submissions" `Card` — list of user's `POST /api/resources` submissions with status chips (Pending / Approved / Rejected). Each row links to the resource.

**Endpoints:** `GET /api/auth/user`, `GET /api/user/submissions`, `GET /api/user/progress`, `GET /api/user/journeys`, `POST /api/auth/logout`.

---

### 6.2 `/bookmarks` — Saved resources

**Purpose.** Show the user's saved resources in the same grid/list/compact contract as Category browse.

**Layout.** Identical contract to §5.6 with:
- Eyebrow `// Bookmarks`.
- Display heading *"Your <em>bookmarks</em>"*.
- Toolbar: view-mode toggle, sort (Newest / A–Z), Clear-all ghost button (confirm dialog).
- Empty state: eyebrow + display *"Nothing saved <em>yet</em>"* + primary CTA → `/`.

**Endpoints:** `GET /api/bookmarks`, `DELETE /api/bookmarks/:resourceId`, `GET /api/favorites`.

---

## 7. Admin panel — `/admin`

**Guard.** `AdminGuard` HOC checks `useAuth().user.role === 'admin'`. Non-admin authenticated users see a "Not authorized" empty-state card with a logout button. Unauthenticated users are redirected to `/login?redirect=/admin`.

**Shell.** `AdminDashboard.tsx` renders:
- Page hero — eyebrow `// Admin`, display heading *"Admin <em>console</em>"*, lede with mono build timestamp + DB stats badge.
- **Top stats row** — `AdminStats` widget showing 4 large numeric cards: Total Resources, Pending Approvals, Categories, Active Users. Each is a `Card` with Fraunces large number, eyebrow label, sparkline-style delta (optional).
- **Tabs** — DS pill-list Tabs (rounded-full container, crimson active state). 14 tabs in this order:
  1. Approvals
  2. Edits
  3. Enrichment
  4. Researcher
  5. Export
  6. Database
  7. Resources
  8. Categories
  9. Subcategories
  10. Sub-Subcategories
  11. Users
  12. GitHub
  13. Link Health
  14. Audit

Each tab has its own functional contract.

---

### 7.1 Approvals — Pending Resources

**Component.** `PendingResources.tsx`.

**Functional contract.**
- Top toolbar: search Input (filters by title/URL), category Select filter, "Select all on page" checkbox, **Bulk Approve** (primary), **Bulk Reject** (outline `--bad`), **Bulk Delete** (outline `--bad`).
- Table (DS table styling — uppercase mono th, row hover `--surface`, hairline rows):
  - Columns: Checkbox · Title · URL (truncated, hover shows full) · Submitted by · Category · Tags chip row · Status chip · Submitted at · Actions.
  - Actions per row: **Approve** primary, **Reject** ghost bad, **Edit** ghost (opens edit dialog with the same field set as Submit form), **Delete** ghost bad.
- Pagination — 25 / 50 / 100 per page Select + page count mono.
- Empty: "No pending resources." with eyebrow.

**Endpoints.** `GET /api/admin/pending-resources`, `POST /api/admin/resources/:id/approve`, `POST /api/admin/resources/:id/reject`, `DELETE /api/admin/resources/:id`, `POST /api/admin/resources/bulk/approve`, `POST /api/admin/resources/bulk/reject`, `POST /api/admin/resources/bulk/delete`, `PUT /api/admin/resources/:id`.

---

### 7.2 Edits — Pending Edits

**Component.** `PendingEdits.tsx`.

**Purpose.** Review community-suggested edits to existing resources.

**Functional contract.**
- Filter chips: All · By field (title / description / tags / category) · By submitter.
- Per-edit `Card`:
  - Eyebrow `// Edit #<id>`.
  - Resource title link → `/resource/:id`.
  - Submitter chip + mono timestamp.
  - **Side-by-side diff** — left "Current" column, right "Proposed" column, changed cells highlighted with crimson 2 px left bar.
  - Actions: **Approve** primary (applies edit + writes audit log), **Reject** outline bad, **Request changes** ghost (opens textarea dialog → sends note to submitter — currently no-op until messaging exists).
- Empty: "No pending edits."

**Endpoints.** `GET /api/admin/resource-edits`, `POST /api/admin/resource-edits/:id/approve`, `POST /api/admin/resource-edits/:id/reject`.

---

### 7.3 Enrichment — Batch enrichment with Claude

**Component.** `BatchEnrichmentPanel.tsx`.

**Purpose.** Run Claude over resources to extract/regenerate metadata.

**Functional contract.**
- **Run new batch** Card:
  - Filter Select: All resources / Un-enriched only / Failed-last-run / By category.
  - Batch-size Slider (1 – 50, default 10).
  - Rate-limit display (mono, read-only).
  - **Start** primary; disabled while a job is running.
- **Active job** Card (visible while a job is running):
  - Crimson progress bar (radius pill, fill = `--accent`), percentage mono next to it.
  - Sub-rows: Processed / Total / Success / Failed / ETA (mono).
  - **Cancel** outline bad.
- **Job history** Table:
  - Columns: Job ID (mono) · Started at · Status chip (Processing/Completed/Failed/Cancelled) · Success rate · Processed / Total · Duration · Actions (View log / Delete).
- View-log dialog: scrollable mono pane.

**Endpoints.** `POST /api/enrichment/start`, `GET /api/enrichment/jobs`, `GET /api/enrichment/jobs/:id`, `DELETE /api/enrichment/jobs/:id`, `POST /api/claude/analyze` (per-resource ad-hoc, used by Edit dialog).

**Acceptance.**
- AC-E1 Progress bar updates ≤ 1 s after server tick.
- AC-E2 Concurrent start prevented client-side and server-side.

---

### 7.4 Researcher — Automated discovery

**Component.** `ResearcherTab.tsx`.

**Purpose.** Crawl for candidate new resources and surface them for human approval.

**Functional contract.**
- Top: **Start a research run** Card — topic input, depth slider (1–3), source Select (GitHub trending / awesome lists / web search via integration), **Run** primary.
- **Jobs** Table: ID · Topic · Started · Status · Discoveries · Actions (View / Delete).
- **Discoveries** Table: Discovered URL · Source · Suggested category · Score chip (crimson if ≥ 0.8) · Actions (**Approve** primary → goes to Approvals queue, **Reject** outline bad).

**Endpoints.** `POST /api/researcher/start`, `GET /api/researcher/jobs`, `GET /api/researcher/jobs/:id`, `DELETE /api/researcher/jobs/:id`, `GET /api/researcher/discoveries`, `POST /api/researcher/discoveries/:id/approve`, `POST /api/researcher/discoveries/:id/reject`.

---

### 7.5 Export — Data export

**Component.** `ExportTab.tsx`.

**Functional contract.**
- Format Tabs (DS pill list): Markdown (awesome-lint) · JSON (full) · CSV · HTML · YAML · PDF.
- Per-format options Card (e.g. Markdown shows ToC toggle, badge-line toggle; JSON shows "include deleted").
- Preview pane (collapsible) — mono code block with first 80 lines.
- **Download** primary button — calls `POST /api/admin/export` with format/options, triggers browser download.
- **Full backup** — separate Card with `GET /api/admin/export-json` link (admin-only DB-wide JSON).

**Endpoints.** `POST /api/admin/export`, `GET /api/admin/export-json`.

---

### 7.6 Database — Database tools

**Component.** `DatabaseTab.tsx`.

**Functional contract.**
- Stats grid (`Card` per stat): Categories count, Resources count by status (Approved / Pending / Rejected), Users, Bookmarks, Audit log entries, DB size.
- **Validation status** card — runs `/api/admin/validation-status` (orphan resources, dangling FKs, duplicate slugs). Each metric shows `--ok` or `--bad` dot.
- **Re-validate** primary button → `POST /api/admin/validate`.
- **Seed database** outline button (with confirm dialog) → `POST /api/admin/seed-database`.
- **Switch list source** Select + Save → `POST /api/switch-list` (advanced: change source repo).
- Danger zone Card — outline bad buttons (currently informational only).

**Endpoints.** `GET /api/admin/stats`, `GET /api/admin/validation-status`, `POST /api/admin/validate`, `POST /api/admin/seed-database`, `POST /api/switch-list`.

---

### 7.7 Resources — Resource manager

**Component.** `ResourceManager.tsx` (built on `GenericCrudManager`).

**Functional contract.**
- Toolbar: Search · Status filter (All / Pending / Approved / Rejected) · Category filter · "Select all on page" · Bulk Approve / Reject / Delete · **+ New resource** primary.
- Dense Table:
  - Columns: Checkbox · ID (mono) · Title · URL (truncate, hover full, external icon) · Category · Subcategory · Sub-Sub · Status chip · Tags chip row · Updated at · Actions.
  - Actions per row: Edit (opens full edit dialog), Approve (only if pending), Reject (only if pending), Delete.
- Edit dialog: same field set as Submit; cascading category selects; tag chip input; awesome-lint preview accordion.

**Endpoints.** `GET /api/admin/resources`, `POST /api/admin/resources`, `PUT /api/admin/resources/:id`, `DELETE /api/admin/resources/:id`, `POST /api/admin/resources/:id/approve`, `POST /api/admin/resources/:id/reject`, `POST /api/admin/resources/bulk/{approve,reject,delete}`.

---

### 7.8 Categories — Category manager

**Component.** `CategoryManager.tsx`.

**Functional contract.**
- Toolbar: Search · **+ New category** primary.
- Table: ID · Slug (mono) · Name · Description · Resource count (chip) · Order · Actions (Edit / Delete).
- Create/Edit dialog: Name Input · Slug Input (auto-derived but editable) · Description Textarea · Icon Select (Lucide name) · Display order Input · Save primary.
- Delete confirm dialog blocked when children exist (subcats/sub-subs/resources).
- Slug uniqueness error → 409 with toast "Category with slug 'X' already exists" (Bug #8 fix preserved).

**Endpoints.** `GET /api/admin/categories`, `POST /api/admin/categories`, `PATCH /api/admin/categories/:id`, `DELETE /api/admin/categories/:id`.

---

### 7.9 Subcategories — Subcategory manager

Same contract as §7.8, with a parent-Category Select added to the dialog. Endpoints: `GET/POST/PATCH/DELETE /api/admin/subcategories[/:id]`.

---

### 7.10 Sub-subcategories — Sub-subcategory manager

Same contract, with parent-Subcategory Select. Endpoints: `GET/POST/PATCH/DELETE /api/admin/sub-subcategories[/:id]`.

---

### 7.11 Users — User manager

**Component.** `UsersTab.tsx`.

**Functional contract.**
- Toolbar: Search by email · Role filter (All / Admin / User).
- Table: ID (mono) · Email · Provider chip (Replit / GitHub / Google / Local) · Role chip (Admin in `accent`, User in default) · Created · Last seen · Actions (Promote / Demote / Reset password / Ban — current routes implement role change; ban is a future placeholder).
- Promote/Demote uses a `PUT /api/admin/users/:id/role` with confirm dialog.

**Endpoints.** `GET /api/admin/users`, `PUT /api/admin/users/:id/role`.

---

### 7.12 GitHub — Bidirectional sync

**Component.** `GitHubSyncPanel.tsx`.

**Functional contract.**
- **Connection status** Card: `live-dot` (crimson when configured, `--text-3` otherwise), repo URL mono, branch chip, last successful sync timestamp, **Reconnect** outline.
- **Repository** Card: search GitHub for awesome-* repos (`GET /api/github/search`) → list of result rows with Choose ghost button → `POST /api/github/configure`.
- **Import** Card: pulls README from the configured repo, parses with `remark`, queues every resource for review. **Run import** primary → `POST /api/github/import`.
- **Export** Card: builds awesome-lint-compliant markdown from DB (handles badge placement, ToC anchor format, URL dedup, description sanitisation, Unicode quote normalisation, spelling corrections per the existing exporter). **Export to README** primary → `POST /api/github/export` (uses Replit GitHub OAuth to commit). Preview mono pane.
- **Sync queue** Table: Job ID · Direction (Import / Export) · Status · Added · Updated · Removed · Started · Duration.
- **Sync history** Table: identical columns, paginated.

**Endpoints.** `GET /api/github/awesome-lists`, `GET /api/github/search`, `POST /api/github/configure`, `POST /api/github/import`, `POST /api/github/export`, `GET /api/github/sync-status`, `GET /api/github/sync-status/:id`, `GET /api/github/sync-history`, `POST /api/github/process-queue`.

---

### 7.13 Link Health — Broken link monitor

**Component.** `LinkHealthDashboard.tsx`.

**Functional contract.**
- **Scheduler** Card: status chip (Enabled / Disabled), cron expression mono, last run timestamp, next run timestamp. Toggle button.
- **Run now** primary → `POST /api/admin/link-health/run` (or `POST /api/admin/check-links` for a single-URL re-check from a dialog).
- **Broken links** Table:
  - Columns: URL (truncate) · Status code chip (4xx/5xx in `--bad`, 3xx in `--warn`, 2xx in `--ok`) · Last error · First seen · Resource title link · Actions (Re-check · Mark fixed · Edit resource).
- **History** Table: per-run summary with totals (`--ok` / `--warn` / `--bad`) and duration.

**Endpoints.** `GET /api/admin/link-health/status`, `GET /api/admin/link-health/broken-links`, `GET /api/admin/link-health/history`, `POST /api/admin/link-health/run`, `POST /api/admin/check-links`.

---

### 7.14 Audit — Audit log

**Component.** `AuditTab.tsx`.

**Functional contract.**
- Filters: Action Select (Create / Update / Approve / Reject / Delete / Import / Export / Role change) · Actor email Input · Date range pickers (DS calendar).
- Feed of `Card` rows (no table — log-style):
  - Eyebrow with mono timestamp `// 2026-05-19T03:14:09Z`.
  - One-line summary (`<actor>` `<action>` `<target type>` `<target id link>`).
  - Optional diff accordion (before/after JSON in mono).
- Pagination + export-to-CSV.

**Endpoints.** `GET /api/admin/audit-logs`.

---

## 8. Shared UX systems

### 8.1 Header (`AppHeader.tsx`)

- Sticky 60 px (56 px on ≤768). Background `color-mix(var(--bg) 85%, transparent)` + `backdrop-filter: blur(14px)` + 1 px `--hairline` bottom border.
- Layout: hamburger (mobile only) · brand link · breadcrumb trail · spacer · search trigger · user menu.
- **Search trigger** — `rounded-lg` Input-shaped button on `--surface` with a `Search` icon + placeholder "Search resources…" + `kbd` "⌘K". Click or focus opens the command palette.
- **Kbd** — JetBrains Mono 10.5 px, hairline border, `--surface` bg, 4 px radius, 4 px padding.
- **User menu** — Dropdown:
  - Unauthed: "Sign in" link → `/login`.
  - Authed: avatar (initials in crimson disc), name + email, sub-items Profile · Bookmarks · (Admin if admin) · separator · Sign out.

### 8.2 Sidebar (`AppSidebar.tsx`)

See §4.4. Implementation notes:
- Brand uses Fraunces 500 tracking-tight; live resource-count line is `.eyebrow`.
- Group labels (`SidebarGroupLabel`) use `.eyebrow`.
- Active route adopts the crimson 2 px bar + 8 px glow.
- Collapsed (icon-only) state — 56 px rail with icons only; tooltips on hover.
- Mobile drawer slides in from left, 86 % width, 280 ms `cubic-bezier(0.2,0.65,0.3,1)`, backdrop blur 2 px.

### 8.3 Command palette / global search

- Trigger: `⌘K`, `Ctrl+K`, or `/` (the latter unless focus is inside an Input/Textarea).
- `Esc` closes when open.
- Behaviour: opens a Dialog containing a large Input on top, list below.
- Search engine: Fuse.js with weights — Title 0.5, Tags 0.3, Description 0.2; threshold 0.35.
- Result rows: title (Fraunces medium), breadcrumb path mono (`--text-3`), tag chips.
- Enter on a result → `/resource/:id` (db-backed) or external URL (legacy).
- Keyboard: Up/Down to navigate, Enter to select, ⌘+Enter to open in new tab.
- Tracks `keyboard_shortcut` analytics event and `searches_per_session` session counter.

### 8.4 Toast system

- `useToast` from `@/hooks/use-toast`.
- Toaster rendered in `main.tsx` at root.
- Position: bottom-right desktop, bottom-center mobile.
- Variants: default (`--bg-2`), destructive (`--bad` 2 px left bar).
- 12 px radius, `--shadow-lg`, auto-dismiss after 5 s, hover pauses dismiss.

### 8.5 Dialog system

- All `Dialog` instances use the DS-tokenised primitive (12 px radius, `--bg-2`, `--shadow-lg`, 4 px backdrop blur).
- `Esc` always closes (unless explicitly disabled with `modal={true}` reasoning).
- Trap focus inside; restore focus on close.

### 8.6 SuggestEditDialog

- Opens from any resource card or ResourceDetail page.
- Unauth gate: shows a small login prompt Card inside the dialog with **Sign in** primary → `/login?redirect=<current>`.
- Auth form: same fields as Submit but pre-populated; an extra **Reason for edit** textarea (max 240 chars).
- Submit → `POST /api/resources/:id/edits`. Resource goes to Admin Edits queue.

### 8.7 AI Recommendations panel (`AIRecommendationsPanel.tsx`)

See §5.1 for layout. Submits to `POST /api/recommendations` and renders ranked results with crimson match chips. Each rec card has a "Why this?" accordion with the model's rationale.

---

## 9. Cross-cutting features

### 9.1 Authentication

- **Providers.** Replit OIDC (Google, Apple, X, GitHub from Replit's side) and local email/password.
- **Session.** Express session with PostgreSQL store (`SESSION_SECRET` required).
- **Hooks.** `useAuth()` returns `{ user, isAuthenticated, isLoading, logout }`. Query key `['/api/auth/user']`.
- **Guards.** `<AuthGuard>` redirects unauth to `/login?redirect=<current>`. `<AdminGuard>` adds a role check.
- **Logout.** `POST /api/auth/logout` → invalidates session → invalidate query cache → hard nav to `/`.

### 9.2 Bookmarks & favorites

- Bookmark = "save for later"; Favorite = "starred / repeat reference".
- Both are per-user, optimistic, idempotent at the API.
- Endpoints: `GET /api/bookmarks`, `POST/DELETE /api/bookmarks/:resourceId`, `GET /api/favorites`, `POST/DELETE /api/favorites/:resourceId`.

### 9.3 Learning journeys

See §5.9 and §5.10. Generation uses Claude with the resource catalog as context. Progress tracked per user, per step.

### 9.4 Batch enrichment

- Sequential, configurable batch size (1–50), rate-limited.
- Per-resource: fetch URL → Cheerio scrape → Claude prompt → write description/tags/og-image to `metadata` JSONB.
- Smart URL validation (skips non-HTTP, dead domains).
- Retry with exponential back-off on transient errors.
- Tracked in `enrichment_jobs` (id, status, started_at, completed_at, processed, total, failed, batch_size, log).

### 9.5 GitHub sync

- **Import.** Fetch repo README → parse with `remark` → for each link match in the markdown:
  - Resolve hierarchy (`ensureCategoryHierarchy()` writes parent IDs into resource `metadata`).
  - Dedupe by URL (http/https + www/non-www variations).
  - Insert as `status='pending'` unless flag overrides.
- **Export.** Build awesome-lint-compliant markdown from DB:
  - Badge on same line as main heading.
  - ToC anchors in GitHub format (`#community--events` style).
  - URL dedupe (http/https + www).
  - Description sanitisation (no-repeat-item, skip empty/punct-only, lowercase-starter preservation for macOS / npm / webpack / iOS, Unicode → straight quotes).
  - Spelling corrections (TensorFlow / CentOS / macOS / WebAssembly / FFmpeg / WebRTC / OpenAI).
  - Underscore-containing tool names get "A " prefix for valid casing.
  - 2 remaining unavoidable lint errors are documented: `awesome-contributing` (needs `CONTRIBUTING.md`) and `awesome-github` (needs git repo).
- **Commit.** Uses Replit GitHub OAuth (`javascript_log_in_with_replit` + `github` integrations).

### 9.6 Link health

- Scheduled scan via cron (currently disabled in dev).
- Each resource URL gets fetched with timeout, redirect-follow, classification (2xx / 3xx / 4xx / 5xx / timeout / network).
- Results stored in a link-health history table.
- Broken links surfaced in §7.13.

### 9.7 Analytics

- Google Analytics 4 (`VITE_GA_MEASUREMENT_ID`).
- `useAnalytics()` hook fires page-view on every wouter route change.
- `useSessionAnalytics()` increments per-session counters (searches, opens, journey steps).
- `trackKeyboardShortcut()` and `trackInteraction()` helpers; events also persisted server-side via `POST /api/interactions`.

### 9.8 SEO

- `SEOHead.tsx` component used on every page; supports custom `title`, `description`, OG image, canonical, no-index flag.
- Static sitemap served at `/sitemap.xml`.
- Static OG image at `/og-image.svg`.
- Per-page `<title>` follows pattern: `<Page title> - Awesome Video Resources` (Home is shorter and brand-led).

### 9.9 Awesome-lint compliance

The exporter must satisfy 28 of 30 awesome-lint rules. Remaining 2 are structural and documented. The full sanitisation suite lives in `server/services/awesomelist-exporter.ts` (or equivalent) and is exercised by `scripts/test-awesome-lint.ts`.

---

## 10. Data model (canonical)

Tables (from `shared/schema.ts`):

| Table | Purpose |
|---|---|
| `users` | Account record (id, email, name, provider, role enum `'admin'\|'user'`, password hash for local strategy, timestamps) |
| `categories` | Top-level taxonomy (id, slug unique, name, description, icon, order) |
| `subcategories` | Mid taxonomy (id, slug unique, name, description, parent `category_id`, order) |
| `sub_subcategories` | Tertiary (id, slug unique, name, description, parent `subcategory_id`, order) |
| `awesome_lists` | Resources (id, title, url unique, description, status enum `'pending'\|'approved'\|'rejected'`, metadata JSONB with `og`, `tags`, `categoryId`, `subcategoryId`, `subSubcategoryId`, scrape data, submitted_by, timestamps) |
| `tags` | Tag dictionary used for autocomplete + count rollups |
| `learning_journeys` | AI-generated learning paths (id, title, description, steps JSONB, created_by) |
| `resource_audit_log` | Append-only history (id, actor_id, action, target_type, target_id, before/after JSONB, timestamp) |

Plus session storage (express-session × pg) and any future tables (bookmarks, favorites, edits, enrichment jobs, link health) implemented either as discrete tables or rolled into the metadata pattern. The PRD treats them as logically separate even when physically embedded.

**Constraints in production.**
- 7 enforced UNIQUE/FK constraints (slug uniques on every taxonomy level + FKs from sub → subcategory → category + URL unique on resources).
- 0 orphaned resources (audit-enforced).

---

## 11. API surface — 102 endpoints categorised

### 11.1 Public read

```
GET  /api/awesome-list                     # full tree from DB (single call powers most of the SPA)
GET  /api/categories
GET  /api/subcategories
GET  /api/sub-subcategories
GET  /api/resources                        # paginated / filterable
GET  /api/resources/:id
GET  /api/resources/check-url
GET  /api/resources/pending                # public visibility into pending queue (read-only)
GET  /api/journeys
GET  /api/journeys/:id
GET  /api/learning-paths/suggested
GET  /og-image.svg
GET  /sitemap.xml
GET  /api/health
```

### 11.2 Authentication

```
GET  /api/auth/user                        # current session
POST /api/auth/local/login
POST /api/auth/logout
GET  /api/login                            # Replit OIDC entry
GET  /api/callback                         # Replit OIDC callback
```

### 11.3 Personal (auth required)

```
GET  /api/bookmarks
POST /api/bookmarks/:resourceId
DELETE /api/bookmarks/:resourceId
GET  /api/favorites
POST /api/favorites/:resourceId
DELETE /api/favorites/:resourceId
GET  /api/user/journeys
GET  /api/user/progress
GET  /api/user/submissions
POST /api/journeys/:id/start
PUT  /api/journeys/:id/progress
GET  /api/journeys/:id/progress
POST /api/interactions
POST /api/resources                        # submit
POST /api/resources/:id/edits              # suggest edit
PUT  /api/resources/:id/approve            # legacy aliases retained
PUT  /api/resources/:id/reject
```

### 11.4 AI

```
POST /api/claude/analyze                   # per-resource ad-hoc
GET  /api/recommendations
GET  /api/recommendations/init
POST /api/recommendations
POST /api/recommendations/feedback
POST /api/learning-paths
POST /api/learning-paths/generate
```

### 11.5 Admin — content moderation

```
GET  /api/admin/pending-resources
GET  /api/admin/resource-edits
GET  /api/admin/resources
POST /api/admin/resources
PUT  /api/admin/resources/:id
DELETE /api/admin/resources/:id
POST /api/admin/resources/:id/approve
POST /api/admin/resources/:id/reject
POST /api/admin/resources/bulk/approve
POST /api/admin/resources/bulk/reject
POST /api/admin/resources/bulk/delete
POST /api/admin/resource-edits/:id/approve
POST /api/admin/resource-edits/:id/reject
```

### 11.6 Admin — taxonomy CRUD

```
GET  /api/admin/categories
POST /api/admin/categories
PATCH /api/admin/categories/:id
DELETE /api/admin/categories/:id
GET  /api/admin/subcategories
POST /api/admin/subcategories
PATCH /api/admin/subcategories/:id
DELETE /api/admin/subcategories/:id
GET  /api/admin/sub-subcategories
POST /api/admin/sub-subcategories
PATCH /api/admin/sub-subcategories/:id
DELETE /api/admin/sub-subcategories/:id
```

### 11.7 Admin — users + audit

```
GET  /api/admin/users
PUT  /api/admin/users/:id/role
GET  /api/admin/audit-logs
GET  /api/admin/stats
GET  /api/admin/validation-status
POST /api/admin/validate
POST /api/admin/seed-database
```

### 11.8 Admin — enrichment

```
POST /api/enrichment/start
GET  /api/enrichment/jobs
GET  /api/enrichment/jobs/:id
DELETE /api/enrichment/jobs/:id
```

### 11.9 Admin — researcher

```
POST /api/researcher/start
GET  /api/researcher/jobs
GET  /api/researcher/jobs/:id
DELETE /api/researcher/jobs/:id
GET  /api/researcher/discoveries
POST /api/researcher/discoveries/:id/approve
POST /api/researcher/discoveries/:id/reject
```

### 11.10 Admin — GitHub sync

```
GET  /api/github/awesome-lists
GET  /api/github/search
POST /api/github/configure
POST /api/github/import
POST /api/github/export
GET  /api/github/sync-status
GET  /api/github/sync-status/:id
GET  /api/github/sync-history
POST /api/github/process-queue
POST /api/admin/import-github
POST /api/switch-list
```

### 11.11 Admin — link health

```
GET  /api/admin/link-health/status
GET  /api/admin/link-health/broken-links
GET  /api/admin/link-health/history
POST /api/admin/link-health/run
POST /api/admin/check-links
```

### 11.12 Admin — export

```
POST /api/admin/export
GET  /api/admin/export-json
```

Total: **102 active endpoints** (verified by `rg` on `server/routes.ts`).

---

## 12. States contract — universal

Every interactive surface MUST handle, and the DS provides primitives for:

| State | Pattern |
|---|---|
| **Loading** | Skeleton primitive (`<Skeleton>`); matches the layout it replaces; ≤ 600 ms before considered "slow" → optional inline note |
| **Empty** | Eyebrow + display heading + sub-copy + primary CTA; no decorative imagery beyond the icon |
| **Filtered-empty** | Same as Empty + "Clear filters" ghost button + mono "Showing 0 of N" |
| **Error (recoverable)** | Inline error `Card` with `--bad` icon + message + Retry button |
| **Error (fatal)** | Whole-route `ErrorPage` with typed error (see §5.12) |
| **Unauthenticated** | Inline login CTA inline (small surfaces) or full empty-state with redirect-aware login button (large surfaces) |
| **Unauthorized (auth-but-wrong-role)** | "Not authorised" empty-state with sign-out button |
| **Optimistic** | Mutation triggers immediate UI change; rollback on failure with destructive toast |
| **Success** | Default toast (≤ 5 s) — never block on a confirmation modal for routine successes |

---

## 13. Motion contract

| Surface | Motion | Duration | Easing |
|---|---|---|---|
| Hover colour / border | colour | 160 ms | linear |
| Card hover lift | transform + bg | 220 ms | `cubic-bezier(0.2,0.65,0.3,1)` |
| Tabs underline/active swap | bg + colour | 160 ms | linear |
| Dialog open | fade + zoom | 220 ms | ease-out |
| Mobile drawer slide | transform | 280 ms | `cubic-bezier(0.2,0.65,0.3,1)` |
| Accordion | `max-height` | 320 ms | `cubic-bezier(0.2,0.65,0.3,1)` |
| Toast enter | translate + fade | 220 ms | ease-out |
| Skeleton shimmer | linear gradient sweep | 1200 ms | linear, infinite |

`prefers-reduced-motion: reduce` MUST collapse every transform-based motion to a colour-only transition.

---

## 14. Accessibility contract

- Every interactive element keyboard-reachable; focus ring **crimson** via `--color-ring`.
- Touch targets ≥ 44 × 44 px on ≤ 768 px (WCAG AAA target).
- Text colour against `--bg`:
  - 12 px–14 px text uses `--text` or `--text-2` (≥ 4.5:1).
  - `--text-3` permitted only for ≥ 18 px or non-essential decoration.
  - `--text-4` is disabled-only.
- All Cards/Inputs/Buttons have visible focus state.
- ⌘K palette is fully keyboard-driven (Up/Down/Enter/Esc).
- `Esc` closes all dialogs and the mobile drawer.
- Every page has a `<h1>` (the display heading) and a logical heading order.
- All images have `alt`; decorative grain overlay has `aria-hidden="true"`.
- `axe` clean on every public route (criticals must be 0; non-criticals documented).

---

## 15. Responsive contract

| Surface | ≤ 375 | 768 | 1024 | ≥ 1280 |
|---|---|---|---|---|
| Sidebar | drawer | drawer | 240 px collapsed-on-click | 280 px fixed |
| Header | 56 px | 56 px | 60 px | 60 px |
| Page padding | 16 px | 24 px | 32 px | 48 px |
| Page max-width | full | full | 960 px | 1280 px |
| Category grid | 1 col | 2 col | 2 col | 3 col |
| Resource detail | single col | single col | 8/4 split | 8/4 split |
| Admin tabs | scroll-x pill list | scroll-x | wrap to 2 lines | inline single line |
| Toast | bottom-centre | bottom-right | bottom-right | bottom-right |

---

## 16. Performance budget

| Budget | Target |
|---|---|
| First contentful paint (Home, cold cache) | ≤ 1.8 s on simulated 4G |
| Largest contentful paint | ≤ 2.5 s |
| Cumulative layout shift | ≤ 0.05 (fonts self-hosted via `@fontsource`, `font-display: swap`) |
| Total JS (compressed) | ≤ 350 kB |
| `/api/awesome-list` payload | ≤ 3.5 MB (current 2.97 MB) |
| Fetch timeout for awesome-list | 45 s, 1 retry with linear backoff |
| Per-route TTI | ≤ 3 s on simulated 4G |

`fetchStaticAwesomeList` enforces the timeout; failure surfaces a typed message in `ErrorPage` (HTTP / timeout / parse).

---

## 17. Security & privacy

- Local password storage uses **bcrypt** (cost ≥ 10).
- Session cookies are `httpOnly`, `sameSite='lax'`, `secure` in production.
- Admin endpoints gated by `isAdmin` middleware (verifies session role).
- `POST /api/auth/local/login` rate-limited at the proxy level (consideration: add server-side limiter in WP-7).
- No PII written to client logs.
- GA tracking respects `Do Not Track` (page-view suppression).
- All external links use `rel="noopener noreferrer"`.
- Suggest-Edit dialog server-side validates ownership of submitted-by ID for edit attribution.

---

## 18. Migration mapping — what changes per surface

| Section | Pre-migration (Terminal/Matrix) | Post-migration (Editorial+Crimson) |
|---|---|---|
| Tokens (foundation) | IBM Plex Mono everywhere, Matrix green `#00ff88`, radius `0`, no atmosphere | Fraunces / Inter / JetBrains Mono ladder, Crimson `#ff3d52`, 12/8/999 radius ladder, radial atmosphere + grain |
| Buttons / Cards | square, neon focus | rounded, soft DS shadow, crimson focus, hover lift |
| Inputs / Selects | mono everything | Inter body + crimson focus, textarea mono |
| Tabs | flat underline neon | rounded-full pill list, active = `--surface-3` + crimson |
| Sidebar | mono nav, neon active | Fraunces brand, mono eyebrow groups, crimson 2 px bar + glow |
| Header | mono | Inter nav, kbd eyebrow, crimson-tinted search focus |
| Home hero | bold sans | Fraunces medium, italic crimson accent word |
| About | bordered card overrides | DS card defaults, crimson section icons |
| Login | full-screen gradient bg | DS atmosphere via MainLayout, crimson halo, italic accent |
| Category | mono uppercase chips | `chip` Badge variant, view-mode toggle in DS Tabs |
| Resource detail | flat | DS Card.hoverable, crimson chips, OG card |
| Admin tabs | neon-active tabs | DS pill list with crimson active |
| Toasts | hard square | 12 px radius, `--bg-2`, crimson left bar for destructive |
| Error page | flat | DS Card with mono error block (typed) |

---

## 19. Acceptance — Phase 6 evidence matrix

For every cell `<route> × <viewport ∈ {375, 768, 1280, 1536}> × <auth ∈ {anon, user, admin}>`:

1. Screenshot stored at `_validation/p6/<route>/<viewport>-<auth>.png`.
2. DOM HTML dump at `_validation/p6/<route>/<viewport>-<auth>.html`.
3. Sidecar JSON with:
   - Console errors (must be empty).
   - Network failures (must be empty; non-2xx noted with expected-status flag).
   - `axe-core` violations (criticals must be 0; serious documented).
   - Computed `--color-*`, `--font-*`, `--radius-*` from `getComputedStyle(documentElement)` (must match `_planning/DS_SPEC.md §2`).
   - Sampled-element computed colour for 3 representative nodes per page (header, card, button).
4. The matrix lives in `_validation/p6/FINAL_VALIDATION_REPORT.md`. Any red cell blocks shipping.

Effective cell count: ~ (13 public × 4 × 2) + (3 protected × 4 × 1) + (14 admin × 4 × 1) ≈ **172 cells**.

---

## 20. Open questions / explicit non-goals

1. **No light mode** — the DS handoff has no light tokens; the product is dark-only. Future light mode would require a parallel token block.
2. **`/settings/theme`** — current legacy multi-personality picker; runtime applier is neutralised but the page UI remains. Decision deferred: convert to a read-only crimson-accent showcase, or remove. Until decided it stays renderable but inactive.
3. **Admin mockups absent** — the DS handoff did not supply per-admin-tab mockups. Admin design follows DS primitives (DS_SPEC §3) plus the bundled `admin.jsx` reference idiom (stats cards, queue tables, pill tabs, filter chips).
4. **`color-mix()` browser support** — Chrome ≥ 111, Firefox ≥ 113, Safari ≥ 16.2. No fallback shipped unless a regression appears.
5. **Awesome-lint** — 2 unavoidable lint errors (CONTRIBUTING + git-repo presence) are accepted and documented.
6. **Mobile dev-preview "Load failed"** — addressed by `fetchStaticAwesomeList` hardening (typed error, 45 s timeout, 1 retry, same-origin credentials). Root cause investigation deferred (likely dev-preview cookie + payload + mobile cellular latency) and is not a production-path regression.
7. **`ban` user action in Users tab** — UI placeholder; no backing endpoint. Tracked as a future work item.

---

## 21. Glossary

- **DS** — Design system (Editorial+Crimson).
- **Eyebrow** — Small mono-uppercase label above a heading, crimson, weight 700.
- **Display heading** — Fraunces medium, tracking −0.02, leading 1.04. `<em>` inside renders crimson italic via Editorial skin.
- **Chip** — Mono uppercase pill used for tags and counts. Variants: default, accent (crimson-tinted).
- **Surface** — Translucent ink-tinted background, multiple intensity levels (`--surface`, `--surface-2`, `--surface-3`).
- **Crimson** — `#ff3d52`, the single accent of this system.
- **Atmosphere** — `--bg-atmosphere` radial gradient + `.grain` overlay, mounted by `MainLayout` only.
- **Hairline** — 1 px `--hairline` border for dividers below visible-border strength.

---

## 22. Source of truth & change log

- **Canonical token + primitive contract**: `_planning/DS_SPEC.md` (do not duplicate; reference).
- **Migration plan + gates**: `_planning/REMEDIATION_PLAN.md`.
- **Delta catalog (per-token before/after)**: `_planning/DELTA_CATALOG.md`.
- **Site inventory (live)**: `_planning/SITE_MAP.md`.
- **Recent migration progress**: top of `replit.md`.

Any future change to a page's functional or design contract must update this file (`_planning/SPEC_v6.md`) in the same change-set. This document is the single product PRD.
