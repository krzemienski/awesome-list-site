-- Run15 BUG-001: registration/login treated emails case-sensitively, so
-- QATEST+CASE1@example.com and qatest+case1@example.com became two accounts.
-- App-level fix normalizes email to lowercase on register + makes
-- getUserByEmail case-insensitive; this data pass lowercases existing rows so
-- those lookups match historical accounts.
--
-- Data-only + idempotent (publish pre-applies the dev schema diff and the boot
-- migrator re-runs this file, so nothing here may fail on a second pass):
--  * lowercase every email whose lowercase form is NOT already taken by
--    another row (collision-safe: pre-existing case-variant duplicate
--    accounts are left untouched for the journaled data-fix script to merge)
-- No new UNIQUE index on lower(email): publish applies schema diffs BEFORE
-- data fixes run on prod, so a schema-level expression index would 23505 the
-- publish itself if case-variant duplicates still exist there (0033 precedent).

UPDATE users u
SET email = lower(u.email)
WHERE u.email IS NOT NULL
  AND u.email <> lower(u.email)
  AND NOT EXISTS (
    SELECT 1 FROM users t
    WHERE t.id <> u.id AND lower(t.email) = lower(u.email)
  );
