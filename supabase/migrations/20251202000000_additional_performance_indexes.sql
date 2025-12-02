-- Additional Performance Optimization Migration
-- Created: 2025-12-02
-- Purpose: Add additional missing indexes identified through query analysis

-- ================================================
-- NAVIGATION HIERARCHY INDEXES
-- ================================================

-- Subcategories: FK lookups and slug searches
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id
ON subcategories(category_id);

CREATE INDEX IF NOT EXISTS idx_subcategories_slug
ON subcategories(slug);

-- Sub-subcategories: FK lookups and slug searches
CREATE INDEX IF NOT EXISTS idx_sub_subcategories_subcategory_id
ON sub_subcategories(subcategory_id);

CREATE INDEX IF NOT EXISTS idx_sub_subcategories_slug
ON sub_subcategories(slug);

-- ================================================
-- RESOURCE QUERY OPTIMIZATION
-- ================================================

-- Subcategory filtering (common in listResources)
CREATE INDEX IF NOT EXISTS idx_resources_subcategory
ON resources(subcategory);

-- URL index for duplicate detection during import
CREATE INDEX IF NOT EXISTS idx_resources_url_hash
ON resources USING hash(url);

-- Composite index for hierarchical resource counts
-- Used by getHierarchicalCategories() for group by queries
CREATE INDEX IF NOT EXISTS idx_resources_approved_category
ON resources(category)
WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_resources_approved_subcategory
ON resources(subcategory)
WHERE status = 'approved' AND subcategory IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resources_approved_subsubcategory
ON resources(sub_subcategory)
WHERE status = 'approved' AND sub_subcategory IS NOT NULL;

-- ================================================
-- LEARNING JOURNEYS OPTIMIZATION
-- ================================================

-- Status filter (used in listLearningJourneys)
CREATE INDEX IF NOT EXISTS idx_learning_journeys_status
ON learning_journeys(status);

-- Category filter
CREATE INDEX IF NOT EXISTS idx_learning_journeys_category
ON learning_journeys(category);

-- Composite for common query pattern: published journeys ordered by index
CREATE INDEX IF NOT EXISTS idx_learning_journeys_published_order
ON learning_journeys(order_index)
WHERE status = 'published';

-- ================================================
-- AUDIT LOG OPTIMIZATION
-- ================================================

-- Action type filtering for admin reports
CREATE INDEX IF NOT EXISTS idx_audit_log_action
ON resource_audit_log(action);

-- Composite index for resource audit timeline
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_created
ON resource_audit_log(resource_id, created_at DESC);

-- ================================================
-- USER DATA QUERY OPTIMIZATION
-- ================================================

-- User favorites: Composite for join+order queries
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created
ON user_favorites(user_id, created_at DESC);

-- User bookmarks: Composite for join+order queries
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_created
ON user_bookmarks(user_id, created_at DESC);

-- User journey progress: Composite for user+order queries
CREATE INDEX IF NOT EXISTS idx_user_journey_progress_user_accessed
ON user_journey_progress(user_id, last_accessed_at DESC);

-- ================================================
-- RESOURCE EDITS OPTIMIZATION
-- ================================================

-- Composite for pending edits ordered by creation
CREATE INDEX IF NOT EXISTS idx_resource_edits_pending_created
ON resource_edits(created_at ASC)
WHERE status = 'pending';

-- User's edits timeline
CREATE INDEX IF NOT EXISTS idx_resource_edits_user_created
ON resource_edits(submitted_by, created_at DESC);

-- ================================================
-- GITHUB SYNC OPTIMIZATION
-- ================================================

-- Composite for repository sync history
CREATE INDEX IF NOT EXISTS idx_github_sync_history_repo_created
ON github_sync_history(repository_url, created_at DESC);

-- Direction filter for import/export queries
CREATE INDEX IF NOT EXISTS idx_github_sync_history_direction
ON github_sync_history(direction);

-- ================================================
-- ENRICHMENT QUEUE OPTIMIZATION
-- ================================================

-- Pending items for processing (most frequent query)
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_pending
ON enrichment_queue(job_id, id ASC)
WHERE status = 'pending';

-- Job+status composite for queue monitoring
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_job_status
ON enrichment_queue(job_id, status);

-- ================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ================================================

-- Pending resources (admin workflow)
CREATE INDEX IF NOT EXISTS idx_resources_pending
ON resources(created_at DESC)
WHERE status = 'pending';

-- Active enrichment jobs
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_active
ON enrichment_jobs(created_at DESC)
WHERE status IN ('pending', 'processing');

-- ================================================
-- UPDATE STATISTICS
-- ================================================

ANALYZE resources;
ANALYZE categories;
ANALYZE subcategories;
ANALYZE sub_subcategories;
ANALYZE learning_journeys;
ANALYZE journey_steps;
ANALYZE resource_audit_log;
ANALYZE user_favorites;
ANALYZE user_bookmarks;
ANALYZE user_journey_progress;
ANALYZE resource_edits;
ANALYZE github_sync_history;
ANALYZE enrichment_queue;
ANALYZE enrichment_jobs;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON INDEX idx_subcategories_category_id IS 'Performance: FK lookups for category navigation';
COMMENT ON INDEX idx_resources_subcategory IS 'Performance: Subcategory filtering in resource lists';
COMMENT ON INDEX idx_resources_approved_category IS 'Performance: Category counts for approved resources only';
COMMENT ON INDEX idx_learning_journeys_published_order IS 'Performance: Published journeys sorted by order';
COMMENT ON INDEX idx_user_favorites_user_created IS 'Performance: User favorites timeline query';
COMMENT ON INDEX idx_enrichment_queue_pending IS 'Performance: Fast pending item retrieval for AI processing';
COMMENT ON INDEX idx_resources_pending IS 'Performance: Admin pending resources queue';
