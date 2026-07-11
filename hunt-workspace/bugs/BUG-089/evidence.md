# BUG-089 — Many sub-subcategory pages redirect / 404 randomly (sitemap promises working sub-subcategories but live routes return 404)

**Severity:** MEDIUM (SEO)
**Affected endpoints:** sitemap-listed sub-subcategory slugs

## Reproduction
```bash
# Pull all sub-subcategory URLs from sitemap and probe
curl -s https://awesome.video/sitemap.xml | \
  grep -oE '<loc>[^<]+sub-subcategory[^<]+</loc>' | \
  sed 's|<loc>||;s|</loc>||' | sort -u | while read u; do
  s=$(curl -sIL -o /dev/null -w '%{http_code}' "$u")
  [ "$s" != "200" ] && echo "$s  $u"
done | wc -l
```
Returned non-zero (a meaningful subset of /sub-subcategory/* URLs are
not 200).

## Expected
All sub-subcategory URLs in sitemap return 200.

## Actual
A non-trivial subset is broken.

## Evidence
- `even-more.json`, sitemap
- raw curl pipeline

## Fix prompt

```
Task: Audit every /sub-subcategory/<slug> URL in the sitemap for HTTP
status. Non-200 entries should be removed or 308'd to a related page.

Acceptance:
1. After audit, every sub-subcategory URL in the sitemap returns 200.
2. Verifiable with the same pipeline.
```
