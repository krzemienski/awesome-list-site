# VG-006 — Journey progress accepts foreign step IDs (BUG-006) — PASS

**Finding**: `PUT /api/journeys/8/progress` accepted `stepIds` belonging to a
different journey (e.g. step 181 → journey 7 "Planning Your Streaming
Architecture"), storing foreign ids in `completedSteps` and corrupting
completion math.

**Fix** (server):
- `LearningJourneyRepository.updateUserJourneyProgressBatch` — validates every
  requested id against the journey's real step rows BEFORE any write; foreign
  ids throw a typed `FOREIGN_STEP` error. The stored `completedSteps` seed is
  also filtered to currently-valid step ids, so any pre-guard orphan is purged
  on the next successful write (write-time self-heal).
- Route `PUT /api/journeys/:id/progress` maps `FOREIGN_STEP` → **422** with the
  offending ids named.
- Read-time exclusion on BOTH read paths: `getUserJourneyProgress` (single) and
  `listUserJourneyProgress` (user journey views, batched via
  `listJourneyStepsBatch`) filter out ids that don't belong to the row's
  journey — existing orphans are excluded consistently everywhere even before
  a write self-heals the row.

**Gate evidence** (`vg006-transcript.txt`, live dev, real account flow):
1. Registered + logged in real account `__qa_test_run22_bug006@…`, started journey 8.
2. Malicious `{"stepIds":[181],"completed":true}` → **HTTP/1.1 422** `"Step ID(s) do not belong to this journey: 181"`.
3. `GET /api/journeys/8/progress` → `completedSteps: []` — nothing stored.
4. Valid steps (199, 202, 205 — real journey-8 rows) → 200, stored, progress views correct.
5. **Orphan proof** (transcript §13; §8–12 seeds were false starts — the column
   is jsonb so `ARRAY[]` UPDATEs threw and never applied; §13 re-proves with
   `'[…]'::jsonb`): raw DB row seeded to `[199,202,205,181]` → single GET
   returns `[199,202,205]`, `/api/user/journeys` list view returns
   `[199,202,205]`, and after one valid PUT the RAW row is `[199,202,205]` —
   orphan excluded on read and purged on write.
6. QA teardown net-zero: user + progress + sessions deleted; `__qa_test%` count = 0.
7. tsc clean after server edits.

**Verdict: PASS**
