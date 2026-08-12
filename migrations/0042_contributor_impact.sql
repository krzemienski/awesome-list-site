-- Task #299: durable contributor lifecycle and contributor-safe outcomes.
--
-- Withdrawals are soft states so contributors can keep an honest history.
-- Resource rejection copy gets a dedicated contributor-facing column; audit
-- notes remain private moderator metadata. Every statement is idempotent
-- because Replit Publish can apply the schema diff before the boot migrator.
ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "contributor_rejection_reason" text;
--> statement-breakpoint
ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "status_changed_at" timestamp;
--> statement-breakpoint
UPDATE "resources"
SET "status_changed_at" = CASE
  WHEN "status" = 'approved' AND "approved_at" IS NOT NULL THEN "approved_at"
  ELSE COALESCE("updated_at", "created_at")
END
WHERE "status_changed_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "resource_edits"
  ADD COLUMN IF NOT EXISTS "withdrawn_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resources_submitted_by_status_created_at"
  ON "resources" USING btree ("submitted_by", "status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resource_edits_submitted_by_status_created_at"
  ON "resource_edits" USING btree ("submitted_by", "status", "created_at");