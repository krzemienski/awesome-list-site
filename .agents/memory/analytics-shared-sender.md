---
name: Analytics shared sender + product-SDK keys
description: How custom events reach GA4/Mixpanel/PostHog/Amplitude, where the product keys must live, and traps when verifying on the real network.
---

**Rule:** every custom event goes through the module-private `track()` in analytics.ts (typed helpers only). Product events also fan out to Replit Analytics (platform-injected Umami, prod only) — except page_viewed, which Umami counts itself. Never call a vendor dispatcher from a component, never rename a live event; the catalog in docs/ANALYTICS.md is where names are decided.
**Why:** one hygiene pass for four vendors; renames start new series in Mixpanel/Amplitude.

**Rule:** GA4 page context (page_location/page_path/page_referrer) obeys the same no-token rule as event props — only utm_* and ad click ids survive in the URL.
**Why:** a code review rejected "full URL for attribution" as an exception: reset/auth tokens in query strings would reach GA4. gtag also auto-collects document.location, so the sanitized context must be pinned with gtag('set').

**Rule:** product-SDK keys are project-level shared VITE_* env vars, never a gitignored .env under client/.
**Why:** vite `envDir` is the repo root, so client/.env was silently ignored and three of four vendors were off; gitignored files never merge from task envs either.

**Verification traps:** `@playwright/test` may not be installed — then use plain `playwright` with `executablePath` pointing at `.cache/ms-playwright/chromium_headless_shell-*/…/chrome-headless-shell`; in DEV PostHog drops headless traffic unless `opt_out_useragent_filter` is set; GA bodies are URL-encoded, Mixpanel/PostHog bodies gzipped; a PostHog batch queued before a revoke can land just after it — inspect contents before calling it a leak.

**Rule:** post-consent vendor config (init options, URL scrubbers, Amplitude product plugins, identity props) lives in the lazy `analytics-sdk-options` chunk, imported alongside each SDK; wrappers keep only consent/queue/teardown state.
**Why:** enabling the keys stopped dead-code elimination of vendor init code and grew the pre-consent initial bundle by ~3 KiB gzip; keep any new entry-reachable analytics code lazy. `if (!key)` branches are already stripped when keys are set — shrinking them saves nothing.

**Counting "fires once":** raw request counts over-count — GA and Mixpanel re-send the same batch (same `$insert_id` / GA hit key), so dedupe by insert id before calling something a double fire; Amplitude's `/2/httpapi` is the cleanest ground truth. PostHog sends nothing from headless Chromium in DEV even with a desktop UA override (only `us-assets` loads). Featured home cards are empty in dev, so the home card surface can only be exercised via the recent rail there.
**Replay text capture:** PostHog replay masks all text (`maskTextSelector: '*'`), but the Amplitude session-replay plugin uses defaults — on-screen display names, resource titles and API key labels land in `api-sr.amplitude.com` bodies (inputs stay masked, so the one-time key secret did not leak).

**Full-page navigation resends:** Mixpanel re-sends a batch interrupted by `window.location.href` (e.g. onboarding skip), so raw counts double — same `$insert_id`, not a double fire.

**Rule:** guest-only events must wait for auth to settle (`useAuth().isLoading` false). Guest queries gated on `!isAuthenticated` also run while the session is resolving, so signed-in loads emitted a phantom guest event.

**Rule (owner decision, 2026-10-22):** Replit Analytics gets custom events (incl. `performance` web vitals) while consent is UNSET; only an explicit Decline stops it. GA4/Mixpanel/PostHog/Amplitude stay grant-only. The banner names only those four; the privacy policy's Analytics section describes the Replit behaviour — keep both in sync if this changes. `search_term` is never sent to Replit.
**Why:** almost nobody answers the banner, so a fully consent-gated sender gave ~2% custom-event coverage in Replit Analytics; the tracker is cookie-free and the events carry no identity.

**Rule (2026-10-23):** key outcomes that Mixpanel gets from the SERVER (`sign_up_completed`, `resource_submitted`) are sent from the client with `product: false, replit: true` — Replit Analytics has no server feed, and enabling `product` would double-count Mixpanel. `page_not_found` (path only, never query) and `site_error` (type only, never message) also go to Replit pre-consent; `page_engaged` deliberately does not (Umami computes duration).
**Server conversions need the consent header ON the request that fires them:** only the submit request attaches `serverConversionHeaders()`; the Clerk JIT request that provisions a new account carries none, so server `sign_up_completed` never reaches Mixpanel (code-confirmed 2026-10-23; the old Replit-OIDC consent hand-off was dropped in the Clerk migration).
**Verifying Replit events on prod:** `queryAppAnalytics` sees events within seconds — filter by `created_at` window + `os='Linux'` (tester) and join `event_data` for props. Headless tester traffic IS recorded (UA is not HeadlessChrome).
**Verifying Replit events in dev:** the tracker is prod-only. Do not stub `window.umami`: the owner's no-stubs rule (no-validation-tooling.md) forbids it. Record Replit events as an owner step after publishing. Admin sessions and QA paths (`/qa-*`, all-nines resource ids, `/sign-in?admin`) send nothing to any vendor, so run analytics checks as a guest (analytics-suppression.ts, Oct 2026). Dev UI sign-up hits a Cloudflare bot challenge — create the QA user via the Clerk backend and verify sign-in instead (sign-in tickets were rejected; password sign-in on 127.0.0.1:5000 worked).

**Rule (Oct 2026, PR #28): early events are held, not dropped.** With consent already granted, the landing `page_viewed` fires at React mount but the vendor SDKs start after first paint. Each wrapper (Mixpanel, PostHog, Amplitude, GA4) now holds up to 100 events while `vendorSdksAllowed()` is true and its SDK is not ready, then flushes them; nothing is held before consent, after Decline, or while suppressed (admin marker, QA paths). Before this, returning consented visitors' landing page views never reached the product tools.

**Rule: the admin marker is shared by every tab; SDK state is per tab.** Stop decisions are per tab (`vendorsStoppedForAdmin` in useAuth), not "the marker changed", and Amplitude's replay/Guides transports refuse while `isAnalyticsSuppressed()`.
