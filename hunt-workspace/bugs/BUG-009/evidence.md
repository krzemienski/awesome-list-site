# BUG-009 — /explore returns HTTP 404 (hard status)

**Severity:** LOW
**Affected page:** https://awesome.video/explore

## Reproduction
```bash
curl -sIL -A "Mozilla/5.0" -o /dev/null -w '%{http_code}\n' https://awesome.video/explore
```
Returns **HTTP 404**.

This is a route that may be linked from external sources or an older internal sitemap/version of the site. A 404 is the correct behavior for a route that no longer exists — the question is whether the route was ever published.

## Expected
If /explore was a previous public discovery page, either restore it or 301-redirect it to /categories or /recommendations so that any inbound links continue to work. Today's hard-404 is fine if the route was never published, but a site-wide audit of broken inbound links is warranted.

## Actual
`/explore` returns HTTP 404. No page is rendered. Some top-nav elements may still reference this path; the sitemap should also be cross-checked.

## Evidence
- `bug-deep-hunt.json`, `navCheck[].path == '/explore'` returns `404`
- `curl -I https://awesome.video/explore` returns 404

## Fix prompt

```
Task: Decide what to do with the /explore route on https://awesome.video/.
Today it returns hard HTTP 404:
  curl -I https://awesome.video/explore -> 404

Acceptance (pick ONE):
(a) Issue a 308 from /explore → /categories (if /explore was previously
    a discovery page, this preserves inbound links).
(b) Issue a 308 from /explore → /recommendations.
(c) Document that the route was never productionized and remove any
    internal references to it (admin nav, sitemap, OG tags).

Verify with curl that the chosen outcome matches the pick.
```
