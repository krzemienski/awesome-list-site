-- Migration: Create agent_events table for Claude Agent SDK multi-agent run logging
-- Version: 0031
-- Description: shared/schema.ts declares agent_events (populated by runAgentQuery
-- for both Enrichment and AI Researcher flows), but the table was never created.
-- Without it:
--   - GET /api/enrichment/jobs/:id/events -> 500 "relation \"agent_events\" does not exist"
--   - GET /api/researcher/jobs/:id/events -> 500 (same)
--   - Any enrichment/research run that persists agent events fails on INSERT.
-- Idempotent so re-runs are safe.

CREATE TABLE IF NOT EXISTS "agent_events" (
  "id" serial PRIMARY KEY,
  "job_type" text NOT NULL,
  "job_id" integer NOT NULL,
  "seq" integer NOT NULL,
  "actor" text NOT NULL,
  "actor_type" text NOT NULL,
  "event_type" text NOT NULL,
  "model" text,
  "target_actor" text,
  "summary" text,
  "detail" jsonb DEFAULT '{}'::jsonb,
  "tokens_in" integer,
  "tokens_out" integer,
  "cost_usd" text,
  "duration_ms" integer,
  "ts" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_agent_events_job" ON "agent_events" ("job_type", "job_id");
CREATE INDEX IF NOT EXISTS "idx_agent_events_job_seq" ON "agent_events" ("job_type", "job_id", "seq");
