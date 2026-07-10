-- BUG-018: Add full-text search vector + GIN index for case-insensitive,
-- tokenized search across title, description, and URL.
-- This enables Postgres FTS with to_tsquery/websearch_to_tsquery for
-- better matching than ILIKE alone.

-- Add a generated tsvector column that combines title + description + url
ALTER TABLE resources ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(url, '')
    )
  ) STORED;

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_resources_search_tsv ON resources USING GIN(search_tsv);
