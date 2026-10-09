-- Durable tombstones for admin-deleted accounts. Clerk session JWTs are
-- verified offline, so a token minted before deletion keeps working until it
-- expires; JIT provisioning checks this table (by bridge id and Clerk user id)
-- and refuses to re-create a deleted account. Idempotent: publish pre-applies
-- the schema diff and the boot migrator re-runs this file.

CREATE TABLE IF NOT EXISTS "deleted_user_tombstones" (
  "bridge_user_id" varchar PRIMARY KEY NOT NULL,
  "clerk_user_id" varchar,
  "email" varchar,
  "deleted_by" varchar,
  "deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deleted_user_tombstones_clerk_user_id_idx"
  ON "deleted_user_tombstones" USING btree ("clerk_user_id");
