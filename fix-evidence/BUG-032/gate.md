# VG-032 — Unknown journey returns 200 no-op → PASS

## Fix
`server/routes.ts` PUT /api/journeys/:id/progress: `getLearningJourney(journeyId)`
existence check → **404 "Journey not found"** before step validation. Plus the same
no-op class one layer deeper: a real journey the user never **started** used to
return 200 with empty body (UPDATE matched no row) — now **409 "Journey not
started"**.

## Live evidence (transcript.txt, dev, authed admin session)
- PUT /api/journeys/999/progress → **HTTP 404** `{"message":"Journey not found"}`
- user_journey_progress rows for journey 999 before/after: **0 / 0** (no writes)
- PUT /api/journeys/7/progress (real journey, not started) → **HTTP 409**
- Valid path intact: POST /api/journeys/7/start → 200; PUT stepIds [181,182,183]
  completed:true → 200 with completedSteps [181,182,183]; DB row confirmed.
- Teardown: probe progress row deleted; j7/admin rows = 0, j999 rows = 0 (net-zero).

tsc clean. Verdict: **PASS**
