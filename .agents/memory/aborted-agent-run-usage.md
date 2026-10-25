---
name: Aborted agent run usage
description: Why cancelled Claude Agent SDK runs must accumulate streamed usage, and how to prove cancellation on scratch without over-spending.
---

An aborted Claude Agent SDK run never emits the final result message. Anything that reads usage or cost only from that message records 0 tokens and $0 for cancelled runs, even after real paid work. The run helper therefore accumulates per-message usage, deduplicated by message.id, while streaming. On abort the cost is priced from that streamed usage and stored with `research_jobs.cost_basis = 'lower_bound'` (completed runs store the SDK's `total_cost_usd` as `reported`). It is a real lower bound, not an estimate: on a calibration run the stream priced to about 45% of the reported cost, because model calls made inside tools (WebSearch) never appear in the stream. Final output-token counts arrive only on `message_delta` stream events, so the query must set `includePartialMessages` (piece B, Oct 2026).

**Why:** a live research cancel recorded tokens 0/0 even though 3 web searches had run. "Preserve accrued usage on cancel" cannot be proven without the streamed accumulation.

**How to apply:**
- Any new cancel or abort path, or any job type built on the agent runtime, must persist the streamed tokens.
- Do not gate "empty run" heuristics on cost alone; zero tokens is required too.
- Before starting a paid enrichment on a scratch clone, count the queue exactly the way the server selects it. The "unenriched" filter matches far more rows than a naive metadata IS NULL check, and a mismatch auto-starts extra paid batches.
