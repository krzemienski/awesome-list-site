# AI Researcher

Short reference for the surviving AI researcher flow. The grand multi-agent
"Research" feature that was scoped in earlier drafts of this document was
never shipped and has been removed from the codebase, along with the
`CostDashboard`, `ResearchPanel`, `server/routes/admin/research.ts`, and
`server/modules/research` files that referenced it. The surviving feature
is the simpler **AI Researcher** described below.

## What it does

Admins can ask the system to discover new video / streaming resources that
are not already in the database. A research job runs `ResearchService` (see
`server/ai/researchService.ts`), which uses Claude plus web research helpers
to propose new resources. Each proposal is stored as a "discovery" that an
admin can review, approve, or reject.

Approved discoveries are inserted into the resources table with an audit
log entry sourced as `ai_researcher`.

## Surface area

- **Backend**: `server/ai/researchService.ts`, `server/ai/webResearch.ts`,
  and the `/api/researcher/*` routes registered directly in
  `server/routes.ts`.
- **Frontend**: `client/src/components/admin/ResearcherTab.tsx`, mounted as
  the `researcher` tab in `client/src/pages/AdminDashboard.tsx`.

## API endpoints

All endpoints require `isAuthenticated` + `isAdmin`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/researcher/start` | Start a research job. Body: `{ prompt, categoryFocus?, maxBudgetUsd?, maxTurns? }`. Prompt must be at least 10 characters. Returns `{ success, jobId, message }`. |
| `GET` | `/api/researcher/jobs` | List research jobs. |
| `GET` | `/api/researcher/jobs/:id` | Get a single job, with an `isActive` flag indicating whether the orchestrator is still running it. |
| `GET` | `/api/researcher/jobs/:id/events` | Stream/poll the event log for a job (progress updates shown in the Researcher tab). |
| `DELETE` | `/api/researcher/jobs/:id` | Cancel a running job. |
| `GET` | `/api/researcher/discoveries?jobId=` | List discoveries. With `jobId`, returns discoveries for that job; without it, returns all pending discoveries. |
| `POST` | `/api/researcher/discoveries/:id/approve` | Approve a discovery and insert it as a resource. |
| `POST` | `/api/researcher/discoveries/:id/reject` | Reject a discovery. Body: `{ reason }`. |

## Job lifecycle

1. Admin submits a prompt from the Researcher tab.
2. `ResearchService.startResearchJob` creates a job and runs it in the
   background (the orchestrator tracks active jobs in memory).
3. The Researcher tab polls `/api/researcher/jobs` and
   `/api/researcher/discoveries` while the job is active.
4. As discoveries land, the admin approves or rejects each one. Approved
   discoveries are persisted as resources via the standard storage layer.
