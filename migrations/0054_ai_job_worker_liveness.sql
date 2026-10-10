-- Worker liveness for AI jobs (enrichment + research). worker_id names the
-- process running the job and heartbeat_at is refreshed while it runs, so a
-- restarted or sibling instance can reclaim a job orphaned by a restart
-- immediately instead of waiting out a fixed age threshold. Idempotent:
-- publish pre-applies the schema diff and the boot migrator re-runs this file.

ALTER TABLE "enrichment_jobs" ADD COLUMN IF NOT EXISTS "worker_id" text;
--> statement-breakpoint
ALTER TABLE "enrichment_jobs" ADD COLUMN IF NOT EXISTS "heartbeat_at" timestamp;
--> statement-breakpoint
ALTER TABLE "research_jobs" ADD COLUMN IF NOT EXISTS "worker_id" text;
--> statement-breakpoint
ALTER TABLE "research_jobs" ADD COLUMN IF NOT EXISTS "heartbeat_at" timestamp;
