-- Categories API Optimization Migration
-- Created: 2025-12-02
-- Purpose: Add indexes to optimize /api/categories endpoint (Bug #6 - 1,583ms latency)
-- Target: Reduce from 1,583ms to <50ms

-- ================================================
-- MISSING INDEXES FOR CATEGORY FILTERING
-- ================================================

-- Index for subcategory filtering (used in getHierarchicalCategories)
CREATE INDEX IF NOT EXISTS idx_resources_subcategory
ON resources(subcategory)
WHERE subcategory IS NOT NULL;

-- Index for sub_subcategory filtering (used in getHierarchicalCategories)
CREATE INDEX IF NOT EXISTS idx_resources_sub_subcategory
ON resources(sub_subcategory)
WHERE sub_subcategory IS NOT NULL;

-- Composite index for approved resources by category (most common query)
CREATE INDEX IF NOT EXISTS idx_resources_approved_category
ON resources(category)
WHERE status = 'approved';

-- Composite index for approved resources by subcategory
CREATE INDEX IF NOT EXISTS idx_resources_approved_subcategory
ON resources(subcategory)
WHERE status = 'approved' AND subcategory IS NOT NULL;

-- Composite index for approved resources by sub_subcategory
CREATE INDEX IF NOT EXISTS idx_resources_approved_sub_subcategory
ON resources(sub_subcategory)
WHERE status = 'approved' AND sub_subcategory IS NOT NULL;

-- ================================================
-- SUBCATEGORIES TABLE INDEXES
-- ================================================

-- Index for subcategory category_id lookups (JOIN optimization)
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id
ON subcategories(category_id);

-- ================================================
-- SUB_SUBCATEGORIES TABLE INDEXES
-- ================================================

-- Index for sub_subcategory subcategory_id lookups (JOIN optimization)
CREATE INDEX IF NOT EXISTS idx_sub_subcategories_subcategory_id
ON sub_subcategories(subcategory_id);

-- ================================================
-- ANALYZE TABLES
-- ================================================

ANALYZE resources;
ANALYZE categories;
ANALYZE subcategories;
ANALYZE sub_subcategories;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON INDEX idx_resources_subcategory IS 'Performance: Subcategory resource count queries';
COMMENT ON INDEX idx_resources_sub_subcategory IS 'Performance: Sub-subcategory resource count queries';
COMMENT ON INDEX idx_resources_approved_category IS 'Performance: Approved resources by category (partial index)';
COMMENT ON INDEX idx_subcategories_category_id IS 'Performance: Subcategory JOIN lookups';
COMMENT ON INDEX idx_sub_subcategories_subcategory_id IS 'Performance: Sub-subcategory JOIN lookups';
