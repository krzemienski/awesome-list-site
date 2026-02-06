/**
 * ============================================================================
 * CATEGORIES MODULE - Category Hierarchy Management
 * ============================================================================
 *
 * This module manages the three-tier category hierarchy used to organize
 * resources: Categories → Subcategories → Sub-subcategories.
 *
 * FEATURES:
 * - Three-level hierarchical categorization
 * - CRUD operations for all hierarchy levels
 * - Automatic slug generation from names
 * - Resource counting per category
 * - Category reordering and nesting
 * - Bulk category operations
 *
 * HIERARCHY STRUCTURE:
 * - Category (Level 1): Top-level groupings (e.g., "Infrastructure & Delivery")
 * - Subcategory (Level 2): Refinements (e.g., "CDN & Edge Delivery")
 * - Sub-subcategory (Level 3): Specific topics (e.g., "Multi-CDN Solutions")
 *
 * CATEGORY OPERATIONS:
 * - Create: Add new category with auto-generated slug
 * - Read: Fetch categories with resource counts
 * - Update: Modify name, slug, ordering
 * - Delete: Remove with cascade or orphan handling
 * - Move: Reassign parent relationships
 *
 * SLUG GENERATION:
 * - Lowercase transformation
 * - Special character removal
 * - Hyphen separation
 * - Uniqueness validation
 *
 * CONSTRAINTS:
 * - Categories must have unique slugs at each level
 * - Subcategories belong to exactly one category
 * - Sub-subcategories belong to exactly one subcategory
 * - Circular references prevented
 *
 * See /docs/ARCHITECTURE.md for category schema documentation.
 * ============================================================================
 */

export { categoriesModule } from './routes';
