# Task 571 independent-verification and link-audit evidence

This directory retains the command ledger for the independent verification
recorded in [../../VERIFICATION.md](../../VERIFICATION.md).

- Command-tested source revision:
  `a1e2a9fc598a34b4e662a27f5c8bdb6a869c8f3e`
- Browser-capture status: the final permitted selection reached the browser
  after the app workflow became available, but the external 300-second command
  limit stopped the harness mid-run. It has partial measurements only and no
  harness teardown/result file; see [FINAL-ATTEMPT.log](FINAL-ATTEMPT.log).
- Exact fixture cleanup: completed after the timeout with a two-ID-only
  operation; one local and one Clerk record were deleted and both target
  sets subsequently measured zero. See
  [RAW-GATE-LOGS.md](RAW-GATE-LOGS.md); no broad parity sweep was used.
- Retained pixel images reviewed:
  `tests/parity/baseline/2026-09-15T17-47-51-897Z-9407/{actual,expected,diff}/`
  for `app.home.index-375`, `app.category-1024`, and
  `app.shell.palette-1440`.

The record intentionally distinguishes command-tested revision from the older
full-regression capture revision (`2b44a2bc08692059cc4ab63c526a5871451fbe1f`)
and does not claim browser evidence for a subsequent docs-only commit.

## Final static link/PNG audit

The final read-only audit covers 163 Markdown files, including `README.md`,
`docs/ADMIN-GUIDE.md`, `docs/CONTACT-VARIANTS.md`, and the new verification
documents. It found 1,674 Markdown links and 1,298 PNG references (698 unique):
zero missing local targets, zero missing PNGs, and zero existing-but-untracked
PNG targets. The gate is **PASS**; the retained runnable Node document exits
nonzero if any local target is missing or any PNG is missing/unavailable.

- [Runnable audit script](parity571-audit.js.txt) (`node --input-type=commonjs < parity571-audit.js.txt`)
- [Raw JSON result](parity571-links.json)
- [Raw text report](parity571-missing-targets.txt)

Historical raw artifacts that are unavailable remain explicitly unverified in
their leaf records: the completion log
`completion-responsive-design-system-2026-09-14.log`, the
`final-shell-build/` directory, and
`../evidence/artifact-showcase-550/workflow.log`. No replacement raw log is
asserted or fabricated, and the SCREENS aggregate is intentionally excluded
from the authorized leaf-link repairs.
