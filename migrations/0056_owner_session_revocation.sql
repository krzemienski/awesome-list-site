-- "Sign out all devices" for the owner password session. The owner cookie is
-- stateless, so cookies issued at or before this time are rejected.
-- Idempotent: publish pre-applies the schema diff and the boot migrator
-- re-runs this file.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sessions_revoked_at" timestamp;
