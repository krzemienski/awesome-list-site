-- Persist the selected 5 x 10 account theme through the existing monotonic
-- user-preference revision row. Nullable preserves first-visit browser defaults.

ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "theme_system" text;
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "theme_accent" text;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_theme_system_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_theme_system_check"
      CHECK ("theme_system" IS NULL OR "theme_system" IN ('editorial','terminal','geist','brutalist','swiss'));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_theme_accent_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_theme_accent_check"
      CHECK ("theme_accent" IS NULL OR "theme_accent" IN ('crimson','magenta','orange','amber','emerald','matrix','cyan','violet','lime','rose'));
  END IF;
END $$;