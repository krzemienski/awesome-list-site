# L07-admin-taxonomy: 74 open rows (from omp todo 5389, 2026-10-27 18:13Z)

| id | surface/route | action | expected result | required width/state | evidence path | verdict |
|---|---|---|---|---|---|---|
| CAT-01 | `/admin#categories` | Load category list | Shows skeleton rows while `GET /api/admin/categories` is pending. | All; loading | pending | PENDING |
| CAT-02 | Categories | Activate `Retry` after list failure | Reissues categories; failure is not rendered as an empty/search-no-match state. | All; failure with/without stale rows | pending | PENDING |
| CAT-03 | Categories | Search with no matches | Shows an explicit no-match row and accurate filtered-from count. | All; zero matches | pending | PENDING |
| CAT-04 | Categories | Inspect populated rows | Name, slug, icon, approved resource count, and subcategory count reconcile with admin categories and `GET /api/awesome-list/nav`. | All; populated | pending | PENDING |
| CAT-05 | Categories header | Toggle `Search`/`Hide search` | Reveals/hides search with correct expanded state and retains usable focus. | All; admin | pending | PENDING |
| CAT-06 | Categories search | Type name/slug query | Filters client-side, resets to page 1, and reports result counts. | All; populated | pending | PENDING |
| CAT-07 | Categories search | Activate `Clear search` | Clears query, keeps search open, and returns focus to the input. | All; query present | pending | PENDING |
| CAT-08 | Categories header | Open `Add category` | Opens empty Create Category dialog without an API write. | All; admin | pending | PENDING |
| CAT-09 | Create Category | Edit `Name *` | Updates name and auto-generates a transliterated lowercase slug, including diacritics handling. | All; create dialog | pending | PENDING |
| CAT-10 | Create Category | Edit `Slug *` after auto-generation | Manual slug overrides auto-output and is validated as required. | All; create dialog | pending | PENDING |
| CAT-11 | Create Category footer | Submit with `[QA-audit-1026]` name | `POST /api/admin/categories` creates one QA category, refreshes admin/public taxonomy, and supplies its ID for cleanup. | All; QA creation only | pending | PENDING |
| CAT-12 | Create Category footer | Cancel | Closes without `POST /api/admin/categories`; validation/input is not submitted. | All; create dialog | pending | PENDING |
| CAT-13 | Create Category | Submit empty name and duplicate slug | Dialog stays open with alert; expected field receives focus, `aria-invalid`, and `aria-describedby` rather than banner-only feedback (AC-20). | All; validation/server duplicate | pending | PENDING |
| CAT-14 | Category row | Activate `Edit` | Opens the selected category with existing name/slug; no write occurs. | All; populated | pending | PENDING |
| CAT-15 | Edit Category | Change `Name *` | Updates draft without silently rewriting the existing public slug. | All; QA row dialog | pending | PENDING |
| CAT-16 | Edit Category | Change `Slug *` | Allows deliberate slug edit and validates required/duplicate values. | All; QA row dialog | pending | PENDING |
| CAT-17 | Edit Category footer | Save a QA category | `PATCH /api/admin/categories/:id` persists only the QA row and refreshes admin/public lists. | All; QA row only | pending | PENDING |
| CAT-18 | Edit Category footer | Cancel | Closes without `PATCH /api/admin/categories/:id`; unsaved edits are discarded. | All; dialog | pending | PENDING |
| CAT-19 | Edit Category | Submit empty name or duplicate slug | Field-specific focus/ARIA error is required (AC-20), dialog/draft remain available, and no success toast is shown. | All; validation/server duplicate | pending | PENDING |
| CAT-20 | Category row delete flow | Open, cancel, then delete own empty QA category | Open sends nothing; Cancel sends nothing; confirmation `DELETE /api/admin/categories/:id` removes only the empty QA row and refetches. | All; QA cleanup only | pending | PENDING |
| CAT-21 | Category row delete confirmation | Delete a pre-existing category | Deletion is forbidden; rows with resources/subcategories must additionally expose the disabled reason and prevent confirmation. | All; real row and locked-row states | pending | BLOCKED-BY-POLICY |
| CAT-22 | Categories pagination | Change rows per page and use numbered/Previous/Next/jump controls | Page size 10/25/50/100 resets page 1; real hrefs, direct jump, invalid-input feedback, and focus all work. | All; multi-page | pending | PENDING |
| CAT-23 | Edit Category footer | Save a pre-existing category | `PATCH /api/admin/categories/:id` would mutate real taxonomy and is forbidden. | All; real-row dialog | pending | BLOCKED-BY-POLICY |
| SC-01 | `/admin#subcategories` | Load subcategories | Shows skeleton rows while `GET /api/admin/subcategories` is pending. | All; loading | pending | PENDING |
| SC-02 | Subcategories | Activate `Retry` after list failure | Reissues subcategories; error is distinct from no matches. | All; failure | pending | PENDING |
| SC-03 | Subcategories | Search with no matches | Shows explicit no-match row and filtered-from count. | All; zero matches | pending | PENDING |
| SC-04 | Subcategories | Inspect populated rows | Name, slug, parent, resource count, and navigation order match admin subcategories and `GET /api/awesome-list/nav`. | All; populated | pending | PENDING |
| SC-05 | Subcategories header | Toggle `Search`/`Hide search` | Reveals/hides search with accurate expanded state. | All; admin | pending | PENDING |
| SC-06 | Subcategories search | Type name/slug query | Filters client-side and resets to page 1. | All; populated | pending | PENDING |
| SC-07 | Subcategories search | Activate `Clear search` | Clears query and restores input focus while keeping it open. | All; query present | pending | PENDING |
| SC-08 | Subcategories header | Open `Add subcategory` | Opens create form with parent/name/slug controls and no write. | All; admin | pending | PENDING |
| SC-09 | Create Subcategory | Choose `Parent Category *` | Loads options through `GET /api/admin/categories` and stores the selected parent ID. | All; create dialog | pending | PENDING |
| SC-10 | Create Subcategory | Edit `Name *` | Updates name and auto-generates slug. | All; create dialog | pending | PENDING |
| SC-11 | Create Subcategory | Edit `Slug *` | Allows manual validated slug override. | All; create dialog | pending | PENDING |
| SC-12 | Create Subcategory footer | Submit with `[QA-audit-1026]` name | `POST /api/admin/subcategories` creates one QA row under the selected parent and returns its ID for cleanup. | All; QA creation only | pending | PENDING |
| SC-13 | Create Subcategory footer | Cancel | Closes without `POST /api/admin/subcategories`. | All; create dialog | pending | PENDING |
| SC-14 | Create Subcategory | Submit missing parent/name or duplicate slug | Parent/name/slug errors are accessible; duplicate slug focuses/marks the field rather than showing only a banner (AC-20). | All; validation/server duplicate | pending | PENDING |
| SC-15 | Subcategory row | Activate `Edit` | Opens selected subcategory with current parent/name/slug. | All; populated | pending | PENDING |
| SC-16 | Edit Subcategory | Change `Name *` | Updates draft without auto-changing existing slug. | All; QA row dialog | pending | PENDING |
| SC-17 | Edit Subcategory | Change `Slug *` | Allows deliberate validated slug change. | All; QA row dialog | pending | PENDING |
| SC-18 | Edit Subcategory | Change `Parent Category *` | Updates parent ID in draft using admin category options. | All; QA row dialog | pending | PENDING |
| SC-19 | Edit Subcategory footer | Save a QA subcategory | `PATCH /api/admin/subcategories/:id` persists only the QA row and refreshes related taxonomy. | All; QA row only | pending | PENDING |
| SC-20 | Edit Subcategory footer | Cancel | Closes without `PATCH /api/admin/subcategories/:id`. | All; dialog | pending | PENDING |
| SC-21 | Edit Subcategory | Submit invalid fields or duplicate slug | Dialog retains draft and gives focused, associated field error (AC-20); no false success. | All; validation/server duplicate | pending | PENDING |
| SC-22 | Subcategory row delete flow | Open, cancel, then delete own empty QA subcategory | Open/Cancel send nothing; confirmation `DELETE /api/admin/subcategories/:id` removes only the QA row. | All; QA cleanup only | pending | PENDING |
| SC-23 | Subcategory row delete confirmation | Delete a pre-existing subcategory | Forbidden; rows with resources or sub-subcategories also expose lock reason and disabled confirmation. | All; real and locked rows | pending | BLOCKED-BY-POLICY |
| SC-24 | Subcategories pagination and parent errors | Use 24-row page control/paginator; activate parent-load `Retry` | Pagination preserves navigation order and direct links; parent retry reissues categories and removes the parent-name error only on success. | All; multi-page and parent failure | pending | PENDING |
| SC-25 | Edit Subcategory footer | Save a pre-existing subcategory | `PATCH /api/admin/subcategories/:id` would mutate real taxonomy and is forbidden. | All; real-row dialog | pending | BLOCKED-BY-POLICY |
| SSC-01 | `/admin/subsubcategories` or Settings → Sub-Subcats | Load list | Shows skeleton rows while `GET /api/admin/sub-subcategories` is pending. | All; loading | pending | PENDING |
| SSC-02 | Sub-Subcategories | Activate `Retry` after list failure | Reissues sub-subcategories; error is not an empty result. | All; failure | pending | PENDING |
| SSC-03 | Sub-Subcategories | Search with no matches | Shows explicit no-match row and accurate count. | All; zero matches | pending | PENDING |
| SSC-04 | Sub-Subcategories | Inspect populated rows | Name, slug, both parents, and resource count match admin sub-subcategories/categories/subcategories. | All; populated | pending | PENDING |
| SSC-05 | Sub-Subcategories header | Toggle `Search`/`Hide search` | Reveals/hides search with accurate expanded state. | All; admin | pending | PENDING |
| SSC-06 | Sub-Subcategories search | Type name/slug query | Filters client-side and resets page 1. | All; populated | pending | PENDING |
| SSC-07 | Sub-Subcategories search | Activate `Clear search` | Clears query and restores input focus. | All; query present | pending | PENDING |
| SSC-08 | Sub-Subcategories header | Open `Add sub-subcategory` | Opens create form with cascading parents and no write. | All; admin | pending | PENDING |
| SSC-09 | Create Sub-Subcategory | Choose `Parent Category *` | Loads categories and resets any previously chosen subcategory. | All; create dialog | pending | PENDING |
| SSC-10 | Create Sub-Subcategory | Choose `Parent Subcategory *` | Filters options by category through `GET /api/admin/subcategories`; disabled/empty hint is accurate until a parent exists. | All; create dialog, with/without options | pending | PENDING |
| SSC-11 | Create Sub-Subcategory | Edit `Name *` | Updates name and auto-generates slug. | All; create dialog | pending | PENDING |
| SSC-12 | Create Sub-Subcategory | Edit `Slug *` | Allows manual validated slug override. | All; create dialog | pending | PENDING |
| SSC-13 | Create Sub-Subcategory footer | Submit with `[QA-audit-1026]` name | `POST /api/admin/sub-subcategories` creates one QA row under the selected parents and returns its ID for cleanup. | All; QA creation only | pending | PENDING |
| SSC-14 | Create Sub-Subcategory footer | Cancel | Closes without `POST /api/admin/sub-subcategories`. | All; create dialog | pending | PENDING |
| SSC-15 | Create Sub-Subcategory | Submit missing parents/name or duplicate slug | Parent/name/slug errors are accessible; duplicate slug focuses/marks field (AC-20), and slug-or-name server behavior remains consistent. | All; validation/server duplicate | pending | PENDING |
| SSC-16 | Sub-Subcategory row | Activate `Edit` | Opens selected row with current parents/name/slug. | All; populated | pending | PENDING |
| SSC-17 | Edit Sub-Subcategory | Change `Name *` | Updates draft without auto-changing existing slug. | All; QA row dialog | pending | PENDING |
| SSC-18 | Edit Sub-Subcategory | Change `Slug *` | Allows deliberate validated slug change. | All; QA row dialog | pending | PENDING |
| SSC-19 | Edit Sub-Subcategory | Change parent Category, then parent Subcategory | Category change resets subcategory; only valid cascading options can be submitted. | All; QA row dialog | pending | PENDING |
| SSC-20 | Edit Sub-Subcategory footer | Save a QA row | `PATCH /api/admin/sub-subcategories/:id` persists only the QA row and refreshes related taxonomy. | All; QA row only | pending | PENDING |
| SSC-21 | Edit Sub-Subcategory footer | Cancel | Closes without `PATCH /api/admin/sub-subcategories/:id`. | All; dialog | pending | PENDING |
| SSC-22 | Edit Sub-Subcategory | Submit invalid fields or duplicate slug | Dialog retains draft and gives focused associated field error (AC-20); no false success. | All; validation/server duplicate | pending | PENDING |
| SSC-23 | Sub-Subcategory row delete flow | Open, cancel, then delete own empty QA row | Open/Cancel send nothing; confirmation `DELETE /api/admin/sub-subcategories/:id` removes only the QA row. | All; QA cleanup only | pending | PENDING |
| SSC-24 | Sub-Subcategory row delete confirmation | Delete a pre-existing row | Forbidden; rows with resources expose lock reason and disabled confirmation. | All; real and locked rows | pending | BLOCKED-BY-POLICY |
| SSC-25 | Sub-Subcategories pagination and parent errors | Change page size/use paginator; activate parent-load `Retry` | Page size 10/25/50/100 and jump behavior work; retry reissues failed category and/or subcategory reads without inventing parent names. | All; multi-page and parent failures | pending | PENDING |
| SSC-26 | Edit Sub-Subcategory footer | Save a pre-existing row | `PATCH /api/admin/sub-subcategories/:id` would mutate real taxonomy and is forbidden. | All; real-row dialog | pending | BLOCKED-BY-POLICY |
