-- Performance Optimization Migration
-- Created: 2025-11-29
-- Purpose: Add missing indexes for query performance optimization

-- ================================================
-- RESOURCE INDEXES
-- ================================================

-- Index for resource creation date queries (timeline, recent resources)
CREATE INDEX IF NOT EXISTS idx_resources_created_at
ON resources(created_at DESC);

-- Index for resource updates (audit trails, change tracking)
CREATE INDEX IF NOT EXISTS idx_resources_updated_at
ON resources(updated_at DESC);

-- Index for GitHub sync status queries
CREATE INDEX IF NOT EXISTS idx_resources_github_synced
ON resources(github_synced)
WHERE github_synced = true;

-- Composite index for filtering by category and status (common query)
-- Note: idx_resources_status_category already exists in schema.ts
-- CREATE INDEX IF NOT EXISTS idx_resources_category_status
-- ON resources(category, status);

-- ================================================
-- USER DATA INDEXES
-- ================================================

-- Index for user favorites lookups
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
ON user_favorites(user_id);

-- Index for resource popularity (count favorites)
CREATE INDEX IF NOT EXISTS idx_user_favorites_resource_id
ON user_favorites(resource_id);

-- Index for user bookmarks lookups
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id
ON user_bookmarks(user_id);

-- Index for resource bookmark counts
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_resource_id
ON user_bookmarks(resource_id);

-- Index for user preferences lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
ON user_preferences(user_id);

-- Index for user interactions analytics
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id
ON user_interactions(user_id);

-- Index for resource analytics (views, clicks)
CREATE INDEX IF NOT EXISTS idx_user_interactions_resource_id
ON user_interactions(resource_id);

-- Composite index for interaction type filtering
CREATE INDEX IF NOT EXISTS idx_user_interactions_type
ON user_interactions(interaction_type, created_at DESC);

-- ================================================
-- ENRICHMENT INDEXES
-- ================================================

-- Index for enrichment queue processing
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_status
ON enrichment_queue(status)
WHERE status IN ('pending', 'processing');

-- Index for job-based queue lookups
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_job_id
ON enrichment_queue(job_id);

-- Index for enrichment jobs status
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status
ON enrichment_jobs(status, created_at DESC);

-- Index for user's enrichment jobs
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_started_by
ON enrichment_jobs(started_by);

-- ================================================
-- LEARNING JOURNEY INDEXES
-- ================================================

-- Index for user journey progress lookups
CREATE INDEX IF NOT EXISTS idx_user_journey_progress_user_id
ON user_journey_progress(user_id);

-- Index for journey progress tracking
CREATE INDEX IF NOT EXISTS idx_user_journey_progress_journey_id
ON user_journey_progress(journey_id);

-- Index for journey steps ordering
CREATE INDEX IF NOT EXISTS idx_journey_steps_journey_id
ON journey_steps(journey_id, step_number);

-- ================================================
-- GITHUB SYNC INDEXES
-- ================================================

-- Index for GitHub sync queue status
CREATE INDEX IF NOT EXISTS idx_github_sync_queue_status
ON github_sync_queue(status, created_at DESC);

-- Index for sync history repository lookups
CREATE INDEX IF NOT EXISTS idx_github_sync_history_repository_url
ON github_sync_history(repository_url, created_at DESC);

-- Index for user's sync history
CREATE INDEX IF NOT EXISTS idx_github_sync_history_performed_by
ON github_sync_history(performed_by);

-- ================================================
-- AUDIT & EDITS INDEXES
-- ================================================

-- Index for resource audit log
CREATE INDEX IF NOT EXISTS idx_resource_audit_log_resource_id
ON resource_audit_log(resource_id, created_at DESC);

-- Index for user audit activity
CREATE INDEX IF NOT EXISTS idx_resource_audit_log_performed_by
ON resource_audit_log(performed_by);

-- Index for resource edits status
CREATE INDEX IF NOT EXISTS idx_resource_edits_status
ON resource_edits(status)
WHERE status = 'pending';

-- Index for resource edits resource lookups
CREATE INDEX IF NOT EXISTS idx_resource_edits_resource_id
ON resource_edits(resource_id);

-- Index for user's submitted edits
CREATE INDEX IF NOT EXISTS idx_resource_edits_submitted_by
ON resource_edits(submitted_by);

-- ================================================
-- TAGS INDEXES
-- ================================================

-- Index for tag name lookups (auto-complete, search)
CREATE INDEX IF NOT EXISTS idx_tags_name
ON tags(name);

-- Index for tag slug lookups (URL routing)
CREATE INDEX IF NOT EXISTS idx_tags_slug
ON tags(slug);

-- Index for resource tags junction table
CREATE INDEX IF NOT EXISTS idx_resource_tags_resource_id
ON resource_tags(resource_id);

CREATE INDEX IF NOT EXISTS idx_resource_tags_tag_id
ON resource_tags(tag_id);

-- ================================================
-- FULL-TEXT SEARCH INDEXES
-- ================================================

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for resource title fuzzy search
CREATE INDEX IF NOT EXISTS idx_resources_title_trgm
ON resources USING gin(title gin_trgm_ops);

-- GIN index for resource description fuzzy search
CREATE INDEX IF NOT EXISTS idx_resources_description_trgm
ON resources USING gin(description gin_trgm_ops);

-- Full-text search vector (auto-updated via trigger)
-- Note: This would require a trigger to maintain
-- CREATE INDEX IF NOT EXISTS idx_resources_search_vector
-- ON resources USING gin(search_vector);

-- ================================================
-- PERFORMANCE STATISTICS
-- ================================================

-- Analyze tables to update query planner statistics
ANALYZE resources;
ANALYZE user_favorites;
ANALYZE user_bookmarks;
ANALYZE user_interactions;
ANALYZE enrichment_queue;
ANALYZE enrichment_jobs;
ANALYZE github_sync_queue;
ANALYZE github_sync_history;
ANALYZE resource_edits;
ANALYZE tags;
ANALYZE resource_tags;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON INDEX idx_resources_created_at IS 'Performance: Timeline and recent resources queries';
COMMENT ON INDEX idx_user_favorites_user_id IS 'Performance: User favorites lookups';
COMMENT ON INDEX idx_enrichment_queue_status IS 'Performance: AI enrichment queue processing';
COMMENT ON INDEX idx_github_sync_history_repository_url IS 'Performance: GitHub sync history by repo';
COMMENT ON INDEX idx_resources_title_trgm IS 'Performance: Fuzzy search on resource titles';
