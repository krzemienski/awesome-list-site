# BUG-004 — No search input on public landing/mobile pages

**Severity:** HIGH
**Affected page:** https://awesome.video/ (homepage), and mobile (375) variants
**Affected viewport:** 1440×900, 375×812

## Reproduction
1. Open https://awesome.video/ in a fresh chromium at 1440×900.
2. Look for a search input anywhere on the page. There is no `input[type="search"]`, no placeholder "Search", no combobox.
3. Open https://awesome.video/ at 375×812 (mobile). Same result: no search input. The mobile navigation shows categories but no search affordance.
4. The only search input on the site is the "Search resources..." input inside the admin sidebar at /admin. End users cannot search.
5. As a result, the 1,946 curated resources are only navigable by clicking through the category tree.

## Expected
A search affordance on the public landing page (desktop + mobile) and probably in the global header. Pressing Enter (or clicking the icon) routes to a results page filtered by query. The site has 1,946 entries and exposes a /api/resources endpoint — so a search page exists internally but is unreachable from the public surface.

## Actual
No search input on /, no search on mobile, no search in the global header. The category tree is the only path.

## Evidence
- `screenshots/landing_search_check.png` — landing, no search input
- `screenshots/mobile_landing_search.png` — mobile landing, no search input
- `verify-findings.js` output: `SEARCH-CANDIDATES-LANDING: []` (no `<input>` whose placeholder/name/type=="search" matches /search|query|find|q/)
- `verify-findings.js` output: `MOBILE-SEARCH-INPUTS: []` (same on 375×812)

## Fix prompt

```
Task: Add a public-facing search input that lets users search the 1,946+
curated resources on https://awesome.video/. Today no <input type="search">,
<input placeholder="Search"> or combobox exists on the homepage at 1440
or 375 width. The site already exposes a /api/resources endpoint and has
a /resource?q=… route shape, but no UI to enter a query.

Reproduction: load https://awesome.video/, evaluate
  document.querySelectorAll('input, [role="searchbox"], [role="combobox"]').length
must be >0 on the landing surface, today it is 0.

Acceptance:
1. Add a search icon and/or input in the global header, visible on /,
   /journeys, /advanced, /recommendations, /about at all three viewports.
2. Submitting a query (Enter or click) navigates to a results page that
   fetches /api/resources?q=… and renders matching cards.
3. Mobile: the search affordance is reachable within two taps from the
   landing header.
4. Verifiable: with Playwright, type "ffmpeg", press Enter, assert URL
   transitions to a /search or /resource?q=ffmpeg route that lists ≥3
   matches.
```


STATUS: NOT-REPRO/FIXED-in-source (search affordance present — cmdk trigger, visual-confirmed) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
