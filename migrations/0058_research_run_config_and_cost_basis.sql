-- Researcher run provenance + cost accounting basis.
-- resolved_config: the secret-free endpoint / credential source / model
-- resolution a run launched with (see server/ai/researchRunConfig.ts), so the
-- record states where the run went and which values were per-run overrides.
-- cost_basis: how estimated_cost_usd was obtained — 'reported' (the Agent SDK
-- result's total_cost_usd), 'lower_bound' (priced from streamed per-model
-- usage because a cancelled/aborted run emits no result; excludes model calls
-- made inside tools) or 'unknown'. NULL on legacy rows.
-- Idempotent: publish pre-applies the schema diff and the boot migrator re-runs this file.

ALTER TABLE "research_jobs" ADD COLUMN IF NOT EXISTS "resolved_config" jsonb;
--> statement-breakpoint
ALTER TABLE "research_jobs" ADD COLUMN IF NOT EXISTS "cost_basis" text;
