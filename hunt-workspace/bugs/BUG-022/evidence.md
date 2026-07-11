# BUG-022 — 404 page renders the full category sidebar (218 links), wasting crawl budget

**Severity:** LOW (SEO / UX)
**Affected page:** https://awesome.video/zzz-no-such-page-zzz (and any 404)

## Reproduction
```bash
curl -s https://awesome.video/zzz-no-such-page-zzz | grep -c 'a href'
```
The custom 404 page contains **218 internal links** (full sidebar + footer + "Categories" tree). The HTTP status is correctly 404 but the rendered body is essentially the homepage chrome + a small "Sorry, we couldn't find this page" notice somewhere.

```bash
curl -I https://awesome.video/zzz-no-such-page-zzz
# HTTP/2 404
```

## Expected
A 404 (or 410) page should be minimal: noindex the page, omit the
full sidebar/footer, render only "Page not found" with a "Back to
home" link. So that search engines (and humans) know the path is gone.

## Actual
The 404 page renders the full category sidebar. This sends the same
218-link internal link graph to crawlers as the homepage, diluting
page-rank signals.

## Evidence
- `even-more.json`, `notFound.links = 218`, `status = 404`
- `screenshots/404_custom.png`

## Fix prompt

```
Task: Custom 404 page on https://awesome.video/ renders the full
category sidebar (218 internal <a href>) instead of a minimal
"Page not found" body. Crawl budget waste + misleading internal link
graph.

Reproduction: `curl -I https://awesome.video/zzz-no-such-page` → 404,
then `curl -s URL | grep -c 'a href'` → ~218.

Acceptance:
1. The 404 page renders ≤5 internal links (e.g., Home + a Browse-all CTA).
2. The 404 page emits `<meta name="robots" content="noindex">` in the head.
3. Verifiable with the same curl + grep pipeline.
```
