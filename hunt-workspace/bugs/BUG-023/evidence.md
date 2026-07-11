# BUG-023 — /categories renders only the standard sidebar (no category-grid content)

**Severity:** HIGH (broken/empty page on a route Google indexes)
**Affected page:** https://awesome.video/categories

## Reproduction
1. Open https://awesome.video/categories in a fresh chromium at 1440×900.
2. The page title is "Categories" (or similar) but the body is essentially the same as the sidebar on any other page — the standard category tree with numerical counts.
3. There is no top-level category card grid, no intro text, no "browse all categories" UI — just the sidebar showing the same tree.

## Expected
A page at /categories should list top-level categories as cards (or another discoverable format). Counting the existing card-layout data: there are 8–9 top-level categories (Community & Events, Encoding & Codecs, General Tools, Infrastructure & Delivery, Intro & Learning, Media Tools, Networking & Protocols, Player & DRM, plus "General"). A landing grid would make the route useful.

## Actual
The route returns a full SPA with the same sidebar chrome but no category-card list.

## Evidence
- `more-bugs.json`, `categoriesPage.txt` — body is essentially identical to homepage sidebar
- `screenshots/categories_full.png`

## Fix prompt

```
Task: GET https://awesome.video/categories renders the standard sidebar
only — no actual category card grid, no intro, no breakdown. The route
exists and a user/SEO bot reaching it sees a near-empty body.

Reproduction: load /categories in a fresh chromium, evaluate
  document.querySelectorAll('a[href^="/category/"]').length
Today the count returns ~27 (the sidebar tree only, not a card grid).

Acceptance:
1. /categories renders a card grid with at least one card per
   top-level category (8-9 entries).
2. Each card links to its /category/<slug> page.
3. The standard sidebar remains in place.
4. /category/<slug> pages still work as today (this is a new grid above
   the existing per-category page).
5. Verifiable: Playwright `await page.locator('a[href^="/category/"]').count()` ≥ 30 after
   fix (sidebar tree 27 + 8 top-level cards).
```
