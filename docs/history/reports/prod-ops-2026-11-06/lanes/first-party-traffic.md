# First-party traffic signal from server telemetry

Layout is mine. Read-only; one owner-header GET of `/api/admin/operations/health` at 2026-11-06 21:11Z.

## (1) How paths map to groups
`server/ops/operationalTelemetry.ts:133-165` (`endpointGroup`) maps a path to one of 9 groups (health, catalog, link-health, admin-heavy, github-sync, auth-session, resources, public-api, other). The label is `METHOD:group:Nxx` (`:167-181`). It is called from the request middleware at `server/index.ts:523-531`, but only inside `if (path.startsWith("/api"))` (`:529`).
**Answer: no group separates page documents by template. Page documents are not counted at all.** SSR requests (`/`, `/category/…`, `/resource/…`, `/search`, `/journey/…`, `/tag/…`) never enter the telemetry; the `else` branch (`:541`) only logs documents that fail (status ≥ 400). The API groups cannot stand in for them: `catalog` is the SPA fetching taxonomy JSON, and bots fetching HTML do not call it.

## (2) Minimal change (design only)
Count document requests per template and client class in the same snapshot.
- `operationalTelemetry.ts` (+~35 lines): add `export type DocTemplate = "home"|"category"|"subcategory"|"subsubcategory"|"resource"|"search"|"journey"|"tag"|"static"|"other"`; `documentTemplate(path)` (prefix match, ~12 lines); `clientClass(userAgent)` returning `bot-search` (Googlebot, Bingbot), `bot-ai` (GPTBot, ClaudeBot, PerplexityBot, Applebot), `bot-other` (regex `bot|crawl|spider|curl|python|headless`), else `human` (~10 lines); `recordDocumentRequest(template, cls, status)` writing label `DOC:<template>:<cls>:<Nxx>` into the existing `endpointMetrics` map (~6 lines). No new storage, no new snapshot field.
- `server/index.ts` (+~8 lines) in the `else` branch near `:541`: for `GET`/`HEAD` with an `Accept` containing `text/html` and path not `/assets/`, `/@`, a file extension, call `recordDocumentRequest(documentTemplate(path), clientClass(req.get("user-agent")), res.statusCode)`. The cardinality is fixed (10 × 4 × 5), so the map stays small. Store no IP, no full path, no UA string: only the class.
- Total ≈ 45 lines, 2 files. Consent-free because it holds counts only. Limits: counts reset at each restart (`since boot`), so persist hourly deltas to a table or log line if history is wanted (extra ~30 lines, out of this scope). Our own audit lanes will be counted as `human` or `bot-other`; tag them by the `webdriver`-style header or a lane User-Agent so they can be subtracted.

## (3) Live snapshot (21:11Z; boot ≈ 18:36Z, about 2.6 h)
| Group | 2xx | 3xx | 4xx |
|---|---|---|---|
| other (GET) | 925 | 37 | 32 |
| catalog (GET) | 108 | 39 | 0 |
| resources (GET) | 58 | 13 | 9 |
| auth-session (GET) | 145 | 138 | 0 |
| health (GET) | 39 | 0 | 0 |
| link-health (GET) | 56 | 0 | 0 |
| github-sync (GET) | 32 | 0 | 0 |
| public-api (GET) | 16 | 0 | 8 |
| admin-heavy (GET) | 9 | 0 | 0 |
Writes: POST other 12, PATCH 1, PUT 1. Zero 5xx anywhere; DB select errors 0.

What it says: ~1,460 API GETs in 2.6 h. 75% of `other` is admin and member endpoints (the admin panels poll), not public traffic. `catalog` 147 and `resources` 80 are the only public-browse signals, and they include our own lane browsing (the visitor, member and admin lanes ran during this window, plus my admin pulls: ~60 owner GETs from this lane alone). `auth-session` 283 (145 2xx + 138 3xx) is the SPA asking who the user is on every page load, so it is a rough proxy for client page loads (about 280 loads, many ours). `public-api` 24 is mostly 4xx (8 of 24), consistent with probes or key-less calls.
Conclusion: after removing our own lanes, real visitor volume in this window is small and cannot be separated from it with current groups. It also cannot tell bots from humans. SSR-served bot traffic (Googlebot hitting `/resource/<id>`) is invisible here, which is exactly the gap (2) closes.
