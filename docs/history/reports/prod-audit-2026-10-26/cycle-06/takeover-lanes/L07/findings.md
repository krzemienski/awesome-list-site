**Verdict: ISSUES, and the lane is incomplete.** I drove 20 of the 74 rows, and only at 1440×900. Every other row, and the 820 and 390 widths for all rows, is undriven, and nothing is claimed for them. Production stayed on `bc1797b065c1989ab92f512633f69bf3fe25e718` at start (18:50Z) and end (18:56Z).

I stopped because I judged this lane too large for the context I had left. All my QA rows are deleted and the public taxonomy is back to baseline. The next lane can start at SC-01.

## 1. Findings

| id | sev | URL | width | saw vs expected | evidence | likely source |
|---|---|---|---|---|---|---|
| T6-07-01 | Low | `/admin#categories`, create and edit dialogs | 1440 | The field error (`#create-slug-error`, `#edit-slug-error`) has no `role=alert` or `aria-live`. Focus does move to the field, with `aria-invalid` and `aria-describedby`. The row asks for a dialog "with alert". | `cat-create-empty-1440.png`, DOM read-back | `client/src/components/admin/GenericCrudManager.tsx` (error element rendering) |
| T6-07-02 | Info | Create Category dialog | 1440 | After a manual slug override, typing in Name regenerates the slug and discards the override. This may be intended, so it is an observation only. | session log | `GenericCrudManager.tsx` (name-to-slug sync) |

I did not read the source for these line numbers. They are pointers only.

## 2. Row matrix

All rows were driven at 1440 only. "PASS@1440" means 820 and 390 are still undriven, so each of those rows is an open gap.

| row | verdict | evidence |
|---|---|---|
| CAT-01 | UNDRIVEN | skeleton state never captured |
| CAT-02 | PASS@1440 | `cat-error-1440.png`. With `/api/admin/categories` aborted, the tab shows "Couldn't load categories" and Retry, not an empty state. Retry reissued the GET, and after the route was removed Retry restored the rows. |
| CAT-03 | PASS@1440 | `cat-nomatch-1440.png` shows "No categories match your search." and "filtered from 9". |
| CAT-04 | PASS@1440 | `cat-populated-1440.png`. Counts match `/api/categories` (129, 580, 514 and so on). I did not check the icon or `/api/awesome-list/nav`. |
| CAT-05 | PASS@1440 | Label flips to "Hide search", `aria-expanded` is true, and focus moves to the input. |
| CAT-06 | PARTIAL | Filtering works ("media" gave one row). Reset to page 1 and result counts were not checked. |
| CAT-07 | PASS@1440 | Query cleared, input stays open and focused, 9 rows restored. |
| CAT-08 | PASS@1440 | Empty dialog, no write. |
| CAT-09 | PASS@1440 | Slug generated as `qa-audit-1026-cafe-uni-aetest` from a name with diacritics. |
| CAT-10 | PASS@1440 | Manual slug override works and "Slug is required" shows on empty submit. See T6-07-02. |
| CAT-11 | PASS@1440 | `POST /api/admin/categories` returned id 1205. Admin and public lists refreshed. |
| CAT-12 | UNDRIVEN | Create Cancel was not isolated. |
| CAT-13 | PASS@1440 (T6-07-01) | `cat-create-empty-1440.png`. Empty submit focused `#create-name`, and both fields got `aria-invalid` and `aria-describedby`. The server duplicate showed "slug already in use", focused the slug field, and kept the dialog open (`cat-dup-create2-1440.png`). |
| CAT-14 | PASS@1440 | Edit dialog shows existing name and slug, no write. |
| CAT-15 | PASS@1440 | Name change left the slug untouched. |
| CAT-16 | PASS@1440 | Slug edit allowed. A duplicate slug is rejected with a focused, ARIA-marked field and no PATCH. |
| CAT-17 | PASS@1440 | `PATCH /api/admin/categories/1205` persisted, and the public list refreshed. |
| CAT-18 | PASS@1440 | Cancel sent no PATCH and the name was unchanged. |
| CAT-19 | PASS@1440 (T6-07-01) | Empty name focused `#edit-name` with ARIA. Duplicate slug focused the slug field. The PATCH count stayed unchanged and no success toast appeared. |
| CAT-20 | PASS@1440 | Opening and cancelling the delete dialog sent nothing. Confirm sent `DELETE /api/admin/categories/1206`. |
| CAT-21 | BLOCKED-BY-POLICY | I observed that every real row's Delete button is disabled with a reason ("unavailable: 129 resources still assigned"). |
| CAT-22 | UNDRIVEN | Pagination was seen (Previous, 1, 2, Next, "Page 1 of 2") only incidentally. |
| CAT-23 | BLOCKED-BY-POLICY | Real-row save forbidden. |
| SC-01 to SC-03 | UNDRIVEN | |
| SC-04 | PARTIAL | `sc-populated-1440.png` shows name, slug, parent and resource count. Not reconciled against the API or nav. |
| SC-05 to SC-22, SC-24 | UNDRIVEN | |
| SC-23, SC-25 | BLOCKED-BY-POLICY | Delete buttons on real rows are disabled with a reason (observed). |
| SSC-01 to SSC-22, SSC-25 | UNDRIVEN | |
| SSC-23 | UNDRIVEN | Not blocked by policy, since it deletes my own empty QA row. |
| SSC-24, SSC-26 | BLOCKED-BY-POLICY | |

SSC-23 should be driven, and it needs a QA parent chain created first.

## 3. QA rows created and deleted

Log: `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L07/qa-rows.log`.

| id | created | outcome |
|---|---|---|
| 1205 | create test | deleted |
| 1206 | my tool slip: `type` appended to the auto slug instead of overriding it | deleted by the CAT-20 flow (`DELETE /api/admin/categories/1206`) |
| 1207 | edit-duplicate test | deleted |

Re-read after cleanup:
- Public `/api/categories` has 9 categories, with ids, names and counts equal to the pre-test baseline (`base-categories.json` against `post-categories.json`).
- Admin `/api/admin/categories` has 9 rows and no QA names.
- Public `/api/categories/1205` returns 404.

No subcategory or sub-subcategory rows were created.

## 4. Settings changed

None. Test injections (all removed or session-local):
- localStorage `umami.disabled=1` in my own session.
- `agent-browser network route --abort` on `/api/admin/categories`, removed with `unroute`.

Evidence files are in `reports/prod-audit-2026-10-26/cycle-06/takeover-lanes/L07/`: `cat-populated-1440.png`, `cat-nomatch-1440.png`, `cat-create-empty-1440.png`, `cat-dup-create2-1440.png`, `cat-delete-confirm-1440.png`, `cat-error-1440.png`, `sc-populated-1440.png`, the `base-*.json` baselines and `qa-rows.log`.

## Tool caveats

- `agent-browser fill ""` did not fire onChange, and the next submit used the previous value. That produced the stray 1206 row, and I treated it as a tool artifact, not a product bug.
- Hash-only `open` does not reload the page.