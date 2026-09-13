# Task #554 — System evidence

- Theme: Editorial × Crimson
- Viewports: 375, 768, 1024, 1440
- Broad route pass: 32 captures retained under `screenshots/`; unknown route returned HTTP 404 at all widths with no redirect, matching the retained production baseline.
- Natural empty-search owner: `client/src/pages/Search.tsx`; real query `zzqxv-nothing`, loading `search-results-loading`, terminal `text-no-results`.
- Latest state evidence: consent banners (home + submit), guest bookmark toast, real throttled skeleton/replacement, and showcase correction captured at all four widths under `latest/`.
- Consent: zero external analytics hosts before decision; 375 CTA clearance has zero overlaps. Higher-width fixed-banner/content overlaps are recorded in `latest/consent-metrics.json`; no claim of clearance there.
- Guest bookmark: real on-device add toast present with `li[data-state]`; focused axe serious/critical = 0 at 375/1440.
- Superseded loading capture: the earlier route-fallback capture was not Search-owned. Authoritative correction is in `latest/loading-owned/`: after warming `/search?q=zzqxv-nothing`, real CDP throttling and a new `ffmpeg` query produced 36 `.system-skeleton` descendants under `data-testid="search-results-loading"` at every width, zero route-chunk fallbacks, and 24 content cards on replacement. Incremental CLS and geometry are retained; this is not a zero-shift pass. Focused axe serious/critical = 0 at 375/1440.
- Showcase correction: caption readable, decorative swatch aria-hidden, focused axe serious/critical = 0 at 375/1440.
- Print audit: PASS, 49/49. ds-showcase: PASS, 20/20. ds-button-sweep was not rerun; the prior timed-out partial log is retained and admin failures are out of scope.
- Test-ID comparison against `tests/parity/production-baseline/2026-09-12` is retained in `testid-diff-concise.json`; repeated legacy shell/nav IDs are reported, not silently treated as missing evidence.

Raw request/DOM logs remain in `summary-raw.json`, `captures.json`, and `flows/`; this summary intentionally contains host/count metrics only.
- Cleanup final check: authed disposable phase reports zero `__qa_test_ds_sweep_*` users. Exact admin suffix cleanup is retained in `latest/loading-owned/admin-fixture-cleanup.json`: exact resource/category lookups were empty before and after parameterized `DELETE 0` checks; persistent QA admin was untouched and no broad prefix query/cleanup was performed.
- Exact admin cleanup correction: `latest/loading-owned/admin-fixture-cleanup.json` records the known suffix `1789276853708_1a1xzr`; exact resource/category lookups were empty before and after parameterized `DELETE 0` checks. Persistent QA admin was untouched; no broad prefix query or cleanup was performed.
