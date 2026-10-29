# Created rows: ux-admin-content (cycle-02)

All created through the admin UI on live c25cd76f, all titled `[QA-audit-1026] …`, and all removed through the UI's own Delete flows.

| id | type | title | created (UTC, approx) | removed | confirmed absent |
|---|---|---|---|---|---|
| 190351 | resource (pending) | [QA-audit-1026] c2 resource → renamed "[QA-audit-1026] c2 resource renamed" | ~17:01Z | Resources row Delete → confirm (~17:17Z) | `/api/resources/190351` 404 (anon and admin); not in `/api/admin/resources?status=pending`; stats resources 4017 / pending 16 = baseline |
| 1195 | category | [QA-audit-1026] c2 cat | ~17:05Z | Categories row Delete (~17:20Z) | `/api/admin/categories` and `/api/categories` = 9, id absent |
| 2334 | subcategory | [QA-audit-1026] c2 sub (parent 1195) | ~17:06Z | Subcategories row Delete (~17:19Z) | `/api/subcategories` (no-store) = 99, id absent |
| 3773 | sub-subcategory | [QA-audit-1026] c2 subsub → renamed "… renamed" (parent 2334) | ~17:08Z | Sub-Subcats row Delete (~17:18Z) | `/api/admin/sub-subcategories` and `/api/sub-subcategories` (no-store) = 32, id absent |

Side effects: none persistent. Resource and taxonomy audit-log entries for these ids remain in `resource_audit_log`, as with any admin action. No journey, step or edit rows were created: the steps dialog was opened on real journeys 6 and 7 read-only, and the Add step dialog was cancelled without saving (journey 6 still has 13 step rows).
