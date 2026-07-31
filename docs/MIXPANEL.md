# Mixpanel Tracking Plan

Mixpanel runs **alongside GA4** (see `ANALYTICS.md`) using the `mixpanel-browser`
npm SDK. Client-side only; server-side tracking is future work.

## Architecture

- **Module**: `client/src/lib/mixpanel.ts` — init, consent gate, `mpTrack()`
  dispatcher, identity helpers. All Mixpanel calls funnel through this module.
- **Zero pre-consent footprint**: the SDK is loaded via **dynamic import** only
  after consent — no SDK module code executes, no chunk is fetched, no cookies,
  no network before "Accept". Events fired while the chunk loads are buffered.
- **Privacy**: `page_path` is sent **without query strings** (URLs can carry
  tokens, e.g. password-reset links); referrer is reduced to its origin.
- **Consent (EU/CA compliance)**: shares the GA gate (`analytics-consent` in
  localStorage). `initMixpanel()` no-ops until consent is `granted`; the consent
  banner calls it after "Accept" and `optOutMixpanel()` on decline/revoke.
  Belt-and-braces: the SDK initializes with `opt_out_tracking_by_default: true`
  and only opts in post-consent. **Zero Mixpanel network traffic pre-consent.**
- **Token**: `VITE_MIXPANEL_TOKEN` env var (public client token, never hardcode).
- **CSP**: `server/index.ts` allowlists `api-js.mixpanel.com` / `api.mixpanel.com`
  (connect-src) and `cdn.mxpnl.com` (script-src).
- **Identity**: `mpIdentify()` fires from `useAuth` on login *and* session
  restore (identified by immutable DB user id, never email); `mpReset()` on
  logout. People properties set deliberately: `$name`, `$email`, `role`,
  `$created`, first-touch acquisition.

## Naming convention

- **Events**: `snake_case`, `object_action` in past tense — `resource_viewed`,
  `search_performed`. Never rename a live event (creates a new event in
  Mixpanel); never track inside loops; no PII in event properties.
- **Properties**: `snake_case`; ids as strings; enums documented here.

## Events

| Event | Fired when | Properties | Source |
|---|---|---|---|
| `page_viewed` | Every SPA navigation (single source, exactly once) | `page_path`, `page_title`, `referrer_origin` | `lib/analytics.ts trackPageView` via `use-analytics` |
| `resource_viewed` | Resource detail opened | `resource_id`, extras from caller | `trackSelectContent('resource', …)` |
| `resource_link_opened` | Outbound resource link clicked | `resource_title`, `link_url`, `link_domain`, `category` | `trackResourceClick` |
| `search_performed` | Search executed with results | `search_term`, `result_count` | `trackSearch` |
| `category_viewed` | Category navigation | `category` | `trackCategoryView` |
| `sign_up_completed` | Account created (post-server-confirm) | `sign_up_method`, acquisition | `trackSignUp` |
| `logged_in` | Login succeeded | `login_method`, acquisition | `trackLogin` |
| `resource_bookmarked` / `resource_unbookmarked` | Bookmark toggle server-confirmed | `resource_id` | `useResourceToggle` (choke point, all surfaces) |
| `resource_favorited` / `resource_unfavorited` | Favorite toggle server-confirmed | `resource_id` | `useResourceToggle` |
| `resource_submitted` | Resource submission accepted | form metadata, acquisition (no PII) | `trackGenerateLead` |
| `resource_edit_submitted` | Edit suggestion accepted | `resource_id` | `suggest-edit-dialog` |
| `content_shared` | Share action | `share_method`, `content_type`, `content_id` | `trackShare` |
| `journey_step_completed` / `journey_step_uncompleted` | Logical journey step toggled (server-confirmed; one event per logical step, not per row) | `journey_id`, `step_row_count` | `JourneyDetail` |

All events also carry auto props `platform: 'web'` and `page_path` from `mpTrack`.

## Adding a new event

1. Add it to the table above (name per convention, properties documented).
2. Track at the **server-confirmed** success point (mutation `onSuccess`), not
   on button click, via `mpTrack()` — prefer an existing choke point
   (`lib/analytics.ts` helper or shared hook) over per-surface wiring.
3. Add a Lexicon description in Mixpanel (Data Management → Lexicon).

## Mixpanel project

- Token env var: `VITE_MIXPANEL_TOKEN` (shared env).
- Verify events in Mixpanel → Events (Live View): filter by your test user.
- Governance (manual, in Mixpanel UI): enable Data Standards + Event Approval
  under Project Settings → Data Governance; add Lexicon descriptions per event.
