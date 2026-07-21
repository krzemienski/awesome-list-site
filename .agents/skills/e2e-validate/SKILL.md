---
name: e2e-validate
description: Comprehensive end-to-end functional validation for any project type — CLI, Web Frontend, Backend API, iOS/macOS, or Full-Stack. Detects project platform from codebase, generates validation plans, executes real-system tests (never mocks), captures evidence (screenshots, curl responses, CLI output, simulator recordings), and produces PASS/FAIL verdicts with remediation. Use when asked to "e2e test", "validate", "end-to-end", "prove it works", "functional test", "integration test", or any request to verify a project works from the end-user perspective. Also use when tempted to write unit tests, mocks, or test files — this skill enforces the Iron Rule instead.
---

<iron_rule>
```
IF the real system doesn't work, FIX THE REAL SYSTEM.
NEVER create mocks, stubs, test doubles, or test files.
NEVER write .test.ts, _test.go, Tests.swift, test_*.py, or any test harness.
ALWAYS validate through the same interfaces real users experience.
ALWAYS capture evidence. ALWAYS review evidence. ALWAYS write verdicts.
```
</iron_rule>

<mock_detection>
These thoughts mean you are about to violate the Iron Rule. STOP immediately:

- "Let me add a mock fallback" → Fix why the real dependency is unavailable
- "I'll write a quick unit test" → Run the real app, look at the real output
- "I'll stub this database" → Start a real database instance
- "The real system is too slow" → That is a real bug. Fix it.
- "I'll add a test mode flag" → There is one mode: production. Test that.
- "Just for local development" → Use the same setup a user would
</mock_detection>

<platform_detection>
Detect the project platform by scanning the codebase. Check these indicators IN ORDER and assign the FIRST match. If multiple apply, use the combined platform type.

| Priority | Indicator Files | Platform | Validation Reference |
|----------|----------------|----------|---------------------|
| 1 | `.xcodeproj`, `.xcworkspace`, `Package.swift` | **ios** | references/ios-validation.md |
| 2 | `Cargo.toml` with `[[bin]]`, `go.mod` with `main.go`, `pyproject.toml` with `[project.scripts]`, `package.json` with `"bin"` | **cli** | references/cli-validation.md |
| 3 | REST routes, `routes/`, OpenAPI spec, `swagger.json`, Express/FastAPI/Flask/Gin/Actix handlers WITHOUT frontend files | **api** | references/api-validation.md |
| 4 | React/Vue/Svelte/Angular, `pages/`, `app/`, `src/components/`, `index.html` WITHOUT backend routes | **web** | references/web-validation.md |
| 5 | Frontend framework files AND backend routes/handlers | **fullstack** | references/fullstack-validation.md |
| 6 | None of the above | **generic** | references/generic-validation.md |

Detection script:
```bash
detect_platform() {
  local HAS_IOS=0 HAS_CLI=0 HAS_API=0 HAS_WEB=0

  [ -n "$(find . -maxdepth 3 -name '*.xcodeproj' -o -name '*.xcworkspace' -o -name 'Package.swift' 2>/dev/null | head -1)" ] && HAS_IOS=1

  [ -f Cargo.toml ] && grep -q '\[\[bin\]\]' Cargo.toml 2>/dev/null && HAS_CLI=1
  [ -f go.mod ] && [ -f main.go -o -d cmd/ ] && HAS_CLI=1
  [ -f pyproject.toml ] && grep -q '\[project.scripts\]' pyproject.toml 2>/dev/null && HAS_CLI=1
  [ -f package.json ] && grep -q '"bin"' package.json 2>/dev/null && HAS_CLI=1

  local API_SIGNALS=$(find . -maxdepth 3 \( -name 'routes*' -o -name 'handlers*' -o -name 'controllers*' -o -name 'swagger*' -o -name 'openapi*' \) 2>/dev/null | head -1)
  [ -n "$API_SIGNALS" ] && HAS_API=1

  local WEB_SIGNALS=$(find . -maxdepth 3 \( -name '*.jsx' -o -name '*.tsx' -o -name '*.vue' -o -name '*.svelte' -o -name 'next.config*' -o -name 'vite.config*' -o -name 'angular.json' \) 2>/dev/null | head -1)
  [ -n "$WEB_SIGNALS" ] && HAS_WEB=1

  [ "$HAS_IOS" -eq 1 ] && echo "ios" && return
  [ "$HAS_CLI" -eq 1 ] && echo "cli" && return
  [ "$HAS_WEB" -eq 1 ] && [ "$HAS_API" -eq 1 ] && echo "fullstack" && return
  [ "$HAS_API" -eq 1 ] && echo "api" && return
  [ "$HAS_WEB" -eq 1 ] && echo "web" && return
  echo "generic"
}
```

**Load ONLY the reference file for the detected platform.** Loading all references wastes context. For fullstack, load BOTH api-validation.md and web-validation.md.
</platform_detection>

<evidence_standards>
Every validation MUST produce reviewable evidence saved to `e2e-evidence/`:

| Platform | Evidence Type | Capture Method |
|----------|--------------|----------------|
| iOS | Screenshots + video + logs | `xcrun simctl io`, `log stream` |
| CLI | Terminal output + exit codes | `./binary args 2>&1 \| tee output.txt` |
| API | HTTP responses + status codes | `curl -s url \| tee response.json \| jq .` |
| Web | Browser screenshots + console | Playwright or agent-browser |
| Full-Stack | All of the above, bottom-up | DB → API → Frontend |

Evidence quality:
- **GOOD**: Screenshot showing "41 sessions" badge on dashboard
- **BAD**: Screenshot showing dashboard exists
- **GOOD**: curl response with `{"total": 41, "items": [...]}`
- **BAD**: curl response with just `200 OK`
- **GOOD**: CLI output: `Processed 150 files in 2.3s`
- **BAD**: CLI output: `Done`

**Capturing evidence without reviewing it is WORSE than not capturing it.** For EVERY piece of evidence: READ it → CHECK against PASS criteria → NOTE discrepancies → WRITE verdict.
</evidence_standards>

<validation_order>
Always validate bottom-up through the dependency stack:

```
Database → Backend API → Frontend / CLI / Mobile
```

A frontend bug might actually be a backend bug. Validate the deepest dependency first. For each layer, define PASS criteria BEFORE capturing evidence.
</validation_order>

<intake>
Parse the command arguments to determine the workflow. Arguments are passed via $ARGUMENTS from the slash command.

Supported argument flags (combinable):

| Flag | Effect |
|------|--------|
| `--analyze` | Scan codebase, detect platform, identify all user journeys and endpoints. Output analysis only. |
| `--plan` | After analysis, generate a validation plan with PASS criteria for every journey. Requires approval before execution. |
| `--execute` | Run the full validation plan. If no plan exists, analyze + plan + execute. |
| `--fix` | When validation fails, attempt to fix the code and re-validate. |
| `--audit` | Run validation and save a detailed audit report without fixing anything. |
| `--report` | Generate/export a markdown report of the last validation run. |
| `--ci` | Non-interactive mode: no approval prompts, auto-execute everything. |
| `--platform <type>` | Override auto-detection. Values: ios, cli, api, web, fullstack. |
| `--scope <path>` | Limit validation to a specific module or directory. |
| `--parallel` | Use sub-agents for parallel research and validation phases. |
| `--verbose` | Detailed output including all curl responses, full CLI output, etc. |

Default (no flags): `--analyze --plan --execute` with approval gate between plan and execute.
</intake>

<routing>
| Parsed Intent | Workflow | Reference Files to Load |
|---------------|----------|------------------------|
| `--analyze` only | [workflows/analyze.md](workflows/analyze.md) | Platform-specific reference |
| `--plan` (with or without --analyze) | [workflows/plan.md](workflows/plan.md) | Platform reference + templates/validation-plan.md |
| `--execute` | [workflows/execute.md](workflows/execute.md) | Platform reference |
| `--fix` | [workflows/fix-and-revalidate.md](workflows/fix-and-revalidate.md) | Platform reference |
| `--audit` | [workflows/audit.md](workflows/audit.md) | Platform reference + templates/audit-report.md |
| `--report` | [workflows/report.md](workflows/report.md) | templates/e2e-report.md |
| Default (no flags) | [workflows/full-run.md](workflows/full-run.md) | Platform reference + all templates |
| `--ci` | [workflows/ci-mode.md](workflows/ci-mode.md) | Platform reference |

**After reading the workflow, follow it exactly.**
</routing>

<reference_index>
Platform-specific validation guides (load only what applies):

| File | Platform | Contents |
|------|----------|----------|
| references/cli-validation.md | CLI apps | Build, execute, capture output, verify exit codes |
| references/api-validation.md | Backend APIs | Start server, health check, curl requests, verify JSON |
| references/web-validation.md | Web frontends | Browser automation, screenshots, responsive testing |
| references/ios-validation.md | iOS/macOS | Simulator, screenshots, video, logs, deep links |
| references/fullstack-validation.md | Full-stack | Bottom-up integration: DB → API → Frontend |
| references/generic-validation.md | Other/unknown | Adaptive validation for non-standard projects |
</reference_index>

<workflow_index>
| Workflow | Purpose |
|----------|---------|
| workflows/analyze.md | Codebase scanning, platform detection, journey mapping |
| workflows/plan.md | Generate validation plan with PASS criteria |
| workflows/execute.md | Run validation, capture evidence, write verdicts |
| workflows/fix-and-revalidate.md | Fix failures and re-run validation |
| workflows/audit.md | Read-only validation run, no code changes |
| workflows/report.md | Generate/export validation report |
| workflows/full-run.md | Complete analyze → plan → approve → execute pipeline |
| workflows/ci-mode.md | Non-interactive continuous integration mode |
</workflow_index>

<template_index>
| Template | Purpose |
|----------|---------|
| templates/validation-plan.md | Structured plan with gates per journey |
| templates/audit-report.md | Read-only audit with findings |
| templates/e2e-report.md | Full report with evidence references |
| templates/verdict.md | Per-journey PASS/FAIL verdict format |
</template_index>

<script_index>
| Script | Purpose |
|--------|---------|
| scripts/detect-platform.sh | Auto-detect project platform type |
| scripts/health-check.sh | Poll service health endpoints |
| scripts/evidence-collector.sh | Initialize evidence directory structure |
| scripts/api-validator.sh | Automated curl-based API validation |
| scripts/web-validator.mjs | Playwright-based web validation |
| scripts/ios-validator.sh | iOS simulator validation (adapted from ios-validation-runner) |
</script_index>

<success_criteria>
A complete e2e-validate run produces:
- Platform correctly detected (or overridden)
- Every user journey identified and documented
- PASS criteria defined BEFORE evidence capture
- Evidence captured for every journey step
- Every piece of evidence READ and reviewed (not just existence-checked)
- PASS/FAIL verdict written for every journey with evidence references
- Failed journeys include root cause analysis
- If --fix: code changes made, re-validation passed
- Final report saved to `e2e-evidence/report.md`
- Zero mocks, zero stubs, zero test files created
</success_criteria>

## Anti-Patterns

| Pattern | Why It's Wrong | Do This Instead |
|---------|---------------|-----------------|
| Capturing evidence without reviewing it | Creates false confidence — a screenshot of a crash dialog is still a .png file | READ every piece of evidence, CHECK against PASS criteria, WRITE verdict |
| Validating frontend before backend | Frontend bugs might actually be backend bugs — wrong diagnosis wastes time | Always validate bottom-up: Database → Backend API → Frontend |
| Defining PASS criteria after evidence capture | Confirmation bias makes you see what you expect instead of what's there | Define specific, observable PASS criteria BEFORE capturing any evidence |
| Loading all platform reference files | Wastes context on irrelevant platform guides | Detect platform first, load ONLY the matching reference file |
| Writing mocks or test files "to supplement" validation | Violates the Iron Rule — mocks test mock behavior, not real behavior | Fix the real system; validate through real user interfaces only |

## When NOT to Use

- Validating a single feature or bug fix (use `functional-validation` for targeted validation)
- Projects that use TDD with mocks by design (use `testing-anti-patterns` instead)
- Code review or architecture assessment (no real-system execution needed)
- Performance profiling (use dedicated profiling tools)

## Conflicts

- `functional-validation` — Overlapping scope. Use `e2e-validate` for the full platform-aware workflow with scripts, evidence directories, and reports. Use `functional-validation` for the core philosophy and single-feature validation.
- `testing-anti-patterns` — Fundamentally opposed philosophies. `e2e-validate` forbids all mocks/test files. `testing-anti-patterns` teaches how to mock correctly in TDD projects. Use one or the other based on project mandate.

## Related Skills

- `functional-validation` — protocol this skill implements; use when the full e2e-validate workflow is needed
- `gate-validation-discipline` — evidence-based completion verification enforced by every validation gate
- `no-mocking-validation-gates` — enforces the Iron Rule against mocks that this skill embeds
- `transform-validation-prompt` — transforms any prompt to add blocking validation gates like those here
- `create-validation-plan` — generates structured validation plans with PASS criteria
- `playwright-skill` — browser automation tool used for web platform evidence capture
- `preflight` — pre-execution checklist to run before starting e2e validation
