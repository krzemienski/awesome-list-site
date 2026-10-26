# Analytics — Tracking Plan, Event Taxonomy & Instrumentation

This document is the source of truth for how the app tracks usage. The
**[Tracking plan](#tracking-plan)** (next section) owns the usage questions,
funnels, naming rules, property hygiene and the **shared event catalog** for
the consent-gated tools — Google Analytics 4, Mixpanel, PostHog and Amplitude
— and the cookie-free Replit Analytics, which also receives events before a
consent choice (see [Replit Analytics](#replit-analytics)). The rest of the document covers GA4 specifics (gtag.js): where each
GA4 event is wired, the parameters each carries, first-touch acquisition, the
PII exclusion policy, and how tracking is validated end-to-end against the real
GA4 network endpoint. Mixpanel specifics (identity, server-side conversions)
live in `MIXPANEL.md`.

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
it is turned off, SPA `page_view` counts are inflated (~2×), **and** those
automatic page views bypass the app's URL hygiene: gtag fills their `dr` with
the raw previous URL (query string included), so a token in a landing URL can
reach GA4 through them. Every hit the app itself sends is sanitized (see
[Property hygiene](#property-hygiene-enforced-in-code)). This was observed
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

## Tracking plan

### One shared sender for every custom event

```
typed helper (analytics.ts: trackSearch, trackJourneyStart, …)
   └─ track(name, props, { ga?, product?, replit? })  module-private, consent-aware
        └─ dispatchAnalyticsEvent()              analytics-dispatch.ts — lazy chunk,
             ├─ sanitizeEventProps()             analytics-hygiene.ts  fetched on first event
             ├─ replitTrack   → Replit Analytics unless declined (platform-injected Umami)
             ├─ sendGaEvent   → GA4      (legacy GA name/params when the event predates the catalog)
             ├─ mpTrack       → Mixpanel
             ├─ phCapture     → PostHog
             └─ ampTrack      → Amplitude                       (these four after a grant only)
```

- **One call, every tool.** App code only calls typed helpers — in
  `client/src/lib/analytics.ts` or an area module such as
  `client/src/lib/analytics-contributions.ts`; each helper calls the shared
  `track()` (exported only for those helper modules, never imported by
  components). Components never import `mpTrack` / `phCapture` / `ampTrack` /
  `sendGaEvent` — those are the vendor halves of the dispatcher.
- **Consent per tool.** `track()` returns before doing anything when
  `analytics-consent` is `denied`, and also when it is unset and the event has
  no Replit half. GA4, Mixpanel, PostHog and Amplitude only receive events once
  it is `granted`; Replit Analytics receives them while it is unset or
  granted. The dispatcher re-checks before sending (events queued while its
  chunk loads are dropped on Decline). Each
  vendor half then applies its own gate: a pre-SDK buffer (at most 100
  events) that holds an event only while `vendorSdksAllowed()` is true (a
  grant and not suppressed) and the SDK is not ready yet, and a revoke kill
  switch that clears it (`optOutGA` / `optOutMixpanel` / `optOutPostHog` /
  `optOutAmplitude`). The buffer also covers the gap before init starts: with
  a stored grant, `page_viewed` fires when React mounts, while `main.tsx`
  starts the SDKs only after first paint. The buffer is flushed once each SDK
  is ready. Page context (`page_path`, Mixpanel's `$current_url`) is read when
  the event fires, not at flush time.
- **Admin sessions and QA paths send nothing** (see
  [Admin sessions and QA paths](#admin-sessions-and-qa-paths)): `track()`
  returns first thing, so the dispatcher chunk is never even fetched.
- **Stays out of the entry bundle.** The dispatcher and the hygiene
  rules are a separate chunk, imported on the first event (keep
  it out of the entry closure). Once loaded, dispatch
  is synchronous, so `page_engaged` on `pagehide` still goes out.
- **Names.** Mixpanel, PostHog and Amplitude receive the catalog name. GA4
  receives the same name by default; events that predate this plan keep their
  live GA4 name via `{ ga: { name } }` (e.g. `search` ↔ `search_performed`).
  `{ ga: false }` skips GA4; `{ product: false }` marks the legacy GA4-only
  events (performance/error/engagement telemetry and the two conversions whose
  product half is server-side), so their vendor coverage did not change.
- **Auto props.** Mixpanel, PostHog and Amplitude add `platform: "web"` and a
  query-free `page_path` to every event; GA4 adds its page context (below).
- **SDK-collected URLs are scrubbed too.** The vendor SDKs attach their own
  URL properties to every event, including SDK events. Mixpanel's
  `$current_url` / `$referrer` are overridden with origin + path / origin and
  `$initial_referrer` is blacklisted; PostHog's `sanitize_properties` reduces
  URL values at any nesting depth up to 3, e.g. web-vitals `navigationURL`
  (replay snapshots excepted); an Amplitude enrichment plugin registered after
  init does the same and drops raw `query` / `search` / `hash` fields. These
  SDK options live in `analytics-sdk-options.ts`, a post-consent chunk loaded
  together with each SDK, so they cost nothing in the pre-consent bundle.

### Naming rules

- **Event names:** `snake_case`, `object_action`, verb in the **past tense** —
  `collection_created`, `notification_opened`. Never present tense
  (`create_collection`) or UI wording (`click_button`).
- **Never rename a live event** — a rename starts a new event series in
  Mixpanel/Amplitude and breaks GA4 reports. Legacy GA4 names that differ from
  the catalog name stay as GA4 aliases in the catalog below.
- **Properties:** `snake_case`; IDs end in `_id` and are sent as **strings**
  (the sanitizer converts numeric `*_id` values); counts are numbers ending in
  `_count`; enums are documented in the catalog row.
- **No PII, no user-authored text.** No email, name, password, token, phone,
  free-text notes or proposed edit content. Describe content by id, type or
  length. Fire at **server-confirmed** success points (mutation `onSuccess`),
  never inside loops, and prefer an existing choke point over per-surface
  wiring.

### Property hygiene (enforced in code)

`sanitizeEventProps()` (`client/src/lib/analytics-hygiene.ts`) runs once per
event, before any vendor sees it, and the same cleaned object goes to every tool:

| Rule | Effect |
|---|---|
| PII-named keys | keys matching `email`, `password`/`passwd`, `token`, `secret`, `phone` are dropped |
| Email-shaped values | any string still containing an email address is dropped |
| URLs | absolute URLs → `origin + pathname`; relative `/path?q#h` → `/path` (also inside longer strings, e.g. `error_message`) |
| Long strings | capped at 200 characters (input scanned up to 2,000) |
| IDs | numeric `id` / `*_id` → string |
| Empty / invalid | `null`, `undefined`, `""`, `NaN`, `±Infinity` and nested objects are dropped; arrays keep up to 50 primitive items |

**GA4 page context** (`gaPageContext` in `analytics-hygiene.ts`, GA4 only) is
held to the same no-token rule. GA4 derives source / medium / campaign from the
page URL, so `page_location` keeps origin + path plus **only** the attribution
parameters (`utm_*`, `gclid`, `gbraid`, `wbraid`, `dclid`; values ≤100 chars,
never email-shaped). Every other query parameter (reset / auth tokens, search
terms, invite codes) and the fragment are dropped. `page_path` is the path
alone and `page_referrer` is origin + path. `sendGaEvent` also pins this
context with `gtag('set', …)`, so hits gtag sends on its own (enhanced
measurement) never fall back to the raw `document.location` / `document.referrer`.
When there is no `document.referrer` (SPA navigations), the dispatcher supplies
the previous sanitized `page_location` as `page_referrer`, so gtag never fills
`dr` from the raw previous URL. (GA4's own history page views are the one
exception — see the deployment prerequisite above.)

### Usage questions → funnels → events

Status: **live** = instrumented today; **planned** = to be added by the area
task named in the last column (those tasks add rows to the catalog below; the
names here are the starting proposal and may be refined there, but must follow
the naming rules).

| # | Question | Funnel / metric | Events it needs | Status / owner |
|---|---|---|---|---|
| 1 | **Activation** — do new visitors reach a first moment of value? | `page_viewed` (first session) → any value event within the session: `resource_link_opened`, `resource_bookmarked` / `guest_bookmark_added`, `journey_started` | listed | live |
| 2 | **Retention** — do activated visitors come back and get value again? | weekly cohort retention on the same value events; returning-learner path `journey_resumed` → `journey_step_completed` | value events (live) + `journey_resumed` (live) | live — continue-learning area |
| 3 | **Collection usage** — are collections created, filled and shared? | `collection_created` → `collection_resource_added` / `collection_items_moved` → `collection_published` → `collection_shared` → `public_collection_viewed` → `public_collection_resource_opened` (owner and public events join on `collection_share_id`) | the collection rows in the catalog below | live |
| 4 | **Notification engagement** — do notifications and digests bring people back? | `notification_opened` → value event; opt-ins / opt-outs via `notification_preference_changed`, `notifications_paused` / `notifications_resumed`, `notifications_unsubscribed_all`; preview interest via `digest_preview_item_opened` | `notification_opened`, `notification_marked_read`, `notifications_marked_all_read`, `notification_preference_changed`, `notifications_paused`, `notifications_resumed`, `notifications_unsubscribed_all`, `digest_preview_item_opened`, `learning_preferences_saved`, `learning_preferences_reset` | live (in-app + Settings); email opens/clicks not tracked |
| 5 | **Contribution funnel** — how many visitors who start a submission or edit finish it, and how many get approved? | `resource_submit_started` → `resource_submitted` (server) → approval (server status) ; `resource_edit_started` (`entry_point`) → optional `resource_edit_ai_analysis_requested` → `resource_edit_ai_suggestions_applied` → `resource_edit_submitted`, exits via `resource_edit_cancelled`; follow-up on `/contributions` (`contribution_withdrawn`, `contribution_public_resource_opened`) | `resource_submit_started`, `resource_submitted` (server, live), `resource_edit_*` (live), `contribution_*` (live) | edit funnel + contributions page live; `resource_submit_started` planned — contributions area |
| 6 | **Recommendation quality** — are recommendations opened, and from which position? Is feedback positive? | `recommendations_viewed` (`recommendation_count`, `signed_in`, `source`) → `recommendation_opened` (`position`, `resource_id`, `recommendation_type`) → value event on that resource; quality via `recommendation_feedback_saved` (`feedback`) and `recommendation_restored`; guest upgrade via `recommendation_sign_in_clicked` | `recommendations_viewed`, `recommendations_refreshed`, `recommendations_retried`, `recommendation_opened`, `recommendation_feedback_saved`, `recommendation_restored`, `recommendation_sign_in_clicked` | live |
| 7 | **Onboarding drop-off** — where do new accounts abandon onboarding? | `onboarding_step_viewed` (`step_number`, `step_name`) → `onboarding_step_completed` → … → `onboarding_completed` (`answer_count` + choice values); exits via `onboarding_skipped` (`step_number` it was left on); hesitation via `onboarding_navigated_back` | `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_navigated_back`, `onboarding_skipped`, `onboarding_completed` | live |
| — | **Learning journeys** (existing funnel) | `journey_started` → `journey_step_completed` → `journey_completed` | listed | live |
| — | **Guest → account** (existing funnel) | `guest_bookmark_added` → `auth_prompt_shown` → `sign_up_completed` (server) / `logged_in` → `bookmarks_merged` | listed | live |
| — | **Discovery** (existing) | `search_performed` / `category_viewed` / `filter_applied` → `resource_viewed` → `resource_link_opened` | listed | live |

| 8 | **Feature reach & account health** — which site-wide tools (palette, export, API keys, layout, shortcuts) do people actually use, and how often do accounts leave? | share of weekly active users firing each tool event; palette `open_method` mix; `export_started` → `export_downloaded`; `api_key_created` → `api_key_copied` (→ `api_key_revoked`); `account_deletion_dialog_opened` → `account_deletion_requested` (→ `account_deletion_withdrawn`) | `command_palette_opened`, `export_started`, `export_downloaded`, `api_key_created`, `api_key_copied`, `api_key_revoked`, `profile_name_updated`, `logged_out`, `account_deletion_*`, `account_security_opened`, `home_layout_changed`, `sidebar_toggled` | live |

**How the events answer these questions.** Activation (1) and the Discovery
funnel start at `page_viewed` and end at the first value event; card-level
events (`resource_card_opened`, `resource_link_opened` with a `surface`, and
`tag_interaction` with `action: 'card_click'`) show *which surface* produced
that value — palette, catalogue card, taxonomy card, home card / recent list or
the resource page itself — and `command_palette_opened` (`open_method`) sits in
front of the palette's own `search_performed` → `resource_link_opened` path.
Retention (2) re-uses the same value events weekly, joined with the area events
that bring people back: notification and digest opens (4), journey resumes,
collection activity (3) and recommendation opens (6). Contribution (5) and
onboarding (7) remain their own funnels. Question 8 covers the rest of the
product surface: tool adoption (palette, export, API keys, home layout,
keyboard sidebar toggle) as a share of active users, and the account lifecycle
from `logged_in` / `sign_up_completed` to `logged_out` (scope) and the
deletion request funnel, so churn signals can be segmented by what each
account used before it left. Empty-state calls to action are mostly not
instrumented separately; the event that follows the click (filter, search,
journey start…) already records the outcome. The exception is the Bookmarks
empty state's Explore resources (`library_explore_clicked`), which has no
single follow-up event.

### Replit Analytics

The published site carries Replit's own analytics tracker
(`https://i.replit.com/script.js`, Umami), which the hosting platform injects
into the HTML once analytics is enabled in Publishing settings. The app never
adds the script, a website id or an env var for it, and `script-src` /
`connect-src` already allow `https://i.replit.com`.

- **Page views** are recorded by the tracker itself on every load and SPA
  navigation, independent of the consent banner (cookieless, platform-level).
  For that reason `page_viewed` is **not** forwarded as a custom event — it
  would double the count. The tracker sees SPA navigations only through
  `history.pushState`/`replaceState` and has no `popstate` listener, so on
  Back/Forward `use-analytics.tsx` re-announces the current URL with a
  same-URL, same-state `replaceState`. Without that, a traversal recorded no
  page view and later custom events carried the previous page's URL.
- **Custom events:** every *product* event in the catalog below (the rows
  whose Tools column says "all four" or "product") also goes to Replit
  Analytics via `replitTrack` (`client/src/lib/replit-analytics.ts`) under the
  same catalog name, with the same cleaned properties minus free-form visitor
  text (`search_term`). GA4-only legacy events (`{ product: false }`) are not
  sent, except the ones marked `{ replit: true }`: `performance` (web vitals),
  `page_not_found` (path only), `site_error` (error type only) and the client
  halves of the two server-side conversions, `sign_up_completed` and
  `resource_submitted`. Mixpanel still gets those two conversions from the
  server only (`product: false` on the client keeps them from double-counting
  there); Replit Analytics has no server feed, so it gets them from the
  browser under the same catalog name.
- **Not sent to Replit:** `page_engaged` (Replit computes visit duration from
  its own page views) and every GA4-only legacy row not listed above.
- **Consent:** the tracker is cookie-free and the events carry no identity,
  so they are sent while the visitor has not answered the banner (most never
  do — before this, under 2% of visitors produced any custom event). An
  explicit Decline stops them; events queued while the tracker script is still
  loading (max 50) are re-checked at flush and dropped on Decline. The privacy
  policy (Analytics section) describes this.
- **Shape:** Umami takes flat values only, so arrays (e.g. onboarding
  `topics`) arrive as comma-separated strings, as in GA4; event names over 50
  characters are not sent (none exist today).
- **No tracker** (dev, analytics disabled, blocked script) is a silent no-op.
  The consent banner does not name Replit Analytics: it lists only the tools
  the banner switches on.

### Admin sessions and QA paths

Signed-in admin sessions and known QA/test paths send nothing to Replit
Analytics, GA4, Mixpanel, PostHog or Amplitude. Real visitors are tracked
exactly as before. The rules live in
`client/src/lib/analytics-suppression.ts`.

- **What is suppressed.** An admin session (below), any `/qa-*` path, the
  all-nines sentinel resource ids test runs use (`/resource/99999999`,
  `/resource/999999999`, …: `^/resource/9{8,}$`) and the owner sign-in page
  `/sign-in?admin`. `/admin` and `/bookmarks` are **not** path-blocked:
  visitors' `/bookmarks` stays tracked, and admin pages are covered by the
  session rule.
- **Admin marker.** `localStorage['analytics-admin-session'] = '1'` is set
  when `/api/auth/user` reports `role: "admin"` (any sign-in path, in
  `useAuth`) and right after the owner password sign-in succeeds, before its
  reload. It is cleared in `clearSignedInClientState()`, which every sign-out
  path runs (account menu, "sign out all devices", `/logout`), and when a
  non-admin account is reported on the device. An anonymous answer does not
  clear it: an expired admin session on the owner's device stays quiet.
  localStorage is read synchronously, so the marker covers events fired before
  Clerk loads or the auth check answers on every load after the first.
- **One check in the shared sender.** `track()` returns when
  `isAnalyticsSuppressed()` is true; the dispatcher re-checks the admin marker
  for events queued while its chunk loaded.
- **SDK self-sends.** PostHog (`$pageview`, autocapture, replay), Amplitude
  (autocapture, `Viewed Home Page`, replay) and Mixpanel (`$opt_in`, people
  `engage` on identify) send without going through `track()`. The choke point
  for them is SDK start-up: `initGA` / `initMixpanel` / `initPosthog` /
  `initAmplitude` all gate on `vendorSdksAllowed()` (a grant **and** not
  suppressed), so an admin load or a QA landing never loads any vendor SDK.
  Mid-session (a visitor who granted consent signs in as admin), each tab
  stops its own running SDKs with the existing revoke functions and skips
  identify the first time its `/api/auth/user` answer reports the admin role,
  whether or not another tab set the shared marker first (`useAuth` keeps a
  per-tab "stopped for admin" flag). If a non-admin account replaces the
  marker within a page load (a non-admin signs in on a device with an expired
  admin marker), `useAuth` starts the SDKs again and records the current page
  view; each init still checks consent and QA paths. For a visitor who
  navigates into a QA path while the SDKs run, PostHog's `before_send` and the
  Amplitude URL-scrub enrichment plugin drop every event while suppressed, and
  the Amplitude Session Replay and Guides & Surveys transports refuse every
  upload while suppressed. That transport check also stops replay uploads in
  a visitor tab as soon as another tab sets the admin marker, before that tab
  has re-asked `/api/auth/user`. Server conversion
  headers (`serverConversionHeaders`) are also withheld, so the server sends no
  Mixpanel conversion for an admin.
- **Replit page views.** The injected Umami tracker checks
  `localStorage['umami.disabled']` before every send, page views included
  ([Umami docs](https://umami.is/docs/exclude-my-own-visits)).
  `syncReplitPageviewOptOut()` sets it (plus the flag
  `analytics-umami-disabled-by-app`) while suppressed, at entry-module load
  and on every route change before the tracker's ~300 ms soft-navigation
  delay, and removes both when no longer suppressed. A value set by hand (no
  app flag beside it) is never changed or removed.
- **Residual gaps.**
  - The first page of a device that has never had the marker is, by
    definition, not yet an admin session.
  - Clerk sign-in on a device without the marker: `logged_in` (fired by
    `AuthConversionTracker` when the Clerk session appears) and the landing
    page view can go out before `/api/auth/user` reports the role; SDK
    autocapture on the sign-in page itself is also sent. The owner password
    path has no gap (the marker is set before its reload, and
    `/sign-in?admin` is a suppressed path). Every sign-out clears the marker,
    so this boundary recurs on each Clerk sign-in.
  - A visitor session that lands on a QA path does not start the SDKs for
    that page load. The Umami tracker never installs its SPA hook if
    `umami.disabled` was set before it evaluated, so Replit misses the rest of
    that page load's soft navigations.
  - GA4 Enhanced Measurement history page views on SPA navigation into a QA
    path from a normal page are not filtered (keep that GA4 setting off, see
    the deployment prerequisite).

### Shared event catalog

Every custom event the client emits. **Area tasks add their events here** (one
row each, same columns) in the same change that adds the typed helper. "Product"
= Mixpanel + PostHog + Amplitude + Replit Analytics, and "all four" = GA4 +
product (both include Replit Analytics; `page_viewed` excepted, see above). GA4-only legacy events are listed in the GA4
taxonomy further down and are not repeated here.

| Catalog event (product name) | GA4 name | Tools | Properties | Helper / source |
|---|---|---|---|---|
| `page_viewed` | `page_view` | all four | `page_title`, `referrer_origin` (GA4: page context only) | `trackPageView` ← `use-analytics` |
| `resource_viewed` | `select_content` | all four | `resource_id` + caller extras (GA4: `content_type`, `content_id`, extras) | `trackSelectContent('resource', …)` |
| `resource_link_opened` | `resource_click` (+ GA4-only `outbound_link`) | all four | `resource_title`, `link_url` (origin+path), `link_domain`, `category`, `surface` (`search_palette` \| `resource_detail` \| `resource_card` \| `taxonomy_card` \| `home_card` \| `home_recent_rail` \| `home_recent_list`) | `trackResourceClick` ← palette, detail page, `ResourceCard`, home cards |
| `search_performed` | `search` | all four | `search_term`, `result_count`, `surface` | `trackSearch` |
| `category_viewed` | `category_view` | all four | `category` (GA4: `content_category`) | `trackCategoryView` |
| `filter_applied` | `filter_applied` | all four | `filter_type`, `filter_value`, `result_count`, `zero_results`, `surface` (`search_page` \| `taxonomy_*` \| `home` (kind filter / clear all) \| `journeys_page` (category)) | `trackFilterUsage` |
| `sort_changed` | `sort_change` | all four | `sort_type`, `surface` (`search_page` \| `taxonomy_*` \| `home` \| `categories_page`), `result_count`, `zero_results` | `trackSortChange` |
| `tag_interaction` | `tag_interaction` | all four | `tag`, `action` (`apply` \| `remove` \| `card_click` \| `landing_viewed` \| `link_click` — a resource page's Keep exploring tag link), `surface` (adds `home`, `tag_page`, `resource_onward`), `result_count`, `zero_results` | `trackTagInteraction` (cards: `action: 'card_click'` only when the pill navigates; pages that filter in place via `onTagClick` keep their own `apply` event; `/tag/:slug` sends `landing_viewed` once per tag visit) |
| `logged_in` | `login` | all four | `login_method` (GA4: `method`) + acquisition | `trackLogin` ← `AuthConversionTracker` |
| `content_shared` | `share` | all four | `share_method` (GA4: `method`), `content_type`, `content_id` | `trackShare` |
| `journey_started` | `journey_start` | all four | `journey_id`, `journey_title`, `total_steps` | `trackJourneyStart` |
| `journey_step_completed` | `journey_step_complete` | all four | `journey_id`, `journey_title`, `step_number`, `step_position`, `total_steps`, `step_row_count` (product only) | `trackJourneyStepComplete` |
| `journey_step_uncompleted` | — | product | `journey_id`, `journey_title`, `step_number`, `step_row_count` | `trackJourneyStepUncomplete` |
| `journey_completed` | `journey_complete` | all four | `journey_id`, `journey_title`, `total_steps` | `trackJourneyComplete` |
| `resource_bookmarked` / `resource_unbookmarked` | — | product | `resource_id` | `trackResourceSaveToggle` ← `useResourceToggle` |
| `resource_favorited` / `resource_unfavorited` | — (GA4 has legacy `resource_favorite`) | product | `resource_id` | `trackResourceSaveToggle` ← `useResourceToggle` |
| `guest_bookmark_added` / `guest_bookmark_removed` | same | all four | `resource_id`, `guest_saved_count` | `trackGuestBookmarkAdded` / `Removed` |
| `auth_prompt_shown` | same | all four | `prompt_context`, `guest_saved_count` | `trackAuthPromptShown` |
| `bookmarks_merged` | same | all four | `merged_count`, `duplicate_count`, `failed_count` | `trackBookmarksMerged` |
| `collection_created` | same | all four | `collection_id`, `collection_count` (the owner's collections after this one) — server-confirmed `POST /api/collections` | `trackCollectionCreated` ← `Bookmarks` |
| `collection_renamed` | same | all four | `collection_id`, `item_count` — server-confirmed rename (the name itself is never sent) | `trackCollectionRenamed` ← `Bookmarks` |
| `collection_deleted` | same | all four | `collection_id`, `item_count`, `was_published` — server-confirmed delete | `trackCollectionDeleted` ← `Bookmarks` |
| `collection_archived` / `collection_restored` | same | all four | `collection_id`, `item_count` — server-confirmed archive toggle (archiving also revokes sharing server-side; no separate unpublish event) | `trackCollectionArchiveChanged` ← `Bookmarks` |
| `collection_published` / `collection_unpublished` | same | all four | `collection_id`, `item_count`, `collection_share_id` — server-confirmed Publish link / Unpublish | `trackCollectionPublishChanged` ← `Bookmarks` |
| `collection_shared` | same | all four | `collection_id`, `item_count`, `collection_share_id`, `share_method: "clipboard"` — after the public link is written to the clipboard (a failed copy sends nothing) | `trackCollectionShared` ← `Bookmarks` |
| `collections_reordered` | same | all four | `collection_id` (the moved one), `from_position`, `to_position` (1-based), `direction: "up" \| "down"`, `collection_count` — server-confirmed reorder | `trackCollectionsReordered` ← `Bookmarks` |
| `collection_items_moved` | same | all four | `destination_collection_id`, `source_collection_id` (absent when moving from All saved), `moved_count` (only resources not already in the destination — the server accepts those but changes nothing), `failed_count` — server-confirmed bulk Move; one event per bulk action, none when nothing moved | `trackCollectionItemsMoved` ← `Bookmarks` |
| `collection_resource_added` / `collection_resource_removed` | same | all four | `collection_id`, `resource_id`, `source: "bookmark_button" \| "resource_detail"`, `dialog_mode: "add" \| "edit"` — one per membership request the server accepted from the bookmark notes dialog; rejected requests and bookmark Undo restores send nothing | `trackCollectionMembershipResults` ← `BookmarkButton`, `ResourceDetail` |
| `library_explore_clicked` | same | all four | `surface: "bookmarks_empty_state"` — Explore resources on the empty library | `trackLibraryExploreClicked` ← `Bookmarks` |
| `public_collection_viewed` | same | all four | `collection_share_id`, `item_count` — once per shared collection per page visit when it loads (refetches don't re-fire), or when the visitor grants consent after it loaded; never the owner's identity or the collection name | `trackPublicCollectionViewed` ← `PublicCollection` |
| `public_collection_resource_opened` | same | all four | `collection_share_id`, `resource_id`, `position` (1-based), `item_count`, `link_target: "detail" \| "external"` — click or middle-click on a card's title / View Details (detail) or Open Link (external) | `trackPublicCollectionResourceOpened` ← `PublicCollection` |
| `public_collection_recovery_clicked` | same | all four | `collection_share_id` (only when well-formed), `recovery_action: "retry_error" \| "retry_offline" \| "explore_journeys" \| "home" \| "categories"`, `page_state: "not_found" \| "error" \| "offline"` | `trackPublicCollectionRecoveryClicked` ← `PublicCollection` |
| `resource_card_opened` | same | all four | `resource_id`, `surface`, `card_control` (`title` \| `view_details`) | `trackResourceCardOpened` ← `ResourceCard`, home cards (the detail page's `resource_viewed` fires on arrival) |
| `related_resource_opened` | same | all four | `resource_id` (opened), `from_resource_id`, `position` (1-based), `match_score`, `surface` (`related_list` — Related Resources card \| `resource_onward` — Keep exploring "More like this") | `trackRelatedResourceOpened` ← `ResourceDetail` Related Resources list, `ResourceOnwardPaths` |
| `related_category_opened` | same | all four | `from_resource_id`, `category` (the collection's name), `surface` (`resource_onward`; `related_list` is the default for any other caller) | `trackRelatedCategoryOpened` ← `ResourceOnwardPaths` "More in …" / "View all in …" |
| `command_palette_opened` | same | all four | `open_method` (`keyboard_shortcut` \| `slash_key` \| `header_button` \| `resource_page_button` \| `listing_page_button`), `surface` (page entries only: `resource_onward` \| `tag_page`) — closed → open only | `trackCommandPaletteOpened` ← `MainLayout` (page entries open it through `openSearchPalette`) |
| `export_started` / `export_downloaded` | same | all four | `export_format`, `export_scope` (`all` \| `selected_categories`), `category_count`, `resource_count` — never file contents | `trackExportStarted` / `trackExportDownloaded` ← `export-tools` |
| `api_key_created` | same | all four | `expiry_option` (`30` \| `90` \| `365` \| `never`) — never the key or its name | `trackApiKeyCreated` ← `ApiKeysCard` (server-confirmed) |
| `api_key_copied` | same | all four | `copy_method` (`clipboard` \| `manual_select`) | `trackApiKeyCopied` ← `ApiKeysCard` |
| `api_key_revoked` | same | all four | — | `trackApiKeyRevoked` ← `ApiKeysCard` (server-confirmed) |
| `profile_name_updated` | same | all four | — (never the name) | `trackProfileNameUpdated` ← `Profile` (server-confirmed) |
| `logged_out` | same | all four | `logout_scope` (`this_device` \| `all_devices`) — fired after the server confirms, before identities reset | `trackLoggedOut` ← `useAuth`, `/logout` route |
| `account_deletion_dialog_opened` / `account_deletion_requested` / `account_deletion_withdrawn` | same | all four | — (requested / withdrawn are server-confirmed) | `trackAccountDeletion*` ← `Profile` |
| `account_security_opened` | same | all four | `entry_point` (`profile_tab` \| `manage_button`) | `trackAccountSecurityOpened` ← `Profile`, `AccountSecurityCard` |
| `home_layout_changed` | same | all four | `home_layout`, `previous_layout` (signed-in: after the server saves) | `trackHomeLayoutChanged` ← `use-home-layout` |
| `sidebar_toggled` | same | all four | `toggle_method: 'keyboard_shortcut'`, `sidebar_state`, `sidebar_mode` (`drawer` \| `docked`) | `trackSidebarToggled` ← `ui/sidebar` (⌘/Ctrl+B) |
| `recommendations_viewed` | same | all four | `recommendation_count`, `signed_in`, `source` (`popular` \| `personalized`), `from_cache` — once per surface load, when results or the empty state are first shown | `trackRecommendationsViewed` ← `Recommendations` (guests), `ai-recommendations-panel` |
| `recommendations_refreshed` / `recommendations_retried` | same | all four | `signed_in`, `source`, `recommendation_count` (items on screen when clicked) — fired by the click that starts the request, never an extra request | `trackRecommendationsRefreshed` ← Refresh button / Try again buttons |
| `recommendation_opened` | same | all four | `resource_id`, `position` (1-based), `recommendation_type` (`ai_powered` \| `rule_based` \| `hybrid`), `signed_in`, `source`, `link_target` (`detail` \| `external`) | `trackRecommendationOpened` ← `RecommendationCard`, `Recommendations` guest grid |
| `recommendation_feedback_saved` | same | all four | `resource_id`, `feedback` (`helpful` \| `not_for_me` \| `already_known` \| `hidden` \| `cleared`), `previous_feedback` (same values, `none` instead of `cleared`) — after the server confirms | `trackRecommendationFeedbackSaved` ← `recommendation-feedback` |
| `recommendation_restored` | same | all four | `resource_id` — hidden item restored, server-confirmed | `trackRecommendationRestored` ← `ai-recommendations-panel` |
| `recommendation_sign_in_clicked` | same | all four | `placement` (`recommendations_page` \| `panel_footer` \| `panel_empty_state`) | `trackRecommendationSignInClicked` |
| `onboarding_step_viewed` | same | all four | `step_number`, `step_name` (`level` \| `topics` \| `goals` \| `formats` \| `time`), `total_steps` | `trackOnboardingStepViewed` ← `Onboarding` |
| `onboarding_step_completed` | same | all four | `step_number`, `step_name`, `total_steps` — Continue saved the step | `trackOnboardingStepCompleted` ← `Onboarding` |
| `onboarding_navigated_back` | same | all four | `step_number` (step left), `step_name`, `total_steps`, `to_step_number` | `trackOnboardingNavigatedBack` ← `Onboarding` |
| `onboarding_skipped` | same | all four | `step_number` (step it was skipped on), `step_name`, `total_steps`, `answer_count`, `already_completed` — after the server saves | `trackOnboardingSkipped` ← `Onboarding` |
| `onboarding_completed` | same | all four | `answer_count` (skill + time + every selected topic, goal and format), `skill_level`, `time_commitment`, `topic_count`, `topics`, `learning_goals`, `resource_formats` (lists; GA4 gets comma-separated strings), `total_steps`, `already_completed` — choice values only, never free text | `trackOnboardingCompleted` ← `Onboarding` |
| `notification_preference_changed` | same | all four | `setting` (`email_digest` \| `in_app` \| `include_new_resources` \| `include_watch_next` \| `include_journey_step` \| `cadence` \| `timezone`), `value` (`on`/`off`, or the cadence enum; omitted for `timezone`) — one event per setting that differs between the last server-confirmed preferences and the saved response | `trackNotificationPreferenceChanges` ← `NotificationPreferencesCard` "Save choices" |
| `notifications_paused` / `notifications_resumed` | same | all four | paused: `pause_days` | `trackNotificationsPaused` / `Resumed` ← preferences card quick actions (server-confirmed) |
| `notifications_unsubscribed_all` | same | all four | `digest_turned_off`, `in_app_turned_off` (booleans, server before/after) | `trackNotificationsUnsubscribedAll` ← "Unsubscribe all" (quick actions send only their own event, not `notification_preference_changed`) |
| `notification_opened` | same | all four | `notification_id`, `notification_kind` (`new_resource` \| `watch_next` \| `journey_step`), `was_unread` — never title/description | `trackNotificationOpened` ← `Notifications` row link |
| `notification_marked_read` | same | all four | `notification_id`, `notification_kind`, `read_via` (`opened` \| `button`) — server-confirmed | `trackNotificationMarkedRead` ← `Notifications` read mutation |
| `notifications_marked_all_read` | same | all four | `marked_count` (server's updated count) | `trackNotificationsMarkedAllRead` ← "Mark all read" |
| `digest_preview_item_opened` | same | all four | `notification_kind`, `digest_section` (`new_resources` \| `watch_next` \| `journey_step`), `item_position` (1-based) | `trackDigestPreviewItemOpened` ← preferences card preview |
| `learning_preferences_saved` / `learning_preferences_reset` | same | all four | `surface: 'settings'`; saved adds `first_save` — preference values are never sent | `trackLearningPreferencesSaved` / `Reset` ← `Settings` (after the server confirms) |
| `sign_up_completed` | `sign_up` | GA4 + Replit (client); Mixpanel (**server**) | client: `signup_method` + acquisition (GA4: `method` + acquisition); server: see `MIXPANEL.md` | `trackSignUp` ← `AuthConversionTracker`; server — Clerk JIT provisioning |
| `resource_submitted` | `generate_lead` | GA4 + Replit (client); Mixpanel (**server**) | client: `content_type: "resource_submission"`, `category` (taxonomy name) + acquisition — never title, URL or description; server: see `MIXPANEL.md` | `trackGenerateLead` ← `SubmitResource` (server-confirmed); server — resource-submit handler |
| `page_not_found` | same (legacy `event_category: "navigation"`, `event_label`: path + query) | GA4 + Replit | Replit: `page_path` (path only, no query, ≤200 chars) | `trackPageNotFound` ← `NotFound` (every 404 surface) |
| `site_error` | — (GA4 keeps its legacy `error` event) | Replit | `error_type` only (`javascript_error` \| `unhandled_promise_rejection` \| `api_error` \| `component_crash` \| `route_crash` \| `chunk_load_failed` \| `page_load_failed`) — never the message | `trackSiteError` ← `trackError`, `ErrorBoundary`, `RouteErrorBoundary`, `ErrorPage` |
| `contact_message_sent` | same | all four | none — never the name, address, subject or message (the reply address is required, so no reply flag is sent) | `trackContactMessageSent` ← contact dialog (server-confirmed) |
| `tool_tab_opened` | same | all four | `page: "advanced"`, `tab` (`explorer` \| `metrics` \| `export` \| `recommendations`) | `trackToolTabOpened` ← `Advanced` |


#### Contributions and continue learning

Helpers live in `client/src/lib/analytics-contributions.ts`. The suggest-edit
funnel is product-only (like its pre-existing `resource_edit_submitted` step)
so every step lives in the same tools; the rest go to all four. No proposed
edit text, contribution search text or URLs beyond a hostname are sent.

| Catalog event (product name) | GA4 name | Tools | Properties | Helper / source |
|---|---|---|---|---|
| `resource_edit_started` | — | product | `resource_id`, `entry_point` (`resource_card` \| `resource_page`) | `trackResourceEditStarted` ← `suggest-edit-dialog` (once per editable open; the signed-out sign-in wall is not a start) |
| `resource_edit_ai_analysis_requested` | — | product | `resource_id`, `entry_point`, `outcome` (`succeeded` \| `unavailable` \| `failed`) | `trackResourceEditAiAnalysisRequested` ← dialog, after the confirmed (paid) request settles |
| `resource_edit_ai_suggestions_applied` | — | product | `resource_id`, `entry_point`, `applied_field_count` | `trackResourceEditAiSuggestionsApplied` ← dialog "Apply" |
| `resource_edit_cancelled` | — | product | `resource_id`, `entry_point`, `form_changed`, `ai_suggestions_applied` | `trackResourceEditCancelled` ← dialog Cancel / Esc / overlay / ✕ (not the post-submit close) |
| `resource_edit_submitted` | — | product | `resource_id`, `entry_point`, `changed_field_count`, `ai_suggestions_applied` | `trackResourceEditSubmitted` ← dialog submit `onSuccess` (name unchanged) |
| `contribution_filter_changed` | same | all four | `filter_type` (`type` \| `status` \| `sort` \| `search`), `filter_value` (selects) or `query_length` (search, debounced) | `trackContributionFilterChanged` ← `Contributions` |
| `contribution_filters_cleared` | same | all four | `active_filter_count` | `trackContributionFiltersCleared` ← `Contributions` empty-state "Clear filters" |
| `contribution_withdrawn` | same | all four | `contribution_kind` (`resource` \| `edit`), `contribution_id` | `trackContributionWithdrawn` ← withdraw `onSuccess` |
| `contributions_page_changed` | same | all four | `page_number`, `total_pages` | `trackContributionsPageChanged` ← `Contributions` paginator |
| `contribution_public_resource_opened` | same | all four | `contribution_kind`, `resource_id` | `trackContributionPublicResourceOpened` ← "View public resource" |
| `contribution_external_link_opened` | same | all four | `contribution_kind`, `link_domain` | `trackContributionExternalLinkOpened` ← submitted URL link |
| `contribution_submit_cta_clicked` | same | all four | `placement` (`header` \| `empty_state`) | `trackContributionSubmitCtaClicked` ← `Contributions` |
| `journey_resumed` | same | all four | `journey_id`, `surface` (`continue_learning_page` \| `home_preview`), `has_next_step`, `progress_percent` | `trackJourneyResumed` ← `useResumeJourney` `onSuccess` (never `journey_started`) |
| `continue_learning_cta_clicked` | same | all four | `cta` (`recent_resource` \| `review_journey` \| `find_another_journey` \| `browse_available_journeys` \| `suggested_journey` \| `start_journey` \| `browse_resources`), `journey_id` / `resource_id` when the CTA has one | `trackContinueLearningCtaClicked` ← `ContinueLearning` |

Amplitude additionally sends its own `Viewed Home Page` verification event and
autocaptured `[Amplitude] …` events; PostHog sends autocapture, `$pageview` and
`$pageleave`. Those are SDK events, not catalog events.

### Adding an event (area tasks)

1. Pick the name with the naming rules; add a catalog row (and update the
   question/funnel row it serves).
2. Add a typed helper in `analytics.ts` (or the area's `analytics-<area>.ts`
   module) that calls `track()` — default options
   send the same name and properties to all four tools. Export it only together
   with its first caller (no speculative exports).
3. Call it from the server-confirmed success point.
4. Verify in a consented real browser that GA4 `/g/collect`, Mixpanel `/track`
   (gzipped), PostHog `/e/` and Amplitude `/2/httpapi` requests carry it with
   clean properties, and that nothing is sent after a revoke.

## Architecture

- **`client/src/lib/analytics.ts`** — the only place that talks to gtag, and
  home of the typed `track*` helpers callers import. Every event goes through
  the shared sender (see [Tracking plan](#tracking-plan)); its GA4 half,
  `sendGaEvent(name, params, context)`, merges the already-cleaned payload
  with the sanitized GA4 page context from `gaPageContext` (`page_location`
  with attribution params only, `page_path`, `page_title`, origin + path
  `page_referrer`), pins that context with `gtag('set')` and strips
  `undefined`/`null` params. Only the dispatcher calls `sendGaEvent`.
- **`client/src/lib/acquisition.ts`** — captures first-touch UTM + referrer once
  and attaches it to conversion events.
- **`client/src/hooks/use-analytics.tsx`** — fires exactly one `page_view` per
  navigation (mount + every route change) and a `page_engaged` (with dwell time)
  when leaving a page or hiding the tab. Unless analytics was declined, the
  same mounted hook reports web vitals through `web-vitals` (LCP, INP, CLS,
  FCP, TTFB) and global JavaScript errors. Mounted once in `App.tsx`.

### Initialization order (important)

`initGA()` is **idempotent** and is called in `client/src/main.tsx` inside an
`afterFirstPaint()` callback — deferred until after the first contentful paint
(via `PerformanceObserver` on the `"paint"` entry, with a double-rAF fallback).
All analytics SDKs are consent-gated and deferred to this same callback. Because
`initGA` is idempotent, any code path that calls it earlier (e.g. after an
explicit consent grant) is safe — subsequent calls are no-ops.

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
| `login` | The page goes from signed out to a new Clerk session — `AuthConversionTracker.tsx`. One-step password sign-ins never expose an in-flight `signIn` status, so the transition itself is the trigger. Session restores, page reloads and token refreshes never fire it. | `method` (`client.lastAuthenticationStrategy`, e.g. `password`, `google`) + acquisition |
| `sign_up` (catalog `sign_up_completed`) | Same transition, when the account was created within 10 s of the session (or a live `signUp` attempt was seen) and this browser has not already reported that account's sign-up — `AuthConversionTracker.tsx`. An OAuth sign-in transferred into a registration counts here, not as `login`. | `method` (the account's OAuth provider, else `password`) + acquisition |
| `generate_lead` (catalog `resource_submitted`) | Successful resource submission — `SubmitResource.tsx` | `content_type: "resource_submission"`, `category` + acquisition |
| `share` | Share button on a resource — `ResourceDetail.tsx` | `method: "web_share" \| "clipboard"`, `content_type`, `content_id` |

### Learning-journey funnel (Task #330)

Funnel: journeys list view (`page_view`) → `journey_start` → `journey_step_complete` → `journey_complete`.

| Event | Fires when / where | Key params |
|---|---|---|
| `journey_start` | Genuinely NEW enrollment only — listing one-click start (`Journeys.tsx`) or detail start button (`JourneyDetail.tsx`). Resume re-POSTs (Continue CTA, `useResumeJourney`) never re-fire it. | `journey_id`, `journey_title`, `total_steps` |
| `journey_step_complete` | Logical step marked complete, server-confirmed — one event per logical step (up to 3 row ids written together), never per row | `journey_id`, `journey_title`, `step_number`, `step_position`, `total_steps` |
| `journey_complete` | Server-confirmed transition of `completedAt` null → set in the PUT progress response (re-saves of an already-complete journey never re-fire) | `journey_id`, `journey_title`, `total_steps` |

### Retained custom events (names preserved for dashboard continuity, now enriched)

| Event | Fires when / where | Key params |
|---|---|---|
| `page_engaged` | Leaving a page / tab hide — `use-analytics.tsx` | `page_path`, `engagement_time_msec` |
| `resource_click` + `outbound_link` | Clicking a search result — `search-dialog.tsx` (documented **pair**, not a duplicate: one engagement signal, one outbound-navigation signal) | `content_*` / `link_url`, `link_domain` |
| `category_view` | Category / Subcategory / Sub-subcategory pages — `TaxonomyListing.tsx`, once per resolved node (filtering, sorting and paging within the node do not re-fire it) | `content_category` |
| `theme_change` | Theme settings pickers — `ThemeSettings.tsx` | `theme_name`, `theme_type: "color" \| "font" \| "system"` |
| `resource_favorite` | Favorite toggle — `ResourceDetail.tsx` | `action: "add" \| "remove"`, `content_name`, `content_category` |
| `performance` | Web vitals from `web-vitals` unless analytics was declined (GA4 after consent; Replit Analytics before a choice too) — `use-analytics.tsx` | `metric_name: "lcp" \| "inp" \| "cls" \| "fcp" \| "ttfb"`, `value` (milliseconds for LCP/INP/FCP/TTFB, unitless score for CLS). `fid` stopped in October 2026. |
| `api_performance` | Every API request — `queryClient.ts` | `endpoint`, `status`, `value` (ms) |
| `error` | Failed API request or global JavaScript error — `queryClient.ts` / `use-analytics.tsx` (the browser listeners run unless analytics was declined; GA4 still only after a grant). Each also sends `site_error` (type only) to Replit Analytics | `error_type`, `error_message` (browser errors use a non-content shape such as `short-text`) |
| `guest_bookmark_added` / `guest_bookmark_removed` | Signed-out save toggle (on-device store, Task #329) — `useResourceToggle` guest branch | `resource_id`, `guest_saved_count` |
| `auth_prompt_shown` | Save-intent sign-in prompt shown to a guest — toggle hook / `GuestBookmarks.tsx` | `prompt_context: "guest_save_toast" \| "guest_save_cap" \| "bookmarks_page"`, `guest_saved_count` |
| `bookmarks_merged` | Guest saves merged into the account after sign-in — `GuestBookmarkMerge.tsx` | `merged_count`, `duplicate_count`, `failed_count` |

> Note: `scroll` and `user_engagement` events that appear in GA are produced by
> GA4 **Enhanced Measurement** automatically, not by app code.

### FID to INP transition

Google replaced First Input Delay (FID) with **Interaction to Next Paint (INP)**
as the responsiveness Core Web Vital. The performance capture (skipped after a
Decline) reports `inp` from the `web-vitals` package. The hand-written
`first-input` observer that sent `fid` was removed in October 2026; FID series
end there. `fcp` and `ttfb` were added at the same time, also from
`web-vitals`.

### First-touch acquisition

`acquisition.ts` records the **first** visit's `utm_source/medium/campaign/content/term`,
the referrer **hostname** (not the full URL), the landing **pathname** (no query),
and a timestamp into `localStorage['av_acquisition']`. It never overwrites an
existing record (true first-touch). `getAcquisition()` attaches `utm_*` +
`referrer_domain` to the conversion events (`login`, `sign_up`, `generate_lead`)
so acquisition can be analyzed alongside conversions even though GA4 already
derives source/medium natively from `page_location` (which keeps its `utm_*`
and click-id params; see [Property hygiene](#property-hygiene-enforced-in-code)).

## PII exclusion policy

No personally identifiable information is ever sent to GA4 (or to Mixpanel,
PostHog or Amplitude — the shared sender's property hygiene, described in the
tracking plan, applies to all four):

- No email, password, auth token, or session id in any event or param.
- No user-authored or user-copied text in any event: an event that describes
  content sends its **type and length**, never the content itself.
- Browser-error telemetry sends only the error type and a message shape
  (`empty`, `short-text`, `medium-url-query`, etc.), never the raw message,
  URL, query string, or copied/user-authored text.
- Acquisition stores the referrer **hostname** and landing **pathname** only —
  no full referrer URLs or query strings; UTM values are capped at 100 chars.

This is enforced by test: the validation harness scans every raw `/g/collect`
request body for the throwaway email and password and fails if either appears.

## Interaction helpers

Search and taxonomy browse pages call `trackFilterUsage`, `trackSortChange`, and
`trackTagInteraction` with their surface, resulting resource count, and
zero-result state.

`analytics.ts` used to also carry a set of helpers "retained for future
instrumentation": `trackListSwitch`, `trackLayoutChange`, `trackPopoverView`,
`trackMobileInteraction`, `trackEngagementTime`, `trackScrollDepth`,
`trackShareAction`, `trackKeyboardShortcut`, `trackExportAction`,
`trackSessionQuality`, and `trackCopyAction`. **They have been deleted** (task
#374): nothing imported them, so they sent no events, while every typecheck,
bundle, and styling sweep still paid for them. `trackPerformance` is the
exception: it is restored together with its call site in the already-mounted
`use-analytics.tsx` hook. The hook also owns consent-gated global
JavaScript-error capture, so no unreferenced session hook can silently recreate
the same measurement gap.

## Validation (real GA4 network, no mocks)

Tracking is validated against the **real** GA4 collection endpoint
(`https://*.google-analytics.com/g/collect`) with a real browser — no mocks,
stubs, or fixtures. The harness `scripts/vg2-ga4-validate.mjs` drives a pinned
Chromium through real user flows, intercepts every `/g/collect` request, decodes
the batched event payloads, and asserts on event names, parameters, de-duplication,
and the absence of PII.

Flows exercised: landing (with UTM query) → consent-gated performance and a real
interaction for INP → deliberate browser-error capture → search → resource detail view → in-app SPA
navigation → theme change → taxonomy page → Clerk sign-up → signed-in reload →
Clerk sign-in → consent revoke and re-grant.

### Gotchas the harness handles

- **gtag batches events** and flushes on `visibilitychange → hidden`. The harness
  toggles document visibility to force a flush, then polls for the expected event
  (`waitForEvent`) rather than using a fixed sleep — a freshly loaded page needs
  several seconds for gtag.js to load and drain its queue.
- **A search-result click opens the resource's external URL** in a new tab
  (`window.open`); it does **not** navigate to `/resource/:id`. So the harness
  reaches `select_content` via the real resource route, not via search results.
- **The auth conversions need a real Clerk attempt.** The harness registers a
  throwaway `__qa_test_*+clerk_test@example.com` account through the prebuilt
  `<SignUp>` card, signs out, signs back in through `<SignIn>`, and deletes the
  Clerk account afterwards. Registration — and only registration — sits behind
  Cloudflare Turnstile, which serves headless Chromium an interactive challenge,
  so the harness attaches a Clerk [Testing Token](https://clerk.com/docs/guides/development/testing/overview)
  to every Frontend API call and forces `Clerk.client.captchaBypass`. The
  registration, session, app code and GA4 network path all stay real; only the
  third-party bot gate is stepped around. Without `CLERK_SECRET_KEY` and a
  `pk_test_` publishable key these flows are reported as **SKIP**, never as pass.

### Net-zero teardown

Any DB rows created during validation (throwaway `__qa_test_*@example.com` users
and `qa-test-*` resource submissions) are purged afterward via
`scripts/vg2-teardown.ts`, returning the database to baseline.

### Running it

```bash
node scripts/vg2-ga4-validate.mjs   # drives Chromium through the full local flow
npx tsx scripts/vg2-teardown.ts     # purge throwaway QA rows after the full flow
```

### Post-publish smoke check

Run the production-safe smoke mode immediately after every publish, using the
published site's exact URL:

```bash
node scripts/vg2-ga4-validate.mjs --smoke --base-url https://published.example
```

Smoke mode uses a fresh browser context and only loads the landing page, checks
that no GA4 collection request occurs before consent, grants consent through the
real banner, performs the real `/` keyboard interaction, and waits for an
`INP` performance event on the wire. It does not load the catalog, call Clerk,
create accounts, submit resources, or exercise any other mutating flow. It also
scans every captured payload in raw and percent-decoded form for common PII
fields and email-shaped values.

The smoke command requires an explicit `--base-url` (or `BASE_URL`) when
targeting a non-local site. It exits non-zero if consent gating, GA4 delivery,
INP delivery, or the PII scan fails. The full validator remains the development
check for the broader event taxonomy and auth flows.

The GitHub Pages release workflow runs this smoke automatically after
`deploy-pages` succeeds, passing the deployment action's exact `page_url`.
The workflow uploads `ga4-smoke-evidence-<run id>` even when an assertion fails,
then marks the workflow failed without rolling back or mutating the published
site. The report records both the published URL and the workflow run URL.

The validator prints event counts, per-assertion results, and sample decoded
payloads to stdout (and any output paths it is configured with at run time).
