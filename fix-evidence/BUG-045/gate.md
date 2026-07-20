# VG-045 — Sitemap `lastmod` uses import timestamp

**Verdict: PASS (fixed in code; live sitemap reflects it after republish)**

## Root cause
The sitemap already emitted real per-resource `updated_at` (Run16 BUG-095), but
historic bulk writes poisoned the source column: the July 17 2026 GitHub export
(old per-resource path, since replaced by `markResourcesSynced` — NB-029) stamped
every approved resource, and earlier import/enrichment passes did the same. The
live prod sitemap on July 20 2026 had only **3 distinct dates** across 2,432
dated URLs (2026-07-17 ×1536, 2026-07-18 ×639, 2026-07-19 ×257) — a blanket
stamp presented as a modification date (`/tmp/sitemap-prod.xml` analysis).

## Fix (server/routes.ts, sitemap generation)
Burst detection at the source query: any `updated_at` shared (same second) by
more than 10 approved resources is a bulk-write artifact, not a content-change
signal — those resources now **omit `lastmod`** (spec: omit rather than invent).
Individually-edited resources keep their real dates. Threshold rationale: manual
admin edits cannot exceed 10 writes/second; bulk scripts always do.

## Live evidence (dev, July 20 2026)
- DB: 325 of 1,983 approved resources have non-burst timestamps.
- Dev sitemap after fix: total=1953, dated=419 (resources + taxonomy max-of-
  members + journeys), **8 distinct dates**, all valid `YYYY-MM-DD`, 0 malformed.
- The January 2026 import blanket (327 rows at one second) is fully excluded.
- Remaining top date 2026-06-25 (234 URLs) is the Claude enrichment pass that
  genuinely rewrote descriptions sequentially (≤10/sec, real content changes) —
  source-backed, not a stamp.

## Prod
Read-time filtering — no data migration needed. Takes effect on republish;
re-fetch https://awesome.video/sitemap.xml and confirm the 2026-07-17 blanket
(1,500+ URLs) is gone.
