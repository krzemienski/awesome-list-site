# Agent authentication failure is treated as batch success

## Observed symptom

Input: start one local enrichment job with `batchSize=1` while the mounted Claude credential is rejected with HTTP 401.

Expected: the first authentication error fails the job immediately. No additional resources are attempted.

Actual: each Agent result has `is_error: true`, but enrichment logs `Run stopped: success` and continues. Job 7 reached 28 turns and attempted 9 resources before explicit cancellation.

## Visual/runtime evidence

- `e2e-evidence/remediation-v2/run-20260711T064000-awesome-video-remediation-v2/phase-00/enrichment-nonroot-status.body.json`
- `e2e-evidence/remediation-v2/run-20260711T064000-awesome-video-remediation-v2/phase-00/enrichment-nonroot-events.body.json`
- `e2e-evidence/remediation-v2/run-20260711T064000-awesome-video-remediation-v2/phase-00/enrichment-after-cancel.body.json`
- Research sibling evidence: `e2e-evidence/remediation-v2/run-20260711T064000-awesome-video-remediation-v2/phase-00/research-nonroot-status.body.json`

## Minimal reproduction

1. Run the real app with PostgreSQL and an authenticated admin session.
2. Start `POST /api/enrichment/start` with `{"filter":"unenriched","batchSize":1}`.
3. Use an Agent credential that the upstream API rejects.
4. Read `GET /api/enrichment/jobs/:id` and `GET /api/enrichment/jobs/:id/events`.
5. Observe repeated lifecycle/result events after the first 401 and a non-failed batch result.

## Single root-cause hypothesis

`server/ai/runAgentQuery.ts` does not convert an Agent SDK `ResultMessage` with `is_error: true` into a thrown application error. Callers therefore treat an authentication failure as a successful run and continue batching.

## Failed-approaches cross-check

- Mounting only `/root/.claude` failed before SDK execution because the process ran as root and lacked top-level config.
- Running as non-root with both approved read-only mounts reached the SDK and produced the definitive upstream 401.
- Repeating credentials is not a code fix; the retry loop is incorrect for any terminal Agent error.

## Required invariant

Any Agent SDK terminal result with `is_error: true` must fail the enclosing job immediately, preserve the upstream error summary, and prevent subsequent batch items from starting.
