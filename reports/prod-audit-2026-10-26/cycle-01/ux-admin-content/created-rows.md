# Created rows — ux-admin-content (cycle-01)

All rows titled `[QA-audit-1026] …`; created through the admin UI on live 229f004d.

| Kind | id | Title / name | Created (UTC) | How | Deleted? |
|---|---|---|---|---|---|
| resource | 190345 | [QA-audit-1026] approve-path resource (https://example.invalid/qa-audit-1026-1) | 09:2x | Resources → Add (status Pending) | DELETED via Resources row Delete (after approve, 2 edits, rename, feature on/off); API GET 404 |
| resource | 190346 | [QA-audit-1026] row 4 (…/qa-audit-1026-4) | 09:2x | Resources → Add | DELETED via Resources bulk Delete (rejected first in Approvals); API GET 404 |
| resource | 190347 | [QA-audit-1026] row 2 (…/qa-audit-1026-2) | 09:2x | Resources → Add | DELETED via Resources bulk Delete (rejected first in Approvals); API GET 404 |
| resource | 190348 | [QA-audit-1026] row 3 (…/qa-audit-1026-3) | 09:2x | Resources → Add | DELETED via Resources bulk Delete (rejected first in Approvals); API GET 404 |
| resource_edit | 67 | edit A on 190345 (description) | 09:32:58 / 09:33:02 | /resource/190345 → Suggest Edit | approved in Edits tab; row removed with parent 190345 (ResourceRepository.ts:1180 tx); pending-edits API = 0 |
| resource_edit | 68 | edit B on 190345 (description) | 09:32:58 / 09:33:02 | /resource/190345 → Suggest Edit | rejected in Edits tab; row removed with parent 190345; pending-edits API = 0 |
| category | 1194 | [QA-audit-1026] category (slug qa-audit-1026-category) | 09:44 | Categories → Add category | DELETED via Categories row Delete (after child removed); API list 9, id absent |
| subcategory | 2333 | [QA-audit-1026] subcategory (slug qa-audit-1026-subcategory, parent 1194) | 09:46 | Subcategories → Add subcategory | DELETED via Subcategories row Delete (after rename); API list 99, id absent |
