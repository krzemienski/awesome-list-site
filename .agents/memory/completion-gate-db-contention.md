---
name: Completion gate database contention
description: How to distinguish configured completion-suite interference from a feature regression.
---

Completion validation can launch database-heavy gates together even when browser audits share a Chromium lease. A pool burst, resilience outage, large SEO crawl, and write-race harness can therefore produce unrelated 503s, empty hydrated pages, and false UI assertion failures.

**Why:** Browser serialization prevents process/thread exhaustion but does not serialize database pressure. A clean restart plus sequential reruns can pass the same UI, race, and SEO gates that fail in the combined suite; the pool probe may also expose an independent capacity baseline.

**How to apply:** Inspect failing logs for 503s or missing content, restart the application, and rerun each failed gate alone. Do not change feature code unless an isolated rerun reproduces a path reached by the feature diff. If an unrelated gate still fails alone, report or skip it explicitly rather than broadening the task.