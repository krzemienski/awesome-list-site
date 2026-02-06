/**
 * ============================================================================
 * REPOSITORY MODULES - Domain-Based Data Access Layer
 * ============================================================================
 *
 * This module provides domain-based repository classes that encapsulate
 * database operations for specific business entities. This architecture
 * replaces the monolithic storage.ts file with focused, single-responsibility
 * modules that are easier to test, maintain, and reason about.
 *
 * ARCHITECTURE:
 * Each repository handles one domain:
 * - UserRepository: User accounts, roles, authentication
 * - ResourceRepository: Resource CRUD, approval workflow, status management
 * - CategoryRepository: 3-level category hierarchy (categories, subcategories, sub-subcategories)
 * - TagRepository: Tag management and resource tagging
 * - LearningJourneyRepository: Learning journeys and progress tracking
 * - UserFeatureRepository: User features (favorites, bookmarks, preferences)
 * - AuditRepository: Audit logs and resource edit workflow
 * - GithubSyncRepository: GitHub sync queue and history
 * - EnrichmentRepository: AI enrichment jobs and queue
 * - AdminRepository: Administrative statistics and operations
 *
 * BENEFITS:
 * - Single Responsibility: Each repository handles one domain
 * - Testability: Repositories can be tested and mocked independently
 * - Maintainability: Smaller files are easier to navigate and modify
 * - Parallel Development: Teams can work on different repositories simultaneously
 * - Type Safety: Each repository exports its own types and interfaces
 *
 * USAGE:
 * Import repositories individually for better tree-shaking and clarity:
 *
 * import { UserRepository } from './repositories';
 * const userRepo = new UserRepository();
 * const user = await userRepo.getUser(userId);
 *
 * Or use the unified storage facade for backward compatibility:
 *
 * import { storage } from './storage';
 * const user = await storage.getUser(userId);
 *
 * See /server/repositories/README.md for detailed documentation.
 * ============================================================================
 */

// ============================================================================
// REPOSITORY EXPORTS
// ============================================================================
// Individual repositories will be exported here as they are created.
// This file serves as a barrel export for all repository modules.

export { UserRepository } from './UserRepository';
export { ResourceRepository } from './ResourceRepository';
export { CategoryRepository } from './CategoryRepository';
export { TagRepository } from './TagRepository';
export { LearningJourneyRepository } from './LearningJourneyRepository';
export { UserFeatureRepository } from './UserFeatureRepository';
export { AuditRepository } from './AuditRepository';
export { GithubSyncRepository } from './GithubSyncRepository';
export { EnrichmentRepository } from './EnrichmentRepository';
export { AdminRepository, type AdminStats } from './AdminRepository';
export {
  LegacyRepository,
  type AwesomeListData,
  type HierarchicalCategory,
  type HierarchicalSubcategory,
  type HierarchicalSubSubcategory,
} from './LegacyRepository';
