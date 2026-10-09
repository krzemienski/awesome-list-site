---
name: Aborted agent run usage
description: Why cancelled Claude Agent SDK runs must accumulate streamed usage, and how to prove cancellation on scratch without over-spending.
---

An aborted Claude Agent SDK run never emits the final result message. Anything that reads usage or cost only from that message records 0 tokens and $0 for cancelled runs, even after real paid work. The run helper therefore accumulates per-message usage, deduplicated by message.id, while streaming. Cost remains unknown on abort, so treat the recorded tokens as a lower bound.

**Why:** a live research cancel recorded tokens 0/0 even though 3 web searches had run. "Preserve accrued usage on cancel" cannot be proven without the streamed accumulation.

**How to apply:**
- Any new cancel or abort path, or any job type built on the agent runtime, must persist the streamed tokens.
- Do not gate "empty run" heuristics on cost alone; zero tokens is required too.
- Before starting a paid enrichment on a scratch clone, count the queue exactly the way the server selects it. The "unenriched" filter matches far more rows than a naive metadata IS NULL check, and a mismatch auto-starts extra paid batches.
