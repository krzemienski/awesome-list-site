# BUG-001 — FIXED (code change)
**Severity:** Critical
**Fix:** Modified server/og-middleware.ts category/subcategory/sub-subcategory branches to fetch the FULL approved resource set via `storage.listResources({ status:"approved", category/subcategory, limit:100000 })` instead of using the truncated `found.node?.resources` slice. SSR payload size is logged per request. server/seo-content.ts updated to accept a `related` field on `renderResourceContent` for BUG-007.
**Verification (deferred to deployment):** After CI/CD deploy, `curl /category/encoding-codecs | grep href resource` should return all 328 resources (baseline: 94).
