# Run Config — awesome.video Black-Box Audit

| Field | Value |
|---|---|
| Target URL | https://awesome.video/ |
| Site purpose | User-stated: web app / dashboard / tool. Inferred from landing: "Awesome Video" catalog/curation site for video resources (a sibling "awesome-list"). The site lists curated entries (links to videos/resources), supports browsing/filtering/search, and exposes an admin/authenticated surface for contribution management. The core journey is browse + filter + open detail. Admin journey is auth-gated. |
| Stop condition | **bug-quota ≥100** confirmed bugs (overrides default full-coverage). Continue past coverage completion until the quota is reached or surface is genuinely exhausted. |
| Viewports | Desktop 1440×900 (primary), Tablet 768×1024, Mobile 375×812 |
| Mode | Parallel subagents (the site has many pages; concurrent per-page audit cuts wall-clock) |
| Credentials | admin@example.com / (password redacted from this transcript; stored in agent-browser vault) |
| Driver | Playwright (chromium-headless-shell v1228) via hunt-workspace/engine |
| Workspace | ~/Desktop/awesome-list-site/hunt-workspace/ |
| Auth | Reported as NOT-COVERED for any surface behind login if vault injection fails |
| Notes | templates at references/report-template.md, references/playwright-engine.md, references/parallel-team.md |
