---
name: production-readiness-audit
description: |
  Systematic 8-phase audit methodology for transforming development codebases into production-ready projects.
  Use when: Preparing for first release, major version bump, open-sourcing, or after rapid prototyping phase.
  Covers: Risk-based cleanup waves, parallel audit subagents, validation gates, zero-regression enforcement.
  Keywords: audit, cleanup, release prep, dead code, documentation drift, dependency audit
---

# Production Readiness Audit

Transform messy development codebases into production-ready projects through systematic, risk-ordered cleanup with zero regression tolerance.

## When to Use

- Before first release or major version bump (v0.x to v1.0)
- Before open-sourcing a private project
- After rapid prototyping phase with accumulated debt
- When onboarding new engineers takes >2 days

## When NOT to Use

- Greenfield project with no existing code
- Already has CI/CD with linting, formatting, and test gates
- Single-file scripts or throwaway prototypes
- Mid-feature development (finish the feature first)

## Conflicts

- `code-refactoring` — covers file splitting; this skill covers the broader audit that identifies what to split
- `dependency-health` — covers dependency remediation in depth; this skill's Phase 6 is lighter-weight

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| "Big bang" cleanup — fix everything in one commit | One bad change breaks everything, impossible to bisect | Use risk-based waves with validation after each |
| Remove code that "looks unused" without dead-code tooling | Functions may be called dynamically or via reflection | Use `knip`, `vulture`, `deadcode` to verify zero callers |
| Update docs after all code changes are done | Docs drift compounds — you forget what changed | Update docs in the same wave as the code change |
| Auto-merge Dependabot PRs without testing | Transitive dependency updates break unexpectedly | Batch updates, test together, single reviewed PR |
| Skip fresh-install test before tagging release | "Works on my machine" with cached state | Clone to temp dir, follow README exactly, time it |

## 8-Phase Methodology

### Phase 1: Parallel Audit (4 subagents)
Spawn in parallel: (1) File & dependency inventory, (2) Dead code detection, (3) Documentation alignment — test every README example, (4) Dependency security audit.

### Phase 2: Risk-Based Cleanup Waves
- **Wave 1 (Zero-Risk)**: Delete temp files, fix typos, remove empty dirs. No testing needed.
- **Wave 2 (Low-Risk)**: Remove unused imports, unreferenced functions, commented-out code. Run linter + smoke test.
- **Wave 3 (Medium-Risk)**: Remove disabled features, orphaned modules. Full regression test.
- **Wave 4 (High-Risk)**: Split large files, remove dependencies, architecture changes. Comprehensive testing + benchmarks.

**Critical**: Validate after EACH wave. Never batch waves together.

### Phase 3: Documentation Perfection
Test every example by copy-pasting commands. Fix broken README examples. Update architecture diagrams. Add troubleshooting section.

### Phase 4: Code Quality Standards
Apply formatters (black/prettier/cargo fmt). Add type hints. Standardize error handling. Set up pre-commit hooks.

### Phase 5: Refactor Large Files
Split files >500 LOC by responsibility. Preserve public API surface. Update imports.

### Phase 6: Optimize Dependencies
Remove unused deps. Replace heavy deps with lighter alternatives. Patch security vulnerabilities.

### Phase 7: Test Infrastructure
Ensure critical paths have coverage. Organize tests by type (unit/integration/e2e). Set up CI.

### Phase 8: Final Verification
1. Fresh-install test (clone, follow README, must work in <5 commands)
2. Full regression suite (100% pass)
3. All documented examples work
4. Production build succeeds

## Audit Report Template

```markdown
# Production Readiness Audit Report
**Project**: [Name] | **Date**: [YYYY-MM-DD]

## Summary
- Dead Code: [LOC] | Docs Issues: [count] | Vulnerabilities: [count]

## Prioritized Actions
1. [High impact, low effort first]

## Wave Timeline
- Wave 1: [hours] | Wave 2: [hours] | Wave 3: [hours] | Wave 4: [hours]
```

## Success Criteria

- Zero linter/type errors
- 100% documentation accuracy (all examples work)
- Zero unused dependencies
- Fresh install works in <5 commands, <10 minutes
- Zero regression (all tests pass)

## Related Skills
- `dependency-health` — deep dependency remediation
- `code-refactoring` — file splitting techniques
- `e2e-validate` — functional validation after each wave
- `scout` — fast codebase discovery for audit subagents
