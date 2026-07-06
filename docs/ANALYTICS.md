# Analytics (GA4) — Event Taxonomy & Instrumentation

This document is the source of truth for how the app tracks usage in **Google
Analytics 4** (gtag.js). It covers the event taxonomy, where each event is wired,
the parameters each carries, first-touch acquisition, the PII exclusion policy,
and how tracking is validated end-to-end against the real GA4 network endpoint.

Measurement ID comes from the `VITE_GA_MEASUREMENT_ID` env var. If it is unset,
`initGA()` logs a warning and no tracking runs (the app still works).

## ⚠️ Deployment prerequisite — disable GA4 Enhanced Measurement page views

This app **self-tracks** `page_view` from a single source (`use-analytics`) so it
can fire exactly one enriched page view per SPA navigation. GA4 **Enhanced
Measurement** also has a **"Page changes based on browser history events"**
sub-toggle that is **ON by default** and fires its *own* automatic `page_view`
on every SPA route change. If both are active, in-app navigations are counted
**twice** (the initial hard load is fine — `send_page_view:false` suppresses the
config-time view, so only Enhanced Measurement's initial view + our manual view
would collide on SPA navs specifically).

**Before/right after publishing**, in the GA4 property Admin:
Admin → Data streams → (this web stream) → **Enhanced measurement** → gear icon →
turn **OFF "Page changes based on browser history events"**. Leave the other
Enhanced Measurement toggles (scrolls, outbound clicks, site search, etc.) as you
like — only the history-based page-view sub-toggle conflicts with our tracking.

This cannot be changed from application code — it is a GA4 property setting. Until
it is turned off, SPA `page_view` counts are inflated (~2×). This was observed
live during validation on the configured property (an automatic `page_view` with
the `ae` flag appeared alongside our manual one on the one true SPA navigation).

> Title-timing note: because `SEOHead` sets `document.title` via `react-helmet`
> (deferred a tick) and detail-page titles depend on async data, the manual
> `page_view` on an SPA navigation can carry the *previous* page's `page_title`.
> This is deliberate: the event fires **synchronously** on route change so
> `page_location`/`page_path` are always correct — deferring it to catch the new
> title would risk logging the *wrong* URL during rapid back-to-back navigation.
> `page_path`/`page_location` are the reliable page dimensions; treat the manual
> event's `page_title` as best-effort (GA4's own view derives the correct title).

## Architecture

- **`client/src/lib/analytics.ts`** — the only place that talks to gtag. Every
  event routes through the central `sendEvent(name, params)`, which enriches the
  payload with standard GA4 context (`page_location`, `page_path`, `page_title`,
  `page_referrer`) and strips `undefined`/`null` params.
- **`client/src/lib/acquisition.ts`** — captures first-touch UTM + referrer once
  and attaches it to conversion events.
- **`client/src/hooks/use-analytics.tsx`** — fires exactly one `page_view` per
  navigation (mount + every route change) and a `page_engaged` (with dwell time)
  when leaving a page or hiding the tab. Mounted once in `App.tsx`.

### Initialization order (important)

`initGA()` is **idempotent** and is called at module load in `client/src/main.tsx`
**before React renders**. This is deliberate: React runs child effects
(Router → `useAnalytics`) *before* parent effects (`App`), so a mount-only init
would leave `window.gtag` undefined when the very first `page_view` fires and the
event would be dropped. Initializing pre-render guarantees the initial
`page_view` (with landing-page UTMs) is captured. `App.tsx` still calls
`initGA()` in an effect as a safety net — it no-ops after the first call.

gtag is configured with **`send_page_view: false`** so page views come from a
single source (`use-analytics`), giving exactly one `page_view` per navigation.
In DEV, `debug_mode: true` is added so events appear in GA4 DebugView.

## Event taxonomy

### GA4 recommended events (added for conversion / discovery analysis)

| Event | Fires when / where | Key params |
|---|---|---|
| `page_view` | Every navigation — `use-analytics` on mount + route change | `page_location`, `page_path`, `page_title`, `page_referrer` |
| `search` | Search dialog, once per debounced query — `search-dialog.tsx` | `search_term`, `result_count` |
| `select_content` | Resource detail page mount — `ResourceDetail.tsx` | `content_type: "resource"`, `content_id`, `content_name`, `content_category` |
| `login` | Successful email/password login — `Login.tsx` | `method: "password"` + acquisition |
| `sign_up` | Successful registration — `Register.tsx` | `method: "password"` + acquisition |
| `generate_lead` | Successful resource submission — `SubmitResource.tsx` | `content_type: "resource_submission"`, `category` + acquisition |
| `share` | Share button on a resource — `ResourceDetail.tsx` | `method: "web_share" \| "clipboard"`, `content_type`, `content_id` |

### Retained custom events (names preserved for dashboard continuity, now enriched)

| Event | Fires when / where | Key params |
|---|---|---|
| `page_engaged` | Leaving a page / tab hide — `use-analytics.tsx` | `page_path`, `engagement_time_msec` |
| `resource_click` + `outbound_link` | Clicking a search result — `search-dialog.tsx` (documented **pair**, not a duplicate: one engagement signal, one outbound-navigation signal) | `content_*` / `link_url`, `link_domain` |
| `category_view` | Category / Subcategory / Sub-subcategory pages | `content_category` |
| `theme_change` | Theme settings pickers — `ThemeSettings.tsx` | `theme_name`, `theme_type: "color" \| "font" \| "system"` |
| `resource_favorite` | Favorite toggle — `ResourceDetail.tsx` | `action: "add" \| "remove"`, `content_name`, `content_category` |
| `performance` | Search timing — `search-dialog.tsx` | `metric_name`, `value` |
| `api_performance` | Every API request — `queryClient.ts` | `endpoint`, `status`, `value` (ms) |
| `error` | Failed API request — `queryClient.ts` | `error_type`, `error_message` |
| `copy_action` | *(helper available, not currently wired)* | `content_type`, `content_length` — **never the copied text** |

> Note: `scroll` and `user_engagement` events that appear in GA are produced by
> GA4 **Enhanced Measurement** automatically, not by app code.

### First-touch acquisition

`acquisition.ts` records the **first** visit's `utm_source/medium/campaign/content/term`,
the referrer **hostname** (not the full URL), the landing **pathname** (no query),
and a timestamp into `localStorage['av_acquisition']`. It never overwrites an
existing record (true first-touch). `getAcquisition()` attaches `utm_*` +
`referrer_domain` to the conversion events (`login`, `sign_up`, `generate_lead`)
so acquisition can be analyzed alongside conversions even though GA4 already
derives source/medium natively from `page_location`.

## PII exclusion policy

No personally identifiable information is ever sent to GA4:

- No email, password, auth token, or session id in any event or param.
- `copy_action` sends only the content **type and length**, never the text.
- Acquisition stores the referrer **hostname** and landing **pathname** only —
  no full referrer URLs or query strings; UTM values are capped at 100 chars.

This is enforced by test: the validation harness scans every raw `/g/collect`
request body for the throwaway email and password and fails if either appears.

## Preserved-but-unwired helpers

`analytics.ts` retains several helpers with **no current call sites**, kept for
future instrumentation without re-plumbing the pipeline: `trackListSwitch`,
`trackLayoutChange`, `trackFilterUsage`, `trackSortChange`, `trackPopoverView`,
`trackMobileInteraction`, `trackEngagementTime`, `trackScrollDepth`,
`trackShareAction`, `trackKeyboardShortcut`, `trackExportAction`,
`trackTagInteraction`, `trackSessionQuality`, and `trackCopyAction`. The
`use-session-analytics.tsx` hook (Core Web Vitals + global JS-error capture) is
also defined but not mounted, so LCP/FID/CLS and `javascript_error` events do not
fire today. These are intentional — wire them up when the corresponding UI/metric
is ready.

## Validation (real GA4 network, no mocks)

Tracking is validated against the **real** GA4 collection endpoint
(`https://*.google-analytics.com/g/collect`) with a real browser — no mocks,
stubs, or fixtures. The harness `scripts/vg2-ga4-validate.mjs` drives a pinned
Chromium through real user flows, intercepts every `/g/collect` request, decodes
the batched event payloads, and asserts on event names, parameters, de-duplication,
and the absence of PII.

Flows exercised: landing (with UTM query) → search → resource detail view →
in-app SPA navigation → sign-up → resource submission → theme change.

### Gotchas the harness handles

- **gtag batches events** and flushes on `visibilitychange → hidden`. The harness
  toggles document visibility to force a flush, then polls for the expected event
  (`waitForEvent`) rather than using a fixed sleep — a freshly loaded page needs
  several seconds for gtag.js to load and drain its queue.
- **A search-result click opens the resource's external URL** in a new tab
  (`window.open`); it does **not** navigate to `/resource/:id`. So the harness
  reaches `select_content` via the real resource route, not via search results.

### Net-zero teardown

Any DB rows created during validation (throwaway `__qa_test_*@example.com` users
and `qa-test-*` resource submissions) are purged afterward via
`scripts/vg2-teardown.ts`, returning the database to baseline.

### Running it

```bash
node scripts/vg2-ga4-validate.mjs   # writes evidence/vg2-* (report, raw, screenshots)
npx tsx scripts/vg2-teardown.ts     # purge throwaway QA rows
```

Latest evidence lives in `evidence/vg2-report.md` (event counts, per-assertion
results, and sample decoded payloads).
