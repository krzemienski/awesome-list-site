# BUG-049 — More resource URLs from sitemap return HTTP 404

**Severity:** MEDIUM (sibling of BUG-032 and BUG-045)
**Affected page:** various /resource/* and /subcategory/* slugs

## Reproduction
```bash
# Pull first 50 resource URLs from sitemap and probe
curl -s https://awesome.video/sitemap.xml | \
  grep -oE '<loc>https://awesome[^/]*//resource/[^<]+</loc>' | \
  sed 's|<loc>||;s|</loc>||' | head -50 | while read u; do
  status=$(curl -sIL -o /dev/null -w '%{http_code}' "$u")
  [ "$status" != "200" ] && echo "$status $u"
done
```
Output (sampled): same shape as BUG-045 — the sitemap carries
non-200 URLs.

## Expected
Every URL in the sitemap returns 200.

## Actual
Many URLs do not.

## Evidence
- `more-probes.json`, `resource_404_*` entries

## Fix prompt

```
Task: After BUG-032 and BUG-045, additional sitemap entries (mostly
/resource/* and /subcategory/*) still return 4xx. Audit the entire
sitemap:

  curl -s https://awesome.video/sitemap.xml | \
    grep -oE '<loc>[^<]+</loc>' | sort -u | while read line; do
    u="${line#<loc>}"; u="${u%</loc>}"
    s=$(curl -sIL -o /dev/null -w '%{http_code}' "$u")
    [ "$s" != "200" ] && echo "$s  $u"
  done | tee /tmp/bad-urls.txt

Acceptance:
1. /tmp/bad-urls.txt is empty after the build.
2. The sitemap generator filters non-200 URLs at build time.
3. CI checks `sitemap - server` and fails the build on any 4xx/5xx entry.
```
