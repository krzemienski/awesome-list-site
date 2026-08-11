-- Task #294: trustworthy, first-class resource facets for public discovery.
--
-- Existing resources intentionally start as "unknown". The catalog has no
-- explicit legacy format/provider/skill metadata (verified before this
-- migration); this migration only adopts an old metadata value when it exactly
-- matches the controlled vocabulary. It never guesses from titles, URLs,
-- categories, descriptions, or tags.
--
-- Every statement is idempotent because Replit Publish may apply the schema
-- diff before the boot migrator replays this journal.
ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "resource_format" text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "provider" text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "skill_level" text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint

-- Conservative, repeatable backfill from explicitly named legacy metadata
-- only. Unsupported or missing values stay "unknown".
UPDATE "resources"
SET "resource_format" = CASE
  WHEN lower(replace(coalesce(
    metadata->>'resourceFormat',
    metadata->>'resource_format',
    metadata->>'format',
    ''
  ), '_', '-')) IN (
    'unknown','tool','library','player','sdk','api-service','platform',
    'course','article','video','book','specification','dataset','community','other'
  )
  THEN lower(replace(coalesce(
    metadata->>'resourceFormat',
    metadata->>'resource_format',
    metadata->>'format'
  ), '_', '-'))
  ELSE 'unknown'
END
WHERE "resource_format" = 'unknown';
--> statement-breakpoint
UPDATE "resources"
SET "provider" = CASE
  WHEN lower(replace(coalesce(metadata->>'provider', ''), '_', '-')) IN (
    'unknown','self-hosted','github','youtube','vimeo','aws','google-cloud',
    'azure','cloudflare','mux','akamai','wowza','brightcove','bitmovin','other'
  )
  THEN lower(replace(metadata->>'provider', '_', '-'))
  ELSE 'unknown'
END
WHERE "provider" = 'unknown';
--> statement-breakpoint
UPDATE "resources"
SET "skill_level" = CASE
  WHEN lower(replace(coalesce(
    metadata->>'skillLevel',
    metadata->>'skill_level',
    metadata->>'difficulty',
    ''
  ), '_', '-')) IN ('unknown','beginner','intermediate','advanced','all-levels')
  THEN lower(replace(coalesce(
    metadata->>'skillLevel',
    metadata->>'skill_level',
    metadata->>'difficulty'
  ), '_', '-'))
  ELSE 'unknown'
END
WHERE "skill_level" = 'unknown';
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resources_resource_format_check'
      AND conrelid = 'resources'::regclass
  ) THEN
    ALTER TABLE "resources" ADD CONSTRAINT "resources_resource_format_check"
      CHECK ("resource_format" IN (
        'unknown','tool','library','player','sdk','api-service','platform',
        'course','article','video','book','specification','dataset','community','other'
      ));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resources_provider_check'
      AND conrelid = 'resources'::regclass
  ) THEN
    ALTER TABLE "resources" ADD CONSTRAINT "resources_provider_check"
      CHECK ("provider" IN (
        'unknown','self-hosted','github','youtube','vimeo','aws','google-cloud',
        'azure','cloudflare','mux','akamai','wowza','brightcove','bitmovin','other'
      ));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resources_skill_level_check'
      AND conrelid = 'resources'::regclass
  ) THEN
    ALTER TABLE "resources" ADD CONSTRAINT "resources_skill_level_check"
      CHECK ("skill_level" IN ('unknown','beginner','intermediate','advanced','all-levels'));
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_resources_approved_format"
  ON "resources" ("resource_format") WHERE "status" = 'approved';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resources_approved_provider"
  ON "resources" ("provider") WHERE "status" = 'approved';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resources_approved_skill_level"
  ON "resources" ("skill_level") WHERE "status" = 'approved';