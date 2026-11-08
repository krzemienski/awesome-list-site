-- Task #337: an archived duplicate points at the resource it duplicates, so
-- its old URL can 301 to the kept row instead of answering 410. Only the 27
-- pairs the B5 dedupe documented are backfilled (ledger:
-- reports/prod-ops-2026-11-06/evidence/verified-20261107/b5-dedupe-ledger.jsonl,
-- pair n = line n). Every other archived row keeps answering 410.
-- Idempotent: publish pre-applies the schema diff and the boot migrator
-- re-runs this file. The backfill only touches rows that are still archived
-- with no pointer, and only when the kept row exists and is approved, so it
-- is a no-op on any database that lacks these ids.
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "duplicate_of" integer;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "resources" ADD CONSTRAINT "resources_duplicate_of_resources_id_fk"
    FOREIGN KEY ("duplicate_of") REFERENCES "resources"("id") ON DELETE set null;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "resources" AS r
SET "duplicate_of" = v.kept
FROM (VALUES
    (184997, 189438),
    (185112, 190799),
    (185575, 187982),
    (185596, 186625),
    (185667, 187955),
    (185751, 190827),
    (185778, 188387),
    (185932, 184924),
    (186216, 185329),
    (186217, 189513),
    (186237, 188241),
    (186316, 185370),
    (186325, 188392),
    (186340, 189586),
    (186341, 187936),
    (186350, 188100),
    (186450, 189926),
    (186598, 188262),
    (186618, 188079),
    (186624, 189736),
    (188052, 189757),
    (188109, 189427),
    (188227, 188162),
    (188749, 190854),
    (189251, 188435),
    (189495, 188955),
    (189549, 188167)
) AS v(archived, kept)
WHERE r."id" = v.archived
  AND r."status" = 'archived'
  AND r."duplicate_of" IS NULL
  AND EXISTS (SELECT 1 FROM "resources" k WHERE k."id" = v.kept AND k."status" = 'approved');
