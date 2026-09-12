---
name: Vitest spy calls vanish on mockRestore
description: vi.spyOn(...).mockRestore() resets mock.calls, so reading calls after a try/finally restore always sees an empty list.
---

**Rule:** When a test spies on `console.warn` (or any method) to capture what a middleware/observer logged during a request, push the formatted lines into a local array inside `mockImplementation(...)` and assert on that array — never read `spy.mock.calls` after `mockRestore()`.

**Why:** In vitest `mockRestore()` does what `mockReset()` does (clears calls/results) and then restores the original. A `try { await request(...) } finally { spy.mockRestore() }` followed by `spy.mock.calls` returns `[]` even when the observer fired, which reads as "the runtime contract observer is not installed in the test app" and sends you auditing the install path instead of the test.

**How to apply:** Any assertion of the form "this request produced zero `[contract] response mismatch` lines" (or the inverse mutation probe) must capture through the implementation callback; verify the capture works first with a deliberate mutation that MUST produce a line.
