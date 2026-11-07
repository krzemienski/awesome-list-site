-- First-party page-document counts per hour (W1), so a 28/90-day anonymous
-- traffic series survives deploys. Counts only: no IP, path or user agent.
-- Idempotent: publish pre-applies the schema diff and the boot migrator
-- re-runs this file.
CREATE TABLE IF NOT EXISTS "traffic_hourly" (
	"hour" timestamp with time zone NOT NULL,
	"template" text NOT NULL,
	"class" text NOT NULL,
	"status_class" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "traffic_hourly_hour_template_class_status_class_pk" PRIMARY KEY("hour","template","class","status_class")
);
