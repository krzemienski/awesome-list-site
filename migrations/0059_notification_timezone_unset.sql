-- A notification time zone is null until the user saves one, so a pause or
-- unsubscribe from a never-saved account no longer stores a zone the user did
-- not choose. Digests use UTC while it is null. Existing rows keep their value.
-- Idempotent: publish pre-applies the schema diff and the boot migrator
-- re-runs this file.
ALTER TABLE "notification_preferences" ALTER COLUMN "timezone" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "timezone" DROP DEFAULT;
