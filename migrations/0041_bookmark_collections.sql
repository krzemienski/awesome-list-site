-- Task #295: collections and learning queue.
--
-- Existing user_bookmarks rows remain the source of truth for saves and notes.
-- New columns have non-destructive defaults; collections only organize those
-- rows. Every statement is idempotent because Publish may apply the declarative
-- schema diff before the boot migrator replays this journal.

ALTER TABLE "user_bookmarks"
  ADD COLUMN IF NOT EXISTS "queue_status" text NOT NULL DEFAULT 'saved';
--> statement-breakpoint
ALTER TABLE "user_bookmarks"
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
--> statement-breakpoint
ALTER TABLE "user_bookmarks"
  ADD COLUMN IF NOT EXISTS "personal_tags" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_bookmarks_queue_status_check'
      AND conrelid = 'user_bookmarks'::regclass
  ) THEN
    ALTER TABLE "user_bookmarks"
      ADD CONSTRAINT "user_bookmarks_queue_status_check"
      CHECK ("queue_status" IN ('saved','watch-next','in-progress','done'));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_bookmarks_personal_tags_array_check'
      AND conrelid = 'user_bookmarks'::regclass
  ) THEN
    ALTER TABLE "user_bookmarks"
      ADD CONSTRAINT "user_bookmarks_personal_tags_array_check"
      CHECK (jsonb_typeof("personal_tags") = 'array');
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_user_bookmarks_queue"
  ON "user_bookmarks" ("user_id", "queue_status", "archived_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "bookmark_collections" (
  "id" serial PRIMARY KEY,
  "user_id" varchar NOT NULL,
  "name" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "archived_at" timestamp,
  "share_id" text,
  "published_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "bookmark_collections_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "bookmark_collections_id_user_unique" UNIQUE ("id", "user_id")
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "bookmark_collections_share_id_unique"
  ON "bookmark_collections" ("share_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bookmark_collections_owner_order"
  ON "bookmark_collections" ("user_id", "archived_at", "position", "id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "bookmark_collection_items" (
  "collection_id" integer NOT NULL,
  "user_id" varchar NOT NULL,
  "resource_id" integer NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "bookmark_collection_items_collection_id_resource_id_pk"
    PRIMARY KEY ("collection_id", "resource_id"),
  CONSTRAINT "bookmark_collection_items_collection_owner_fk"
    FOREIGN KEY ("collection_id", "user_id")
    REFERENCES "bookmark_collections"("id", "user_id") ON DELETE CASCADE,
  CONSTRAINT "bookmark_collection_items_bookmark_owner_fk"
    FOREIGN KEY ("user_id", "resource_id")
    REFERENCES "user_bookmarks"("user_id", "resource_id") ON DELETE CASCADE
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_bookmark_collection_items_owner_resource"
  ON "bookmark_collection_items" ("user_id", "resource_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bookmark_collection_items_order"
  ON "bookmark_collection_items" ("collection_id", "position", "resource_id");
