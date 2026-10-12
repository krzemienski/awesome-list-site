---
name: Verifying analytics events in a headless browser
description: Vendor quirks that make real-network analytics checks look broken (PostHog bot filter, Mixpanel resends, sanitizer key drops).
---

- **PostHog drops headless traffic silently.** Even with a normal UA string, posthog-js flags the viewer as a bot via `navigator.webdriver` and `navigator.userAgentData.brands` (HeadlessChrome) — the only trace is a debug console line "viewer is a likely bot", and no `/e/` request is ever made. Override both on `Navigator.prototype` in an init script.
- **Mixpanel resends persisted batches.** Its localStorage queue re-sends earlier batches after full-page navigations (also with a correct `{"status":1}` stub). Count by unique `$insert_id` (Mixpanel dedupes on it), never raw transmissions. Body = gzip → `data=<urlencoded JSON>` (not base64).
- **The shared sanitizer drops any property key containing `email`** (also `token`, `secret`, `phone`, `password`) — e.g. `email_digest_turned_off` vanished from all four vendors. Name keys around it (`digest_turned_off`).
- Intercept only ingestion endpoints (`us.i.posthog.com/(e|i/v0/e|batch)/`, GA `/g/collect`, `api-js.mixpanel.com/track`, Amplitude `/2/httpapi`); a loose regex also matches `us-assets.i.posthog.com/static/*` and breaks the SDK extensions.
- Clerk sign-in ticket: wait until the page leaves `/sign-in` on its own before any `goto`, or the session is lost (navigating early leaves you signed out).

**Why:** each of these cost a verification rerun that looked like an app bug.
**How to apply:** any task that proves "event fires once per vendor after consent" in a real browser.
