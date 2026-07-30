-- Researcher: async post-save quality verification payload (liveness probe +
-- GitHub repo metadata), written by the fire-and-forget verifier after
-- save_discovery persists. Idempotent (IF NOT EXISTS guard) per the
-- boot-migrator contract in server/migrate.ts.
ALTER TABLE "research_discoveries" ADD COLUMN IF NOT EXISTS "verification" jsonb;
