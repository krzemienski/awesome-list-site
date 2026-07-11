# BUG-008 — Six resource pages link to outbound URLs that return HTTP 403 (Forbidden)

**Severity:** MEDIUM (data integrity / library curation defect)
**Affected pages:** https://awesome.video/resource/185224, /185860, /186303, /186305, /186307, /186494

## Reproduction
For each page, fetch the resource page HTML and inspect the outbound link in the "External" section.

1. https://awesome.video/resource/185860 — outbound `https://www.smarthomebeginner.com/best-home-server-apps/` returns **HTTP 403**.
2. https://awesome.video/resource/185224 — outbound `https://www.mo4tech.com/a-brief-history-of-video-compression-standards-1929-to-2020.html` returns **HTTP 403**.
3. https://awesome.video/resource/186305 — outbound `https://www.iso.org/standard/76383.html` returns **HTTP 403**.
4. https://awesome.video/resource/186307 — outbound `https://www.iso.org/standard/83336.html` returns **HTTP 403**.
5. https://awesome.video/resource/186303 — outbound `https://www.iso.org/standard/83529.html` returns **HTTP 403**.
6. https://awesome.video/resource/186494 — outbound `https://bitmovin.com/av1-showing-greater-compression-efficiency-than-hevc/` returns **HTTP 403**.

Run from a host shell:
```
for url in \
  "https://www.smarthomebeginner.com/best-home-server-apps/" \
  "https://www.mo4tech.com/a-brief-history-of-video-compression-standards-1929-to-2020.html" \
  "https://www.iso.org/standard/76383.html" \
  "https://www.iso.org/standard/83336.html" \
  "https://www.iso.org/standard/83529.html" \
  "https://bitmovin.com/av1-showing-greater-compression-efficiency-than-hevc/"; do
  echo -n "$url : "
  curl -sIL -A "Mozilla/5.0" -o /dev/null -w '%{http_code}\n' "$url"
done
```

## Expected
Every entry in the curated library should still resolve to a public-readable page. 403 means the upstream now blocks anonymous access (likely anti-bot rules), or requires a User-Agent header the default `curl` does not match.

## Actual
6 of 25 (24%) randomly-sampled resource pages link to external URLs that return **HTTP 403** to a default curl. A site billed as "1,946 curated resources" should not publish 403-bound links.

## Evidence
- `bug-deep-hunt.json`: `externalFails` list, 6 entries with `status: 403`
- `resource-deep.json`: HTTP request heads
- screenshots in `screenshots/res_deep_<slug>.png`

## Fix prompt

```
Task: Six resource pages on https://awesome.video/ link to outbound URLs
that return HTTP 403 to default curl:
  - /resource/185860 → https://www.smarthomebeginner.com/best-home-server-apps/
  - /resource/185224 → https://www.mo4tech.com/a-brief-history-of-video-compression-standards-1929-to-2020.html
  - /resource/186305 → https://www.iso.org/standard/76383.html
  - /resource/186307 → https://www.iso.org/standard/83336.html
  - /resource/186303 → https://www.iso.org/standard/83529.html
  - /resource/186494 → https://bitmovin.com/av1-showing-greater-compression-efficiency-than-hevc/

Add a periodic external-link liveness check to the admin pipeline. When a
resource's outbound URL returns ≥400 (or no longer matches the archived
description), mark the resource as "stale" so admins can replace or
remove it. Optionally surface a "⚠ Link may be broken" badge on the
public detail page.

Acceptance:
1. After the fix, a curl probe to every listed outbound URL returns 2xx
   or 3xx, or the resource has been retired and 410'd.
2. The admin dashboard exposes a "Broken outbound links" counter.
3. An automated recheck runs daily via cron job.
```
