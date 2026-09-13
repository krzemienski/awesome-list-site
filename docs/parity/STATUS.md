# Parity status

Latest baseline run: `2026-09-12T23-36-11-711Z-43761` (2026-09-12T23:36:11.711Z) — gate **NOT PASSED**.

Pixel rows: 0 pass, 93 fail, 0 incomplete, 4 blocked of 101. Eligibility: {"pixel":26,"token-only":14,"artifact-docs":22,"blocked":12}.

## Largest measured gaps

| Screen | Width | Diff % | Reason |
|---|---:|---:|---|
| app.admin.resources | 1440 | 98.7689% | 98.769% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.resources | 1024 | 98.7077% | 98.708% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
| app.admin.resources | 768 | 98.7065% | 98.707% differing pixels exceeds the 0.5% ceiling; backdrop-filter sets differ (app ["blur(14px)"] vs reference ["blur(14px)","blur(2px)"]) |
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

## Incomplete rows

- none

See [REPORT.md](REPORT.md) for every row and the evidence links.
