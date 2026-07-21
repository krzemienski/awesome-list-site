---
name: Origin/Host CSRF check port normalization
description: Origin-vs-Host comparisons must strip default ports and use the canonical server site var, or prod mutations 403 behind the Replit edge.
---

**Rule:** Any Origin-header-vs-Host CSRF gate must (1) strip default ports (`:443`, `:80`) from BOTH sides before comparing, and (2) use `PUBLIC_SITE_URL` as the fallback allowlist — NOT `SITE_URL`, which is unset in this project (only `VITE_SITE_URL` exists client-side, and it is stale).

**Why:** The Replit edge has been observed surfacing hosts with an explicit `:443` (run15 redirect evidence). An exact-string `new URL(origin).host === req.headers.host` compare would then 403 every browser mutation in prod (login, bookmarks, all admin actions) while passing all dev tests. A dead fallback env var makes the failure unrecoverable.

**How to apply:** Whenever touching security middleware that compares Origin/Referer to Host or a canonical URL, normalize default ports and source the canonical host from `PUBLIC_SITE_URL` (og-middleware's `SITE_URL` export wraps it, default `https://awesome.video`). Verify with curl probes: no-Origin, same-origin, canonical-host, canonical-host`:443`, cross-origin, and `Origin: null` — a 403 vs 401/405 distinguishes gate rejection from route-level handling.
