---
name: Live smoke checks of production
description: How to tell which code production really runs, and how to do signed-in prod checks when throwaway sign-up is blocked.
---
- A publish can leave production on the PARENT of the "Published your App" commit. On 2026-10-09 the 85-file publish never reached prod.
  **Why:** BUILD_REVISION is baked from `git rev-parse HEAD` around the time the platform creates the publish commit, so `/api/version` alone is not proof either way.
  **How to apply:** before calling a publish "live", diff a server-behaviour marker from that commit against prod (response shape, serializer output), not just `/api/version`.
- Throwaway prod accounts can't be created: prod /sign-up has a Cloudflare Turnstile challenge plus a real emailed code.
  **How to apply:** ask the owner to approve using the owner admin account, snapshot bookmarks/favorites/prefs/journey progress first, drive writes through the UI, and diff the snapshot after (restore the theme to the exact prior value, never both-null).
- A one-off 500 from admin-login with no 5xx in the deployment logs is the platform edge; retry once.
