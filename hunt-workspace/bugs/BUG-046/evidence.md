# BUG-046 — /sitemap.xml `<lastmod>` for entries beyond today (2026-07-11+)

**Severity:** MEDIUM (SEO — Google ignores future lastmod or flags the sitemap)
**Affected endpoint:** https://awesome.video/sitemap.xml

## Reproduction
```bash
curl -s https://awesome.video/sitemap.xml | \
  grep -oE '<lastmod>[^<]+</lastmod>' | sort -u
```
Inspect the dates. The site is generated for "today" (2026-07-10), but
many entries show 2026-07-11, 2026-07-12, or later — future dates.

## Expected
Per sitemaps.org, `<lastmod>` should not be a future date unless it's the actual planned publication date. Future dates confuse Google Search Console and signal that the generator is wrong or being misused as a "schedule."

## Actual
Several sitemap entries have lastmod values later than the actual
generation date.

## Evidence
- `quickprobe.json`'s wider scan
- raw curl output, grep lastmod

## Fix prompt

```
Task: https://awesome.video/sitemap.xml emits <lastmod> dates that are
in the future relative to today's date. Confirm and clamp.

Reproduction:
  curl -s https://awesome.video/sitemap.xml \
    | grep -oE '<lastmod>[^<]+</lastmod>' | sort -u
Any date > 2026-07-10 is invalid.

Acceptance:
1. No <lastmod> entry exceeds the actual build timestamp.
2. Each <lastmod> reflects the last genuine edit to that resource/category.
3. Verifiable with the same curl/grep — all dates ≤ today.
```
