# Analytics and consent

A first-time visitor sees a consent banner. Nothing reaches GA4, Mixpanel, PostHog or Amplitude before "Allow analytics"; after it, page views and catalog events reach them through one shared sender. Decline stops everything and clears identifiers. Admin sessions and QA paths send nothing to any vendor.

## Sub-features

- AC-BANNER: banner placement per width; `consent-accept`, `consent-decline`; footer "Cookie settings" reopens it.
- AC-PRE: zero vendor requests before a choice.
- AC-EVENTS: after consent, catalog events carry the documented properties (`docs/ANALYTICS.md`).
- AC-DECLINE: decline/revoke stops vendors and clears `_ga*` and SDK storage.
- AC-ADMIN: an admin session (including a cold landing) sends zero vendor requests.
- AC-VITALS: `performance` events carry lcp, inp, cls, fcp, ttfb.

## How to get to it (user POV)

- Any page in a fresh context shows the banner.
- Footer "Cookie settings" reopens it.

## Driving it with chrome-devtools MCP

Preconditions: a fresh guest context per sub-feature; a separate admin context for AC-ADMIN.

- **Banner.** Fresh context on `/` at each width: 1440/820 the banner is a sticky bottom row and does not cover the footer; 390 it sits in flow at the top. Take a screenshot.
- **Before consent.** Navigate three pages; `list_network_requests` (include `fetch`, `xhr`, `ping`, `other`) shows no request to `api-js.mixpanel.com/track`, `*.amplitude.com/2/httpapi`, `us.i.posthog.com/(e|batch|i/v0/e)`, or `/g/collect`.
- **After consent.** Click `consent-accept`; perform the action under test; wait 15 s; `get_network_request` on the Mixpanel `/track` and Amplitude `/2/httpapi` requests with `requestFilePath` under `.local/verify-evidence/`; gunzip and read the event name and properties. Count Mixpanel by distinct `$insert_id`.
- **Decline.** Footer "Cookie settings" → Decline → `document.cookie` has no `_ga`; further navigation makes no vendor requests.
- **Admin.** Sign in as admin in its own context with consent granted; navigate and click; then open a new page straight onto `/resource/1` (cold landing). Zero vendor requests throughout; `localStorage['umami.disabled']` is set. Sign out → the marker is cleared and visitor tracking resumes.

## Gotchas

- PostHog sends nothing from automation browsers (bot filter); GA4 is off locally (no measurement id); the Replit Umami tracker exists only on the published site. Record those as owner steps, not passes.
- The sanitizer drops property keys containing email, token, secret, phone or password.
- Same-origin Vite module URLs such as `/src/lib/mixpanel.ts` match naive vendor regexes; exclude the app origin.
- After piece A merges, update the admin-suppression marker name and the `surface` properties here.
