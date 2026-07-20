# R-09 — Titles truncate BEFORE " — Awesome Video", never through it (LOW, relates BUG-030)

**Date:** July 20, 2026 · **Status:** FIXED · **Verified live against dev**

## Change

`shared/seo-templates.ts` `clampSeoTitle()`: when an over-budget title ends with the
standard ` — Awesome Video` suffix, the CORE is clamped to the budget remaining after
the suffix (60 − 16 = 44 chars, word-boundary + ellipsis) and the suffix is re-appended
intact. Result: `"Long Resource Name… — Awesome Video"` — never `"… — Awesome…"`.
Titles without the suffix or already ≤60 chars behave exactly as before.

Both emission sites (`server/og-middleware.ts` buildMetaTags and client
`SEOHead.tsx`) clamp through this ONE shared function, so two-pass parity is
preserved by construction.

## Evidence

### 100-page scan (`scan-titles.mjs` → `scan-results.json`)

Sample = 60 resource pages with the LONGEST titles in the corpus (worst cases)
+ 40 sitemap URLs across every non-resource family (95 unique after dedup):

- scanned: 95 · clamped (ellipsis present): 62
- **severedBrand: 0** (no title ends with any proper prefix of " — Awesome Video" + …)
- **overBudget (>60 chars): 0**
- Every clamped title ends with the intact `… — Awesome Video` (see scan-results.json),
  e.g. `"ISO - ISO/IEC 23009-1:2019 - Information… — Awesome Video"` (57ch).

### Two-pass parity (`parity-probe.mjs`)

3 clamped pages (186111, 186249, 185949): served `<title>` === hydrated
`document.title`, `identical: true` for all three.
