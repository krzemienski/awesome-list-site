/**
 * ============================================================================
 * REPOSITORIES INDEX - Central export for all repository classes
 * ============================================================================
 *
 * This module provides a single import point for all repository classes.
 * Repositories implement the repository pattern, providing a clean abstraction
 * over database operations with type safety and consistent error handling.
 *
 * DESIGN PATTERN:
 * - Repository Pattern: Each repository encapsulates data access for one entity
 * - Dependency Injection: Repositories accept db instance in constructor
 * - Type Safety: Full TypeScript support with proper typing
 * - Separation of Concerns: Business logic in services, data access in repos
 *
 * USAGE:
 * ```typescript
 * import { UserRepository, ResourceRepository } from './repositories';
 * import { db } from './db';
 *
 * const userRepo = new UserRepository(db);
 * const resourceRepo = new ResourceRepository(db);
 *
 * const user = await userRepo.getById('user-id');
 * const resource = await resourceRepo.getById(123);
 * ```
 *
 * REPOSITORY CATEGORIES:
 * - User Management: UserRepository
 * - Resources: ResourceRepository
 * - Hierarchical Data: CategoryRepository, SubcategoryRepository, SubSubcategoryRepository
 * - User Interactions: FavoriteRepository, BookmarkRepository
 * - Learning: JourneyRepository
 * - Metadata: TagRepository
 * - Integrations: GithubSyncRepository, EnrichmentRepository
 * - Audit & Compliance: AuditLogRepository
 * - Base Classes: HierarchyRepository (generic base for hierarchical entities)
 * ============================================================================
 */

// Base repository classes
export { HierarchyRepository } from './HierarchyRepository';
export type { HierarchyRepositoryConfig } from './HierarchyRepository';

// User management
export { UserRepository } from './UserRepository';

// Resource management
export { ResourceRepository } from './ResourceRepository';

// Category hierarchy
export { CategoryRepository } from './CategoryRepository';
export { SubcategoryRepository } from './SubcategoryRepository';
export { SubSubcategoryRepository } from './SubSubcategoryRepository';

// User interactions
export { FavoriteRepository } from './FavoriteRepository';
export { BookmarkRepository } from './BookmarkRepository';

// Learning journeys
export { JourneyRepository } from './JourneyRepository';

// Tags and metadata
export { TagRepository } from './TagRepository';

// External integrations
export { GithubSyncRepository } from './GithubSyncRepository';
export { EnrichmentRepository } from './EnrichmentRepository';

// Audit logging
export { AuditLogRepository } from './AuditLogRepository';
export type { AuditLogEntry, AuditLogRecord } from './AuditLogRepository';
