---
name: awesome-list-site-conventions
description: Development conventions and patterns for awesome-list-site. TypeScript Vite project with freeform commits.
---

# Awesome List Site Conventions

> Generated from [krzemienski/awesome-list-site](https://github.com/krzemienski/awesome-list-site) on 2026-03-22

## Overview

This skill teaches Claude the development patterns and conventions used in awesome-list-site.

## Tech Stack

- **Primary Language**: TypeScript
- **Framework**: Vite
- **Architecture**: type-based module organization
- **Test Location**: separate
- **Test Framework**: vitest

## When to Use This Skill

Activate this skill when:
- Making changes to this repository
- Adding new features following established patterns
- Writing tests that match project conventions
- Creating commits with proper message format

## Commit Conventions

Follow these commit message conventions based on 500 analyzed commits.

### Commit Style: Free-form Messages

### Prefixes Used

- `maestro`

### Message Guidelines

- Average message length: ~59 characters
- Keep first line concise and descriptive
- Use imperative mood ("Add feature" not "Added feature")


*Commit message example*

```text
feat(server): add centralized error handling middleware (#16)
```

*Commit message example*

```text
refactor(server): split storage into domain repositories
```

*Commit message example*

```text
MAESTRO: Polish UI styles and fix scrolling issues
```

*Commit message example*

```text
fix: remove stub /api/health endpoint, use proper health check with DB connectivity (qa-requested)
```

*Commit message example*

```text
chore: add auto-claude entries to .gitignore
```

*Commit message example*

```text
Merge origin/main: resolve all conflicts, fix Claude model IDs, fix API response parsing
```

*Commit message example*

```text
Published your App
```

*Commit message example*

```text
Saved progress at the end of the loop
```

## Architecture

### Project Structure: Single Package

This project uses **type-based** module organization.

### Configuration Files

- `.agents/skills/playwright-skill/package.json`
- `.agents/skills/tailwind-v4-shadcn/templates/vite.config.ts`
- `.github/workflows/deploy.yml`
- `.github/workflows/test.yml`
- `.prettierrc`
- `Dockerfile`
- `docker-compose.yml`
- `drizzle.config.ts`
- `eslint.config.js`
- `package.json`
- `playwright.config.ts`
- `railway.json`
- `tailwind.config.ts`
- `tsconfig.json`
- `vercel.json`
- `vite.config.ts`
- `vitest.config.ts`

### Guidelines

- Group code by type (components, services, utils)
- Keep related functionality in the same type folder
- Avoid circular dependencies between type folders

## Code Style

### Language: TypeScript

### Naming Conventions

| Element | Convention |
|---------|------------|
| Files | camelCase |
| Functions | camelCase |
| Classes | PascalCase |
| Constants | SCREAMING_SNAKE_CASE |

### Import Style: Path Aliases (@/, ~/)

### Export Style: Default Exports


*Preferred import style*

```typescript
// Use path aliases for imports
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
```

*Preferred export style*

```typescript
// Use default exports for main component/function
export default function UserProfile() { ... }
```

## Testing

### Test Framework: vitest

### File Pattern: `*.test.ts`

### Test Types

- **Unit tests**: Test individual functions and components in isolation
- **Integration tests**: Test interactions between multiple components/services
- **E2e tests**: Test complete user flows through the application


*Test file structure*

```typescript
import { describe, it, expect } from 'vitest'

describe('MyFunction', () => {
  it('should return expected result', () => {
    const result = myFunction(input)
    expect(result).toBe(expected)
  })
})
```

## Error Handling

### Error Handling Style: Try-Catch Blocks


*Standard error handling pattern*

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error('User-friendly message')
}
```

## Common Workflows

These workflows were detected from analyzing commit patterns.

### Feature Development

Standard feature implementation workflow

**Frequency**: ~9 times per month

**Steps**:
1. Add feature implementation
2. Add tests for feature
3. Update documentation

**Files typically involved**:
- `client/src/components/admin/research/*`
- `client/src/components/admin/research/hooks/*`
- `client/src/pages/*`
- `**/*.test.*`
- `**/api/**`

**Example commit sequence**:
```
MAESTRO: Add Research tab with admin UI components
MAESTRO: Document Research API endpoints and update specification
MAESTRO: Add RESEARCH_FEATURE.md documenting AI research capabilities
```

### Refactoring

Code refactoring and cleanup workflow

**Frequency**: ~5 times per month

**Steps**:
1. Ensure tests pass before refactor
2. Refactor code structure
3. Verify tests still pass

**Files typically involved**:
- `src/**/*`

**Example commit sequence**:
```
refactor(types): reduce excessive any type usage for improved type safety
refactor(server): split storage into domain repositories
feat(server): add centralized error handling middleware (#16)
```

### Add Ai Powered Feature

Implements a new AI-powered backend feature (e.g., research, enrichment, tagging) and integrates it with the admin UI.

**Frequency**: ~2 times per month

**Steps**:
1. Create or update backend service file in server/ai/ (e.g., researchService.ts, enrichmentService.ts, tagging.ts)
2. Add or update API endpoints in server/routes.ts
3. Update or extend shared schema in shared/schema.ts
4. Create or update admin UI components in client/src/components/admin/ (e.g., ResearchPanel.tsx, ResearcherTab.tsx, BatchEnrichmentPanel.tsx)
5. Integrate new UI into client/src/pages/AdminDashboard.tsx

**Files typically involved**:
- `server/ai/*.ts`
- `server/routes.ts`
- `shared/schema.ts`
- `client/src/components/admin/*.ts*`
- `client/src/pages/AdminDashboard.tsx`

**Example commit sequence**:
```
Create or update backend service file in server/ai/ (e.g., researchService.ts, enrichmentService.ts, tagging.ts)
Add or update API endpoints in server/routes.ts
Update or extend shared schema in shared/schema.ts
Create or update admin UI components in client/src/components/admin/ (e.g., ResearchPanel.tsx, ResearcherTab.tsx, BatchEnrichmentPanel.tsx)
Integrate new UI into client/src/pages/AdminDashboard.tsx
```

### Admin Ui Panel Or Tab Addition

Adds a new admin panel or tab with supporting UI components and integrates it into the AdminDashboard.

**Frequency**: ~2 times per month

**Steps**:
1. Create new UI component(s) in client/src/components/admin/ (e.g., ResearchPanel.tsx, ExportTab.tsx, ValidationTab.tsx, GitHubSyncPanel.tsx)
2. Optionally add supporting hooks/types in client/src/components/admin/ or subfolders
3. Integrate the new component into client/src/pages/AdminDashboard.tsx

**Files typically involved**:
- `client/src/components/admin/*.ts*`
- `client/src/pages/AdminDashboard.tsx`

**Example commit sequence**:
```
Create new UI component(s) in client/src/components/admin/ (e.g., ResearchPanel.tsx, ExportTab.tsx, ValidationTab.tsx, GitHubSyncPanel.tsx)
Optionally add supporting hooks/types in client/src/components/admin/ or subfolders
Integrate the new component into client/src/pages/AdminDashboard.tsx
```

### Backend Api Endpoint Addition

Adds new backend API endpoints, typically for new features or admin operations.

**Frequency**: ~2 times per month

**Steps**:
1. Create or update service/logic file in server/services/ or server/ai/
2. Add new endpoint(s) to server/routes.ts
3. Update shared/schema.ts if new data types are needed

**Files typically involved**:
- `server/services/*.ts`
- `server/ai/*.ts`
- `server/routes.ts`
- `shared/schema.ts`

**Example commit sequence**:
```
Create or update service/logic file in server/services/ or server/ai/
Add new endpoint(s) to server/routes.ts
Update shared/schema.ts if new data types are needed
```

### Frontend Ui Refactor Or Enhancement

Refactors or enhances frontend UI components for improved UX, responsiveness, or new features.

**Frequency**: ~3 times per month

**Steps**:
1. Update or refactor components in client/src/components/layout/ or client/src/components/ui/
2. Update related page components in client/src/pages/
3. Update CSS or style files in client/src/styles/ or client/src/index.css

**Files typically involved**:
- `client/src/components/layout/*.ts*`
- `client/src/components/ui/*.ts*`
- `client/src/pages/*.ts*`
- `client/src/styles/*.css`
- `client/src/index.css`

**Example commit sequence**:
```
Update or refactor components in client/src/components/layout/ or client/src/components/ui/
Update related page components in client/src/pages/
Update CSS or style files in client/src/styles/ or client/src/index.css
```

### Type Safety And Typescript Improvement

Systematically replaces 'any' types with proper TypeScript types across backend and frontend for improved type safety.

**Frequency**: ~1 times per month

**Steps**:
1. Identify files with 'any' usage (server/*.ts, client/src/*.ts*)
2. Replace 'any' with specific interfaces/types or 'unknown' where appropriate
3. Update or create type definitions in shared/schema.ts or client/src/types/
4. Run TypeScript compiler and fix errors
5. Document or verify changes

**Files typically involved**:
- `server/**/*.ts`
- `client/src/**/*.ts*`
- `shared/schema.ts`
- `client/src/types/*.ts`

**Example commit sequence**:
```
Identify files with 'any' usage (server/*.ts, client/src/*.ts*)
Replace 'any' with specific interfaces/types or 'unknown' where appropriate
Update or create type definitions in shared/schema.ts or client/src/types/
Run TypeScript compiler and fix errors
Document or verify changes
```

### Repository Pattern Refactor

Refactors backend data access to use domain-based repository classes, improving modularity and maintainability.

**Frequency**: ~1 times per month

**Steps**:
1. Create repository classes in server/repositories/ (e.g., UserRepository.ts, ResourceRepository.ts, etc.)
2. Update server/storage.ts to delegate to repositories
3. Refactor server/routes.ts and service files to use repositories directly
4. Update documentation (e.g., docs/ARCHITECTURE.md) to describe the new pattern

**Files typically involved**:
- `server/repositories/*.ts`
- `server/storage.ts`
- `server/routes.ts`
- `server/ai/*.ts`
- `server/github/*.ts`
- `server/localAuth.ts`
- `server/replitAuth.ts`
- `docs/ARCHITECTURE.md`

**Example commit sequence**:
```
Create repository classes in server/repositories/ (e.g., UserRepository.ts, ResourceRepository.ts, etc.)
Update server/storage.ts to delegate to repositories
Refactor server/routes.ts and service files to use repositories directly
Update documentation (e.g., docs/ARCHITECTURE.md) to describe the new pattern
```

### Add Or Update Shared Documentation

Adds or updates documentation files for APIs, features, or design systems.

**Frequency**: ~2 times per month

**Steps**:
1. Create or update markdown documentation in docs/ or root
2. Update or add specification or feature description files (e.g., SPECIFICATION.md, RESEARCH_FEATURE.md, DESIGN-SYSTEM.md, API.md)
3. Optionally update DEVELOPMENT.md for dev workflow/tooling changes

**Files typically involved**:
- `docs/*.md`
- `SPECIFICATION.md`
- `RESEARCH_FEATURE.md`
- `DESIGN-SYSTEM.md`
- `API.md`
- `DEVELOPMENT.md`

**Example commit sequence**:
```
Create or update markdown documentation in docs/ or root
Update or add specification or feature description files (e.g., SPECIFICATION.md, RESEARCH_FEATURE.md, DESIGN-SYSTEM.md, API.md)
Optionally update DEVELOPMENT.md for dev workflow/tooling changes
```

### Add Skill Or Workflow To Agents

Adds new skills, references, scripts, or workflows to the .agents/skills/ directory for agent-based automation or documentation.

**Frequency**: ~2 times per month

**Steps**:
1. Create new SKILL.md and supporting files in .agents/skills/<skill-name>/
2. Add references, scripts, templates, and workflows as needed
3. Optionally update skills-lock.json or related manifest

**Files typically involved**:
- `.agents/skills/*/SKILL.md`
- `.agents/skills/*/references/*.md`
- `.agents/skills/*/scripts/*`
- `.agents/skills/*/templates/*`
- `.agents/skills/*/workflows/*`
- `skills-lock.json`

**Example commit sequence**:
```
Create new SKILL.md and supporting files in .agents/skills/<skill-name>/
Add references, scripts, templates, and workflows as needed
Optionally update skills-lock.json or related manifest
```


## Best Practices

Based on analysis of the codebase, follow these practices:

### Do

- Write tests using vitest
- Follow *.test.ts naming pattern
- Use camelCase for file names
- Prefer default exports

### Don't

- Don't use long relative imports (use aliases)
- Don't skip tests for new features
- Don't deviate from established patterns without discussion

---

*This skill was auto-generated by [ECC Tools](https://ecc.tools). Review and customize as needed for your team.*
