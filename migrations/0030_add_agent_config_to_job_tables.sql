-- Migration: Add per-run agent config columns to enrichment_jobs and research_jobs
-- Version: 0030
-- Description: The Claude Agent SDK multi-agent flows (Enrichment + AI Researcher)
-- accept a per-run model + custom base URL + encrypted auth token. shared/schema.ts
-- already declares these columns on both job tables, but no migration ever added
-- them to the database. Without them:
--   - GET /api/enrichment/jobs -> 500 "column \"model\" does not exist"
--   - GET /api/researcher/jobs -> 500 "column \"model\" does not exist"
--   - POST /api/enrichment/start and /api/researcher/start would fail on INSERT.
-- All four columns are nullable text; existing rows backfill to NULL (platform default).

ALTER TABLE "enrichment_jobs"
  ADD COLUMN IF NOT EXISTS "model" text,
  ADD COLUMN IF NOT EXISTS "base_url" text,
  ADD COLUMN IF NOT EXISTS "auth_token_encrypted" text,
  ADD COLUMN IF NOT EXISTS "auth_token_last4" text;

ALTER TABLE "research_jobs"
  ADD COLUMN IF NOT EXISTS "model" text,
  ADD COLUMN IF NOT EXISTS "base_url" text,
  ADD COLUMN IF NOT EXISTS "auth_token_encrypted" text,
  ADD COLUMN IF NOT EXISTS "auth_token_last4" text;
