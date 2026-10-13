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

## Counting events when a navigation follows quickly
Rule: when a navigation happens within a few seconds of an event, Mixpanel and GA4 can retransmit the in-flight batch (the Mixpanel copy has the SAME `$insert_id`), so a single `track()` call shows up as two network events. Amplitude kept one copy.

**Why:** a contribution-withdraw check showed 2 Mixpanel + 2 GA hits but 1 Amplitude hit; a rerun that waited 15 s before navigating showed exactly 1 everywhere. It was a vendor retransmit, not the app firing twice.

**How to apply:**
- Count Mixpanel events by distinct `$insert_id`, or wait ~15 s after the action before navigating.
- Amplitude `/2/httpapi` and Mixpanel `/track` bodies are both gzipped; decode with `postDataBuffer()` + `gunzipSync`.
- Same-origin Vite module URLs (`/src/lib/mixpanel.ts`) match vendor-name regexes; exclude the app origin before claiming "zero vendor traffic before consent".
- PostHog `/e/` stays at 0 in automation browsers (bot filter), which is expected.
- Backend-minted Clerk session JWTs sent as Bearer or `__session` to 127.0.0.1 did not authenticate in this run. A sign-in token via `/sign-in?__clerk_ticket=` in the browser did work.
