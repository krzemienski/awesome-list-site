---
name: Anthropic mid-loop steering
description: How to inject guidance into an Anthropic agent loop mid-run without a 400 (research agent + any future agent loop).
---

# Steering an Anthropic agent loop mid-run

Applies to hand-written Messages-API loops only. As of Oct 2026 the research agent runs on the Claude Agent SDK and no longer has a hand-written loop (no `messages.create` in `server/ai/researchService.ts`); steer it through the SDK (prompt, hooks) instead. To nudge a hand-written loop's strategy mid-conversation, append the guidance as a `{ type: 'text', text: ... }` block to the SAME user message that already carries the `tool_result` blocks — do NOT push a separate standalone `{ role: 'user' }` message.

**Why:** The Anthropic Messages API requires strict user/assistant role alternation. After an assistant turn with `tool_use`, the very next message MUST be a single `user` message containing a `tool_result` for every `tool_use` id. Pushing the tool_results AND then a second user message produces two consecutive user turns → HTTP 400. Putting the text block after the tool_result blocks in the one user turn satisfies both constraints.

**How to apply:** Build `const userContent: any[] = [...toolResults]; if (nudge) userContent.push({ type: 'text', text: nudge }); messages.push({ role: 'user', content: userContent });`. Tool_result blocks first, then any extra text.

## Research agent "don't give up" tuning (same file)
- A research turn should count as PRODUCTIVE if it found a fresh non-duplicate candidate (`check_duplicate` → `isDuplicate === false`), not only if it called `save_discovery`. Counting only saves makes the agent quit while mid-exploration on real leads.
- Escalate before bailing: inject a strategy-pivot nudge after a few stalled turns and only hard-stop after sustained stalling — never abort after 1–2 duplicate-only turns on a large budget.
- `web_search` `max_uses` is a per-run total cap; tie it to the run size (not a flat ~12) or long high-budget runs get kneecapped after a handful of searches.
