# Created rows: ux-admin-content (cycle-03), rev b89d3e4b
| id | type | title | removed | confirmed absent |
|---|---|---|---|---|
| 190353 | resource (pending) | [QA-audit-1026] c3 resource | UI Delete | /api/resources/190353 404 anon+admin; resources 4017 = baseline |
| 1196 | category | [QA-audit-1026] c3 cat -> renamed | UI Delete | absent in /api/admin/categories and /api/categories |
| 2335 | subcategory (parent 1196) | [QA-audit-1026] c3 sub | UI Delete | absent in /api/admin/subcategories |
| 3774 | sub-subcategory (parent 2335) | [QA-audit-1026] c3 subsub | UI Delete | absent in /api/admin/sub-subcategories |

Side effect on a REAL row: resource 190113 "oddity-rtsp-server". While probing edit-dialog validation I cleared the Title/URL fields with a no-op fill and pressed Save; the app showed "Resource updated: Changes to oddity-rtsp-server were saved". API afterwards shows title, url, description and status unchanged (approved), so the save was a no-op re-save of identical values. It may have written a resource audit-log entry / bumped updated_at. My mistake; I did not repeat it on real rows (edit-validation was re-driven on my own row 190353, with no save).
Journeys: steps dialog opened read-only; Add step dialog opened, a resource picked, then Cancel; nothing saved.
