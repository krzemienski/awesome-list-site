-- Typo recovery runs only after indexed FTS returns no rows. pg_trgm provides
-- `%` candidate selection and similarity ordering without a full catalog scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_resources_title_trgm
  ON resources USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_description_trgm
  ON resources USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_url_trgm
  ON resources USING GIN (url gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_resources_title_compact_trgm
  ON resources USING GIST (
    lower(regexp_replace(title, '[^a-zA-Z0-9]+', '', 'g')) gist_trgm_ops
  );