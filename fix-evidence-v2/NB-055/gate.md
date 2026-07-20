# NB-055 — tag casing chaos (VG-gate)

Same tag existed in up to 3 spellings (FFMPEG/FFmpeg/ffmpeg, NGINX/Nginx/nginx, …), splitting filter facets. New admin endpoint `POST /api/admin/maintenance/canonicalize-tags`: groups tags case-insensitively, canonicalizes each family via a ~70-entry curated brand-casing map (FFmpeg, NGINX, macOS, H.264, …) with most-frequent-spelling fallback (lexicographic tie-break → deterministic), rewrites + dedupes each resource's metadata tag array, audit-logged, anon → 401. Tags live in `resources.metadata->'tags'` (the resource_tags join table is empty/unused) — canonicalizing metadata fixes the client-built filter facets (fix-at-audited-surface).

Proof (dev, July 20 2026):
- Run 1: `{variantFamiliesFound: 74, resourcesUpdated: 192}`; run 2: `{variantFamiliesFound: 0, resourcesUpdated: 0}` (idempotent).
- DB: families with >1 distinct spelling among approved resources = 0 rows.

**PASS.** Prod: script calls the endpoint post-republish.
