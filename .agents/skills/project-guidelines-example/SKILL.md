---
name: project-guidelines-example
description: |
  Template for creating project-specific Claude Code skills. Shows the required structure,
  sections, and patterns for a skill that encodes project conventions, architecture, and
  decision context that Claude cannot infer from code alone.
  Use when: Creating a new project-specific skill or CLAUDE.md configuration.
  Covers: skill YAML frontmatter, architecture encoding, convention documentation, anti-pattern definition
  Keywords: skill template, project guidelines, CLAUDE.md, project conventions, skill creation
---

# Project Guidelines Skill Template

A structural template for encoding project-specific knowledge into a Claude Code skill. Use this as the skeleton when creating skills for new projects.

## When to Use

- Starting a new project and need a skill to encode its conventions
- An existing project has undocumented conventions causing repeated mistakes
- You need a template for a project-specific CLAUDE.md or skill

## When NOT to Use

- The project already has a comprehensive CLAUDE.md
- You need general coding advice (use language-specific skills instead)
- The project has no unique conventions worth encoding

---

## Required Sections for a Project Skill

### 1. Architecture Decision Records (HIGH VALUE)
Encode decisions Claude CANNOT infer from reading code:
```markdown
## Architecture Decisions
- **Auth**: Session-based, NOT JWT — tokens are stored server-side in Redis
- **State**: Server-authoritative — never trust client state for business logic
- **Deploys**: Blue-green via ALB — never modify both target groups simultaneously
```

### 2. File Ownership Rules (PREVENTS CONFLICTS)
```markdown
## File Ownership
- `src/auth/` — Security team only. Never modify without security review.
- `src/db/migrations/` — Must be sequential, never reorder. Always add, never modify existing.
- `*.generated.ts` — Auto-generated. Never edit manually (overwritten on build).
```

### 3. Convention Anti-Patterns (NEVER/WHY/Fix)
```markdown
## Anti-Patterns

### NEVER: Import from barrel files in the same package
```typescript
// NEVER
import { UserService } from '.';  // barrel re-export
// WHY: Creates circular dependency. Build succeeds but runtime fails with undefined.
// Fix: Import directly from the source file
import { UserService } from './user-service';
```
```

### 4. Environment-Specific Gotchas
```markdown
## Environment Gotchas
- Dev: Uses SQLite — no concurrent writes. Don't test concurrency locally.
- Staging: Shares database with QA — never truncate tables.
- Prod: Read replicas lag 50-200ms — don't read-after-write on replica.
```

### 5. Build & Run Commands
```markdown
## Commands
- `make dev` — Start local dev server (port 3000)
- `make migrate` — Run pending migrations
- `make seed` — Seed dev database (destructive — drops existing data)
```

---

## Template Frontmatter

```yaml
---
name: my-project
description: |
  Project conventions and architecture decisions for [Project Name].
  Encodes auth patterns, deployment constraints, and file ownership
  that Claude cannot infer from code alone.
  Use when: Working on [Project Name] codebase.
  Covers: auth, deployment, database migrations, API conventions
  Keywords: [project-name], conventions, architecture
---
```

## What NOT to Include

| Exclude | Why |
|---------|-----|
| Standard language patterns | Claude knows these natively |
| Framework documentation | Use Context7 or official docs |
| Code examples > 10 lines | Keep skill scannable; link to files instead |
| Deployment runbooks | Put in `docs/`, not in skill |

## APPLICABILITY GUARD

This template is for **project-specific skills** only. For general-purpose skills (language patterns, framework guides), use a different structure focused on anti-patterns and gotchas.

## Related Skills
- `skill-creator` — automated skill creation workflow
- `working-with-cc` — Claude Code configuration best practices
- `slash-command-factory` — create project-specific slash commands
