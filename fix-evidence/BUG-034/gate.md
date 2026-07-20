# VG-034 — Journey 8 step 6: Part I must precede Part 2 → PASS

## Root cause
Rows sharing a stepNumber had **no deterministic ordering** — repo sorted by
step_number only. On prod the two "FFmpeg vs TwitchTranscoder" rows were inserted
Part 2 first (row 215 = Part 2, row 216 = Part I), so id/insertion order showed
Part 2 first. Dev data was already in the correct order.

## Fix
1. `LearningJourneyRepository.ts`: both step queries now order by
   `(step_number ASC, id ASC)` — deterministic within-step ordering (code fix,
   ships everywhere).
2. Prod data swap journaled in `scripts/run22-data-fixes-prod.ts` (BUG-034 block):
   fetches /api/journeys/8, and iff the lower-id step-6 row carries Part 2, swaps
   the two rows' resourceIds via PATCH /api/admin/journeys/8/steps/:stepId.
   Idempotent (noop when already ordered). Runs after republish.

## Live evidence
- Dev API /api/journeys/8 step 6 order: 214 Part I → 215 Part 2 ✓
- Dev UI /journey/8 (Playwright, 1440px): Part I DOM index 7264 < Part 2 index 7490
  → journey8-desktop.png
- Prod (pre-fix baseline): 215 Part 2 → 216 Part I (confirms root cause; will be
  corrected by the journaled swap post-republish)
- Unrelated ordering untouched: tiebreaker only affects rows sharing a stepNumber.

tsc clean. Verdict: **PASS**
