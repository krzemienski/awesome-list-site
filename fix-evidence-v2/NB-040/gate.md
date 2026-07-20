# NB-040 — paid/long background jobs launch with no confirmation — VG PASS (July 20, 2026)

**Fix**: explicit AlertDialog confirmation added on all four admin surfaces that start background jobs:
- ResearcherTab — "Launch research job?" (budget + turns + real API cost stated) — `button-confirm-launch` / `button-cancel-launch`
- BatchEnrichmentPanel — "Start enrichment job?" (`dialog-confirm-enrichment`)
- LinkHealthDashboard — "Run link health check?" (`dialog-confirm-link-check`), both Run buttons rewired
- ExportTab — "Run awesome-lint validation?" / "Run link check?" (`dialog-confirm-export-job`, shared for both actions)

**Proof (live, dev, Playwright authed admin)**: on each surface, clicking the launch/run button opened the dialog (text captured below), Cancel dismissed it, and a network watcher on all five job-start endpoints (`/api/researcher/start`, `/api/enrichment/start`, `/api/admin/link-health/run`, `/api/admin/validate`, `/api/admin/check-links`) recorded **zero POSTs** across the whole pass. `research_jobs` total unchanged (21 before/after, incl. QA seeds later torn down).

Dialog texts:
- "Launch research job? This starts a Claude research agent with a budget of up to $1.00 and 30 turns. The job runs in the background and incurs real API cost."
- "Start enrichment job? This starts a Claude AI enrichment run over unenriched resources in batches of 10. …incurs real API cost."
- "Run link health check? This checks every resource URL in the catalog against the live web. …can take several minutes."
- "Run awesome-lint validation? …runs in the background and can take a minute."
- "Run link check? This checks the links in the exported markdown against the live web. …several minutes."

Screenshots: `NB-040-researcher-confirm.png`, `NB-040-enrichment-confirm.png`, `NB-040-linkhealth-confirm.png`, `NB-040-export-validate-confirm.png`, `NB-040-export-links-confirm.png`.
