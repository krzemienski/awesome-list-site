-- Migration: Add API keys table for programmatic API access
-- Version: 0027
-- Description: Creates the api_keys table with proper indexes for authentication and access control

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL,
  "key" varchar NOT NULL UNIQUE,
  "name" varchar NOT NULL,
  "scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_used_at" timestamp,
  "expires_at" timestamp,
  "revoked_at" timestamp
);

-- Add foreign key constraint with cascade delete
ALTER TABLE "api_keys"
  ADD CONSTRAINT "api_keys_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_api_keys_user_id" ON "api_keys" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_key" ON "api_keys" ("key");
CREATE INDEX IF NOT EXISTS "idx_api_keys_expires_at" ON "api_keys" ("expires_at");
