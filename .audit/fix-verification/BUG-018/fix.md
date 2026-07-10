# BUG-018 — FIXED (code change)
**Severity:** Medium
**Fix:** ResourceRepository.ts listResources — replaced `like` with `ilike` (case-insensitive) on title, description, AND url (added url to search fields). Imports `ilike` from drizzle-orm. Created migrations/0029_search_fts.sql adding a generated tsvector column `search_tsv` and a GIN index `idx_resources_search_tsv` for future FTS performance.
