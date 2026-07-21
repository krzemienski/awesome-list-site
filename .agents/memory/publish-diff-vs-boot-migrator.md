---
name: Publish schema diff vs boot migrator — migrations must be idempotent
description: Why every new migration file must use IF NOT EXISTS-style guards, or the first publish after adding it fails healthchecks
---

# Publish schema diff vs boot migrator

**Rule:** every statement in a new `migrations/*.sql` file must be idempotent (`CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guarded constraints, dedup DELETEs are fine). Non-idempotent DDL makes the publish fail even though the migration is brand new.

**Why:** the schema is applied to production TWICE by two independent mechanisms:
1. Replit's Publish flow introspects dev vs prod and applies the SQL diff (from `shared/schema.ts` state) to prod *before* the app container boots.
2. The app's own boot migrator (`runMigrations`, prod boot only) then runs pending journaled migrations — but `drizzle.__drizzle_migrations` in prod doesn't know about step 1.

So the boot migrator always re-executes DDL the publish diff already applied → `42P07 already exists` → boot code refuses to start on failed migration → healthcheck 500 loop → "deployment failed to publish". Prod ledger showed 0029-0031 recorded but the new index already present with 0032 unrecorded — exact signature.

**How to apply:** when authoring any migration, add guards; when a publish fails, `fetch_deployment_logs` and grep for `Migration failed` / `42P07`. Verify a fix by re-running the .sql against dev (where the object already exists) — it must exit 0 with a "skipping" NOTICE — plus the migration-drift workflow. Prod state is checkable read-only via `executeSql({environment:"production"})` (pg_indexes + `drizzle.__drizzle_migrations`).
