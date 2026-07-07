# BUG-015 — FIXED (code change)
**Severity:** Critical
**Fix:** server/index.ts — added a middleware BEFORE handleSSR that checks if the request path matches /admin, /admin/*, /bookmarks, or /settings. If matched AND no `connect.sid` cookie is present in req.headers.cookie, respond with 302 Location: /login. Public routes (/, /resource/:id, /category/:slug, /journeys, /api/*) pass through.
