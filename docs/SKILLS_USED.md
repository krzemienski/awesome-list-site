# Skills Used in This Project

## Custom Skills Created

### multi-context-integration-testing

**Location**: `~/.claude/skills/multi-context-integration-testing/`

**Created**: 2025-11-30 (Session 8)

**Purpose**: Proven patterns for multi-context integration testing developed through this project

**When to invoke**: Before starting any integration testing work (Domain 2-5 in master plan)

**What it provides**:
- MultiContextTestHelper class for managing multiple authenticated browser contexts
- 3-layer validation methodology (API + Database + UI)
- Auth token extraction from localStorage patterns
- RLS isolation testing patterns
- Rate limiting handling

**How to invoke**:
```
Use the multi-context-integration-testing skill when testing endpoints or workflows
```

**Evidence it works**:
- Session 8: 13 integration tests passing using these patterns
- Found 3 RLS bugs that would have shipped to production
- Reduced testing time from 8-12 hours (trial-and-error) to 4 hours (systematic)

---

## Superpowers Skills Invoked

### systematic-debugging
- Used in Session 8 to debug black screen issue (circular Vite dependency)
- 4-phase protocol: Root Cause → Pattern Analysis → Hypothesis → Fix

### root-cause-tracing
- Referenced in master plan for complex debugging scenarios

### executing-plans
- Used to execute master verification plan in batches

### writing-skills + testing-skills-with-subagents
- Used to create multi-context-integration-testing skill following TDD-for-docs

---

**Note**: Skills are personal/global tools. They exist in `~/.claude/skills/` and can be used across projects.
