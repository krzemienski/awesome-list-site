---
name: Sync history ↔ queue run matching
description: How to tie github_sync_history rows to github_sync_queue runs without mis-attributing commits.
---
Tie history rows to queue runs by identity, never by time. An export stamps `queueId` into its history row's metadata. It also keeps `commitSha` on its queue row, including when bookkeeping fails after the commit. For legacy rows that have neither, attribute a history row only if exactly ONE run with the same repo and direction was executing when the row was written. If several runs overlap, match nothing.

**Why:** a symmetric 10-minute window handed a later export's commit to an earlier export that was blocked before committing. An execution-window rule still fails when a second export is queued while the first is running.

**How to apply:** every join between the two tables (sync-status "commit landed", sync-history dedupe) goes through the one identity helper. New export paths must pass `queueId` and record `commitSha` on failure.
