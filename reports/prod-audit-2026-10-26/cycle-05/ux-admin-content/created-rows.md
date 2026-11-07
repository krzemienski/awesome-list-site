# created rows (c5 ux-admin-content)
- resource 190357 "[QA-audit-1026] c5 admin-content resource" (url https://example.com/qa-audit-1026-c5-admcontent): created pending via Add dialog. To delete by id at end.
- 190357: featured toggled on/off, duplicate-URL create+edit rejected server-side (nothing saved), bulk-deleted via alertdialog. Confirmed public /api/resources/190357 404 and 0 QA results in admin search.
- category "[QA-audit-1026] c5 category" (slug qa-audit-1026-c5-category): created via UI; id TBD
- category 1198 "[QA-audit-1026] c5 category renamed": created + edited (rename; duplicate slug + empty name rejected)
- subcategory 2337 "[QA-audit-1026] c5 subcategory" under category 1198: created
- sub-subcategory 3776 "[QA-audit-1026] c5 subsub" under subcategory 2337: created
- Taxonomy rows 1198/2337/3776 deleted via UI alertdialogs (Cancel focused). Confirmed 0 QA names in /api/categories, admin subcategories and sub-subcategories.
