---
name: Sync watchdog needs live queue ids
description: Why route-started GitHub imports/exports must register as live, and why the link scan must not hold the heavy-work slot.
---
The periodic orphan watchdog fails any `processing` github_sync_queue row older than 5 minutes unless its id is in the sync service's live-id set. Anything that runs a sync outside processQueue (the admin import/export routes) must wrap its work in the service's owned-queue-item helper.

**Why:** exports run a pre-push link check over ~1,800 links that takes >5 min, so every real export was flipped to "Orphaned by server restart" mid-run while still pushing.

**How to apply:** any new code path that starts a sync, enrichment or research job must register its row as live with the watchdog. Long network-bound work (link scans) should take the single shared heavy-work slot only for its DB read; holding it for the whole sweep 503s pull/sync/backup for 20–40 min.
