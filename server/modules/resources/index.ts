/**
 * ============================================================================
 * RESOURCES MODULE - Resource Management
 * ============================================================================
 *
 * This module handles all resource-related operations including CRUD,
 * search, filtering, and approval workflows.
 *
 * FEATURES:
 * - Full CRUD operations for resources
 * - Advanced search with filters and pagination
 * - Category-based organization and hierarchy
 * - Resource approval workflow (pending → approved → rejected)
 * - Duplicate detection via URL matching
 * - Bulk operations for batch processing
 *
 * RESOURCE LIFECYCLE:
 * 1. Submit: User submits new resource (status: pending)
 * 2. Review: Moderator reviews for quality and relevance
 * 3. Approve/Reject: Resource marked as approved or rejected
 * 4. Publish: Approved resources appear in public lists
 * 5. Update: Resources can be edited with audit trail
 * 6. Archive: Soft delete with option to restore
 *
 * SEARCH & FILTERING:
 * - Full-text search across title, description, tags
 * - Filter by category, subcategory, status
 * - Sort by date, popularity, quality score
 * - Pagination with configurable page sizes
 *
 * VALIDATION:
 * - URL format and accessibility checks
 * - Required fields enforcement
 * - Tag normalization and limits
 * - Description length constraints
 *
 * See /docs/API.md for resource endpoint documentation.
 * ============================================================================
 */

export { resourcesModule } from './routes';
