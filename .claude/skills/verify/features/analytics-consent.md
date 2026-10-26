# Analytics and consent

A first-time visitor sees a consent banner. Nothing reaches GA4, Mixpanel, PostHog or Amplitude before "Allow analytics"; after it, page views and catalog events reach them through one shared sender. Decline stops those four vendors and clears identifiers; on the published site the cookieless Replit (Umami) tracker keeps counting page views. Admin sessions and QA paths send nothing to any vendor.

## Sub-features

- AC-BANNER: sticky bottom placement at every width; `consent-accept`, `consent-decline`; footer "Cookie settings" reopens it.
- AC-PRE: zero GA4, Mixpanel, Amplitude and PostHog requests before a choice. On production the cookieless Replit tracker still sends page views to `i.replit.com/api/send`; those are expected unless `localStorage['umami.disabled']` is set.
- AC-EVENTS: after consent, catalog events carry the documented properties (`docs/ANALYTICS.md`).
- AC-DECLINE: decline/revoke stops vendors and clears `_ga*` and SDK storage.
- AC-ADMIN: an admin session (including a cold landing) sends zero vendor requests.
- AC-VITALS: `performance` events carry lcp, inp, cls, fcp, ttfb. CLS and INP are sent only when the page goes hidden (`visibilitychange` to `hidden`), which a headless tab never fires. Prove them in a headed browser by switching to another tab; otherwise report them UNVERIFIED.

## How to get to it (user POV)

- Any page in a fresh context shows the banner.
- Footer "Cookie settings" reopens it.

## Driving it with chrome-devtools MCP

Preconditions: a fresh guest context per sub-feature; a separate admin context for AC-ADMIN.

- **Banner.** Fresh context on `/` at each width: the banner is the last row of the page, pinned to the viewport bottom at 1440, 820 and 390 alike. Scroll to the end: the footer, or on an admin tab the last table row and its action buttons, ends fully above the banner's top edge. Back-to-top and toasts sit above the banner. The first Tab stop is still "Skip to main content", and the banner's controls come after the page content. Take a screenshot.
- **Before consent.** Navigate three pages; `list_network_requests` (include `fetch`, `xhr`, `ping`, `other`) shows no request to `api-js.mixpanel.com/track`, `*.amplitude.com/2/httpapi`, `us.i.posthog.com/(e|batch|i/v0/e)`, or `/g/collect`. On production, `i.replit.com/api/send` page views are expected here regardless of consent; they stop only when `localStorage['umami.disabled']` is set. Count them separately and never as a consent failure.
- **After consent.** Click `consent-accept`; perform the action under test; wait 15 s; `get_network_request` on the Mixpanel `/track` and Amplitude `/2/httpapi` requests with `requestFilePath` under `.local/verify-evidence/`; gunzip and read the event name and properties. Count Mixpanel by distinct `$insert_id`.
- **Decline.** Footer "Cookie settings" → Decline → `document.cookie` has no `_ga`; further navigation makes no vendor requests.
- **Admin.** Sign in as admin in its own context with consent granted; navigate and click; then open a new page straight onto `/resource/1` (cold landing). Zero vendor requests throughout; `localStorage['umami.disabled']` is set. Sign out → the marker is cleared and visitor tracking resumes.

## Gotchas

- PostHog: posthog-js drops every event while `navigator.webdriver` is true (and on a HeadlessChrome user agent). With those overridden in the `initScript`, read the request bodies with `get_network_request` (never by patching `fetch` in the page) and report them as "emitted". Ingestion and dashboards stay an owner step (`../SKILL.md` Evidence).
- GA4 is off locally (no measurement id), and the Replit Umami tracker exists only on the published site. Record those as owner steps, not passes.
- Denied consent does not stop the Umami tracker on the published site, because it is cookieless. A production sweep that is not testing analytics sets `localStorage['umami.disabled']='1'` as well, and its report gives the owner the QA time windows.
- The sanitizer drops property keys containing email, token, secret, phone or password.
- Same-origin Vite module URLs such as `/src/lib/mixpanel.ts` match naive vendor regexes; exclude the app origin.
- After piece A merges, update the admin-suppression marker name and the `surface` properties here.
