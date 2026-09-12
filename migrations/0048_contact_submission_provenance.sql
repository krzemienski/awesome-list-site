-- Contact inbox provenance for POST /api/contact: a keyed hash of the
-- submitter's IP (the raw address is never stored) and the signed-in
-- submitter when there was one. Additive and nullable, so existing rows stay
-- valid. Every statement is idempotent because Publish pre-applies the dev
-- schema diff and the boot migrator then re-runs this same file.

ALTER TABLE "contact_submissions"
  ADD COLUMN IF NOT EXISTS "ip_hash" varchar(64);
--> statement-breakpoint
ALTER TABLE "contact_submissions"
  ADD COLUMN IF NOT EXISTS "user_id" varchar;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_submissions_user_id_users_id_fk'
      AND conrelid = 'contact_submissions'::regclass
  ) THEN
    ALTER TABLE "contact_submissions"
      ADD CONSTRAINT "contact_submissions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_submissions_user_id"
  ON "contact_submissions" ("user_id");
--> statement-breakpoint
-- 0047 described an hourly retention scheduler that was never wired up.
-- Keep the table comment truthful: the purge helper exists, scheduling is a
-- follow-up.
COMMENT ON TABLE "contact_submissions" IS
  'Private contact inbox for POST /api/contact (default-off). ip_hash is a keyed HMAC of the sender IP, never the address. Retention: purgeExpiredContactSubmissions() deletes rows older than config.contact.retention_days (default 180) but is not scheduled yet.';
