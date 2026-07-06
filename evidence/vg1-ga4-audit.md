# VG-1 — GA4 Audit & Event Taxonomy

Task: Enhance GA4 event tracking across the Awesome Video Resource Viewer (React + Vite SPA, Express API, port 5000).
Scope of this gate: audit current analytics, design an optimized GA4 taxonomy, define privacy exclusions, list flows to instrument, and name a real validation flow. **No code changes in this gate.**

---

## 1. Current implementation (as found)

### Initialization
- `client/src/App.tsx` → `App()` `useEffect` calls `initGA()` once (guarded by `import.meta.env.VITE_GA_MEASUREMENT_ID`, which **is set** in dev `.env`).
- `client/src/lib/analytics.ts` → `initGA()` injects `gtag.js` and runs `gtag('js', ...)` + `gtag('config', ID)`. **The `config` call auto-emits the first `page_view`.**
- No `gtag` script in `client/index.html`; it is injected at runtime.

### Page views
- `client/src/hooks/use-analytics.tsx` (used in `Router()`): on `wouter` location change, calls `trackPageView(location)` (deduped via `prevLocationRef`; does **not** fire on initial mount because the ref is initialized to the current location).
- `trackPageView(url)` calls `gtag('config', ID, { page_path: url })` — sends **only `page_path`**; no `page_title`, `page_location`, or `page_referrer`.

### Event dispatch
- **Every** custom event funnels through `trackEvent(action, category?, label?, value?)`, which emits `gtag('event', action, { event_category, event_label, value })` — a **legacy Universal-Analytics shape**. Meaningful data is concatenated into `event_label` (e.g. `` `${category}: ${title}` ``) instead of dedicated GA4 parameters.

### Events currently WIRED to real UI (actually fire)
| Event | Trigger (file) | Params today |
|---|---|---|
| `page_view` | route change (`use-analytics.tsx`) + initial `config` | `page_path` only |
| `search` | **every keystroke** in `search-dialog.tsx` (effect on `[query, fuse]`) | `event_label`=term, `value`=count |
| `resource_click` + `outbound_link` | search result click (`search-dialog.tsx`) | label=`cat: title` / url |
| `performance` | search latency (`search-dialog.tsx`) | metric, ms |
| `category_view` | `Category.tsx`, `Subcategory.tsx`, `SubSubcategory.tsx` | label=name/path |
| `api_performance`, `error` | `queryClient.ts` fetch success/failure | endpoint/ms, type:message |
| `page_not_found` | `not-found.tsx` mount | path |

### Events DEFINED but DEAD (never called — verified via ripgrep, 0 consumers)
`theme_change`, `list_switch`, `layout_change`, `filter_applied`, `sort_change`, `resource_preview`, `mobile_interaction`, `engagement_time`, `scroll_depth`, `copy_action`, `share_action`, `resource_favorite`, `keyboard_shortcut`, `export_action`, `tag_interaction`, `session_quality`, plus **the entire `client/src/hooks/use-session-analytics.tsx` hook** (scroll-depth milestones, session-quality on unload, Core Web Vitals, JS error capture) — it is imported by nothing.

> **Consequence:** despite ~25 helper functions existing, **engagement-depth tracking (scroll, engagement time, CWV) never fires today**, and there is **no acquisition capture anywhere**.

### Acquisition / attribution
- **None.** No UTM parsing, no referrer capture, no first-touch persistence.

### Consent / privacy
- **No consent mechanism exists** (no cookie banner, no `gtag('consent', ...)`). Out of scope to add one; this gate preserves current behavior (analytics initializes when the measurement ID is present).

### Server-side analytics
- **None.** No GA4 Measurement Protocol usage. Implementation is purely client-side. (Measurement Protocol is therefore out of scope per the task.)

### Defects found (must fix in Phase 2 or VG-2 fails)
1. **Keystroke `search` spam:** `trackSearch` runs in the query effect → one user search emits N `search` events (violates "one action ≠ duplicate events"). → debounce.
2. **`trackCopyAction` privacy:** sends the first 50 chars of copied content → replace with `content_type` + `content_length` (no raw text). (Currently dead, but will be corrected.)
3. **Initial page_view dependency on `config`:** switching to `send_page_view:false` (below) requires firing the initial `page_view` manually or it is lost.

---

## 2. GA4 documentation references (summarized inline)

- **Recommended events**: GA4 defines standard event names (`page_view`, `login`, `sign_up`, `search`, `select_content`, `generate_lead`, `share`, …). Using them unlocks built-in reports. Prefer them over custom names when the behavior matches.
- **Custom events**: lowercase `snake_case`, action-oriented, stable/generic; put dynamic detail in **parameters**, never in the event name.
- **Recommended/standard parameters**: `page_location`, `page_title`, `page_referrer`, `search_term`, `content_type`, `content_id`, `method`, `value`, `engagement_time_msec`.
- **Acquisition dimensions**: GA4 derives source/medium/campaign from the `page_location` URL (UTM query) on `page_view` and from `page_referrer`. Sending the full `page_location` (href incl. UTMs) is sufficient for native attribution; extra first-party `utm_*` params can be attached to conversion events for custom analysis.
- **Engagement**: `engagement_time_msec` measures foreground time; GA4 uses it for engaged-sessions/engagement-rate.
- **DebugView / Realtime**: `debug_mode: true` in the `config`/event routes events into DebugView; Realtime shows events within seconds. Validation here uses **real `/g/collect` network requests** captured in a real browser (DebugView screenshot best-effort; property access not assumed).
- **Measurement Protocol**: only relevant with server-side analytics — **not present**, so excluded.

---

## 3. Proposed event taxonomy (ADD, don't rename — preserve existing dashboards)

**Strategy:** keep all existing event names for dashboard continuity, but (a) enrich **every** event with standard context params via a central `sendEvent`, (b) **add** GA4 recommended events for conversion/facilitation flows, (c) add acquisition + engagement. Renaming is avoided (zero gate value, breaks dashboards). Documented intentional multi-event pairs (e.g. `resource_click` + `outbound_link`) are **not** "duplicate identical events".

### 3a. Global context (attached to every event via `sendEvent`)
`page_location` (full href incl. UTMs), `page_path` (pathname+search), `page_title` (`document.title`), `page_referrer` (`document.referrer`).

### 3b. Acquisition (new `client/src/lib/acquisition.ts`)
Captured once on first load, persisted **first-touch** in `localStorage` (`av_acquisition`): `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer_domain` (hostname only), `landing_page` (pathname only), `first_seen`. `getAcquisition()` returns the `utm_*` + `referrer_domain` for attaching to **conversion events** (`login`, `sign_up`, `generate_lead`). First-touch is not overwritten.

### 3c. Recommended events to ADD
| Event | Trigger | Params |
|---|---|---|
| `page_view` | initial mount + every route change (single source) | context (3a) |
| `login` | real local-login success (`Login.tsx`) | `method:"password"` + acquisition |
| `sign_up` | real register success (`Register.tsx`) | `method:"password"` + acquisition |
| `search` | **debounced** committed query (`search-dialog.tsx`) | `search_term`, `result_count` |
| `select_content` | resource detail viewed (`ResourceDetail.tsx`) | `content_type:"resource"`, `content_id`, `content_category` |
| `generate_lead` | resource submission success (`SubmitResource.tsx`) | `content_type:"resource_submission"`, `category` + acquisition |
| `share` | share action on resource (`ResourceDetail.tsx`) | `method`, `content_type`, `content_id` |

### 3d. Engagement to ADD
| Event | Trigger | Params |
|---|---|---|
| `page_engaged` | on route change (previous page) + `pagehide` (current page) | `engagement_time_msec`, `page_path` |

### 3e. Existing custom events — retained + enriched (no rename)
`resource_click`, `outbound_link`, `category_view`, `api_performance`, `error`, `page_not_found` keep their names; they gain the 3a context automatically. High-value dead helpers wired to real UI in this task: `theme_change` (theme settings), `resource_favorite` (favorite button), plus `share` above. Remaining dead helpers/`useSessionAnalytics` are **left unwired and documented** (removing them is out of scope; wiring all of them is over-scope per plan).

---

## 4. Privacy exclusions (must NOT be sent)
- No email, phone, full name, address, password, token, or session id.
  - Login/Register: send only `method`, never the email/password. (Toasts show the email in-UI, but it is **not** put into any GA4 param.)
- No raw copied text (`trackCopyAction` → `content_type` + `content_length` only).
- `search_term` **is** sent (it is the GA4-recommended parameter for the `search` event and is standard site-search practice); it is the only free-text field emitted and carries no PII by design.
- `referrer_domain` = hostname only; `landing_page` = pathname only (no full query persisted to storage).
- `content_id`/`content_category`/resource titles are public catalog data, not PII.

## 5. Pages / flows to instrument (mapped to routes)
- Entry/landing & all routes: `page_view` (`/`, `/category/:slug`, `/subcategory/:slug`, `/sub-subcategory/:slug`, `/search`, `/recommendations`, `/resource/:id`, `/about`, `/advanced`, `/submit`, `/journeys`, `/journey/:id`, `/settings/theme`, `/login`, `/register`, `/profile`, `/bookmarks`, `/admin`).
- Auth: `login` (`/login`), `sign_up` (`/register`).
- Core interaction: `select_content` (`/resource/:id`), `resource_click`/`outbound_link` (search), `search` (dialog + `/search`), `category_view` (browse), `resource_favorite` + `share` (`/resource/:id`), `theme_change` (`/settings/theme`).
- Conversion/facilitation: `generate_lead` (`/submit`).
- Acquisition: UTM/referrer attached to `page_view` (via `page_location`) + conversions.
- Engagement: `page_engaged` (`engagement_time_msec`) across all routes.
- Error/friction: `error`, `page_not_found` (retained).

## 6. Real validation flow (for VG-2 / VG-3)
Real browser (Playwright, Chromium already pinned locally), app at `http://localhost:5000`, capturing real `www.google-analytics.com/g/collect` requests:
1. Enter with UTM: `/?utm_source=newsletter&utm_medium=email&utm_campaign=vg_test` → assert one `page_view` with `page_location` carrying the UTMs.
2. Navigate `/` → `/category/:slug` → assert `page_view` (new) + `page_engaged` (previous) — **exactly one `page_view` per navigation**.
3. Open a resource `/resource/:id` → assert `select_content` (`content_type=resource`, `content_id`).
4. Open search dialog, type a term → assert **exactly one** `search` (debounced) with `search_term`.
5. Sign up a throwaway `__qa_test_*` account on `/register` → assert `sign_up` (`method=password`) carrying acquisition; then `/submit` a `__qa_test` resource → assert `generate_lead`.
6. Inspect every captured payload: names/params correct, **no PII**, no duplicate identical events.
- **Net-zero:** purge the throwaway `__qa_test_*` user + submitted resource afterward; app returns to baseline.

## 7. Verdict
All VG-1 pass criteria satisfied: current implementation enumerated (wired + dead), taxonomy proposed (page views, acquisition, engagement duration, conversion/facilitation, key actions), recommended-vs-custom distinguished, PII exclusions explicit, ≥1 real validation flow named. **PASS → proceed to Phase 2.**
