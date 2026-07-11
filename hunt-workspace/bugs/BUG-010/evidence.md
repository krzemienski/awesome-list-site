# BUG-010 — /journeys renders same sidebar as homepage; only 1 actual journey link

**Severity:** MEDIUM
**Affected page:** https://awesome.video/journeys

## Reproduction
1. Open https://awesome.video/journeys in a fresh chromium at 1440×900.
2. The visible page is dominated by the standard sidebar (Categories with 87 entries — Community Groups 5, Online Forums 3, Events & Conferences 8, Podcasts & Webinars 4, General 74, then Encoding & Codecs 336, etc.).
3. There is exactly **one** link whose href contains `/journey` — the rest is sidebar chrome.
4. Compare with /advanced which has 245 links and renders the actual advanced-search form.

The /journeys page advertises itself as "Learning Journeys" in the top-nav, but the page renders no list of journeys — just the standard category sidebar with a heading "Learning Journeys" visible.

## Expected
The /journeys page should display a list of curated learning journeys with their summaries and a CTA to start each. The expected count is non-trivial — the nav promises "Learning Journeys" plural.

## Actual
The page renders only one journey-related link. Either the journeys collection is empty, or the layout hides the journeys beneath the sidebar. Visiting /journeys feels like a dead-end.

## Evidence
- `screenshots/journeys_list.png` (full-page screenshot)
- bug-deep-hunt.json, `journeys.txt` (full body text) — has '| H' cut-off and no journey titles
- bug-deep-hunt.json, `journeys.links` = 1

## Fix prompt

```
Task: /journeys on https://awesome.video/ renders essentially the same
chrome as the homepage — only 1 anchor whose href contains /journey.
The top-nav label is "Learning Journeys" (plural); users expect a list
of journeys they can start.

Reproduction: load /journeys, evaluate
  document.querySelectorAll('a[href*="/journey"]').length
today = 1.

Acceptance:
1. /journeys renders a card grid (or list) of curated journeys. At minimum
   3 distinct journey entries.
2. Each card links to its /journey/<slug> detail page.
3. The sidebar and "Learning Journeys" header are still present.
4. Verifiable: load /journeys and assert document.querySelectorAll(
   'a[href^="/journey/"]').length >= 3.
```
