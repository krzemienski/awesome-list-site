# VG-031 — Head metadata lags soft navigation (BUG-031)

**Verdict: PASS** — July 20, 2026, 20 live soft-navigation trials (Playwright, real Chromium)

## Root cause
Every dynamic page (ResourceDetail, JourneyDetail, Category, Subcategory,
SubSubcategory, Home) early-returned a loading skeleton **without** rendering
`SEOHead`, and the global lazy-route Suspense fallback did the same. During a
soft navigation the previous page's Helmet unmounted (removing canonical/OG)
while the new page hadn't mounted its head yet — so mid-load the document
showed the PREVIOUS route's `<title>` with **no** canonical/OG at the new URL
(mixed, non-atomic head state). Captured before the fix:
soft-nav Home → `/resource/185720` at +80ms showed
`title="Awesome Video — 1813+ …"` (Home's) with `canonical=null`, `og:url=null`.

## Fix (client-only)
Render a route-owned `SEOHead` in **every** loading/error early-return, so the
head swaps in the same React commit that swaps the route content:
- `ResourceDetail` loading branch — neutral "Loading resource" + current-path canonical
- `JourneyDetail` loading branch + not-found branch (not-found is `noindex`,
  matching the server's soft-404 contract)
- `Category` / `Subcategory` / `SubSubcategory` loading branches
- `Home` loading branch — brand-default head
- `App.tsx` `RouteFallback` (lazy-chunk Suspense fallback) — brand default +
  current-path canonical, replaced by the destination page's real head when the
  chunk mounts

`SEOHead` already derives canonical/og:url from `window.location.pathname`
against the fixed apex base, so the loading-state head is always
current-route-consistent. No server changes; crawler hard-loads were already
correct via og-middleware.

## Live evidence — 20 trials (`trials-20.json.txt`)
Routes covered: 3-level taxonomy (category / subcategory / sub-subcategory),
2 resource pages, journeys list + journey detail, categories, search, settings,
settings/theme, terms, privacy, faceted URL (`?search=QSV`), home. Each trial:
pushState soft-nav → sample head at +150ms ("early") and +1050ms ("final").

Checks per trial (all 20 PASS, 0 failures):
- early + final canonical and og:url are either absent (noindex surfaces:
  /search, /settings, /settings/theme) or exactly `https://awesome.video` +
  current route path — never the previous route's
- no trial exposes the previous route's title mid-load (stale-title check
  compares early title against the previous route's final title)
- `<title>` and `og:title` agree in the final state
- faceted `?search=` canonical collapses to the clean base route (by design)

Note: `/category/:cat/:sub` is a legacy alias the server 301s to
`/subcategory/:sub`; the client canonical on that alias points at the 301
target — client and server agree (verified via curl: server Location header
and bot-page canonical both `= /subcategory/books-courses`).

Screenshots: `vg031-trial2.png` (resource detail), `vg031-trial9.png`
(sub-subcategory), `vg031-trial20.png` (return home).

tsc clean after all edits.
