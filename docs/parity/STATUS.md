# Parity status

Latest historical full baseline: `2026-09-12T21-32-31-677Z-10218` (2026-09-12T21:32:31.677Z) — gate **NOT PASSED**.

## Evidence scope correction

The full baseline above predates the timeout cancellation, `server/` source
fingerprint, and end-of-run live catalog/admin adapter re-read repairs. Its
equal start/end fingerprints and clean teardown remain historical visual
evidence, but are **not** proof of current server or live-data integrity.
Post-repair focused verification against the live local app is recorded in
[failure-paths.md](evidence/harness/failure-paths.md): a two-row 1-second
timeout probe exited 2 with two `INCOMPLETE` rows before the next row began,
and selected visitor/admin captures completed their live adapter re-reads and
identity teardown without changing shared baseline outputs. No full run was
performed for this correction.

Pixel rows: 0 pass, 93 fail, 4 blocked of 101. Eligibility: {"pixel":26,"token-only":14,"artifact-docs":22,"blocked":12}.

## Latest run integrity

- The runner recorded equal input fingerprints (`c9781473…` at start and
  end) and `inputsChangedDuringRun: false`; the full run had no dirty input
  paths.
- All 181 captured rows completed font readiness on both sides, with no
  capture failures, same-origin API failures, discarded frames, or document
  reloads. One reference side needed the second stability pair; all other
  sides stabilized on the first pair.
- The disposable admin teardown deleted both the local and Clerk users,
  recorded no errors, and left `localQaUsersRemaining: []`. The run's exit 1
  is the expected pre-parity verdict for the measured page differences, not
  an identity or capture-integrity failure.
- The remaining declared-face gaps are confined to artifact rows: 88
  evidence-only rows and the four counted `artifact.showcase` rows. The
  app-side pixel rows have no font-face gap. See
  [identity cleanup evidence](evidence/harness/identity-cleanup.md) and
  [font evidence](evidence/harness/font-gaps.md).

## Largest measured gaps

| Screen | Width | Diff % | Reason |
|---|---:|---:|---|
| app.admin.resources | 1440 | 98.7689% | 98.769% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.resources | 768 | 98.7103% | 98.710% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.resources | 1024 | 98.7077% | 98.708% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.resources | 375 | 98.2902% | 98.290% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.subsubcategory | 375 | 93.9623% | 93.962% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.subsubcategory | 768 | 88.3069% | 88.307% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.subsubcategory | 1024 | 86.8766% | 86.877% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.subsubcategory | 1440 | 84.4458% | 84.446% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.about | 1024 | 76.2168% | 76.217% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.about | 375 | 75.4063% | 75.406% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |

## Blocked rows

- app.home.curated@375: app exposes no curated home layout control ([data-testid=home-layout-curated] or a control named /curated/i)
- app.home.curated@768: app exposes no curated home layout control ([data-testid=home-layout-curated] or a control named /curated/i)
- app.home.curated@1024: app exposes no curated home layout control ([data-testid=home-layout-curated] or a control named /curated/i)
- app.home.curated@1440: app exposes no curated home layout control ([data-testid=home-layout-curated] or a control named /curated/i)

See [REPORT.md](REPORT.md) for every row and the evidence links.
