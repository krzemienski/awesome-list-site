# NB-046 — 54% of catalog untagged, gap invisible (VG-gate)

Decision: a full enrichment run over 759 untagged resources is a paid Claude batch job — not run unilaterally. Fix lands the *visibility* + the one-click path:
- New `GET /api/admin/enrichment/coverage` (admin-gated; anon → 401 verified) returns `{approvedTotal, tagged, untagged, coveragePct}` from a single jsonb census query.
- BatchEnrichmentPanel renders the census above Job Control: "Tag coverage: 1,047 of 1,806 approved resources have tags (58%). Run an enrichment job with the 'Unenriched Only' filter to close the 759-resource gap." (`nb046-coverage.png`, data-testid `text-tag-coverage`).
- The existing "Unenriched Only" filter + Start button on the same card is the remediation path; admin can run it batch-by-batch under budget control.

**PASS (visibility + actionable path; bulk enrichment left as an admin-initiated action).**
