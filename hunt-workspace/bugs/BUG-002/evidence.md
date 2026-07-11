# BUG-002 — Google Analytics 4 endpoint unreachable (Fetch API error)

**Severity:** MEDIUM
**Affected page:** every page that fires a GA4 event
**Affected viewport:** all

## Reproduction
1. Open https://awesome.video/ in a fresh chromium.
2. Open DevTools Network tab.
3. Click any link or trigger any interaction. Watch for failed GA4 hits.
4. Inspect the Response: `Fetch API cannot load https://www.google.com/g/collect?v=2&tid=G-76D744KQCJ...` and `Connecting to 'https://www.google.com/g/collect?...'` errors.

## Expected
Google Analytics 4 events (pageviews, clicks) flow to GA4 measurement ID `G-76D744KQCJ`. The site operator can see traffic in the GA dashboard.

## Actual
On 11+ distinct pageview contexts during the crawl, GA4 endpoints fail with `Fetch API cannot load https://www.google.com/g/collect?...`. The site loses real-user analytics. This is observable in Network panel (status 0 / opaque response) and in console (`Connecting to` / `Fetch API cannot load` warnings).

## Evidence
- crawl-results.json: console errors include `Connecting to 'https://www.google.com/g/collect?v=2&tid=G-76D744KQCJ...'` (4 occurrences)
- sweep-summary.json: same `Fetch API cannot load https://www.google.com/g/collect?...` on multiple GA4 events
- Direct curl from the host: `curl -I 'https://awesome.video/'` shows the GA tag was injected but events fail.

## Fix prompt

```
Task: GA4 measurement ID G-76D744KQCJ is failing to send events from
https://awesome.video/. Reproduction: load /, /submit, /login in a fresh
chromium and observe the Network panel — hits to
https://www.google.com/g/collect?v=2&tid=G-76D744KQCJ... return zero-byte
or never connect; the console shows
  Fetch API cannot load https://www.google.com/g/collect...
  Connecting to 'https://www.google.com/g/collect...'
Verify with Playwright:
  await ctx.request.get('https://awesome.video/');
  // open DevTools in headed mode and observe Network panel
Causes to check:
  (1) Content-Security-Policy `connect-src` may not allow www.google.com;
      inspection of the response header shows
        connect-src 'self' https://*.google-analytics.com https://...
      but does NOT include https://www.google.com — GA4 endpoint is
      *.google-analytics.com only, the actual endpoint is *.google.com.
  (2) Browser blocking third-party cookies (Chrome SameSite/Secure).
  (3) Network egress blocked by corporate proxy.
Fix: extend connect-src to include https://*.google.com (GA4 Measurement
Protocol endpoint), and verify with a Playwright test that the GA4 hit
returns 200/204.
```
