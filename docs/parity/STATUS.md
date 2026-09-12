# Parity status

Latest baseline run: `2026-09-12T18-03-48-670Z-22711` (2026-09-12T18:03:48.670Z) — gate **NOT PASSED**.

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
