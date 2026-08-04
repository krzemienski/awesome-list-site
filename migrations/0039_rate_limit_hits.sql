-- Task #279: shared, cross-instance rate-limit counters.
-- express-rate-limit's in-memory store is per Autoscale instance, so the
-- advertised per-IP limits were effectively (limit × instance count) and a
-- single-IP burst past the documented limit often never tripped 429. This
-- table is the shared fixed-window counter store used by every app limiter.
-- Idempotent on purpose: publish pre-applies the dev schema diff AND the boot
-- migrator re-runs the same DDL (see server/migrate.ts).
CREATE TABLE IF NOT EXISTS "rate_limit_hits" (
  "limiter" varchar(64) NOT NULL,
  "key" varchar(256) NOT NULL,
  "hits" integer NOT NULL DEFAULT 0,
  "reset_at" timestamp with time zone NOT NULL,
  CONSTRAINT "rate_limit_hits_pk" PRIMARY KEY ("limiter", "key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rate_limit_hits_reset_at" ON "rate_limit_hits" ("reset_at");
