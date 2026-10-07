---
name: Offline-state verification recipes
description: How to reach paused-query offline states on prod vs dev, and which signed-in surfaces need special URLs or are always cached.
---
- Prod: a warm page loads the route chunks first, then a fresh page at /about goes offline and soft-navigates (pushState + popstate). Hashed chunks come from the HTTP cache.
- Dev (Vite): module URLs are not HTTP-cached, so offline soft-nav hits the route error boundary ("Couldn't load this page"). To reach a paused query in dev, `page.route('/api/auth/user')`: `r.fetch()`, wait about 4 s for the route modules, `ctx.setOffline(true)`, then `r.fulfill`. Aborting the data request instead gives isError (no retry), not a paused query.
- Lazy pages that import only after auth resolves (e.g. /profile) cannot be reached this way in dev. Verify those on prod after a republish.
- Always boot-cached while signed in, so their offline "Try again" is reachable only on a 5xx: notifications (the header uses the same query key), /api/user/preferences (theme provider) and categories.
- Home account features (continue-learning preview, personalized recs) render only on `/?context=account`, not in either home layout.
**Why:** each of these cost several probe runs during the site audit.
**How to apply:** pick the recipe before writing an offline probe; record NA for the boot-cached surfaces.
