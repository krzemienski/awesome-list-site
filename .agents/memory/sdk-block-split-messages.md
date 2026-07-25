---
name: Agent SDK splits one API turn into many assistant messages
description: One API turn = several SDK assistant messages sharing message.id (one per content block), each repeating the same usage; breakers and token sums must account for this
---

The Claude Agent SDK emits **one `assistant` message per content block**, not per API turn. A single batched turn (e.g. 16 tool_use blocks) streams as 16 assistant messages that all share the same `message.id` and all carry an identical copy of that turn's `usage`. This is documented SDK behavior ("One API turn can produce several assistant messages that share a message.id"), not a bug.

**Why:** a prod research run was falsely aborted by the MCP circuit breaker — it counted "assistant messages containing mcp__ tool_use since the last tool_result", so 16 block-messages from ONE healthy turn looked like 16 unanswered calls and tripped the dead-bridge threshold mid-run. The same duplication inflated event-log token totals 16× for that turn.

**How to apply:**
- Never treat an assistant-message count (or per-message tool_use sightings) as evidence of unanswered tool calls. Track pending calls keyed by `tool_use_id`, cleared when the matching `tool_result` arrives.
- A stall verdict needs BOTH a large pending backlog (well above any plausible batch size) AND a long silence window since the last handler response — block batches arrive within milliseconds, so silence-based gating makes them harmless.
- Give any stall detector a timer backstop: an in-loop check only runs when a new message arrives, so a fully silent stream can never trip it.
- When summing tokens across events, dedupe usage by `message.id` — attribute the turn's usage to the first block-message only.
- Add an identical-error-text streak guard (abort after ~10 consecutive identical is_error results on mcp calls) so a dead bridge with an unrecognized error wording — or a model stuck re-sending the same bad input — still gets stopped without depending on a signature regex.
