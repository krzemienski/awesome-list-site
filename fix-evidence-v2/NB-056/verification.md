# NB-056 — public API response drift vs documented contract
Fix: /api/public/resources now emits the full documented envelope — storage returns {resources,total} only, so the route adds page, limit, totalPages (= max(1, ceil(total/limit))) to match server/openapi.ts PaginatedResourcesResponse and the module header comment.
Live probe: GET /api/public/resources?limit=2 → keys [limit, page, resources, total, totalPages] = page 1, limit 2, totalPages 905, total 1809. Spec now mounted and discoverable (see NB-025). VERIFIED.
