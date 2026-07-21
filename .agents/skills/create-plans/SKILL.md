---
name: create-plans
description: |
  Create hierarchical project plans optimized for solo agentic development.
  Use when: Planning projects, phases, or tasks that Claude will execute. Creating briefs, roadmaps, phase plans, and context handoffs. Structuring work for Claude-as-implementer with verification criteria.
  Covers: Brief templates, roadmap generation, phase plan structure, context handoffs, verification criteria, solo-developer-plus-Claude workflow, plan-as-prompt philosophy.
  Keywords: planning, project plan, roadmap, phases, brief, context handoff, verification, agentic development
---

# Create Plans

Hierarchical project plans for solo agentic development: one user (visionary) + one implementer (Claude). No teams, no ceremonies, no coordination overhead.

## Core Principles

**Plans are prompts.** PLAN.md IS the prompt Claude executes — not a document that gets transformed. It contains objective, context (`@file` references), tasks, verification, and success criteria.

**Scope control via atomicity.** Claude's quality degrades at ~40-50% context usage (not 80%). Split phases into many small plans (2-3 tasks each). Better to have 10 small, high-quality plans than 3 large, degraded ones.

**Ship fast, iterate fast.** Plan -> Execute -> Ship -> Learn -> Repeat. Milestones mark shipped versions (v1.0, v1.1). No enterprise process.

## APPLICABILITY GUARD

**Use this skill when:**
- Starting a new project that needs phased planning
- Breaking a large feature into executable phases
- Creating a roadmap from a project brief
- Resuming work from a context handoff

**When NOT to Use:**
- Executing an existing plan — use `/run-plan` (loads ~5-7k tokens vs ~20k for this skill)
- Lightweight task lists or kanban — use `plans-kanban`
- Writing PRDs for ralph-tui agent execution — use `ralph-tui-prd`
- General documentation — use `docs`
- One-off quick tasks that don't need phased planning

## Planning Hierarchy

```
BRIEF.md          -> Human vision (you read this)
    |
ROADMAP.md        -> Phase structure (overview)
    |
RESEARCH.md       -> Research prompt (optional, for unknowns)
    |
FINDINGS.md       -> Research output (if research done)
    |
PLAN.md           -> THE PROMPT (Claude executes this)
    |
SUMMARY.md        -> Outcome (existence = phase complete)
```

Rules: Roadmap requires Brief. Phase plan requires Roadmap. PLAN.md IS the execution prompt. SUMMARY.md existence marks phase complete. Each level can look UP for context.

## Output Structure

```
.planning/
├── BRIEF.md
├── ROADMAP.md
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   ├── 01-01-SUMMARY.md
    │   ├── 01-02-PLAN.md
    │   └── 01-02-SUMMARY.md
    └── 02-auth/
        ├── 02-01-RESEARCH.md
        ├── 02-01-FINDINGS.md
        ├── 02-02-PLAN.md
        └── 02-02-SUMMARY.md
```

## Checkpoints

Claude automates everything with a CLI or API. Checkpoints are for verification and decisions only.

| Type | Purpose | Example |
|------|---------|---------|
| `checkpoint:human-verify` | Human confirms Claude's automated work | Visual UI check, design approval |
| `checkpoint:decision` | Human makes implementation choice | Auth provider, architecture pattern |
| `checkpoint:human-action` | Action with no CLI/API (rare) | Email verification link, 2FA web login |

**Critical rule:** If Claude CAN do it via CLI/API/tool, Claude MUST do it. Never ask human to deploy (use CLI), create webhooks (use API), run builds (use Bash), or write env files (use Write tool).

## Deviation Rules

Plans are guides, not straitjackets. During execution, 5 embedded rules handle discoveries:

1. **Auto-fix bugs** — broken behavior -> fix immediately, document in Summary
2. **Auto-add missing critical** — security/correctness gaps -> add immediately, document
3. **Auto-fix blockers** — can't proceed -> fix immediately, document
4. **Ask about architectural** — major structural changes -> stop and ask user
5. **Log enhancements** — nice-to-haves -> log to ISSUES.md, continue

No user intervention needed for rules 1-3, 5. Only rule 4 requires user decision.

## Context Scan (Run on Every Invocation)

Check git status, existing `.planning/` structure, and `.continue-here.md` handoff files. Present findings before intake question.

**If handoff found:** offer resume or fresh start.
**If planning structure exists:** offer plan next phase, execute current, create handoff, or view roadmap.
**If no structure:** offer new project, create roadmap, jump to phase planning, or get guidance.

## Domain Expertise

Before creating roadmap or phase plans, check `~/.claude/skills/expertise/` for domain-specific skills. Load SKILL.md (~5k tokens) + only the references relevant to the current phase type (~3-7k additional). Do NOT load all references (~20-27k tokens).

## Routing

| User Says | Workflow |
|-----------|----------|
| "brief", "new project", "start" | `workflows/create-brief.md` |
| "roadmap", "phases" | `workflows/create-roadmap.md` |
| "phase", "plan phase", "next phase" | `workflows/plan-phase.md` |
| "execute", "run", "build it" | **EXIT** -> Use `/run-plan` |
| "research", "investigate" | `workflows/research-phase.md` |
| "handoff", "stopping" | `workflows/handoff.md` |
| "resume", "continue" | `workflows/resume.md` |
| "milestone", "ship", "release" | `workflows/complete-milestone.md` |

## Chain Execution

For multi-stage prompt chains (research -> plan -> implement):

1. **Dependency detection**: Scan prompts for `@` references to determine order
2. **Execution modes**: Sequential (dependent), parallel (independent), or mixed DAG
3. **Validation after each step**: Output file exists, has content (>100 chars), metadata present
4. **Archiving**: Move completed prompts to `completed/` subfolder

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Include team structures, RACI matrices, sprint ceremonies, or stakeholder management | This is solo dev + Claude — enterprise PM theater wastes context and confuses the executor | Delete anything that sounds like corporate process; plans are prompts for one implementer |
| Create plans with more than 3 tasks per PLAN.md | Claude quality degrades at ~40-50% context; large plans produce rushed, low-quality output in the second half | Split into atomic plans: 01-01-PLAN.md, 01-02-PLAN.md, each with 2-3 focused tasks |
| Use this skill for plan execution | Loading the full skill (~20k tokens) for execution wastes context that should go to implementation | Use `/run-plan <path>` which loads only ~5-7k tokens |
| Skip the context scan before intake | You'll miss existing planning artifacts, handoff files, or git state — leading to duplicate or conflicting plans | Always run the context scan first; present findings before asking what to do |
| Put multi-week estimates or resource allocation in plans | Solo dev doesn't need time estimates; they create false urgency and scope anxiety that degrades plan quality | Focus on task decomposition and verification criteria, not timelines |

## Conflicts

- `ralph-tui-prd` generates flat PRDs with user stories for ralph-tui agent execution; this skill generates hierarchical phase-based plans for direct Claude execution
- `planning-with-files` uses Manus-style file-based planning for complex multi-step tasks; this skill uses a structured hierarchy (brief -> roadmap -> phase)
- `plans-kanban` visualizes plan progress as a dashboard; this skill creates the plans that kanban visualizes

## Related Skills

- `create-validation-plan` — add blocking validation gates to every phase of a plan
- `planning-with-files` — Manus-style file-based planning for complex multi-step tasks
- `plans-kanban` — visualize plan progress in a dashboard
- `research` — run the research phase before committing to a roadmap
