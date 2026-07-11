# BUG-071 — /search?q= serves a custom page but the body has only the sidebar (no results)

**Severity:** MEDIUM (search empty)
**Affected page:** https://awesome.video/search

## Reproduction
```bash
curl -sIL -o /dev/null -w '%{http_code}\n' https://awesome.video/search
# 200
curl -s 'https://awesome.video/search?q=ffmpeg' | grep -c 'a href="/resource/'
# likely 0
```

## Expected
/search should list /resource/* results matching q. Today it serves
the SPA shell + sidebar only.

## Actual
Empty search results page.

## Evidence
- earlier `navCheck` showed /search → 200
- visual inspection on /search shows no results

## Fix prompt

```
Task: GET https://awesome.video/search?q=ffmpeg returns 200 but no
/a[href^="/resource/"] anchors. The /search results page is empty.

Acceptance:
1. /search?q=<real-term> shows ≥1 matching resource card.
2. /search?q=<garbage> shows an empty-state UI ("no results").
3. Verifiable with Playwright.
```
