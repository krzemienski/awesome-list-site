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

## Task 592 — never-tested flows (budget ≤ 8 calls)

Counting note: `GET /api/health/ai` `requestCount` only counts calls made through `claudeService`. Recommendation generation goes through `createStructuredMessage` (`server/ai/anthropicConfig.ts`) and does **not** move that counter (it stayed 0 → 0 across both calls below). Paid calls are therefore counted from the server responses themselves: a POST that returns items with `type: "ai_powered"` after a server-cache miss, or any `refresh=true` POST for a non-cold-start user.

| # | Date (UTC) | Endpoint | Caller | Purpose | Evidence |
|---|---|---|---|---|---|
| 1 | 2026-10-10 17:17:51 | `POST /api/recommendations?limit=10` (DEV, :5000) | throwaway `__qa_test_plan_592_v06est_*` (saved prefs + 1 bookmark) | V06: first mount for an established user (server-cache miss) | 200 in 14.6 s; items typed `ai_powered` (e.g. 186398 "Per-Title Encode Optimization – Netflix TechBlog", 98%) |
| 2 | 2026-10-10 17:18:05 | `POST /api/recommendations?limit=10&refresh=true` (DEV, :5000) | same user | V06: Refresh button (forced regeneration) | 200; list changed (185769 entered, 185828 left) |

Cold-start users (V06 part A, V06 supplement) are rule-based and made no model calls. The AI-outage probe (V06 part C) ran on a second instance whose AI base URL is a closed port, so no call left the machine.
| 3 | 2026-10-10 17:34 | `POST /api/claude/analyze` (DEV, :5000) | throwaway admin `__qa_test_plan_592_v10admin_*` | V10: admin Analyze with AI → Apply AI Suggestions → submit → approve; analysed URL `https://github.com/videolan/vlc` | 200, confidence 0.92; `requestCount` 0 → 1 |

An earlier V10 attempt pointed Analyze at `https://github.com/videolan/x264` (a 404). The server refused before any model call ("Can't analyze this URL"; `requestCount` stayed 0), so it is not counted. **Running total after V10: 3 of 8.**

V14 and V15 ran on the scratch clone `awesome_scratch_592` (instance A on :5161). Each agent job is counted as one budget unit; its turns, tokens and cost are recorded from the job's own events. The cancel/restart proofs ran on instance B (:5163), whose AI base URL is a local server that accepts the connection and never answers, so they made no paid call.

| # | Date (UTC) | Endpoint | Job | Purpose | Evidence |
|---|---|---|---|---|---|
| 4 | 2026-10-10 17:42:34 | `POST /api/enrichment/start` (UI, unenriched, batch 1) | enrichment 44 | V14 run 1, before fix | completed 1/1, 13 events, `result` cost $0.0189 (haiku-4.5, budget cap $0.08). Exposed the tags-never-promoted defect |
| 5 | 2026-10-10 17:53:06 | same, after the `applyEnrichment` fix | enrichment 48 | V14 re-proof | completed 1/1, cost $0.0275; R1 gained `metadata.tags`; follow-up unenriched start found 0 resources (job 49, no model call) |

| 6 | 2026-10-10 17:55:04 | `POST /api/researcher/start` (UI Launch, budget $0.30, 12 turns, target 1) | research 51 | V15 bounded paid run | failed at 17:55:54: "Reached maximum budget ($0.3)". The `result` event reported 3 turns, 4/897 tokens, **$0.3082**, but the job row recorded 0 turns / 0 tokens / $0.00. Exposed the usage-lost-on-error-result defect |
| 7 | 2026-10-10 ~18:05 | `POST /api/researcher/start` (API, budget $0.05, 12 turns, target 1) | research 57 | V15 re-proof after the `runAgentQuery` usage fix | failed "Reached maximum budget ($0.05)"; job row now records 2 turns and $0.1162, equal to the `result` event. The SDK checks the cap between turns, so one opus turn overshot the $0.05 cap |

**Running total for task 592: 7 of 8.**
