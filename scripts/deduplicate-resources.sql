-- Database URL Deduplication Migration
-- Generated: 2025-12-02
-- Strategy: Keep first occurrence (by created_at), delete duplicates
-- Impact: 693 duplicate URL groups, 693 resources to delete (~26% of database)

-- IMPORTANT: Run this in a transaction for safety
-- Test on staging first!

BEGIN;

-- Step 1: Create temporary table with resource mapping (duplicate → kept)
CREATE TEMP TABLE resource_dedup_map AS
SELECT
  url,
  (array_agg(id ORDER BY created_at))[1] as keep_id,  -- First created
  array_remove(array_agg(id ORDER BY created_at), (array_agg(id ORDER BY created_at))[1]) as delete_ids
FROM resources
GROUP BY url
HAVING COUNT(*) > 1;

-- Verify mapping (should show 693 URLs)
SELECT COUNT(*) as duplicate_url_groups FROM resource_dedup_map;

-- Step 2: Update foreign key references to point to kept resource
-- This preserves user data instead of letting CASCADE delete it

-- Update user_favorites
UPDATE user_favorites
SET resource_id = m.keep_id
FROM resource_dedup_map m
WHERE resource_id = ANY(m.delete_ids)
  AND NOT EXISTS (
    -- Prevent duplicate favorites (user already favorited the kept resource)
    SELECT 1 FROM user_favorites uf2
    WHERE uf2.user_id = user_favorites.user_id
    AND uf2.resource_id = m.keep_id
  );

-- Delete duplicate favorites (where user favorited both versions)
DELETE FROM user_favorites
WHERE resource_id IN (
  SELECT unnest(delete_ids) FROM resource_dedup_map
);

-- Update user_bookmarks
UPDATE user_bookmarks
SET resource_id = m.keep_id
FROM resource_dedup_map m
WHERE resource_id = ANY(m.delete_ids)
  AND NOT EXISTS (
    SELECT 1 FROM user_bookmarks ub2
    WHERE ub2.user_id = user_bookmarks.user_id
    AND ub2.resource_id = m.keep_id
  );

-- Delete duplicate bookmarks
DELETE FROM user_bookmarks
WHERE resource_id IN (
  SELECT unnest(delete_ids) FROM resource_dedup_map
);

-- Update resource_tags (if table exists)
UPDATE resource_tags
SET resource_id = m.keep_id
FROM resource_dedup_map m
WHERE resource_id = ANY(m.delete_ids)
  AND NOT EXISTS (
    SELECT 1 FROM resource_tags rt2
    WHERE rt2.resource_id = m.keep_id
    AND rt2.tag_id = resource_tags.tag_id
  );

-- Delete duplicate resource_tags
DELETE FROM resource_tags
WHERE resource_id IN (
  SELECT unnest(delete_ids) FROM resource_dedup_map
);

-- Update journey_steps (ON DELETE SET NULL but better to preserve reference)
UPDATE journey_steps
SET resource_id = m.keep_id
FROM resource_dedup_map m
WHERE resource_id = ANY(m.delete_ids);

-- Update enrichment_queue (if any pending jobs reference duplicates)
UPDATE enrichment_queue
SET resource_id = m.keep_id
FROM resource_dedup_map m
WHERE resource_id = ANY(m.delete_ids)
  AND NOT EXISTS (
    SELECT 1 FROM enrichment_queue eq2
    WHERE eq2.resource_id = m.keep_id
    AND eq2.job_id = enrichment_queue.job_id
  );

-- Delete duplicate enrichment_queue entries
DELETE FROM enrichment_queue
WHERE resource_id IN (
  SELECT unnest(delete_ids) FROM resource_dedup_map
);

-- resource_audit_log: Leave as-is (ON DELETE SET NULL, historical record)

-- Step 3: Delete duplicate resources
-- This will cascade to any remaining unhandled references
DELETE FROM resources
WHERE id IN (
  SELECT unnest(delete_ids) FROM resource_dedup_map
);

-- Step 4: Verification queries
SELECT COUNT(*) as remaining_resources FROM resources;
SELECT COUNT(*) as duplicate_urls_remaining FROM (
  SELECT url FROM resources GROUP BY url HAVING COUNT(*) > 1
) AS still_dupes;

-- Verify user data preserved
SELECT
  (SELECT COUNT(*) FROM user_favorites) as favorites_count,
  (SELECT COUNT(*) FROM user_bookmarks) as bookmarks_count,
  (SELECT COUNT(DISTINCT resource_id) FROM journey_steps WHERE resource_id IS NOT NULL) as journey_resources;

-- Expected results:
-- remaining_resources: ~1,954 (2,647 - 693)
-- duplicate_urls_remaining: 0
-- User data counts should match or be close to pre-migration

-- If verification passes, COMMIT. If any issues, ROLLBACK.
-- COMMIT;
-- ROLLBACK;  -- Use this if any issues found

-- Post-migration: Re-run awesome-lint to verify error reduction
-- Expected: 84 errors → 36 errors (48 duplicate URL errors eliminated)
