---
name: AI job liveness and terminal states
description: How enrichment/research job orphan detection, queue close-out and the budget_stopped status are meant to work; read before touching job admission, the orphan watchdog or job status UI.
---

Rule: orphan decisions for enrichment/research jobs use worker liveness (worker_id + heartbeat_at), never age alone. Same-container dead pid → reclaim immediately. Other container → heartbeat older than 45 s. Rows with no worker_id → legacy 5-minute rule. Ids owned in-process are never touched.
**Why:** prod is Autoscale (several instances), so an in-process registry alone cannot tell a sibling's live job from a dead one. Age-only rules left a 5-minute 409 window after every restart. PG session advisory locks were rejected because the pooler status is unknown.
**How to apply:** every new writer of an active job row must stamp WORKER_ID + heartbeat and run the heartbeat helper. A worker whose row leaves the active states must stop, and it must not overwrite a reclaim's 'failed' verdict.

Rule: when an enrichment job reaches a terminal state, its leftover queue rows become 'cancelled' (with a reason in error_message), not 'skipped', and counters are not bumped.
**Why:** 'skipped' already means invalid URL / manually curated. Bumping counters would fake 100% progress.

Rule: a run stopped by its USD cap is `budget_stopped`, not failed or completed. Status columns are free text with no contract enums, so any new value needs label/tone entries in every admin status surface (ResearcherTab, BatchEnrichmentPanel, both StatusChip maps).
