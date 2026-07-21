-- Persist link-health scan results so they survive server restarts/republishes.
-- Idempotent (IF NOT EXISTS guards) per boot-migrator contract in server/migrate.ts.
CREATE TABLE IF NOT EXISTS "link_health_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "total_links" integer DEFAULT 0 NOT NULL,
  "checked_links" integer DEFAULT 0 NOT NULL,
  "healthy_links" integer DEFAULT 0 NOT NULL,
  "broken_links" integer DEFAULT 0 NOT NULL,
  "redirect_links" integer DEFAULT 0 NOT NULL,
  "timeout_links" integer DEFAULT 0 NOT NULL,
  "suspect_links" integer DEFAULT 0 NOT NULL,
  "error_message" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_link_health_jobs_status" ON "link_health_jobs" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "link_health_checks" (
  "id" serial PRIMARY KEY NOT NULL,
  "job_id" integer NOT NULL,
  "resource_id" integer DEFAULT 0 NOT NULL,
  "url" text NOT NULL,
  "status" text NOT NULL,
  "http_status" integer,
  "response_time" integer,
  "redirect_url" text,
  "final_url" text,
  "error_message" text,
  "consecutive_failures" integer DEFAULT 0 NOT NULL,
  "flagged_for_review" boolean DEFAULT false NOT NULL,
  "last_checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "link_health_checks" ADD CONSTRAINT "link_health_checks_job_id_link_health_jobs_id_fk"
    FOREIGN KEY ("job_id") REFERENCES "link_health_jobs"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_link_health_checks_job_id" ON "link_health_checks" ("job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_link_health_checks_status" ON "link_health_checks" ("status");
