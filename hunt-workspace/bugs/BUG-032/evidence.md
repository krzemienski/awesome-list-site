# BUG-032 — sitemap.xml lists /journey/1..5 but they all return hard 404

**Severity:** MEDIUM (SEO — sitemap pollution, Google Search Console errors)
**Affected routes:** /journey/1, /2, /3, /4, /5

## Reproduction
```bash
for n in 1 2 3 4 5; do
  echo -n "/journey/$n : "
  curl -sIL -o /dev/null -w '%{http_code}\n' "https://awesome.video/journey/$n"
done
```
All return **404**.

But the same URLs are listed in /sitemap.xml:
```bash
curl -s https://awesome.video/sitemap.xml | grep -E '/journey/[1-5]'
```

## Expected
The sitemap should never list URLs that 404. Google Search Console will
flag these as 5xx/4xx URLs in sitemap coverage and demote the site's
overall crawl quality.

## Actual
Five consecutive journey slugs in the sitemap all 404. (Slugs 6,7 do
exist — a mix of working and broken entries.)

## Evidence
- `quickprobe.json`, `journey_1..5.status = 404`
- `even-more.json`, `sitemap.sampleTail: [..., /journey/6, /journey/7, /journey/8, /journey/9, /journey/10]`

## Fix prompt

```
Task: /sitemap.xml lists /journey/1 .. /journey/5 but those URLs return
HTTP 404 today. Either:
(a) Restore the missing journeys, OR
(b) Remove the broken entries from the sitemap, OR
(c) 410 the routes + remove from the sitemap.

Run:
  curl -I https://awesome.video/journey/1  → today 404
  curl -s https://awesome.video/sitemap.xml | grep '/journey/'

Acceptance:
1. Every <loc> in the sitemap returns 2xx, 3xx, or 410.
2. The sitemap generator filters out 404 URLs at build time.
3. /sitemap.xml entries all resolve.
```
