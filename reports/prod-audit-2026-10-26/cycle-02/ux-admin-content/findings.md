# ux-admin-content — cycle 02 (rev c25cd76f, 16:56:45Z–17:20:51Z) — ISSUES 7 (1 MEDIUM, 6 LOW); AC-01..05 + HDR-01 FIXED
(saved by lead from the auditor's final message; harness refused the auditor's Write)

| id | sev | URL | width | saw | expected | evidence | likely source |
|---|---|---|---|---|---|---|---|
| AC-06 | LOW | /admin#resources | all | Search "webrtc" (115) → page 3 → URL `?status=approved&page=3`; reload keeps page 3 but drops the search → page 3 of unfiltered 3,825 under empty search box. Category and sort not in URL either. | search/category/sort persist with page, or page resets when absent | resources-reload-drops-search-1440.png | ResourceManager.tsx:229-230, :250 vs :276-299 |
| AC-07 | MEDIUM | /admin#resources | ~741-895px (768, 820 confirmed) | "Show filters and tools" button shrinks below its label (768: 77px for 105px text; 820: 99 for 116); label spills across Search field and Add "+". | label fits | resources-768-filters-overflow.png, resources-820-touch.png | admin-catalog-resources.css:45-60; ResourceManager.tsx:1213-1226 |
| AC-08 | LOW | /admin#categories/#subcategories/#subsubcategories | 390, 820 touch | "Clear search" X is 36×36 with touch pointer | ≥44 on touch | subcategories-390-touch-search.png | GenericCrudManager.tsx:2697 |
| AC-09 | LOW | taxonomy tabs | all | "Search" toggle shows field but focus stays on toggle; typing goes nowhere | focus moves into field | subsubcats-1440.png | GenericCrudManager.tsx:2588-2595 |
| AC-10 | LOW | /admin#edits "Recently resolved" | 820/390 touch, 1440 | rejection reasons ellipsized (164px box for 380px text), full text only in title tooltip (no touch) | full reason readable on touch | edits-820-touch.png, edits-1440.png | RecentResourceEdits.tsx:107-109 |
| AC-11 | LOW | /admin#resources | 1440 | Enter on "Go to page 2": scrollY 647→1642, focus stays on paginator, new first row 1201px above viewport. Public listings fixed in #58; admin not. | paging brings new results into view | eval {y:1642, firstRowTop:-1201} | ResourceManager.tsx:1724-1735 |
| AC-12 | LOW | /admin#subsubcategories | 1440 | search field 200px, placeholder cut "Search sub-subcateg" | placeholder fits | subsubcats-1440.png | admin-catalog-taxonomy.css:91-93 |

## Cycle-1 re-checks: AC-01..05 and HDR-01 all FIXED (details in auditor report: focus to first invalid field with no live region; touch checkboxes visible 32×32; named scroll regions + cue; Recently resolved = API 10 rows, Check again refetches both; delete-locked wraps at 390, 4.72:1; header links 24 mouse / 44 touch).
## Passed: Overview numbers = API; Resources search/sort/filter/create/edit/delete (row 404 after); Approvals view only (FlipReel untouched); taxonomy CRUD on own rows; journeys 6/7 view-only, Remove/Clear 44×44, nothing saved; shell sizes; no console errors.
## UNVERIFIED: live approve/reject landing in Recently resolved; server field-error focus; bulk actions/Featured/approve-all not re-driven; true hover:none device; reduced motion; SR output; loading/error states.
## Rows created & removed: resource 190351, category 1195, subcategory 2334, sub-subcategory 3773 — lead confirmed 190351 404 public, no QA taxonomy in /api/categories or admin subcategories, stats 4017/3825/16 = baseline.
