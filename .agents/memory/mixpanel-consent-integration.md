---
name: Mixpanel consent-gated integration
description: Gotchas for the consent-gated mixpanel-browser setup (pre-consent footprint, $opt_in noise, gzipped payloads).
---

# Mixpanel consent-gated integration

- **Rule**: any "zero pre-consent" analytics SDK must be **dynamic-imported after consent**, not statically imported — mixpanel-browser's module code registers globals as a side effect at bundle evaluation even if `init()` is never called.
  **Why:** architect review flagged the static import as a consent violation; consent gates on `init()` alone don't stop module side effects.
  **How to apply:** keep all SDK access behind `client/src/lib/mixpanel.ts`'s lazy loader; buffer events fired while the chunk loads.
- `mixpanel.opt_in_tracking()` fires a `$opt_in` EVENT every call — guard with `has_opted_out_tracking()` or every page load emits noise.
- Never send `pathname + search` or full `document.referrer` as event props — query strings carry reset-password tokens; send pathname + referrer origin only.
- Mixpanel `/track` request bodies are **gzipped** form data (`data=` base64/JSON inside); to decode in Playwright use `request.postDataBuffer()` + `gunzipSync`, not `postData()`.
- Dev-mode SDK batches sends with multi-second delays — E2E asserts need ~6-7s waits or they false-fail with "no events".

## Server-side conversions (July 2026)
- The two critical conversions (sign_up_completed, resource_submitted) are emitted ONLY server-side via Mixpanel's HTTP ingestion API; the client deliberately does not send them — re-adding a client emit double-counts.
- Consent must travel with the conversion request itself (an explicit granted signal from the same gate the browser SDKs use); no signal → the server must not track.
- Mixpanel /track `time` is Unix SECONDS, not ms — a ms timestamp lands events millennia in the future / fails ingestion.
