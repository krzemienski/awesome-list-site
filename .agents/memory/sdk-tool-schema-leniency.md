---
name: MCP tool schemas must be lenient for non-Anthropic models
description: SDK-side zod rejects loose tool args BEFORE the handler runs (no event, no save, breaker miscounts); validate in-handler instead
---

Custom OpenAI-compatible models (grok etc.) routinely emit tool args with numbers as strings ("85") or omit "required" fields. The Claude Agent SDK validates MCP tool input with zod `safeParseAsync` BEFORE the handler runs — a rejection means the handler never executes, no tool event is emitted, and from the run log it looks like the bridge silently dropped the call.

**Why:** an entire research run saved zero discoveries because every save call was rejected SDK-side, and the MCP circuit breaker counted those "no handler response" strikes as bridge-death and aborted the run.

**How to apply:**
- Tool `inputSchema`s for agent-facing MCP tools stay lenient: fields `.optional()`, numerics `z.union([z.number(), z.string()])`, "REQUIRED:" spelled out in the `describe()` text.
- Enforce the real contract IN-HANDLER and return instructive JSON errors (`{error, guidance: "Re-call with ..."}`) so the model can self-correct instead of stalling.
- Any circuit breaker watching for unanswered mcp__ calls must classify tool_results: only genuine bridge-death signatures (no such tool / not connected / mcp server failed|closed) count as strikes; validation rejections and handler errors must reset the counter.
- Custom models may also pass `model:` per Task/Agent delegation — strip it in a PreToolUse hook or subagents 404 on the custom endpoint.
- Terminal job status must be persisted via a small dedicated retried UPDATE before any heavyweight log persist, or a crash mid-persist leaves jobs stuck "processing".
