# BUG-051 — Duplicate /redundant sitemap entries for the same canonical URL

**Severity:** MEDIUM (SEO)

See BUG-021. Additional evidence (sample):
- `curated` URLs share canonical URL but appear >1 time in sitemap.
- Crawl-budget waste + Google may treat as spam.

## Evidence (already captured)
- `even-more.json`, `sitemapDups`
- raw curl/grep proof in BUG-021

## Reproduction
```bash
curl -s https://awesome.video/sitemap.xml | \
  grep -oE '<loc>[^<]+</loc>' | sort | uniq -c | sort -rn | head -25
```

## Fix prompt

Same as BUG-021 — dedupe at build time.
