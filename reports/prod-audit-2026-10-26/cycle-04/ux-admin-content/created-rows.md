# created rows (c4 ux-admin-content)
- resource 190355 "[QA-audit-1026] c4 admin-content resource": created pending via Add dialog; Featured toggled on/off; bulk-approved (approved, public 3826 briefly); a duplicate-URL edit was rejected server-side (nothing saved); bulk-deleted. Confirmed: /api/admin/resources/190355 405 (no GET by id), search QA-audit-1026 returns 0, public /api/resources/190355 404, stats back to 4017/3825/16.
- category 1197 "[QA-audit-1026] c4 category" (slug qa-audit-1026-c4-category) - to delete
- subcategory 2336 "[QA-audit-1026] c4 subcategory" under category 1197 - to delete
- sub-subcategory 3775 "[QA-audit-1026] c4 subsub" under subcategory 2336 - to delete
- Taxonomy rows 1197/2336/3775 deleted via UI delete dialogs; confirmed 0 QA rows in /api/categories, admin subcategories, sub-subcategories; subcats 99, subsubs 32 (baseline). Stats 4017/3825/16.
