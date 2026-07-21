---
name: SEO soft-404 + sitemap architecture
description: How this SPA returns real HTTP 404s, keeps the indexable set equal to the sitemap, and why malformed URLs crash the dev server.
---

# SEO soft-404, indexation parity, and the malformed-URL dev crash

This app is an SPA: the dev (vite catch-all) and prod (serveStatic sendFile)
handlers both **hard-code HTTP 200** for every path. `server/og-middleware.ts`
buffers the HTML response and rewrites `<head>`, and is the ONLY place that can
flip the status.

## Returning a real 404
- `resolveRoute()` returns `{meta, found}`; dynamic routes do a DB existence
  check. On miss -> `found:false` -> `notFoundMeta` (robots noindex, NO
  canonical / og:url). On DB error -> **fail OPEN** (`found:true`) so a
  transient blip never demotes a real page.
- The 404 status is set inside og-middleware's **buffered `res.end`** (right
  before flushing, while `!res.headersSent`). It sticks because the downstream
  SPA handler's 200 hasn't been flushed yet.
- **Why not fix it in vite.ts:** `server/vite.ts` is framework-managed and
  forbidden to edit by the dev guidelines.

## Indexable set MUST equal the sitemap
- The sitemap lists only `resources.status == 'approved'` and
  `learningJourneys.status == 'published'`.
- So the detail-route metadata must apply the same status gate, or a
  pending/draft entity's direct `/resource/:id` or `/journey/:id` URL leaks a
  `200 + self-canonical` (indexable) page that isn't in the sitemap.

## Malformed percent-encoded URLs crash the DEV server
- A path like `/category/%E0%A4%A` reaches Vite's `viteTransformMiddleware`,
  which calls `decodeURI(path)` and throws `URIError`. Because og-middleware is
  `async` and the throw happens downstream of its `next()`, it becomes an
  **unhandledRejection -> process exit** (HTTP 000, workflow FAILED).
- **Why:** Node terminates on unhandled promise rejections; the framework's
  sync throw during `next()` rejects the async middleware's promise.
- **How to apply:** guard with `try { decodeURI(urlPath) } catch { 404 }` at the
  TOP of og-middleware, BEFORE `next()` and BEFORE the api/asset skip block, so
  malformed page/asset/api paths never reach the crashing decoder. Production
  (serveStatic) returns 400 for these instead of crashing, so the crash is
  dev-only — but the guard fixes both and yields a clean 404 + noindex.
- `decodeURI` only throws on truly malformed sequences, so valid percent-encoded
  routes (e.g. `/category/encoding%2Dcodecs`) still pass through.
