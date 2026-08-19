# Mixpanel Tracking Plan

Mixpanel runs **alongside GA4** (see `ANALYTICS.md`) using the `mixpanel-browser`
npm SDK. Most events are client-side; the two **critical conversion events**
(`sign_up_completed`, `resource_submitted`) are emitted **server-side** (Task
#233) so ad blockers can't undercount them — see "Server-side conversions"
below.

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
| `sign_up_completed` | Account created (server-confirmed) | `sign_up_method` (`'password'` \| `'replit'`), acquisition, `tracked_from: 'server'` | **server** — register handler (`server/routes.ts`) + OIDC callback (`server/replitAuth.ts`) |
| `logged_in` | Login succeeded | `login_method`, acquisition | `trackLogin` |
| `resource_bookmarked` / `resource_unbookmarked` | Bookmark toggle server-confirmed | `resource_id` | `useResourceToggle` (choke point, all surfaces) |
| `resource_favorited` / `resource_unfavorited` | Favorite toggle server-confirmed | `resource_id` | `useResourceToggle` |
| `resource_submitted` | Resource submission accepted | `content_type`, `category`, acquisition, `tracked_from: 'server'` (no PII) | **server** — resource-submit handler (`server/routes.ts`) |
| `resource_edit_submitted` | Edit suggestion accepted | `resource_id` | `suggest-edit-dialog` |
| `content_shared` | Share action | `share_method`, `content_type`, `content_id` | `trackShare` |
| `journey_started` | Genuinely new enrollment (listing one-click start or detail start button; resume re-POSTs never re-fire) | `journey_id`, `journey_title`, `total_steps` | `lib/analytics.ts trackJourneyStart` (Task #330) |
| `journey_step_completed` / `journey_step_uncompleted` | Logical journey step toggled (server-confirmed; one event per logical step, not per row) | `journey_id`, `journey_title`, `step_number`, `step_position`, `total_steps`, `step_row_count` (uncompleted omits `step_position`/`total_steps`) | `JourneyDetail` via `trackJourneyStepComplete` / inline `mpTrack` |
| `journey_completed` | Server-confirmed `completedAt` transition null → set (PUT progress response; never re-fired for already-complete journeys) | `journey_id`, `journey_title`, `total_steps` | `JourneyDetail` via `trackJourneyComplete` (Task #330) |

All events also carry auto props `platform: 'web'` and `page_path` from `mpTrack`.

## Server-side conversions (ad-blocker-proof)

Ad blockers block `api-js.mixpanel.com` for a large share of technical
audiences, undercounting client-only conversions. The fix (Task #233):

- **Module**: `server/lib/mixpanelServer.ts` — `trackServerEvent()` posts to
  Mixpanel's HTTP ingestion API (`api.mixpanel.com/track`) fire-and-forget.
- **Events**: `sign_up_completed` (register handler) and `resource_submitted`
  (resource-submit handler) are emitted **only** server-side. The client
  helpers (`trackSignUp` / `trackGenerateLead`) still fire the GA4 halves but
  deliberately no longer call `mpTrack` for these — one producer per event, so
  there is nothing to dedup. Server events carry `tracked_from: 'server'` and
  a unique `$insert_id` (Mixpanel's retry-dedup key).
- **Consent**: the server only tracks when the request carries
  `x-analytics-consent: granted`, attached by `serverConversionHeaders()`
  (`client/src/lib/mixpanel.ts`) from the same localStorage gate the browser
  SDKs use. No consent → no header → no server event.
- **Acquisition**: the client also forwards its first-touch acquisition record
  (`utm_*` + `referrer_domain` from `getAcquisition()`, PII-free) as a compact
  JSON header `x-mixpanel-acquisition`. The server validates it strictly
  (allowlisted keys only, values capped at 100 chars, header capped at 1&nbsp;KB)
  and merges the props onto the two conversion events — so they keep the same
  acquisition properties the client-side events carried before Task #233.
- **Identity**: the client also passes its current Mixpanel distinct_id via
  `x-mixpanel-distinct-id`; the server falls back to the immutable DB user id
  (the same id `mpIdentify()` uses) when the header is absent.
- **Token**: server reads `MIXPANEL_TOKEN` (optional server-only override) or
  the shared `VITE_MIXPANEL_TOKEN` from env — never hardcoded, never shipped
  in any new client code.
- **Replit OIDC sign-ups (Task #235)**: first-time Replit-login account
  creation also fires `sign_up_completed` (`sign_up_method: 'replit'`) from
  the OIDC verify callback (`server/replitAuth.ts`). The redirect flow can't
  carry custom headers, so right before navigating to `/api/login` the client
  POSTs its consent state to `/api/auth/oidc-analytics-consent` via
  `primeOidcAnalyticsConsent()` (`client/src/lib/mixpanel.ts`), reusing the
  same consent/distinct-id headers as the register path. The endpoint is
  CSRF-safe (same-origin check + custom headers) and authoritative: no
  consent → flags cleared → no event. The verify callback consumes the flags
  one-shot with a 15-minute TTL and emits only when the upsert **atomically**
  reports it created the account (`xmax = 0`), so subsequent logins and
  retried callbacks never fire it. Account creation is confirmed
  server-side, so the event is emitted regardless of ad blockers.

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
