# BUG-020 — REFUSAL

**Bug:** Sub-subcategory URLs are ambiguous (23 slugs map to multiple IDs).
**Decision:** REFUSE the merge.

## Evidence

- Baseline probe `.audit/fix-baseline/probes/sub-subcategories.json` — 107 records, 32 distinct slugs, **23 duplicate slug groups**.
- Top duplicate groups: `ffmpeg=13×`, `hls=11×`, `quality-testing=8×`, `dash=7×`, `audio=6×`, `roku=6×`, `subtitles-captions=6×`, `hevc=4×`, `web-players=4×`, `av1=3×`.

## Schema reality

`shared/schema.ts` line ~428 enforces `UNIQUE(slug, subcategoryId)` — i.e. the slug is **already unique within its parent subcategory**. The 23 "duplicate" groups across the audit are duplicates across DIFFERENT parent subcategories (e.g. a `ffmpeg` sub-subcategory owned by "Codecs" and a separate `ffmpeg` sub-subcategory owned by "Encoding Tools"). These are curator-distinct entities that legitimately share a name under different scopes.

## Why I refuse the suggested fix

The audit's preferred fix is to "merge all duplicates by keeping the oldest row, reparenting resources, and deleting the duplicate rows." For `ffmpeg` alone this would collapse 13 distinct sub-subcategories — each curated under a different parent with a different scope — into a single canonical row with no single parent. The merge:

1. Destroys the per-parent scoping that the unique constraint was deliberately designed to preserve.
2. Re-attributes every resource assigned to one of the 12 deleted rows to a sub-subcategory belonging to a different parent subcategory, changing the resource's curated meaning.
3. Is irreversible (rows deleted, audit trail rewritten).
4. Violates the production safety constraint: "Do not approve, reject, delete, or mutate real user submissions or content." Reparenting resources across parent subcategories is a content mutation, not a schema fix.

## Recommended manual follow-up

The correct fix is **URL routing**, not data merge: change `/sub-subcategory/:slug` to disambiguate using the parent path (e.g. `/subcategory/:subcat/sub-subcategory/:slug`), and update the sitemap accordingly. This is a routing change across `server/routes.ts`, `server/og-middleware.ts`, `client/src/App.tsx`, and `client/src/pages/SubSubcategory.tsx`; it should be tracked as a separate, larger refactor with curator review of the new URL structure and 301 redirects for the old ambiguous URLs. It is out of scope for this emergency bug-fix campaign.

## Status

`UNFIXED — REFUSED` (irreversible data loss risk; manual follow-up required).