-- Additive nullable resource-kind override and persisted contact-form inbox.
-- Existing imports omit kind and remain valid; no kind backfill is performed.

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "kind" text;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resources_kind_check'
      AND conrelid = 'resources'::regclass
  ) THEN
    ALTER TABLE "resources" ADD CONSTRAINT "resources_kind_check"
      CHECK ("kind" IS NULL OR "kind" IN (
        'tools','libraries','standards','events','protocols','other'
      ));
  END IF;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "contact_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "reply_to" varchar(320) NOT NULL,
  "subject" varchar(200) NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_submissions_created_at"
  ON "contact_submissions" ("created_at");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_submissions_name_length_check'
      AND conrelid = 'contact_submissions'::regclass
  ) THEN
    ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_name_length_check"
      CHECK (char_length(trim("name")) BETWEEN 1 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_submissions_reply_to_length_check'
      AND conrelid = 'contact_submissions'::regclass
  ) THEN
    ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_reply_to_length_check"
      CHECK (char_length("reply_to") BETWEEN 3 AND 320);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_submissions_subject_length_check'
      AND conrelid = 'contact_submissions'::regclass
  ) THEN
    ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_subject_length_check"
      CHECK (char_length(trim("subject")) BETWEEN 1 AND 200);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_submissions_message_length_check'
      AND conrelid = 'contact_submissions'::regclass
  ) THEN
    ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_message_length_check"
      CHECK (char_length("message") BETWEEN 20 AND 4000);
  END IF;
END $$;
--> statement-breakpoint
COMMENT ON TABLE "contact_submissions" IS
  'Private contact inbox. The hourly background scheduler deletes expired rows in bounded batches after the configured retention period (default 180 days).';