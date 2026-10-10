---
name: Queued optimistic rollback
description: Why per-mutation onMutate snapshots are the wrong rollback target when clicks are queued behind an in-flight write.
---

When later clicks are applied to the cache optimistically while an earlier write is in flight, a queued mutation's `onMutate` snapshot already contains its own flip. Rolling back to that snapshot on failure keeps the failed change visible.

**Rule:** roll back to the last server-confirmed state (seed it when the write chain starts, update it from each successful response), then re-apply only the intents still queued.

**Also:** a failed background refetch must not swap a loaded page for a full-page error. Show the error state only when the query has no data.

**Why:** the completion review rejected a journey progress queue for exactly this. The bug only shows when the queued write fails AND the reconciling refetch is also unavailable, so an online refetch normally hides it.

**How to apply:** any optimistic UI with a client-side write queue. Prove it with a browser run where A succeeds, queued B fails, and the detail GET is aborted, reading the UI without a reload.
