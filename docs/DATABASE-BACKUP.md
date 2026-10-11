# Full database backup & restore

The **Full database backup** on Admin → Export is the site's restorable
backup. The **JSON Snapshot** card next to it is a catalog extract only and
cannot rebuild the site.

## What a backup contains

A backup is a `pg_dump --format=custom` archive of the whole application
database:

- **Every table in every application schema.** Today that is `public` (41
  tables incl. `users`, `user_favorites`, `user_bookmarks`,
  `bookmark_collections*`, `learning_journeys`, `journey_steps`,
  `user_journey_progress`, `resources`, `resource_edits`,
  `resource_audit_log`, `enrichment_jobs`/`enrichment_queue`,
  `research_jobs`/`research_discoveries`, `notification_preferences`,
  `user_preferences`, `api_keys`, `sessions`, …) plus `drizzle`, the migration
  journal the boot migrator reads. New tables are covered automatically: the
  dump is not a list of tables.
- **Every row**, including the user rows keyed by the Clerk bridge id, so
  restored favorites, bookmarks, journeys and audit entries still point at
  the right people.
- **All relationships and structure**: primary, unique and foreign keys,
  check constraints, indexes, sequence positions and extensions (`pg_trgm`).

Not included:

- The `_system` schema, which the hosting platform creates on the managed
  production database. It is not application data.
- Sign-in credentials (passwords, social logins, MFA). Clerk holds them
  outside this database; restoring a backup re-links users to their existing
  Clerk accounts through the bridge id on `users`.

## Where it is stored

Backups go to the project's **private App Storage bucket**
(`DEFAULT_OBJECT_STORAGE_BUCKET_ID`), under
`<PRIVATE_OBJECT_DIR>/db-backups/<environment>/`, where `<environment>` is
`production` for the published site and `development` for the workspace.
Each backup is two objects:

| Object | Content |
| --- | --- |
| `<id>.dump` | the pg_dump archive (contains personal data) |
| `<id>.manifest.json` | id, creator, timestamps, pg versions, archive size + SHA-256, per-table row counts, sequence values and a schema inventory |

The manifest is written after the archive upload succeeds, so a listed backup
always has a complete archive. The row counts in the manifest are read back
out of the archive itself (not from the live database), so they describe
exactly what a restore will produce even if the site was writing during the
dump. A backup fails, and stores nothing, if any live table is missing from
the archive.

There is **no HTTP download** of the archive. The admin API
(`GET`/`POST /api/admin/database-backups`) returns metadata only. Each backup
is recorded in the audit log as `database.backed_up`.

## Taking a backup

- **Admin UI:** Admin → Export → Full database backup → **Create backup**.
  It runs synchronously (about 1 s for the current ~11k rows) and shares the
  heavy-work slot with exports and seeding, so it can return "already in
  progress" while one of those is running.
- **CLI (workspace shell):**

  ```bash
  npm run db:backup -- create            # backup of this environment's DATABASE_URL
  npm run db:backup -- list              # newest first
  npm run db:backup -- show <backup-id>  # full manifest
  # add --environment production to list/show/restore published-site backups
  ```

The server needs the `pg_dump` / `pg_restore` binaries (PostgreSQL 16 client,
matching the server's major version). If they are missing, the backup fails
with an explicit message instead of producing anything partial.

## Restoring

A restore **never merges into or overwrites a database that has tables in
it**. It also refuses the app's own `DATABASE_URL`. Always restore into a new,
empty database first:

```bash
# 1. Create an empty disposable database on the same Postgres server.
psql "$DATABASE_URL" -c "create database awesome_restore"

# 2. Point TARGET_DATABASE_URL at it (same credentials, different db name).
export TARGET_DATABASE_URL="$(node -e 'const u=new URL(process.env.DATABASE_URL); u.pathname="/awesome_restore"; console.log(u.toString())')"

# 3. Restore + verify.
npm run db:backup -- restore <backup-id>            # add --environment production for a published-site backup
```

The command:

1. downloads the archive from private storage and checks its SHA-256 against
   the manifest (a mismatch aborts before anything is written);
2. runs `pg_restore --single-transaction --exit-on-error`, so a failed restore
   leaves the target empty;
3. compares the result with the manifest and prints one PASS/FAIL line per
   check: the exact table set, column / key / constraint / index / sequence
   counts, extensions, **every table's row count** and **every sequence's
   value**. It exits non-zero if any check fails.

### Recovering the site from a verified restore

Once a restore reports `RESTORE VERIFIED`, either:

- point the app's `DATABASE_URL` at the restored database and restart (or
  republish), or
- if the site must stay on its existing database, take a fresh backup of it
  first, empty it (`DROP SCHEMA public CASCADE; DROP SCHEMA drizzle CASCADE;
  CREATE SCHEMA public;`) and run the restore against it with
  `TARGET_DATABASE_URL`. This destroys the current data, so it is a manual,
  deliberate step.

Users sign in again with their existing Clerk accounts; their local rows,
roles, favorites and history come back from the backup.

Replit's own database checkpoints / point-in-time restore remain a separate,
complementary safety net; this backup is the one the project controls and can
restore anywhere.

## Proof (2026-10-10, development)

Backup `20261010T234202Z-cfefddd0` was created from the admin UI (Create
backup button, signed in as a disposable admin): 41 tables, 11,021 rows,
838.6 KB, SHA-256 `5a77ff6b…7303`. It was restored into the newly created,
empty database `awesome_restore_604b`:

```
Checksum verified. Restoring (single transaction)…
PASS  table set            expected 41 tables  actual 41 tables
PASS  schema: foreignKeys  expected 47         actual 47
PASS  schema: indexes      expected 126        actual 126
PASS  rows: public.users   expected 10         actual 10
PASS  rows: public.resource_audit_log  expected 6505  actual 6505
PASS  rows: public.resources           expected 1993  actual 1993
…
RESTORE VERIFIED: backup 20261010T234202Z-cfefddd0 → <host>/awesome_restore_604b, 82/82 checks passed in 1500 ms.
```

(41 per-table row counts, 28 sequence values, 13 schema checks.) The restored
database was then dropped. The refusal paths were also exercised: restoring
into a non-empty database and into the app's own `DATABASE_URL` both exit 1
without writing.
