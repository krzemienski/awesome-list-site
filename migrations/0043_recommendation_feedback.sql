-- Task #298: durable, undoable recommendation feedback state.
-- Every statement is idempotent because Publish can apply the declarative
-- schema diff before the boot migrator replays this journal.

CREATE TABLE IF NOT EXISTS "user_recommendation_feedback" (
  "user_id" varchar NOT NULL,
  "resource_id" integer NOT NULL,
  "feedback" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "user_recommendation_feedback_user_id_resource_id_pk"
    PRIMARY KEY ("user_id", "resource_id"),
  CONSTRAINT "user_recommendation_feedback_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_recommendation_feedback_resource_id_resources_id_fk"
    FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE,
  CONSTRAINT "user_recommendation_feedback_value_check"
    CHECK ("feedback" IN ('helpful','not_for_me','already_known','hidden'))
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_user_recommendation_feedback_resource"
  ON "user_recommendation_feedback" ("resource_id");