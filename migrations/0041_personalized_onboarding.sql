-- Task #297: persist optional personalized-onboarding progress in the existing
-- one-row-per-user preferences record.
--
-- Every statement is idempotent because Replit Publish may apply the schema
-- diff before the boot migrator replays this journal.
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "onboarding_status" text NOT NULL DEFAULT 'not_started';
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "onboarding_step" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "onboarding_dismissed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "revision" integer NOT NULL DEFAULT 1;
--> statement-breakpoint

-- Normalize nullable/legacy values before tightening the existing contract.
UPDATE "user_preferences"
SET
  "preferred_categories" = CASE
    WHEN jsonb_typeof("preferred_categories") = 'array' THEN "preferred_categories"
    ELSE '[]'::jsonb
  END,
  "learning_goals" = CASE
    WHEN jsonb_typeof("learning_goals") = 'array' THEN "learning_goals"
    ELSE '[]'::jsonb
  END,
  "preferred_resource_types" = CASE
    WHEN jsonb_typeof("preferred_resource_types") = 'array' THEN "preferred_resource_types"
    ELSE '[]'::jsonb
  END,
  "skill_level" = CASE
    WHEN "skill_level" IN ('beginner','intermediate','advanced') THEN "skill_level"
    ELSE 'beginner'
  END,
  "time_commitment" = CASE
    WHEN "time_commitment" IN ('daily','weekly','flexible') THEN "time_commitment"
    ELSE 'flexible'
  END;
--> statement-breakpoint

ALTER TABLE "user_preferences"
  ALTER COLUMN "preferred_categories" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "preferred_categories" SET NOT NULL,
  ALTER COLUMN "learning_goals" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "learning_goals" SET NOT NULL,
  ALTER COLUMN "preferred_resource_types" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "preferred_resource_types" SET NOT NULL,
  ALTER COLUMN "time_commitment" SET DEFAULT 'flexible',
  ALTER COLUMN "time_commitment" SET NOT NULL;
--> statement-breakpoint

-- Existing users who already made meaningful preference choices should never
-- be treated as brand-new or repeatedly invited through onboarding.
UPDATE "user_preferences"
SET
  "onboarding_status" = 'completed',
  "onboarding_step" = 5,
  "onboarding_completed_at" = COALESCE("updated_at", "created_at", now())
WHERE "onboarding_status" = 'not_started'
  AND (
    jsonb_array_length("preferred_categories") > 0
    OR jsonb_array_length("learning_goals") > 0
    OR jsonb_array_length("preferred_resource_types") > 0
  );
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_skill_level_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_skill_level_check"
      CHECK ("skill_level" IN ('beginner','intermediate','advanced'));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_revision_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_revision_check"
      CHECK ("revision" >= 1);
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_time_commitment_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_time_commitment_check"
      CHECK ("time_commitment" IN ('daily','weekly','flexible'));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_onboarding_status_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_onboarding_status_check"
      CHECK ("onboarding_status" IN ('not_started','in_progress','completed','dismissed'));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_onboarding_step_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_onboarding_step_check"
      CHECK ("onboarding_step" BETWEEN 1 AND 5);
  END IF;
END $$;