---
name: no-mocking-validation-gates
description: |
  Prevents circumventing validation gates by creating mock/stub implementations. Enforces real system integration.
  Use when: implementing integrations, facing timeout/API issues, tempted to add fallback modes, plan says "no mocking".
  Covers: mock detection, rationalization patterns, real-system debugging, integration failure diagnosis.
  Keywords: mock, stub, fallback, test mode, fake data, bypass, validation gate, integration
---

# No Mocking Validation Gates

## The Violation This Prevents

When facing integration challenges (timeouts, API issues, CLI problems), there's a temptation to:
1. Create "mock" or "test" endpoints that return fake data
2. Add "fallback" modes that bypass the real system
3. Rationalize "it's just for testing" when the plan explicitly forbids mocking

**This is NEVER acceptable when the project specifies "NO mocking, stubs, or placeholder data EVER".**

## The Pattern to Recognize

Watch for these rationalizations:
- "The CLI isn't responding, let me create a mock mode"
- "This will help with testing while we debug"
- "I'll add a fallback that returns realistic data"
- "The infrastructure is working, we just need test data"

**If you catch yourself creating ANY of these, STOP IMMEDIATELY.**

## The Correct Approach

When integration fails:

1. **DIAGNOSE** - Why isn't the real system responding?
   - Check if the CLI is in PATH
   - Verify API credentials/authentication
   - Check for process conflicts
   - Review error logs

2. **FIX** - Address the actual root cause
   - Update PATH environment
   - Fix authentication
   - Resolve process conflicts
   - Debug the actual integration

3. **VERIFY** - Confirm the real system works
   - Test with actual CLI commands
   - Capture real output
   - Validate end-to-end flow

## Red Flags in Code

**NEVER write code like:**
```swift
// BAD: Mock fallback
if !claudeAvailable {
    return mockResponse()
}

// BAD: Test mode bypass
if input.prompt.hasPrefix("__TEST__") {
    return fakeChatStream()
}

// BAD: "Realistic" fake data
let mockStream = AsyncThrowingStream { continuation in
    continuation.yield(.assistant(fakeMessage))
}
```

**ALWAYS write code like:**
```swift
// GOOD (Swift): Fail clearly when system unavailable
guard await executor.isAvailable() else {
    throw Abort(.serviceUnavailable, reason: "Claude CLI not available")
}

// GOOD (Swift): Use real system
let stream = executor.execute(prompt: input.prompt, ...)
return StreamingService.createSSEResponse(from: stream, on: req)
```

```typescript
// GOOD (TypeScript/Next.js): Fail clearly when system unavailable
const health = await fetch(`${BACKEND_URL}/health`);
if (!health.ok) {
  return NextResponse.json(
    { error: "Backend service unavailable" },
    { status: 503 }
  );
}

// GOOD (TypeScript): Use real system, never mock the SDK
import { query } from "@anthropic-ai/claude-agent-sdk";
delete process.env.CLAUDECODE; // Required in dev to prevent nested session rejection
const result = await query({ prompt, tools });
return NextResponse.json(result);
```

```typescript
// BAD (TypeScript): Mock fallback
const getResponse = async (prompt: string) => {
  if (process.env.NODE_ENV === "test") {
    return { content: "Mock AI response" }; // NEVER DO THIS
  }
  return await query({ prompt });
};

// BAD (TypeScript): Fake data endpoint
app.get("/api/test/sessions", (req, res) => {
  res.json([{ id: "fake-1", title: "Mock Session" }]); // NEVER DO THIS
});
```

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Create a "mock mode" fallback when the real system times out | Hides the real integration bug; mock data passes validation gates that real data would fail | Diagnose the timeout root cause (DNS, auth, process conflicts) and fix the real system |
| Add `if (process.env.NODE_ENV === "test")` guards that return fake data | Test-mode bypasses create two code paths — the mock path is never validated against real behavior | Remove the guard; use the real system in all environments |
| Rationalize "it's just temporary for debugging" | Temporary mocks become permanent; no one removes them once the feature "works" | Log the real error, fix it, and validate with the real system |
| Return hardcoded "realistic" data when an API call fails | Realistic fakes pass visual inspection but mask data-shape mismatches, auth failures, and rate limits | Let the failure propagate with a clear error message so it gets fixed |

## Related Skills

- `functional-validation` — Full validation protocol (philosophy + platform routing)
- `e2e-validate` — Execution engine with workflows, scripts, and templates
- `gate-validation-discipline` — Evidence-based completion verification
- `verification-before-completion` — Pre-completion behavioral checks

## When NOT to Use

- Writing actual production feature flags (not mock bypasses)
- Creating test fixtures for CI pipelines with explicit user approval
- Building development seed scripts that clearly label data as synthetic

## Conflicts

- **functional-validation**: Complementary — this skill prevents mocking, functional-validation provides the real validation protocol
- **e2e-validate**: Complementary — both enforce real-system testing

## The Bottom Line

**If the real system doesn't work, FIX THE REAL SYSTEM.**

Creating mock implementations:
- Violates the validation methodology
- Hides real bugs
- Creates false confidence
- Wastes time on throw-away code
- Breaks trust with the user

The validation gate exists precisely to ensure real functionality. Circumventing it defeats the entire purpose.
