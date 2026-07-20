# VG-033 — Unknown stepId returns 500 → PASS

## Fix
Covered by the BUG-006 foreign-step guard (`FOREIGN_STEP` error code → 422 in the
route catch) — unknown ids and foreign-journey ids take the same validated path;
no 500 for client input. Verified compatible with BUG-006 and BUG-032.

## Live evidence (transcript.txt, dev, authed admin session, journey 7 started)
- stepId 99999 (exists nowhere) → **HTTP 422** "Step ID(s) do not belong to this journey: 99999"
- stepId 199 (belongs to journey 8) → **HTTP 422** same message
- stepId "abc" (non-integer) → **HTTP 400** "Step ID is required"
- completedSteps in DB unchanged by all invalid cases ([181,182,183] before/after)
- Valid updates still work (200, steps persisted) — see transcript.

No internal server error for any client input. Verdict: **PASS**
