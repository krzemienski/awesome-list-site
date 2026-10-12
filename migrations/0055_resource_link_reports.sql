-- Member reports that a resource's link is dead. One row per member and
-- resource: reporting again after an admin handled it reopens the same row.
-- Idempotent: publish pre-applies the schema diff and the boot migrator
-- re-runs this file.

CREATE TABLE IF NOT EXISTS "resource_link_reports" (
  "resource_id" integer NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'open' NOT NULL,
  "note" text,
  "handled_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "handled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "resource_link_reports_resource_id_user_id_pk" PRIMARY KEY ("resource_id", "user_id"),
  CONSTRAINT "resource_link_reports_status_check" CHECK ("status" IN ('open','resolved','dismissed')),
  CONSTRAINT "resource_link_reports_note_length_check" CHECK ("note" IS NULL OR char_length("note") <= 500)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resource_link_reports_status_created_at"
  ON "resource_link_reports" USING btree ("status", "created_at");
