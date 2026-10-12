---
name: Analytics shared sender + product-SDK keys
description: How custom events reach GA4/Mixpanel/PostHog/Amplitude, where the product keys must live, and traps when verifying on the real network.
---

**Rule:** every custom event goes through the module-private `track()` in analytics.ts (typed helpers only). Never call a vendor dispatcher from a component, never rename a live event; the catalog in docs/ANALYTICS.md is where names are decided.
**Why:** one hygiene pass for four vendors; renames start new series in Mixpanel/Amplitude.

**Rule:** GA4 page context (page_location/page_path/page_referrer) obeys the same no-token rule as event props — only utm_* and ad click ids survive in the URL.
**Why:** a code review rejected "full URL for attribution" as an exception: reset/auth tokens in query strings would reach GA4. gtag also auto-collects document.location, so the sanitized context must be pinned with gtag('set').

**Rule:** product-SDK keys are project-level shared VITE_* env vars, never a gitignored .env under client/.
**Why:** vite `envDir` is the repo root, so client/.env was silently ignored and three of four vendors were off; gitignored files never merge from task envs either.

**Verification traps:** use `@playwright/test`'s browser (plain `playwright` resolves an uninstalled revision); in DEV PostHog drops headless traffic unless `opt_out_useragent_filter` is set; GA bodies are URL-encoded, Mixpanel/PostHog bodies gzipped; a PostHog batch queued before a revoke can land just after it — inspect contents before calling it a leak.

**Rule:** post-consent vendor config (init options, URL scrubbers, Amplitude product plugins, identity props) lives in the lazy `analytics-sdk-options` chunk, imported alongside each SDK; wrappers keep only consent/queue/teardown state.
**Why:** enabling the keys stopped dead-code elimination of vendor init code and grew the pre-consent initial bundle by ~3 KiB gzip; keep any new entry-reachable analytics code lazy. `if (!key)` branches are already stripped when keys are set — shrinking them saves nothing.

**Counting "fires once":** raw request counts over-count — GA and Mixpanel re-send the same batch (same `$insert_id` / GA hit key), so dedupe by insert id before calling something a double fire; Amplitude's `/2/httpapi` is the cleanest ground truth. PostHog sends nothing from headless Chromium in DEV even with a desktop UA override (only `us-assets` loads). Featured home cards are empty in dev, so the home card surface can only be exercised via the recent rail there.
**Replay text capture:** PostHog replay masks all text (`maskTextSelector: '*'`), but the Amplitude session-replay plugin uses defaults — on-screen display names, resource titles and API key labels land in `api-sr.amplitude.com` bodies (inputs stay masked, so the one-time key secret did not leak).
