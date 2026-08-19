/**
 * HTTP cache contract — Task #327. One module defines (and documents) the
 * Cache-Control policy for every public delivery class so endpoints cannot
 * drift apart one string literal at a time.
 *
 * | Class                          | Policy                                   | Why |
 * |--------------------------------|------------------------------------------|-----|
 * | Hashed /assets/* bundles       | public, max-age=31536000, immutable      | Vite content-hashes filenames; a changed file gets a new URL, so shared caches (and the platform edge) may hold them for a year. |
 * | HTML documents (all routes)    | no-store (server/og-middleware.ts)       | Every document embeds a per-request CSP nonce; caching or 304-revalidating HTML pairs a stale-nonce body with a fresh-nonce header and blocks every inline script. NEVER weaken this. |
 * | Catalog reads (awesome-list,   | public, max-age=60, must-revalidate      | Backed by the in-process public cache with the same 60s TTL; cross-instance staleness of ≤60s is already the system-wide contract, so letting browsers/shared caches reuse for 60s adds no new staleness class while removing a request per SPA navigation. ETag enables 304 afterwards. |
 * |   nav, categories, tags,       |                                          |     |
 * |   subcategories, sub-subcats)  |                                          |     |
 * | Public REST API (/api/public/*)| public, max-age=60                       | Read-only, anonymous, DB-fresh data for external consumers; 60s shared caching bounds staleness to the same contract as catalog reads. Express's default weak ETag still provides 304 revalidation. |
 * | Non-200 public API results     | no-store                                 | A 404 can flip to 200 the moment a resource is approved — never pin negative results in shared caches. |
 * | Auth/admin/user responses      | no-store / private, no-store (per route) | Session-specific; unchanged by this contract. |
 *
 * Platform note (diagnosed Aug 19, 2026): on the very first response of a
 * browsing session, Replit's Google-Frontend edge injects a `GAESA` session
 * affinity cookie and — per the long-standing GFE rule that responses carrying
 * Set-Cookie must not be shared-cached — rewrites `public` to `private` on
 * that ONE response. Requests that already carry the cookie pass our origin
 * headers through verbatim (verified with cookie replay against prod). That
 * edge rewrite is outside app control and does not affect browser caching;
 * the app's job is to emit the correct explicit origin policy below.
 */

/** Hashed, content-addressed static bundles under /assets. */
export const HASHED_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Public catalog/taxonomy reads served from the 60s in-process public cache.
 * must-revalidate: once the 60s window lapses, caches MUST revalidate (ETag →
 * 304) instead of ever serving stale.
 */
export const CATALOG_CACHE_CONTROL = "public, max-age=60, must-revalidate";

/**
 * Catalog variants outside the known taxonomy (unbounded key space — not
 * server-cached): shared caches may store them but must revalidate each use.
 */
export const UNCACHED_CATALOG_CACHE_CONTROL = "public, max-age=0, must-revalidate";

/** Anonymous read-only /api/public/* success responses. */
export const PUBLIC_API_CACHE_CONTROL = "public, max-age=60";

/** Non-200 outcomes on public endpoints (negative results must not stick). */
export const PUBLIC_API_ERROR_CACHE_CONTROL = "no-store";
