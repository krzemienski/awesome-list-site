# Mixpanel Tracking Plan

Mixpanel runs **alongside GA4** (see `ANALYTICS.md`) using the `mixpanel-browser`
npm SDK. Most events are client-side; the two **critical conversion events**
(`sign_up_completed`, `resource_submitted`) are emitted **server-side** (Task
#233) so ad blockers can't undercount them — see "Server-side conversions"
below.

## Architecture

- **Module**: `client/src/lib/mixpanel.ts` — init, consent gate, `mpTrack()`
  (the Mixpanel half of the shared sender), identity helpers. All Mixpanel
  calls funnel through this module.
- **Shared sender**: app code never calls `mpTrack()` directly. Custom events go
  through the typed helpers in `lib/analytics.ts` → `track()` → the shared
  dispatcher (`lib/analytics-dispatch.ts`), which cleans properties once and
  sends the same event to GA4, Mixpanel, PostHog and Amplitude. The usage
  questions, funnels, naming rules, property hygiene and the **shared event
  catalog** live in `ANALYTICS.md` → "Tracking plan"; this file keeps the
  Mixpanel-specific details.
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

Defined once in `ANALYTICS.md` → "Tracking plan → Naming rules": `snake_case`
`object_action` in the past tense, never rename a live event, ids as strings,
no PII (enforced by the shared sender's property hygiene).

## Events

| Event | Fired when | Properties | Source |
|---|---|---|---|
| `page_viewed` | Every SPA navigation (single source, exactly once) | `page_path`, `page_title`, `referrer_origin` | `lib/analytics.ts trackPageView` via `use-analytics` |
| `resource_viewed` | Resource detail opened | `resource_id`, extras from caller | `trackSelectContent('resource', …)` |
| `resource_link_opened` | Outbound resource link clicked (palette, detail page, resource / taxonomy / home cards) | `resource_title`, `link_url`, `link_domain`, `category`, `surface` | `trackResourceClick` |
| `resource_card_opened` | Card title / View Details clicked → detail page | `resource_id`, `surface`, `card_control` | `trackResourceCardOpened` |
| `search_performed` | Search executed with results | `search_term`, `result_count` | `trackSearch` |
| `category_viewed` | Category / subcategory / sub-subcategory page, once per resolved node | `category` | `TaxonomyListing` via `trackCategoryView` |
| `sign_up_completed` | Clerk user is first provisioned into the application DB | `sign_up_method: 'clerk'`, acquisition, `tracked_from: 'server'` | **server** — Clerk JIT provisioning (`server/clerkAuth.ts`) |
| `logged_in` | A Clerk sign-in attempt completes and produces a session (never on a session restore or token refresh) | `login_method` (verification strategy), acquisition | `AuthConversionTracker` via `trackLogin` |
| `resource_bookmarked` / `resource_unbookmarked` | Bookmark toggle server-confirmed | `resource_id` | `useResourceToggle` → `trackResourceSaveToggle` (choke point, all surfaces) |
| `resource_favorited` / `resource_unfavorited` | Favorite toggle server-confirmed | `resource_id` | `useResourceToggle` → `trackResourceSaveToggle` |
| `resource_submitted` | Resource submission accepted | `content_type`, `category`, acquisition, `tracked_from: 'server'` (no PII) | **server** — `routes/domains/catalog-contributions.ts` |
| `resource_edit_started` | Signed-in visitor opens the suggest-edit form | `resource_id`, `entry_point` (`resource_card` \| `resource_page`) | `suggest-edit-dialog` → `trackResourceEditStarted` (`lib/analytics-contributions.ts`) |
| `resource_edit_ai_analysis_requested` / `resource_edit_ai_suggestions_applied` | Confirmed AI analysis settles / its suggestions are applied | `resource_id`, `entry_point`, `outcome` / `applied_field_count` | `suggest-edit-dialog` |
| `resource_edit_cancelled` | Suggest-edit dialog closed without submitting | `resource_id`, `entry_point`, `form_changed`, `ai_suggestions_applied` | `suggest-edit-dialog` |
| `resource_edit_submitted` | Edit suggestion accepted | `resource_id`, `entry_point`, `changed_field_count`, `ai_suggestions_applied` | `suggest-edit-dialog` → `trackResourceEditSubmitted` |
| `contribution_*` / `contributions_page_changed` | Contributions page: filter changed or cleared, withdraw confirmed, page changed, public resource / submitted URL opened, submit CTA | ids, enums and counts only — see `ANALYTICS.md` catalog | `Contributions` → `lib/analytics-contributions.ts` |
| `content_shared` | Share action | `share_method`, `content_type`, `content_id` | `trackShare` |
| `journey_started` | Genuinely new enrollment (listing one-click start or detail start button; resume re-POSTs never re-fire) | `journey_id`, `journey_title`, `total_steps` | `lib/analytics.ts trackJourneyStart` (Task #330) |
| `journey_step_completed` / `journey_step_uncompleted` | Logical journey step toggled (server-confirmed; one event per logical step, not per row) | `journey_id`, `journey_title`, `step_number`, `step_position`, `total_steps`, `step_row_count` (uncompleted omits `step_position`/`total_steps`) | `JourneyDetail` via `trackJourneyStepComplete` / `trackJourneyStepUncomplete` |
| `journey_resumed` | Server-confirmed resume from Continue Learning or the home preview (never re-fires `journey_started`) | `journey_id`, `surface`, `has_next_step`, `progress_percent` | `useResumeJourney` → `trackJourneyResumed` |
| `continue_learning_cta_clicked` | Recent resource, review / find-another, suggested journey or empty-state CTA clicked | `cta`, `journey_id` / `resource_id` | `ContinueLearning` → `trackContinueLearningCtaClicked` |
| `journey_completed` | Server-confirmed `completedAt` transition null → set (PUT progress response; never re-fired for already-complete journeys) | `journey_id`, `journey_title`, `total_steps` | `JourneyDetail` via `trackJourneyComplete` (Task #330) |
| Collection events (`collection_created`, `collection_renamed`, `collection_deleted`, `collection_archived` / `collection_restored`, `collection_published` / `collection_unpublished`, `collection_shared`, `collections_reordered`, `collection_items_moved`, `collection_resource_added` / `collection_resource_removed`, `library_explore_clicked`, `public_collection_viewed`, `public_collection_resource_opened`, `public_collection_recovery_clicked`) | Server-confirmed collection actions on My Library, notes-dialog membership changes, and public collection page views/clicks | see the collection rows in `ANALYTICS.md` → "Shared event catalog" (ids and counts only; no collection names, no owner identity) | `lib/analytics-collections.ts` |
| `guest_bookmark_added` / `guest_bookmark_removed` | Signed-out visitor toggles an on-device save (Task #329 guest funnel) | `resource_id`, `guest_saved_count` | `useResourceToggle` guest branch |
| `auth_prompt_shown` | Save-intent sign-in prompt shown to a guest | `prompt_context` (`'guest_save_toast'` \| `'guest_save_cap'` \| `'bookmarks_page'`), `guest_saved_count` | toggle hook + `GuestBookmarks` page |
| `bookmarks_merged` | On-device guest saves pushed into the account after sign-in | `merged_count`, `duplicate_count`, `failed_count` | `GuestBookmarkMerge` |
| `recommendations_viewed` | Recommendations shown, once per surface load | `recommendation_count`, `signed_in`, `source`, `from_cache` | `lib/analytics-recommendations.ts` |
| `recommendations_refreshed` / `recommendations_retried` | Refresh / Try again started a request (no extra request) | `signed_in`, `source`, `recommendation_count` | `lib/analytics-recommendations.ts` |
| `recommendation_opened` | Recommended item opened | `resource_id`, `position`, `recommendation_type`, `signed_in`, `source`, `link_target` | `lib/analytics-recommendations.ts` |
| `recommendation_feedback_saved` / `recommendation_restored` | Feedback or restore server-confirmed | `resource_id`, `feedback`, `previous_feedback` (restore: `resource_id`) | `lib/analytics-recommendations.ts` |
| `recommendation_sign_in_clicked` | Guest sign-in CTA on a recommendation surface | `placement` | `lib/analytics-recommendations.ts` |
| `onboarding_step_viewed` / `onboarding_step_completed` / `onboarding_navigated_back` | Onboarding step shown / saved with Continue / Back | `step_number`, `step_name`, `total_steps` (back adds `to_step_number`) | `lib/analytics-recommendations.ts` ← `Onboarding` |
| `onboarding_skipped` | "Save and browse later" saved | `step_number`, `step_name`, `total_steps`, `answer_count`, `already_completed` | `lib/analytics-recommendations.ts` ← `Onboarding` |
| `onboarding_completed` | Final save confirmed | `answer_count`, choice values (`skill_level`, `time_commitment`, `topics`, `learning_goals`, `resource_formats`, `topic_count`), `already_completed` | `lib/analytics-recommendations.ts` ← `Onboarding` |
| `notification_preference_changed` | "Save choices" server-confirmed; one event per changed setting | `setting`, `value` (`on`/`off` or cadence; none for `timezone`) | `NotificationPreferencesCard` → `lib/analytics-notifications.ts` |
| `notifications_paused` / `notifications_resumed` / `notifications_unsubscribed_all` | Preferences quick action server-confirmed | paused: `pause_days`; unsubscribe: `digest_turned_off`, `in_app_turned_off` | `NotificationPreferencesCard` |
| `notification_opened` | Inbox notification link followed | `notification_id`, `notification_kind`, `was_unread` (never its text) | `Notifications` |
| `notification_marked_read` / `notifications_marked_all_read` | Read state server-confirmed | `notification_id`, `notification_kind`, `read_via` / `marked_count` | `Notifications` |
| `digest_preview_item_opened` | Settings digest preview item clicked | `notification_kind`, `digest_section`, `item_position` | `NotificationPreferencesCard` |
| `learning_preferences_saved` / `learning_preferences_reset` | Settings learning preferences saved / reset (server-confirmed; values never sent) | `surface`, saved: `first_save` | `Settings` |
| `command_palette_opened` | Search palette opens (closed → open) | `open_method` | `MainLayout` |
| `export_started` / `export_downloaded` | Export begun / file download triggered | `export_format`, `export_scope`, `category_count`, `resource_count` | `export-tools` |
| `api_key_created` / `api_key_copied` / `api_key_revoked` | API key created (server-confirmed) / secret copied / revoked (server-confirmed) — never the key | `expiry_option` / `copy_method` / — | `ApiKeysCard` |
| `profile_name_updated` | Display name saved (server-confirmed) — never the name | — | `Profile` |
| `logged_out` | Sign-out confirmed, sent before `mpReset()` | `logout_scope` | `useAuth`, `/logout` route |
| `account_deletion_dialog_opened` / `account_deletion_requested` / `account_deletion_withdrawn` | Deletion dialog opened / request submitted / withdrawn (last two server-confirmed) | — | `Profile` |
| `account_security_opened` | Security tab or account-security modal opened | `entry_point` | `Profile`, `AccountSecurityCard` |
| `home_layout_changed` | Home layout preference switched | `home_layout`, `previous_layout` | `use-home-layout` |
| `sidebar_toggled` | Sidebar toggled with ⌘/Ctrl+B | `toggle_method`, `sidebar_state`, `sidebar_mode` | `ui/sidebar` |

All events also carry auto props `platform: 'web'` and `page_path` from `mpTrack`.
Every client event in this table is also sent, with the same name and
properties, to PostHog and Amplitude by the shared sender.

## Server-side conversions (ad-blocker-proof)

Ad blockers block `api-js.mixpanel.com` for a large share of technical
audiences, undercounting client-only conversions. The fix (Task #233):

- **Module**: `server/lib/mixpanelServer.ts` — `trackServerEvent()` posts to
  Mixpanel's HTTP ingestion API (`api.mixpanel.com/track`) fire-and-forget.
- **Events**: `sign_up_completed` (Clerk JIT provisioning) and
  `resource_submitted` (resource-submit handler) are emitted **only**
  server-side. The client
  helpers (`trackSignUp` / `trackGenerateLead`) still fire the GA4 halves but
  are marked GA4-only (`product: false`) — one producer per event, so
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
- **Clerk sign-ups**: the first request that successfully creates the local
  Clerk bridge row emits `sign_up_completed` with `sign_up_method: 'clerk'`.
  Consent and acquisition arrive through the same validated request headers;
  existing users and failed email-collision provisioning do not emit it.

## Adding a new event

1. Follow `ANALYTICS.md` → "Tracking plan → Adding an event": catalog row +
   typed helper in `lib/analytics.ts` (or an area module such as
   `lib/analytics-notifications.ts`) calling `track()` (never `mpTrack()`
   directly), fired at the **server-confirmed** success point.
2. Add it to the table above if it matters for Mixpanel reports.
3. Add a Lexicon description in Mixpanel (Data Management → Lexicon).

## Mixpanel project

- Token env var: `VITE_MIXPANEL_TOKEN` (shared env).
- Verify events in Mixpanel → Events (Live View): filter by your test user.
- Governance (manual, in Mixpanel UI): enable Data Standards + Event Approval
  under Project Settings → Data Governance; add Lexicon descriptions per event.
