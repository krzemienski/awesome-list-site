# R-12 — Sitemap lastmod: batch-stamped dates + 8 undated hubs (LOW, relates BUG-045/046)

**Date:** July 20, 2026 · **Status:** FIXED (omit-for-ALL policy) · **Verified live against dev**

## Decision

Acceptance offered: "Real per-URL dates or omit for ALL; 0 undated URLs."

Pre-fix dev sitemap: 1,953 URLs — 419 dated / 1,534 undated, and the 419
surviving dates clustered on just **8 distinct values** (234 URLs alone on
2026-06-25, a mass-enrichment day). After two prior rounds of honesty filtering
(Run16 real updatedAt, Run22 per-second burst exclusion), the corpus provably
has NO genuine per-URL content-change signal — `updated_at` is bookkeeping.
Dating all 1,953 URLs would mean inventing dates, which the audit's own
"lastmod honesty" framing forbids. Therefore: **omit `<lastmod>` for ALL URLs**
— the explicitly allowed second branch. A lastmod-free sitemap is fully valid;
crawlers distrust inconsistent lastmod anyway.

## Change

`server/routes.ts` sitemap route: removed the resource-lastmod burst query,
`maxLastmodOf` tree aggregation, and journey `updatedAt` emission; `addUrl` no
longer takes/emits lastmod. One uniform policy, documented in-code with a
do-not-reintroduce note (only a true content-change signal justifies dates).

## Evidence (`sitemap-parse.txt`, dev)

```
total=1953 lastmodTags=0
parsed urls=1953 with_lastmod=0 unique_locs=1953
XML well-formed: True
```

- Zero `<lastmod>` tags across all 1,953 URLs (XML-parsed proof, not grep-only).
- No mixed signals: 0 batch-stamped dates, 0 undated-vs-dated inconsistency.
- URL set unchanged (1,953 before and after; unique locs = 1,953).
- tsc clean after removal.

Sample head: `sitemap-head.xml`.
