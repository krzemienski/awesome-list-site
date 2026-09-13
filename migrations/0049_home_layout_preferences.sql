-- Task #542: persist the selected home presentation alongside the existing
-- one-row-per-user preference record. This migration is deliberately
-- idempotent because a publish can apply schema changes before boot replay.
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "home_layout" text NOT NULL DEFAULT 'index';
--> statement-breakpoint

-- Normalize any pre-existing nullable/invalid values before tightening the
-- column. Learning preference columns are intentionally not touched.
UPDATE "user_preferences"
SET "home_layout" = 'index'
WHERE "home_layout" IS NULL
   OR "home_layout" NOT IN ('index', 'curated');
--> statement-breakpoint

ALTER TABLE "user_preferences"
  ALTER COLUMN "home_layout" SET DEFAULT 'index',
  ALTER COLUMN "home_layout" SET NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_home_layout_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_home_layout_check"
      CHECK ("home_layout" IN ('index', 'curated'));
  END IF;
END $$;