# BUG-045 — /subcategory/ffmpeg returns HTTP 404 (another sitemap-listed 404)

**Severity:** MEDIUM (SEO — sitemap pollution + broken inbound traffic)
**Affected page:** https://awesome.video/subcategory/ffmpeg

## Reproduction
```bash
curl -sIL -o /dev/null -w '%{http_code}\n' https://awesome.video/subcategory/ffmpeg
# → 404

curl -s https://awesome.video/sitemap.xml | grep 'subcategory/ffmpeg'
# → <loc>https://awesome.video/subcategory/ffmpeg</loc>  (sitemap lists it)
```

## Expected
The sitemap should never list URLs that 404. Same defect as BUG-032
(sitemap lists /journey/1..5 all 404) but for a subcategory slug.

## Actual
`/subcategory/ffmpeg` is a heavily-trafficked target (search engines will
follow the sitemap link). 404 + soft-template HTML body = poor SEO
experience.

## Evidence
- `public-deep`-audit: `/subcategory/ffmpeg` returns 404 at all three
  viewports
- cross-checked against sitemap `subcategory/ffmpeg` entry

## Fix prompt

```
Task: Subcategory slug ffmpeg is referenced in the sitemap but the
route returns hard 404. Reproduce:
  curl -I https://awesome.video/subcategory/ffmpeg  → today 404
  curl -s https://awesome.video/sitemap.xml | grep ffmpeg  → lists URL

Acceptance (pick one):
(a) Recreate the /subcategory/ffmpeg page with content (curated
    ffmpeg-related resources).
(b) Remove the broken entry from sitemap.xml and 410 the route.
(c) 308-redirect ffmpeg to a parent page (e.g.,
    /subcategory/ffmpeg-based-tools or /category/encoding-codecs).
```
