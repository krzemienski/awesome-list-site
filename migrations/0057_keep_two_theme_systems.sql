-- Keep only two design systems: Editorial (the default, Crimson) and Geist.
-- Terminal, Brutalist and Swiss were removed; saved rows on a removed system
-- move to the default pair, then the check narrows to the kept list
-- (shared/onboarding-values.ts THEME_SYSTEM_VALUES).
-- Idempotent: publish pre-applies the schema diff and the boot migrator
-- re-runs this file. The update is a no-op once rows are rewritten, and the
-- constraint is only rebuilt while it still allows a removed system.
UPDATE "user_preferences"
  SET "theme_system" = 'editorial',
      "theme_accent" = 'crimson',
      "revision" = "revision" + 1,
      "updated_at" = now()
  WHERE "theme_system" IS NOT NULL
    AND "theme_system" NOT IN ('editorial','geist');
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_theme_system_check'
      AND conrelid = 'user_preferences'::regclass
      AND pg_get_constraintdef(oid) NOT LIKE '%terminal%'
      AND pg_get_constraintdef(oid) NOT LIKE '%brutalist%'
      AND pg_get_constraintdef(oid) NOT LIKE '%swiss%'
  ) THEN
    ALTER TABLE "user_preferences"
      DROP CONSTRAINT IF EXISTS "user_preferences_theme_system_check";
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_theme_system_check"
      CHECK ("theme_system" IS NULL OR "theme_system" IN ('editorial','geist'));
  END IF;
END $$;
