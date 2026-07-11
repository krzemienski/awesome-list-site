# BUG-061 — robots.txt `Crawl-delay: 1` slow-crawls the site (interactive UX unaffected)

**Severity:** LOW (SEO strategy)
**Affected endpoint:** https://awesome.video/robots.txt

## Reproduction
```bash
curl -s https://awesome.video/robots.txt | grep -i 'crawl-delay'
```
Returns `Crawl-delay: 1`. This is per the crawler spec — Bing and Google
honor it; others ignore.

## Expected
A balanced crawl-delay that doesn't throttle quality crawlers while
protecting origin capacity. `Crawl-delay: 1` means a single-thread
crawler waits 1s between requests, which is acceptable.

## Actual
Functional. Flagged only because the rate is low for an SPA where
clients grab many pages per session.

## Evidence
- raw `curl robots.txt`

## Fix prompt (observation, not strictly a fix)

```
Task: /robots.txt sets Crawl-delay: 1. If the origin is healthy,
consider raising to 0 (or removing the directive). If the origin has
faced load issues, keep at 1.

Acceptance:
1. /robots.txt follows Google's current best practices: include a
   sitemap directive (already present), explicit Allow/Disallow rules
   (already present).
2. Crawl-delay may be tuned based on origin SLO.
```
