# BUG-095 — /resource pages bias external links toward GitHub (15+ of top 25 outbound domains are github.com)

**Severity:** LOW (curation bias)
**Affected page:** /resource/*

## Reproduction
Inspect the unique external domains of the first 80 resource pages:
```
   10 github.com
   10 aws.amazon.com
    3 medium.com
    3 devstreaming-cdn.apple.com
    2 iso.org
    ...
```

>50% of unique external domains are github.com / aws.amazon.com. The
site claims to be a video-dev resources list, but the curated entries
over-index on GitHub.

## Expected
A more balanced collection with academic, paid-product, blog, and
documentation sources alongside GitHub repos.

## Actual
Top categories skew heavily toward GitHub repos.

## Evidence
- `big-resource-sweep.json`, `outbound_unique_domains`

## Fix prompt

```
Task: Diversify the curated entries. Add at least 10 entries from
medium.com, devstreaming-cdn.apple.com (Apple docs), iso.org (codec
specs), academic publications, or vendor documentation sites per
quarter.

Acceptance:
1. Quarterly curation includes 10+ non-GitHub entries.
2. Top-10 unique external-domain histogram shows GitHub ≤40% by
   quarter-end.
```
