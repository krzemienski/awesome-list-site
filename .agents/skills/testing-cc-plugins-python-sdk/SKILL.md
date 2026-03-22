---
name: testing-cc-plugins-python-sdk
description: |
  Claude Agents SDK (Python) reference for plugin testing, session management, and streaming.
  Use when: Testing Claude Code plugins programmatically, building autonomous agents with Python SDK, monitoring long-running operations.
  Covers: SDK installation, session lifecycle, streaming messages, tool results, progress monitoring, error handling.
  Keywords: claude sdk, python sdk, claude-code-sdk, plugin testing, session management, streaming, autonomous agent
---

# Claude Agents SDK (Python)

## When to Use

- Testing Claude Code plugins programmatically
- Building autonomous agents using the Python SDK
- Monitoring long-running Claude Code operations
- Managing session lifecycle (create, resume, stream)

## When NOT to Use

- TypeScript/Node.js Claude SDK (use `claude-api` skill)
- Building MCP servers (use `mcp-builder`)
- General Python testing (use `python-testing`)

## Conflicts

- `claude-api` — covers the TypeScript/REST API; this skill covers the Python Agents SDK
- `developing-cc-plugins` — covers plugin creation; this skill covers testing plugins via SDK

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Poll for completion in tight loop | Burns CPU; may hit rate limits | Use async streaming with `async for` on message stream |
| Ignore `tool_use` messages in stream | Miss critical tool execution results | Handle all message types: `text`, `tool_use`, `tool_result` |
| Create sessions without cleanup | Leaked processes; resource exhaustion | Use `async with` context manager or explicit `session.close()` |
| Hardcode model in production code | Model availability changes; no fallback | Use config with fallback: `model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")` |
| Skip error handling on session start | Silent failures; hung processes | Wrap session creation in try/except; check for auth errors |

## Installation

```bash
pip install claude-code-sdk
# Requires: Claude CLI installed and authenticated
```

## Session Lifecycle

```python
from claude_code_sdk import ClaudeCodeSession

async with ClaudeCodeSession() as session:
    response = await session.query("Explain this codebase")
    print(response.text)
```

## Streaming Messages

```python
async with ClaudeCodeSession() as session:
    async for message in session.stream("Refactor the auth module"):
        if message.type == "text":
            print(message.content, end="", flush=True)
        elif message.type == "tool_use":
            print(f"\n[Tool: {message.name}({message.input})]")
        elif message.type == "tool_result":
            print(f"[Result: {message.content[:100]}]")
```

## Plugin Testing Pattern

```python
async def test_plugin_behavior():
    async with ClaudeCodeSession(
        cwd="/path/to/project",
        allowed_tools=["Read", "Write", "Bash"],
    ) as session:
        response = await session.query("Use my-plugin to process data.json")
        tool_calls = [m for m in response.messages if m.type == "tool_use"]
        assert any(t.name == "my-plugin" for t in tool_calls)
```

## Monitoring Long-Running Operations

```python
import asyncio

async def monitor_with_timeout(prompt: str, timeout: int = 300):
    async with ClaudeCodeSession() as session:
        try:
            async for message in asyncio.wait_for(
                session.stream(prompt), timeout=timeout
            ):
                if message.type == "text":
                    print(message.content, end="")
        except asyncio.TimeoutError:
            print(f"\nOperation timed out after {timeout}s")
```

## Key SDK Types

| Type | Description |
|------|-------------|
| `ClaudeCodeSession` | Main session class; manages CLI subprocess |
| `Message` | Base message with `type`, `content` fields |
| `ToolUseMessage` | Tool invocation with `name`, `input` |
| `ToolResultMessage` | Tool execution result |

## Related Skills
- `claude-api` — TypeScript/REST Claude API
- `developing-cc-plugins` — building Claude Code plugins
