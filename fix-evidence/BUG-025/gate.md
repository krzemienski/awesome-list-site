# VG-025 — BUG-025 (LOW) — Filter badge shows the total count

**Verdict: PASS (8/8)** — July 20, 2026, live dev app (`http://localhost:5000`), Playwright Chromium @1440px.

## Fix
The `badge-count` badge on all three taxonomy resource pages rendered `allResources.length` (unfiltered total) even while search/tag/subcategory filters were active:
- `client/src/pages/Category.tsx` — badge now renders `filteredResources.length` (the header line already shows "X of Y resources shown" for the total context).
- `client/src/pages/Subcategory.tsx` — same change.
- `client/src/pages/SubSubcategory.tsx` — same change.
`tsc --noEmit` clean.

## Gate checks (all PASS)
Expected counts computed **independently** from the live `/api/awesome-list` tree by replaying the page's filter predicate (title/description contains "video", dedup by id):

| Check | Result |
|---|---|
| Category `/category/intro-learning`: initial badge = unfiltered total | badge=188, API=188 |
| Category: badge = filtered count after search "video" | badge=147, API-computed=147 |
| Category: badge sync with the list's "Showing 1–24 of N" line | line=147 = badge |
| Category: filter actually applied | 147 < 188 |
| Category: clearing filter restores total | badge back to 188 |
| Subcategory `/subcategory/encoding-transcoding-guides`: badge follows filter + restores | total 15/15, filtered 9/9, restored 15 |
| Sub-subcategory `/sub-subcategory/hevc`: badge follows filter | total 10/10, filtered 8/8 |

Note: first probe run flagged a false FAIL from the probe's own regex matching the header's intentional "147 of 188 resources shown" (Run17 BUG-059 filtered-of-total copy) instead of the list's "Showing … of N" line; regex corrected, app behavior was correct.

## Evidence
Screenshots: `bug025-category-filtered.png`, `bug025-subcategory-filtered.png`, `bug025-subsubcategory-filtered.png` (this directory).
