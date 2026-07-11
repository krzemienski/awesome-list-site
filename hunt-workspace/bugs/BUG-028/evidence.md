# BUG-028 — /journey/<n> pages return 200 but render only sidebar (no journey content)

**Severity:** HIGH (the journey route promised by sitemap and nav is empty)
**Affected page:** https://awesome.video/journey/1, /2, /3, /4, /5

## Reproduction
```bash
for n in 1 2 3 4 5; do
  echo -n "/journey/$n : "
  curl -sIL -o /dev/null -w '%{http_code}\n' "https://awesome.video/journey/$n"
done
```
All return **200** (sitemap happy-path). But opening them in a browser shows only the standard sidebar.

## Expected
A curated journey with: title, narrative intro, sequence of resource cards.

## Actual
The route is a 200 + the same sidebar with no journey body. The 6 existing journey slugs in the sitemap are silent stubs.

## Evidence
- `bug-deep-hunt.json` shows journey depth checks
- `screenshots/journey_1.png` and `journeys_list.png`

## Fix prompt

```
Task: /journey/<n> on https://awesome.video/ (n=1..5) returns HTTP 200
but renders the standard sidebar with no journey narrative. Reproduce:
  curl -s https://awesome.video/journey/1 | grep -c 'journey\|step\|lesson\|curated'
→ 0 (no journey-specific content).

Acceptance:
1. /journey/<n> renders a heading with the journey title + a sequence of
   curated /resource/* cards (≥3 per journey).
2. Each journey is noindexed from search if it's a draft.
3. Verifiable: Playwright loads /journey/1 and asserts at least 3
   `a[href^="/resource/"]` exist outside the sidebar.
```
