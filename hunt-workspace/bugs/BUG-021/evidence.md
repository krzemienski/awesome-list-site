# BUG-021 — sitemap.xml lists the same sub-subcategory URLs 2–11 times

**Severity:** MEDIUM (SEO / crawl-budget waste)
**Affected endpoint:** https://awesome.video/sitemap.xml

## Reproduction
```bash
curl -s https://awesome.video/sitemap.xml | \
  grep -oE '<loc>[^<]+</loc>' | sort | uniq -c | sort -rn | head -10
```

The sitemap has **2,155 URLs with significant duplicates**:
```
   11 https://awesome.video/sub-subcategory/hls
    8 https://awesome.video/sub-subcategory/ffmpeg
    8 https://awesome.video/sub-subcategory/quality-testing
    7 https://awesome.video/sub-subcategory/dash
    6 https://awesome.video/sub-subcategory/subtitles-captions
    6 https://awesome.video/sub-subcategory/audio
    6 https://awesome.video/sub-subcategory/roku
    4 https://awesome.video/sub-subcategory/hevc
    4 https://awesome.video/sub-subcategory/web-players
    4 https://awesome.video/sub-subcategory/android
   ...
```

## Expected
Each canonical URL appears exactly once in sitemap.xml. Google may
ignore duplicate URLs, but the wasted bytes and crawl-budget signals a
generator bug.

## Actual
15+ sub-subcategory slugs are duplicated, ranging 2–11 times. The
generator appears to emit one entry per resource within the
sub-subcategory (no dedupe pass). For sub-subcategories with many
resources this multiplies the entry count without adding information.

## Evidence
- `even-more.json`, `sitemapDups` array
- raw `curl | grep | sort | uniq -c` output above

## Fix prompt

```
Task: https://awesome.video/sitemap.xml lists the same sub-subcategory
URL up to 11 times. Example: /sub-subcategory/hls appears 11 times.

Run:
  curl -s https://awesome.video/sitemap.xml | \
    grep -oE '<loc>[^<]+</loc>' | sort | uniq -c | sort -rn | head

Acceptance:
1. Each <loc> appears exactly once in the sitemap.
2. The sitemap contains only one entry per canonical URL (no
   per-resource duplicates bleeding into parent subcategory entries).
3. The total URL count drops to ≈2155 / (avg duplicate) and stays in
   sync with /api/categories and /api/resources.
4. Verifiable with the same curl, after fix every count is 1.
```
