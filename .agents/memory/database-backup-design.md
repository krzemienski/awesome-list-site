---
name: Full database backup design
description: Why backups live in private App Storage with no download route, and the restore safety rules.
---

- Backups are pg_dump archives in private App Storage, env-prefixed; there is deliberately NO HTTP download route and restore is operator-CLI only, never an admin button.
  **Why:** archives contain PII (users, api_keys — the `key` column is stored in plain text, never claim it is hashed).
- Manifest row counts are read back out of the archive, not the live DB, and the manifest is uploaded last as the commit marker.
  **Why:** the site writes during the dump; live counts would make restore verification fail spuriously.
- Restore refuses non-empty targets and the app's own DATABASE_URL; the target comes from env only.
- Backup endpoint errors must never be 500 (contract masks 500 bodies) — use DatabaseBackupError statuses.

**How to apply:** keep these invariants when extending backups (scheduling, retention, prod use). pg_dump availability in the published runtime was not verified when built.
