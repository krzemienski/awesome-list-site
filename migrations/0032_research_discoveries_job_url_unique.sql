-- Defensive dedup: keep the oldest row per (job_id, url) so the unique index
-- can always be created even if past retry races left duplicates behind.
DELETE FROM "research_discoveries" a
  USING "research_discoveries" b
  WHERE a.job_id = b.job_id AND a.url = b.url AND a.id > b.id;--> statement-breakpoint
CREATE UNIQUE INDEX "research_discoveries_job_url_uq" ON "research_discoveries" USING btree ("job_id","url");
