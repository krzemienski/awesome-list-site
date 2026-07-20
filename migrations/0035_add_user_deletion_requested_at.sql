-- Run22 BUG-020: private account/data-deletion request channel.
-- NULL = no pending request; a timestamp = the user asked for deletion at
-- that moment (set via the authenticated POST /api/user/deletion-request).
-- Idempotent: safe under the publish pre-apply + boot-migrator double run.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_requested_at" timestamp;
