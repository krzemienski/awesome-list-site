# R5-028 — Password change invalidates other sessions

**Claim: VERIFIED-ALREADY-FIXED (no code change).** The invalidation DELETE
(routes.ts change-password: `DELETE FROM sessions WHERE sess->'passport'->'user'->'claims'->>'sub' = userId AND sid <> currentSid`)
postdates the R5 prod audit. Live two-jar repro on dev (July 20, 2026):

```
login1:200  (jar1)
login2:200  (jar2)
jar1-pre:  GET /api/auth/user -> 200 authenticated user JSON
changepw via jar2: {"message":"Password changed successfully","otherSessionsInvalidated":1}
jar1-post: GET /api/auth/user -> {"user":null,"isAuthenticated":false}
```

Acceptance met: other jar unauthenticated after change; response count = 1 (true count, not hardcoded 0).
Prod picks this up at the next republish (change shipped in the Run23/24 wave).
