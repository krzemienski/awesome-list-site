---
name: Research job admission guard
description: POST /api/researcher/start refuses a second run with 409 RESEARCH_JOB_ACTIVE; never prove it with a hand-inserted job row.
---
Research starts are admitted in one transaction under `pg_advisory_xact_lock(hashtext('research_job_admission'))`, the same pattern as enrichment: a live pending/processing row (by `isJobOrphaned`, with in-process ids owned) throws `ResearchJobActiveError` → `409 {code:'RESEARCH_JOB_ACTIVE'}`; provably orphaned rows are flipped to failed first (G2, Oct 2026). The UI also disables Launch, but that is not the guard.

**Why:** a lead probe on 2026-10-25 inserted a `processing` row by hand with `created_at = now()`. Local Postgres runs America/New_York while the app compares in UTC, so the row looked 4 hours old, was correctly reclaimed as orphaned, and a real paid run started ($0.22).

**How to apply:** prove the guard through the real path only: start a small run, immediately POST a second start, expect 409, then cancel the first with `DELETE /api/researcher/jobs/:id` (there is no `/cancel` route). Expect ~$0.08–0.31 per probe; the SDK overshoots a $0.25 cap by about $0.06.
