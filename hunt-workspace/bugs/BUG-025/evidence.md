# BUG-025 — /recommendations renders only the standard sidebar (no recommendation cards)

**Severity:** HIGH (broken/empty page on a route Google indexes)
**Affected page:** https://awesome.video/recommendations

## Reproduction
1. Open https://awesome.video/recommendations in a fresh chromium at 1440×900.
2. The page title is "AI-Powered Recommendations — Awesome Video" with
   META description "Personalized video development resource recommendations based on your interests and learning goals.".
3. The rendered body has **no actual recommendation cards** — only the
   standard category sidebar.

```js
const links = await page.locator('a[href^="/resource/"]').count();
```

## Expected
Per the page title and META description, this should be a list of
personalized resource recommendations. At minimum, the page should
serve a list of editor-curated featured resources for anonymous
visitors.

## Actual
The route renders the standard sidebar only. The "AI-powered
recommendations" promise is unmet.

## Evidence
- `more-bugs.json`, `recommendationsPage.txt` — only sidebar chrome
- `screenshots/recommendations_full.png`

## Fix prompt

```
Task: GET https://awesome.video/recommendations renders the standard
sidebar but no recommendation cards. META description promises
"personalized video development resource recommendations based on your
interests and learning goals" but the body shows only the sidebar.

Reproduction: load /recommendations, evaluate
  document.querySelectorAll('a[href^="/resource/"]').length
Today = 0 (the resource links visible in the sidebar are nested in
the sidebar nav, not in the recommendation area; the SIDEBAR also
shows /subcategory/... but not /resource/* cards).

Acceptance:
1. /recommendations renders ≥5 /resource/* cards for anonymous visitors
   (editorially curated fallback).
2. For authenticated visitors, render personalized recommendations
   from /api/recommendations or similar.
3. Heading reads "AI-Powered Recommendations" or similar.
4. Verifiable via Playwright with the locator count above.
```
