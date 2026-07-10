# BUG-007 — FIXED (code change)
**Severity:** Low
**Fix:** server/og-middleware.ts /resource/:id branch now fetches related resources via `buildRelatedResources()` (server/services/relatedResources.ts) and passes them as the new `related` field to renderResourceContent. server/seo-content.ts updated to accept `related?: { id, title, description? }[]` and render the related links as raw anchors in the SSR body.
**Baseline evidence:** /resource/186621 raw HTML had 0 internal resource links. After fix: SSR HTML should contain anchors to related resources.
