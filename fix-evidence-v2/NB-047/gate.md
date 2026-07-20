# NB-047 — slug anomaly iostvos vs ios-tvos (VG-gate)

DB sub-subcategory slug was `iostvos` while routes.ts display-name map + client hierarchy referenced `ios-tvos` — the referenced URL 404'd.

Fix:
- Slug renamed to `ios-tvos` via `PATCH /api/admin/sub-subcategories/3633` (script section NB-047; idempotent — run 2 `noop-already-renamed`).
- Permanent 301 in `server/index.ts` for `/sub-subcategory/iostvos` and `/subsubcategory/iostvos` (GET/HEAD, query string preserved).

Proof (dev, July 20 2026):
- `curl /sub-subcategory/iostvos` → 301 → `/sub-subcategory/ios-tvos`; `?x=1` preserved.
- `/sub-subcategory/ios-tvos` → 200, renders "iOS/tvOS" h1 with 24 resource cards (`nb047-ios-tvos.png`).
- Browser nav to old slug lands on new URL (data-cluster.json).

**PASS.** Prod: script renames the prod row post-republish; 301 ships with the build.
