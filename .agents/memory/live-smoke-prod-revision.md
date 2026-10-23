---
name: Live smoke checks of production
description: How to tell which code production really runs, and how to do signed-in prod checks when throwaway sign-up is blocked.
---
- A publish can leave production on the PARENT of the "Published your App" commit. On 2026-10-09 the 85-file publish never reached prod.
  **Why:** BUILD_REVISION is baked from `git rev-parse HEAD` around the time the platform creates the publish commit, so `/api/version` alone is not proof either way.
  **How to apply:** before calling a publish "live", diff a server-behaviour marker from that commit against prod (response shape, serializer output), not just `/api/version`.
- Throwaway prod accounts can't be created: prod /sign-up has a Cloudflare Turnstile challenge plus a real emailed code. Confirmed 2026-10-23: the tester got "Verify you are human" with a maildrop.cc address (domain accepted); mail.tm doesn't load; Gmail connector is send-only; the attached Clerk connector and PROD_CLERK_SECRET_KEY both hold invalid keys. A prod sign-up check needs a human.
- Owner password sign-in (`/sign-in?admin`) is not a Clerk sign-in, so it never fires `logged_in`.
  **How to apply:** ask the owner to approve using the owner admin account, snapshot bookmarks/favorites/prefs/journey progress first, drive writes through the UI, and diff the snapshot after (restore the theme to the exact prior value, never both-null).
- Read-only proof that a prod admin write route exists without calling it: send an anonymous request with that method (plus Origin). 401 means the route is mounted; an unknown /api/admin/* path gives 404.
  **Why:** you get route-level proof for cancel/start endpoints without the side effects of an authenticated call.
- For signed-in read-only admin sweeps, route-abort every non-GET /api request in the page. The only ones seen are `POST /api/send`. These are the Replit-injected widget beacon, not app writes.
- A one-off 500 from admin-login with no 5xx in the deployment logs is the platform edge; retry once.
- Signed-in prod checks in a non-default design system: the account's saved server theme beats a seeded `ds-system` localStorage value, so the page loads in the saved system. Call `window.applyDesignSystem(system, accent)` in the page instead, with non-GET /api calls aborted so nothing is saved.
  **Why:** 2026-10-12 a Geist admin chart check silently ran in Editorial after localStorage was seeded with geist.
