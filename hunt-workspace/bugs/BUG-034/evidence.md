# BUG-034 — /journeys page has only one H1/H2 heading and zero journey cards

**Severity:** HIGH (page advertised by top-nav is empty)
**Affected page:** https://awesome.video/journeys

## Reproduction
1. Open https://awesome.video/journeys in a fresh chromium at 1440×900.
2. The page's rendered body is only ~5,740 chars (mostly the sidebar +
   heading).
3. There is **exactly one** unique H1/H2/H3 heading ("Learning
   Journeys" or similar), and **0** journey cards in the body.
4. The default sidebar (count 1) suggests the page is rendering just
   the sidebar, not a journey list.

## Expected
/journeys should render a card-grid of curated learning journeys
(e.g., "Streaming Fundamentals", "AV1 Encoding Deep Dive", "DRM
Implementation Path"), each linking to its detail page.

## Actual
The page is essentially blank: one heading + sidebar.

## Evidence
- `quickprobe.json`, `journeysMeta = { txtLen: 5740, uniqueH2Count: 1, journeyCards: 0, resourceCards: 0, sidebarCount: 1 }`
- `screenshots/journeys_deep.png`

## Fix prompt

```
Task: /journeys is a one-page top-nav route that exists only as a
placeholder. Reproduce: load /journeys and evaluate
  document.querySelectorAll('a[href^="/journey/"]').length
today = 0.

Acceptance:
1. /journeys renders ≥3 journey cards (or rows) linking to
   /journey/<slug>.
2. Each card has a title, a one-line intro, and a "Start journey" CTA.
3. Verifiable with Playwright that the locator returns ≥3 anchors
   under the h1 area.
```
