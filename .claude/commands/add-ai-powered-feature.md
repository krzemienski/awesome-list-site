---
name: add-ai-powered-feature
description: Workflow command scaffold for add-ai-powered-feature in awesome-list-site.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-ai-powered-feature

Use this workflow when working on **add-ai-powered-feature** in `awesome-list-site`.

## Goal

Implements a new AI-powered backend feature (e.g., research, enrichment, tagging) and integrates it with the admin UI.

## Common Files

- `server/ai/*.ts`
- `server/routes.ts`
- `shared/schema.ts`
- `client/src/components/admin/*.ts*`
- `client/src/pages/AdminDashboard.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update backend service file in server/ai/ (e.g., researchService.ts, enrichmentService.ts, tagging.ts)
- Add or update API endpoints in server/routes.ts
- Update or extend shared schema in shared/schema.ts
- Create or update admin UI components in client/src/components/admin/ (e.g., ResearchPanel.tsx, ResearcherTab.tsx, BatchEnrichmentPanel.tsx)
- Integrate new UI into client/src/pages/AdminDashboard.tsx

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.