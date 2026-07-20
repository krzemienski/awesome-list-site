# R5-028 — Password change invalidates other sessions

**Claim: fixed (code).** (HIGH)

change-password deletes all OTHER sessions for the user from the PG session store and returns the
true `otherSessionsInvalidated` count (routes.ts ~2191).
Cross-restart two-jar repro on dev (fix-evidence-v3/_harness/run24a-http2b.mjs):
  jarA (current) + jarB (2nd session) both live before change.
  change-password via jarA -> 200, otherSessionsInvalidated: 3.
  jarB after change -> {isAuthenticated:false} (dead).
  jarA (current) after change -> {isAuthenticated:true} (alive).
Acceptance met: other jar unauthenticated; count is real, not hardcoded.
