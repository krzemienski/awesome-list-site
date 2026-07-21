---
name: functional-validation
description: |
  Enforces end-user perspective testing — NEVER write mocks, unit tests, or test files. Always validate through real system execution.

  Use when: validating any feature works, verifying a bug fix, confirming implementation completeness, tempted to write test files
  Covers: iOS simulator screenshots, CLI binary execution, cURL API requests, browser automation, evidence-based PASS/FAIL gates
  Keywords: validation, functional test, real system, no mocks, evidence, PASS/FAIL, screenshots, integration, end-to-end
---

# Functional Validation

## The Iron Rule

```
IF the real system doesn't work, FIX THE REAL SYSTEM.
NEVER create mocks, stubs, test doubles, or test files.
ALWAYS validate through the same interfaces real users experience.
```

## Before You Validate

Ask yourself:
- **What does PASS look like?** Define specific, observable criteria BEFORE capturing evidence. "App works" is not a criteria. "Dashboard shows 3 active sessions with green status indicators" is.
- **What platform am I validating?** Detect from project files (see table below). Wrong platform = wrong validation approach = wasted time.
- **Is the system running?** Backend, database, external services — start them ALL before validating. Partial systems produce misleading failures.
- **Am I about to write a test file?** If yes, STOP. You are violating the Iron Rule. Fix the real system instead.

## Platform Detection and Routing

| Indicator | Platform | Reference | Key Tool |
|-----------|----------|-----------|----------|
| `.xcodeproj`, `.xcworkspace` | iOS/macOS | **MANDATORY READ**: [ios-validation.md](references/ios-validation.md) | `xcrun simctl` + screenshots |
| `Cargo.toml`, `go.mod`, `pyproject.toml` with `[project.scripts]`, CLI binary | CLI | **MANDATORY READ**: [cli-validation.md](references/cli-validation.md) | Binary/module execution + exit codes |
| REST routes, OpenAPI spec | Backend API | **MANDATORY READ**: [api-validation.md](references/api-validation.md) | `curl` + response verification |
| React/Vue/Svelte, `package.json` | Web Frontend | **MANDATORY READ**: [web-validation.md](references/web-validation.md) | Playwright + screenshots |
| Both frontend and backend | Full-Stack | Read BOTH api + web references | Integration through UI |

**Do NOT load** references for platforms that don't apply. Loading all four wastes context.

## Mock Detection — The Red Flags

These thoughts mean you're about to violate the Iron Rule. **STOP immediately.**

| The Thought | Why It's Wrong | What To Do Instead |
|-------------|---------------|---------------------|
| "Let me add a mock fallback for testing" | Mocks test mock behavior, not real behavior. You'll get a green light on broken code. | Fix why the real dependency isn't available. Start it. |
| "I'll write a quick unit test to verify" | Unit tests can't catch integration issues — the API returns 200 but the UI shows "No Data" because the JSON key changed. | Run the real app, look at the real UI. |
| "I'll stub this database" | In-memory DBs have different behavior (no constraints, no migrations, different SQL dialect). Your test passes, production crashes. | Start a real database instance. |
| "The real system is too slow/complex" | If it's too slow for you, it's too slow for users. That's a real bug. | Fix the performance issue. That IS the work. |
| "I'll add a test mode flag" | Test mode flags create two code paths. The production path is the one that breaks, and you're not testing it. | There is one mode: production. Test that. |
| "Just for local development" | "Just for local" artifacts get committed, merged, and deployed. Mock data leaks into production. It happens every time. | Use the same setup a user would. |

## The Validation Protocol

### 1. Start Real System and Execute

Start ALL real dependencies (backend, database, external services). Poll health endpoints — don't proceed until every dependency returns 200. Then execute through the platform's user interface. See your platform reference file for the specific build/launch/interaction sequence.

### 2. Capture Evidence

Every validation MUST produce reviewable evidence:

| Platform | Evidence | How to Capture |
|----------|----------|----------------|
| iOS/macOS | Screenshots | `xcrun simctl io booted screenshot path.png` |
| CLI | Terminal output | `./binary args 2>&1 \| tee output.txt` |
| API | Response bodies | `curl -s url \| tee response.json \| jq .` |
| Web | Browser screenshots | `page.screenshot({ path: 'evidence.png' })` |

### 3. Verify Evidence (THE CRITICAL STEP)

**Capturing evidence without reviewing it is worse than not capturing it** — it creates false confidence.

For every piece of evidence:
1. **READ it** — use the Read tool for screenshots, `cat` for text
2. **Check against PASS criteria** — the criteria you defined BEFORE validation
3. **Note discrepancies** — anything unexpected is either a bug or wrong criteria
4. **Write a verdict** — PASS with evidence reference, or FAIL with what went wrong

### 4. When Validation FAILS

This is where most workflows break. When you get a FAIL:

| Failure Type | Diagnosis | Fix |
|--------------|-----------|-----|
| App shows error dialog | Read the error text. Check backend logs. | Fix the API or error handling. |
| Screenshot shows wrong screen | Navigation failed. Check deep link URL or tap coordinates. | Fix navigation, increase wait time. |
| API returns 500 | Check server logs for stack trace. | Fix the backend handler. |
| CLI exits non-zero | Read stderr output. | Fix the reported error. |
| Black/blank screenshot | App hasn't rendered yet. | Increase sleep time after launch. |
| Data not showing | Backend not running, or wrong endpoint. | Verify backend health, check API prefix. |

**After fixing, RE-VALIDATE from step 1.** Partial re-validation misses regressions.

## Multi-Platform Validation

If your change touches multiple platforms (e.g., API + Web, CLI + API, Mobile + Backend), validate the deepest dependency first:

```
Database → Backend API → Frontend/CLI/Mobile
```

A frontend bug might actually be a backend bug. Validate bottom-up to isolate failures correctly. Load the reference file for each platform you're validating.

## Evidence Quality Standards

Not all evidence is equal. High-quality evidence:

| Quality | Example | Why It Matters |
|---------|---------|----------------|
| **Good** | Screenshot showing "41 sessions" badge on Home screen | Proves specific data loaded correctly |
| **Bad** | Screenshot showing Home screen exists | Proves nothing about data correctness |
| **Good** | curl response with `{"total": 41, "items": [...]}` | Proves API returns expected data |
| **Bad** | curl response with `200 OK` | Proves endpoint exists, not correctness |
| **Good** | CLI output: `Processed 150 files in 2.3s` | Proves functionality AND performance |
| **Bad** | CLI output: `Done` | Proves it finished, not that it worked |

## NEVER

- **NEVER write test files** (`.test.ts`, `_test.go`, `Tests.swift`, `test_*.py`) — they test abstractions, not the real system. A passing test suite with a broken app is worse than no tests at all.
- **NEVER mock HTTP clients** (`URLProtocol`, `nock`, `httptest`, `responses`) — mocked responses don't change when the real API changes. Your mock says 200, the real API says 404.
- **NEVER use in-memory databases** (`SQLite :memory:`, `H2`) — they accept invalid SQL, skip migration issues, and have different concurrency behavior. Your "test" passes, production crashes.
- **NEVER render components in isolation** (Testing Library, Storybook for validation) — a component working alone proves nothing about the integrated system. Props change, contexts differ, API responses vary.
- **NEVER claim PASS without reading evidence** — file existence is not verification. A screenshot of a crash dialog is still a `.png` file. A curl response of `{"error": "not found"}` is still a 200-byte JSON file.
- **NEVER validate against a "test" configuration** — if you need `TEST_MODE=true` for it to work, it doesn't work. There is one mode: the mode users experience.
- **NEVER skip re-validation after a fix** — fixing one thing can break another. The ONLY way to know is to re-run the full validation.

## Anti-Patterns

| Pattern | Why It's Wrong | Do This Instead |
|---------|---------------|-----------------|
| Capturing screenshots without reviewing them | Creates false confidence — a screenshot of a crash dialog is still a .png file | READ every screenshot with the Read tool, check against PASS criteria, note discrepancies |
| Defining PASS criteria after capturing evidence | Confirmation bias makes you see what you expect instead of what's there | Define specific, observable PASS criteria BEFORE capturing any evidence |
| Partial re-validation after a fix | Fixing one thing can break another — the only way to know is full re-run | Always re-validate from step 1 after any fix |
| Validating frontend without starting backend | Frontend shows onboarding/error states, not the feature you're validating | Start ALL real dependencies and poll health endpoints before validating |
| Using `200 OK` as proof of correctness | Status codes prove the endpoint exists, not that it returns correct data | Quote actual response bodies and verify data content |

## When NOT to Use
- TDD-based projects that require test files (use `testing-anti-patterns` instead)
- Go projects with established test suites (use `testing-strategy` instead)
- Pure code review without execution (use `code-review` instead)

## Conflicts
- `testing-anti-patterns` — that skill embraces TDD with mocks/test files; this skill forbids them. Use testing-anti-patterns for TDD projects.
- `testing-strategy` — Go-specific testing strategy that uses test files. Use for Go projects with established test suites.

## Related Skills

- `e2e-validate` — Full execution engine with workflows, scripts, templates, and CI mode. Use this for running validation.
- `gate-validation-discipline` — Evidence verification protocol. Use when marking tasks/gates complete.
- `no-mocking-validation-gates` — Guard rail against mock/stub creation. Always active.
- `verification-before-completion` — Behavioral pre-completion checks. Use before claiming done.
- `create-validation-plan` — Planning with embedded validation gates. Use when creating phased plans.
- `full-functional-audit` — Systematic discovery and validation of every screen/endpoint. Use for audits.
- `transform-validation-prompt` — Transform any prompt to embed validation gates.
- `preflight` — Pre-session environment checks. Run before starting validation work.
