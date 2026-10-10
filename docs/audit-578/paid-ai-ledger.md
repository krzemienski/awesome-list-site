# Paid AI ledger — audit-578 remediation

Every real paid model call made while proving audit-578 items. Budgets are per task.

## Task 586 — AI job moderation, cancellation, outbound fetches (budget ≤ 6 calls; used 4)

All four calls ran against the scratch clone `awesome_scratch_586` (instance on :5101). DEV and production were never called. The model is the server default for each job type.

| # | Date (UTC) | Endpoint | Job | Purpose | Recorded usage |
|---|---|---|---|---|---|
| 1 | 2026-10-09 15:58:10 | `POST /api/researcher/start` | research 59 | G04: cancel a live paid run | Cancelled at t+54s. Recorded tokens 0/0, because of the zero-usage-on-abort gap later fixed in `runAgentQuery.ts` |
| 2 | 2026-10-09 16:01:45 | `POST /api/researcher/start` | research 60 | G04: re-prove the live cancel after the usage fix | Cancelled at t+48s; tokens in=20 out=8 preserved; cost $0.0000 (the SDK reports no cost on abort) |
| 3 | 2026-10-09 16:10:16 | `POST /api/enrichment/start` (batch 1) | enrichment 48 | G07: safe public QA enrichment plus private/redirect QA URLs | 3/3 enriched, 5 turns, $0.0335 |
| 4 | 2026-10-09 ~16:12 | same job, batch 2 (automatic) | enrichment 48 | **Unintended.** A wrong pre-check queued 770 extra scratch resources | Cancelled at 16:13:08 (G04 proof); tokens 26→36 in, 1857→1863 out; cost stayed $0.0335 |

## Task 582 — Edit suggestions (budget ≤ 4 calls; used 1)

| # | Date (UTC) | Endpoint | Caller | Purpose | Recorded usage |
|---|---|---|---|---|---|
| 1 | 2026-10-09 16:17 | `POST /api/claude/analyze` (DEV, :5000) | throwaway admin `__qa_test_plan_582_1791561997330_admin` | C03: prove admin Analyze/Apply still fills the suggest-edit form and runs through the shared `aiLimiter` + daily quota; URL `https://github.com/FFmpeg/FFmpeg` | `GET /api/health/ai` `requestCount` 0 → 1 |

All non-admin edit-submission proofs (C01–C05, D11) made **0** calls (`requestCount` 0 → 0).
