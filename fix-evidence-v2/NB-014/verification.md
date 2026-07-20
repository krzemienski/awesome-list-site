# NB-014 — 48 mid-clause truncated descriptions fixed

## Scan
`SELECT ... WHERE status='approved' AND (trim(description) ~ '\.\.\.$' OR ~ '…$')`
returned exactly **48** rows in dev — matching the audit count.

## Fix (`scripts/run23-data-fixes-prod.ts`, NB-014 section)
- **38 rows**: elided at the last full sentence boundary (`[.!?]` + optional
  closing quote/bracket, min 50 chars retained) — the dangling fragment and
  ellipsis dropped, leaving complete sentences.
- **10 rows** with no usable sentence boundary (single truncated sentence or
  code fragment) got hand-written complete descriptions (OVERRIDES table:
  185811, 185722, 185724, 185870, 185964, 185974, 186134, 185755, 186074,
  186113) based on the visible source content.

Idempotent: the ellipsis-tail regex is the trigger condition; fixed rows
no-op on re-run.

## Live proof (dev, July 20, 2026)
- First run: 48/48 written, every PUT 200 (journal
  `fix-evidence-v2/NB-013/data-fixes-dev.json`, NB-014 actions with
  before/after tails).
- Post-scan inside the same run: **0 remaining** ellipsis-truncated approved
  descriptions.
- Second run: `scan.truncatedCount = 0` → all no-ops.

## Prod follow-up
Same script run post-republish applies the identical transform to prod
(fresh-read conditions, so prod-only drift is handled row by row).
