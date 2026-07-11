# BUG-081 — /sitemap.xml `<lastmod>` for /journey/1..5 (the broken ones) is 2026-07-10

**Severity:** LOW (sitemap consistency)
**Affected endpoint:** https://awesome.video/sitemap.xml

## Reproduction
```bash
curl -s https://awesome.video/sitemap.xml | grep -A1 '/journey/1</loc>'
```
Returns:
```xml
<loc>https://awesome.video/journey/1</loc>
<lastmod>2026-07-10</lastmod>
```

The broken (404) journey URLs all carry the same `lastmod` as if they
exist. This tells Google "these are real, recently updated" — but
they return 404.

## Expected
`lastmod` should match the underlying entity's last edit, or be
removed entirely from broken entries.

## Actual
Broken entries carry fake `lastmod` values.

## Evidence
- `quickprobe.json`, sitemap-related entries

## Fix prompt

```
Task: When a URL is removed/410'd, remove (or strip lastmod) from its
sitemap entry. Today the sitemap lists broken /journey/1..5 with
lastmod=2026-07-10.

Acceptance:
1. Every <loc> in the sitemap returns 2xx; no stale entries.
2. The lastmod value reflects the entity's last genuine edit.
```
