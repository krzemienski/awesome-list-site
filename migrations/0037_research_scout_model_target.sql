-- Researcher: explicit scout-model override + stop-after-N-discoveries target.
-- Idempotent (IF NOT EXISTS guards) per boot-migrator contract in server/migrate.ts.
ALTER TABLE "research_jobs" ADD COLUMN IF NOT EXISTS "scout_model" text;
--> statement-breakpoint
ALTER TABLE "research_jobs" ADD COLUMN IF NOT EXISTS "target_discoveries" integer;
