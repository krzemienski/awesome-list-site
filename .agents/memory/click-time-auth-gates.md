---
name: Click-time auth gates
description: Why click handlers must not trust useAuth().isAuthenticated while the auth check is still resolving.
---
`isAuthenticated` is a provisional `false` while /api/auth/user is loading, and also while an anonymous answer is being re-asked after Clerk restores a session. A click handler that toasts "Sign in to…" on `!isAuthenticated` turns signed-in members away right after a hard load.

**Why:** a signed-in contributor clicking Suggest Edit within ~1s of load got the sign-in toast; the funnel lost starts.

**How to apply:** gate on `isAuthPending` from useAuth first — open the UI in a "Checking your sign-in…" state (or defer) and settle once it flips false. Reproduce by delaying GET /api/auth/user ~3s in the browser's network interception, not by racing a fast load.
