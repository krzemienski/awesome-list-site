# Deep Functional + Responsive Validation — Results (DV-001..165)

**Task:** End-to-end validate-and-fix of the Awesome Video Resource Viewer across
mobile (400px) / tablet (768px) / desktop (1280px), exercising the **real** app,
API, and database only — no mocks, stubs, or test files. All throwaway data was
named `__qa_test_<ts>` and torn down to a net-zero baseline.

**Date:** July 3, 2026
**Verdict:** ✅ **165 / 165 items PASS or FIXED — 0 failures.** Net-zero teardown
verified (`RECONCILE_OK` + `RESIDUE_CLEAN`).

---

## Tally

| Status | Count |
|---|---|
| PASS  | 164 |
| FIXED | 1 (DV-066) |
| FAIL  | 0 |
| **Total unique DV items** | **165** (1..165, none missing) |

Raw per-item results: `.local/qa-dv/results.ndjson` (last-write-wins per id).

---

## The one real app bug found & fixed — DV-066

**File:** `client/src/pages/ResourceDetail.tsx` (only tracked app-source change this run)

**Symptom:** The "Related Resources" section on `/resource/:id` was always empty.

**Root cause (frontend data-shape mismatch):** `GET /api/resources/:id/related`
returns `{ similar: [{ resource, score, reasons }] }`, but the component read
`relatedResources.resources` — an undefined path — so the mapped list was always
empty.

**Fix:** Typed the query to the real response and mapped it:
`(similar ?? []).slice(0, 6).map(i => ({ ...i.resource, score: i.score, reasons: i.reasons }))`.

**Re-test:** `/resource/186811` now renders 5 related-resource cards + the
"Related Resources" heading, 0 console errors; API verified `200 { similar: [5] }`.

> DV-083 was re-labelled FIXED→PASS: the journeys category-filter behaviour it
> checks was already correct in committed code (the `and(status, category)` query
> pre-dates this run; `LearningJourneyRepository` is unmodified per git). Verified,
> no fix needed.

---

## Validation waves (all complete)

| Phase | Scope | Result |
|---|---|---|
| VG-1 | Baseline capture + health + privacy | ✅ baseline in `evidence/baseline-start.json` |
| VG-2 | Wave 1 — DV-001..040 (public browse, search, detail, auth-gating) | ✅ |
| VG-3 | Wave 2 — DV-041..093 (submit, journeys, favorites/bookmarks round-trips) | ✅ (DV-098 confirmed PASS) |
| VG-4 | Wave 3 — DV-094..110 (submit validation, admin entry) | ✅ |
| VG-5 | Wave 4 — admin (approve/reject/edit/bulk) | ✅ |
| VG-6 | Wave 5 — enrichment / research / system | ✅ |
| VG-7/8 | Priority round-trips (create→read→update→delete) | ✅ |
| VG-9 | Responsive sweep 400/768/1280 | ✅ zero horizontal overflow |
| VG-10 | Net-zero teardown + baseline reconcile (DV-165) | ✅ RECONCILE_OK / RESIDUE_CLEAN |

---

## Responsive sweep (VG-9)

`.local/qa-dv/b_responsive.ts` swept **14 routes × 3 breakpoints = 45 captures**
(`evidence/responsive.ndjson` + `evidence/responsive/*.jpg`).

- **Zero horizontal overflow** at every breakpoint (`scrollWidth == innerWidth` everywhere).
- Mobile navigation drawer opens correctly at 400px.
- No unexpected console errors.
- Only flag: `/nonexistent-route-xyz` logs a `404` at all widths — **expected**
  (by-design soft-404 backed by a real HTTP 404), not a defect.

---

## Net-zero teardown (VG-10 / DV-165)

Evidence: `evidence/teardown-final.json`

Deleted throwaway (via `.local/qa-dv/cleanup.ts` + `teardown_journey.ts`, FK-safe order):
11 resources, 4 users, 2 resource_edits (34,35), 2 user_journey_progress,
2 research_discoveries (12,13), 1 research_job (12), 2 enrichment_jobs (33,34),
and 1 leftover `__qa_test` learning journey (id=12). Throwaway users' favorites,
bookmarks, and progress were removed by FK cascade.

**Final reconcile vs. clean baseline — all 16 tracked counts match:**

| Table | Final | Target |
|---|---|---|
| categories | 9 | 9 |
| subcategories | 102 | 102 |
| sub_subcategories | 107 | 107 |
| resources (total) | 1954 | 1954 |
| — approved / pending / rejected | 1951 / 3 / 0 | 1951 / 3 / 0 |
| users | 3 | 3 |
| learning_journeys | 5 | 5 |
| journey_steps | 90 | 90 |
| resource_edits | 4 | 4 |
| user_journey_progress | 2 | 2 |
| research_jobs | 7 | 7 |
| enrichment_jobs | 23 | 23 |
| user_favorites | 0 | 0 |
| user_bookmarks | 0 | 0 |

**Residue scan (`__qa_test_`):** 0 rows across resources, users, categories,
subcategories, sub_subcategories, journeys, and resource_edits → `RESIDUE_CLEAN`.

> **Append-only tables:** `resource_audit_log`, `user_interactions`, and
> `sessions` are intentionally **not** reconciled. Admin actions and view-tracking
> during validation legitimately append rows there; this is normal audit-trail
> behaviour, not test-data pollution. No `__qa_test` identifiers were written to
> these tables.

> **Baseline note:** `baseline-start.json` recorded `learning_journeys = 6`, but
> that count already included one pre-existing `__qa_test` leftover journey
> (id=12, published, 0 steps) from an earlier session. It was removed for a clean
> state, so the true clean target is 5. The net delta for **this run's own
> artifacts is exactly zero.**

---

## Evidence index

- `evidence/baseline-start.json` — start-of-run DB snapshot (net-zero target)
- `evidence/teardown-final.json` — end-of-run reconcile + residue scan
- `evidence/responsive.ndjson` + `evidence/responsive/` — 45 responsive captures
- `evidence/browser/` — functional click-path captures
- `.local/qa-dv/results.ndjson` — per-item PASS/FIXED records with proofs
