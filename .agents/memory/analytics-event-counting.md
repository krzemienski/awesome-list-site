---
name: Counting analytics events in real browser runs
description: How to decide whether an event "fired once" when verifying analytics with Playwright network capture.
---

Rule: when a navigation happens within a few seconds of an event, Mixpanel and GA4 can retransmit the in-flight batch (the Mixpanel copy has the SAME `$insert_id`), so a single `track()` call shows up as two network events. Amplitude kept one copy.

**Why:** a contribution-withdraw check showed 2 Mixpanel + 2 GA hits but 1 Amplitude hit; a rerun that waited 15 s before navigating showed exactly 1 everywhere. It was a vendor retransmit, not the app firing twice.

**How to apply:**
- Count Mixpanel events by distinct `$insert_id`, or wait ~15 s after the action before navigating.
- Amplitude `/2/httpapi` and Mixpanel `/track` bodies are both gzipped; decode with `postDataBuffer()` + `gunzipSync`.
- Same-origin Vite module URLs (`/src/lib/mixpanel.ts`) match vendor-name regexes; exclude the app origin before claiming "zero vendor traffic before consent".
- PostHog `/e/` stays at 0 in automation browsers (bot filter), which is expected.
- Backend-minted Clerk session JWTs sent as Bearer or `__session` to 127.0.0.1 did not authenticate in this run. A sign-in token via `/sign-in?__clerk_ticket=` in the browser did work.
