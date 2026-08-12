-- Task #300: explicit reminder consent, private in-app notifications, and a
-- durable idempotent digest queue. Every statement is safe when Publish applies
-- the schema diff before the boot migrator replays this file.

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "user_id" varchar PRIMARY KEY NOT NULL,
  "email_digest_enabled" boolean DEFAULT false NOT NULL,
  "in_app_enabled" boolean DEFAULT false NOT NULL,
  "include_new_resources" boolean DEFAULT true NOT NULL,
  "include_watch_next" boolean DEFAULT true NOT NULL,
  "include_journey_step" boolean DEFAULT true NOT NULL,
  "cadence" text DEFAULT 'weekly' NOT NULL,
  "timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
  "policy_version" integer DEFAULT 1 NOT NULL,
  "paused_until" timestamp with time zone,
  "email_opted_in_at" timestamp with time zone,
  "email_unsubscribed_at" timestamp with time zone,
  "in_app_opted_in_at" timestamp with time zone,
  "last_email_digest_at" timestamp with time zone,
  "last_in_app_digest_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_preferences_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "notification_preferences_cadence_check"
    CHECK ("cadence" IN ('weekly','biweekly','monthly')),
  CONSTRAINT "notification_preferences_policy_version_check"
    CHECK ("policy_version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "policy_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_preferences"
    ADD CONSTRAINT "notification_preferences_policy_version_check"
    CHECK ("policy_version" >= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_email_due"
  ON "notification_preferences" ("email_digest_enabled", "paused_until", "last_email_digest_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_in_app_due"
  ON "notification_preferences" ("in_app_enabled", "paused_until", "last_in_app_digest_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "digest_unsubscribe_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "digest_unsubscribe_tokens_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "digest_unsubscribe_tokens_token_hash_unique"
    UNIQUE ("token_hash")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_unsubscribe_tokens_user"
  ON "digest_unsubscribe_tokens" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_unsubscribe_tokens_expires"
  ON "digest_unsubscribe_tokens" ("expires_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "in_app_notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "href" text NOT NULL,
  "resource_id" integer,
  "collection_id" integer,
  "journey_id" integer,
  "step_number" integer,
  "idempotency_key" text NOT NULL,
  "read_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "in_app_notifications_idempotency_key_unique"
    UNIQUE ("idempotency_key"),
  CONSTRAINT "in_app_notifications_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "in_app_notifications_resource_id_resources_id_fk"
    FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE SET NULL,
  CONSTRAINT "in_app_notifications_collection_id_bookmark_collections_id_fk"
    FOREIGN KEY ("collection_id") REFERENCES "bookmark_collections"("id") ON DELETE SET NULL,
  CONSTRAINT "in_app_notifications_journey_id_learning_journeys_id_fk"
    FOREIGN KEY ("journey_id") REFERENCES "learning_journeys"("id") ON DELETE SET NULL,
  CONSTRAINT "in_app_notifications_kind_check"
    CHECK ("kind" IN ('new_resource','watch_next','journey_step')),
  CONSTRAINT "in_app_notifications_href_check"
    CHECK ("href" ~ '^/(resource|bookmarks|journey)/')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_in_app_notifications_user_created"
  ON "in_app_notifications" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_in_app_notifications_user_read"
  ON "in_app_notifications" ("user_id", "read_at", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_in_app_notifications_expires_at"
  ON "in_app_notifications" ("expires_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "digest_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL,
  "channel" text NOT NULL,
  "period_key" varchar(96) NOT NULL,
  "policy_version" integer DEFAULT 1 NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "scheduled_for" timestamp with time zone NOT NULL,
  "next_attempt_at" timestamp with time zone NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 3 NOT NULL,
  "claimed_at" timestamp with time zone,
  "lease_expires_at" timestamp with time zone,
  "worker_id" varchar(96),
  "sent_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "last_error_code" varchar(96),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "digest_jobs_idempotency_key_unique"
    UNIQUE ("idempotency_key"),
  CONSTRAINT "digest_jobs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "digest_jobs_channel_check" CHECK ("channel" IN ('email','in_app')),
  CONSTRAINT "digest_jobs_status_check"
    CHECK ("status" IN ('queued','processing','sent','failed','skipped')),
  CONSTRAINT "digest_jobs_attempt_count_check" CHECK ("attempt_count" >= 0),
  CONSTRAINT "digest_jobs_max_attempts_check" CHECK ("max_attempts" BETWEEN 1 AND 10),
  CONSTRAINT "digest_jobs_policy_version_check" CHECK ("policy_version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "digest_jobs"
  ADD COLUMN IF NOT EXISTS "policy_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "digest_jobs"
    ADD CONSTRAINT "digest_jobs_policy_version_check"
    CHECK ("policy_version" >= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_jobs_claim"
  ON "digest_jobs" ("status", "next_attempt_at", "scheduled_for", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_jobs_user_created"
  ON "digest_jobs" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_jobs_lease"
  ON "digest_jobs" ("status", "lease_expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "digest_jobs_pending_user_channel_unique"
  ON "digest_jobs" ("user_id", "channel")
  WHERE "status" IN ('queued','processing');
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "digest_attempts" (
  "id" serial PRIMARY KEY NOT NULL,
  "job_id" integer NOT NULL,
  "attempt_number" integer NOT NULL,
  "outcome" text DEFAULT 'started' NOT NULL,
  "error_code" varchar(96),
  "provider_message_id" varchar(255),
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "digest_attempts_job_id_digest_jobs_id_fk"
    FOREIGN KEY ("job_id") REFERENCES "digest_jobs"("id") ON DELETE CASCADE,
  CONSTRAINT "digest_attempts_job_attempt_unique"
    UNIQUE ("job_id", "attempt_number"),
  CONSTRAINT "digest_attempts_outcome_check"
    CHECK ("outcome" IN ('started','sent','failed','skipped','delivery_unknown'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_attempts_job"
  ON "digest_attempts" ("job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_attempts_outcome_started"
  ON "digest_attempts" ("outcome", "started_at");