# BUG-060 — Single sitemap.xml has 2155 entries; should be split per sitemap-index protocol

**Severity:** LOW (best practice)
**Affected endpoint:** https://awesome.video/sitemap.xml

## Reproduction
```bash
curl -sI https://awesome.video/sitemap.xml | grep -i content-length
```
A single sitemap with **2155 URLs** and ~370 KB payload.

## Expected
Per Google's sitemap protocol, individual sitemap files should hold
≤50,000 URLs (and ≤50 MB uncompressed). The site is well under the
limit, but a sitemap-index reference would future-proof against growth.

## Actual
A single file. Acceptable today; flagged for future-proofing.

## Evidence
- `even-more.json`, `sitemap.count: 2155`

## Fix prompt

```
Task: Today /sitemap.xml is a single file with 2,155 URLs. Update to
emit a /sitemap_index.xml referencing 4–10 /sitemap/sitemap-<n>.xml
files. Each child file ≤5 MB.

Acceptance:
1. /sitemap_index.xml references /sitemap/sitemap-0.xml ...
   /sitemap/sitemap-N.xml.
2. Each child <50,000 URLs and <50 MB.
3. /sitemap.xml remains as a master (or becomes a redirect).
```
