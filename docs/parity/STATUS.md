# Parity status

Latest baseline run: `2026-09-12T16-03-20-100Z-278` (2026-09-12T16:03:20.100Z) — gate **NOT PASSED**.

Pixel rows: 0 pass, 93 fail, 4 blocked of 101. Eligibility: {"pixel":26,"token-only":14,"artifact-docs":22,"blocked":12}.

## Largest measured gaps

| Screen | Width | Diff % | Reason |
|---|---:|---:|---|
| app.admin.resources | 1440 | 98.7689% | 98.769% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |
| app.admin.resources | 1024 | 98.7076% | 98.708% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |
| app.admin.resources | 768 | 98.7065% | 98.707% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |
| app.admin.resources | 375 | 98.2899% | 98.290% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |
| app.subsubcategory | 375 | 93.9622% | 93.962% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |
| app.subsubcategory | 768 | 88.3063% | 88.306% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |
| app.subsubcategory | 1024 | 86.8762% | 86.876% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |
| app.subsubcategory | 1440 | 84.4457% | 84.446% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |
| app.about | 1024 | 76.2162% | 76.216% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |
| app.about | 375 | 75.4062% | 75.406% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]); @font-face parity gap: 27 face(s) declared on one side only |

## Blocked rows

- app.home.curated@375: app exposes no curated home layout control ([data-testid=home-layout-curated] or a control named /curated/i)
- app.home.curated@768: app exposes no curated home layout control ([data-testid=home-layout-curated] or a control named /curated/i)
- app.home.curated@1024: app exposes no curated home layout control ([data-testid=home-layout-curated] or a control named /curated/i)
- app.home.curated@1440: app exposes no curated home layout control ([data-testid=home-layout-curated] or a control named /curated/i)

See [REPORT.md](REPORT.md) for every row and the evidence links.

## Task 498 close-out (Phase 0 only; recorded 2026-09-10, re-measured 2026-09-12)

Task 498 closed at Phase 0 and claims no parity. It added
[`ARCHIVE-REVIEW.md`](./ARCHIVE-REVIEW.md) (the 103-entry archive review ledger;
its `.local/` original is gitignored), [`GROUND.md`](./GROUND.md) with grounding
captures of the real 1,816-resource home and the running registered artifact
(`evidence/ground-home.jpg`, `evidence/ground-artifact.jpg`), and a
reference-authority note in the artifact `DESIGN.md`. Its duplicate reference
server and capture scaffold were dropped in favour of `tests/parity/runner.mjs`.

At `22be4659` it measured three required-check regressions: standalone palette
drift (125 findings from the raw archive copy in `awesome-list-site-ds/` and
`CanonicalShowcase.tsx`), product-profile drift (hard fail, `index.html`
without `data-product-profile`) and `tsc` (37 errors). The foundation wave
resolved all three — see [`worklog/foundation.md`](./worklog/foundation.md) —
by freezing the canonical archive root out of the palette scan (verified
byte-for-byte against the pinned archive on every run) and retargeting the
product-profile gate at the design-system artifact. Re-measured at `98f1b0cc`:
`validate:standalone-palette-drift` PASS (3 roots, 82 files, 0 new values),
`validate:product-profiles` PASS (5 approved profiles), `npm run check` PASS.

Environment note: the frozen-reference check reads the gitignored archive by
the upload filename recorded in `source-sync.json` (`archive.path`). A
workspace holding the same bytes under a different upload name fails with
`ENOENT`, not a drift verdict; place a copy at the recorded path locally (same
SHA-256) before treating that result as a gate failure.
