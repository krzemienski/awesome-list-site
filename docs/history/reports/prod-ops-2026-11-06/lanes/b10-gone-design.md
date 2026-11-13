# B10: 410 Gone for archived/rejected resource ids

> Layout is mine; no template given. Design + read-only checks only: no code edits, anonymous curl only (no telemetry POST). 2026-11-06, prod revision 6cb1a93e.

## 1. How `/resource/:id` resolves today
- Page route: `server/og-middleware.ts`. `resolveRoute` branch for `/resource/:id` at `:1651-~1868`: `parseRouteId` → `storage.getResource(id)`; **only `status==="approved"` is found** (comment at `:1665-1668`: "A pending/rejected/archived resource resolves to a soft-404 + noindex"). Everything else returns `{meta: notFoundMeta(path), found:false}` (`:1868`, shape `ResolvedRoute` `:265`).
- The 404 status is applied in `ogInject`: `notFound = !resolved.found` (`:~2580`), `res.statusCode = 404` in the wrapped `res.end` (`:~2650`). Body is the SPA shell with noindex meta and a "missing page" static block (`:2621-2626`); `notFoundMeta` (`:375`) sets `noindex`, og:url = home, no canonical.
- API: `GET /api/resources/:id` (`catalog-contributions.ts:718`) answers `404 {"message":"Resource not found"}` for any non-approved id.
- Client `ResourceDetail` renders only from that API result; it adds no status of its own (not read further: the HTTP status is decided server-side).

## 2. Anonymous curl (this run)
| id | what it is | `/resource/<id>` | `/api/resources/<id>` |
|---|---|---|---|
| 190709 | archived Nov 6 (DNS fails) | **404** HTML shell, `cache-control: no-store` | 404 `{"message":"Resource not found"}` |
| 190704 | archived Nov 6 (HTTP 404) | 404 | 404 |
| 189488 | archived Nov 6 (HTTP 410) | 404 | 404 |
| 190945 | rejected (`[AUDIT]` row) | 404 | 404 |
| 99999999 | never existed | 404 | 404 |
All five are indistinguishable: archived, rejected and never-existed ids return the same 404 and body. A crawler therefore re-requests them (a 404 is retried; a 410 is dropped sooner). The ≥15 404s in 20 min from the logs lane fit this: the 26 ids archived on Nov 6 left the sitemap but remain in crawler/Google indexes.

**Sitemap already excludes them.** `/sitemap.xml` has 4,074 `/resource/` URLs = the approved count, and none of 190709, 190704, 189488, 190945 appear. Source: `routes/non-api.ts:166-186` (queries `status: "approved"`), emitted `:~330`. So no sitemap change is needed.

## 3. Recommendation
1. **410 Gone for `archived`** (the link-health and dedupe path: the entry existed publicly and was deliberately removed). Search engines drop 410s faster than 404s.
2. **Rejected: optional, I lean no.** A 410 on a rejected id tells anyone that id was once submitted and refused. Ids are sequential so the leak is small, but rejected rows were never public and never in the sitemap, so there is little crawler traffic to fix. Do 410 for archived only unless the owner wants rejected too (`withdrawn`, `pending` stay 404).
3. **301 to a replacement: not today.** No table records "replaced by". The only replacement knowledge is in the audit-log notes (link-health `rewrite-url`) and the B5 pair list (e.g. 186350 OvenMediaEngine → 188100, the rows in `lanes/owner-queues.md`), which is a one-off mapping. Later option: store `metadata.replacedBy` (an id) when an archive is made as part of B5 and 301 to `/resource/<id>` only if that target is approved. Until then B5 archives (27) also become 410, which is correct for Google (it consolidates by the live URL, not by redirect).
4. 410 body: keep the same noindex SPA shell, with a heading such as "This resource was removed" and the existing "Browse all categories" link. Add `Cache-Control: public, max-age=3600` (a 404 here is `no-store`; a longer cache is safe since the cache is invalidated on resource writes via `invalidatePublicCache`).

## 4. Minimal change (3 edits, about 14 lines, one file: `server/og-middleware.ts`)
1. `:265` `ResolvedRoute`: add `gone?: boolean` (1 line).
2. `:~1868` in the `/resource/` branch, before `return { meta: notFoundMeta(path), found: false }`: if `resource?.status === "archived"`, return `{ meta: notFoundMeta(path), found: false, gone: true }` (3-4 lines; the `resource` variable is scoped in the `try` at `:1664`, so hoist `let archived = false` above it, 2 lines). Route-meta cache note: `gone` lives in the cached `ResolvedRoute`, and the cache is flushed on every resource mutation (`invalidatePublicCache`), so an archive takes effect on the next request.
3. `:~2580` and `:~2650`: carry `gone = resolved.gone` next to `notFound`, then in the `res.end` wrapper `res.statusCode = gone ? 410 : 404` (3-4 lines).
`GET /api/resources/:id` stays 404 (an API; no crawler value). Optional follow-up: the same `status==='archived'` → 410 in `getResourceByIdHandler` (`catalog-contributions.ts:718`, 3 lines) if you want API and page consistent.
No schema change, no `db:push`.

## 5. How to verify after publish (GET only)
`curl -sI https://awesome.video/resource/190709` → 410; 190945 (rejected) → 404; 99999999 → 404; an approved id → 200; `sitemap.xml` `/resource/` count unchanged (4,074 ± the day's approvals); the Tier 1 check "bad route → 404" still passes (it uses a never-existed id).

## 6. Unverified
- The exact line numbers marked `~` (±5) because the handler is large; re-check when editing.
- Whether Googlebot is the crawler in the logs (not checked here; that is the logs lane's claim).
- Client `ResourceDetail` behaviour on a 410 API response was not read (the API stays 404 in the minimal change).
