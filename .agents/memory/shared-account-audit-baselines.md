---
name: Shared-account audit baselines
description: How to judge "state changed" reports when parallel auditors share one prod admin account, and which recommendation calls count as paid AI.
---
Parallel auditors share the single prod admin session, so one agent's baseline snapshot can land inside another agent's journaled create→delete window and later look like a "deleted real bookmark".

**Why:** a clean pass reported bookmarks 13 → 12; the "13" baseline was read 4 s into another agent's temporary QA bookmark. The true baseline was the earliest pre-mutation snapshot.

**How to apply:** before calling a shared-state delta a defect or residue, line up every agent's created.jsonl windows against the baseline timestamps; trust the earliest snapshot taken before any agent's first write.

Recommendations: an ordinary signed-in page load auto-POSTs /api/recommendations and is served from the engine's cache — allowed. Only the Refresh control / `?refresh=true` forces paid regeneration — SKIP it after checking its name and keyboard reach.
