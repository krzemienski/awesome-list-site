# VG-050 — Anonymous interaction POST is unrestricted

**Verdict: PASS**

## Fix
`POST /api/interactions` now requires authentication (`isAuthenticated`
middleware — same guard as every other user write surface) and derives the
user identity from the session (`req.user.claims.sub`); the spoofable body
`userId` is ignored. `interactionType` is validated (400 when missing/blank).
Both client call sites already gate on a logged-in user (ResourceDetail fires
only when `user?.id` exists; the recommendation panel is an authed surface),
so no legitimate anonymous traffic existed.

## Live evidence (dev, real HTTP, July 20 2026 — `api-transcript.txt`)
1. **Anonymous abuse rejected**: `POST /api/interactions` with a spoofed
   `userId` and no session → **401 Unauthorized** `{"message":"Unauthorized"}`.
2. **Authenticated flow still succeeds**: real session established via
   `POST /api/auth/local/login` (200); same POST with the session cookie →
   **200** `{"status":"recorded"}`.
3. **Identity is session-derived, not body-derived**: server log shows
   `User interaction: d460f5e7-a085-4083-96a2-2f20dc9315c4 view 185000` —
   the session user's id, with no `userId` in the request body at all.
4. **Validation**: authed POST without `interactionType` → **400**
   `{"error":"interactionType is required"}`.
5. **No unrelated data modified**: the endpoint remains acknowledgment-only
   (no DB write path exists for interactions); nothing to mutate.

Defense-in-depth already in place on this route class: the global
Origin-mismatch rejection on mutations (Run17 BUG-054) also covers this POST.
