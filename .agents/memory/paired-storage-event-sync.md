---
name: Paired storage-event sync
description: Cross-tab synchronization and browser-harness timing rules for related localStorage keys.
---

Treat related localStorage keys as one logical update: coalesce their native `storage` events to the next task before reading the complete stored state.

**Why:** Browsers can expose an intermediate pair while delivering separate key events, briefly mixing the new value for one key with the old value for another. In this SPA, server-injected content can also make `#root` look ready before React effects have mounted.

**How to apply:** Cross-tab consumers should resolve the final pair together after coalescing. Browser checks should wait for a client-rendered, route-specific control and perform the valid change through the real UI before probing invalid or removed storage values.