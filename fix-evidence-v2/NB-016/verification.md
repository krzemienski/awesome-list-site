# NB-016 — /api/recommendations/feedback unauthenticated write with spoofable userId

**Fix**: `server/routes.ts` — endpoint now requires `isAuthenticated` and derives
`userId` from the session (`req.user.claims.sub`), same pattern as the Run22-hardened
`/api/interactions`. Body `userId` is ignored entirely. Client callers already gate
feedback UI on a signed-in user (they throw / show a sign-in toast when logged out),
so no client change was needed; the extra body field is harmless.

**Live verification (dev, July 20, 2026, post-restart):**
```
POST /api/recommendations/feedback (anon, body userId="spoofed-user")
  -> 401 {"message":"Unauthorized"}
POST /api/recommendations/feedback (admin session, body userId="spoofed-other-user")
  -> 200 {"status":"success","message":"Feedback recorded"}   # recorded under SESSION identity
```
