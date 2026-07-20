# Run24E — data/link fixes script + importer title fix

## Delivered
- `scripts/run24-data-fixes-prod.ts` — idempotent, journaled, admin-API-driven (same pattern as run23). Covers R4-021/022/023, BUG-056 (verify-only, live from this network = auditor bot-block), R4-066 wayback re-audit (auto-probes origins; 187178 QUANTEEC repointed to live origin, others keep wayback), R5-032/033/034/035/036/041/061/062/064/065, NB-046, NB-052, tag canonicalization (R5-063 + NB-015).
- `server/lib/titleClean.ts` `cleanGithubSlugTitle()` — strips "owner/" from "owner/repo — desc" titles; wired into the importer choke point (`server/ai/researchService.ts` insertDiscovery) so future GitHub research batches never re-introduce R5-041. Owner charclass excludes dots (GitHub owners are alnum+hyphen only) so "H.264/AVC — x" and "iOS/tvOS" are safe; unit-probed 8 cases.
- `server/lib/tagCanonicalize.ts` + upgraded `/api/admin/maintenance/canonicalize-tags`: separator fold (live streaming/live_streaming/live-streaming), conservative plural fold with keep-list, extended brand-casing map; response now reports `pluralMerges`.

## Dev validation (PROD_BASE=http://localhost:5000)
- Run 1: 32 mutating actions (8 repoints, wayback origin repoint, 3 retitle-class, desc rewrites, R5-032 x11, R5-035 x2, tags 84 families/49 plural merges/351 resources).
- Run 2: 12 mutating — the Medium/Bitmovin R5-035 rows initially skipped on 403 (datacenter bot-block); probe now accepts same-page 403.
- Run 3: full no-op (0 mutating; canonicalize-tags 0/0/0). Journal: `evidence/run24/data-fixes-dev.json`; raw logs run1–3 alongside.
- DB sweeps all 0: slug titles, shortcodes, missing ext-spaces, tracking URLs, IMSC acronym, speaker-bio descs; Demuxed Podcast approved count = 1.
- tsc clean; migration-drift ✅ no drift; app serving 200.

## Prod notes (for post-republish run)
- Prod-only rows (187995 SVT-AV1, 187950 Demuxed survivor) log absent/no-dup noops on dev — expected; on prod the retitle + dedup will fire.
- Plural query alias for tag filters would need a client change (out of scope; client normalizeTag already folds separators).
- Hand-lint regex `[a-z,]\.[A-Z]` residuals beyond the extension whitelist belong to Run24A.
