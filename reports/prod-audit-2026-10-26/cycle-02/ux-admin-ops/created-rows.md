# ux-admin-ops cycle 2: production side effects

No content rows were created, edited or deleted. No role changes, backups, link checks, validations, seeds or journey step saves.

Unavoidable side effect: the brief allows export downloads, and every export download writes one append-only audit-log row. The audit log cannot be deleted through the app, and deleting audit rows is forbidden. The 8 rows (all 2026-10-26):

| audit id | action | time (UTC) | trigger |
|---|---|---|---|
| 27413 | database.exported | 17:06:30 | UI JSON Snapshot Download |
| 27414 | resources.exported | 17:06:34 | UI CSV Download |
| 27415 | catalog.exported | 17:06:39 | UI README.md Generate |
| 27416 | categories.exported | 17:06:44 | UI OPML Download |
| 27417 | categories.exported | 17:06:55 | UI OPML Download (second click, to read the toast) |
| 27418 | database.exported | 17:07:05 | curl GET /api/admin/export-json (file check) |
| 27419 | resources.exported | 17:07:06 | curl GET /api/admin/export-csv (file check) |
| 27420 | categories.exported | 17:07:07 | curl GET /api/admin/export-opml (file check) |

The downloaded files were held in /tmp/c2-aops-dl and deleted at the end of the run (the JSON snapshot holds limited user summaries).
