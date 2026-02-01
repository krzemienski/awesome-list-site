/**
 * ============================================================================
 * MODULES - Modular Backend Architecture
 * ============================================================================
 *
 * This is the central module registry for the awesome-list backend.
 * It provides a clean barrel export pattern for all feature modules.
 *
 * ARCHITECTURE:
 * Each module is self-contained with its own:
 * - Routes: HTTP endpoint handlers
 * - Services: Business logic layer
 * - Models: Data access and validation
 * - Types: TypeScript interfaces and schemas
 *
 * MODULES:
 * - auth: Authentication and authorization
 * - resources: Resource CRUD and management
 * - categories: Category hierarchy management
 * - user: User profiles and preferences
 * - journeys: Learning journey tracking
 * - admin: Administrative operations
 * - github-sync: GitHub synchronization
 * - enrichment: AI-powered resource enrichment
 *
 * USAGE:
 * Import specific modules as needed:
 * import { authModule } from './modules';
 * import { resourcesModule } from './modules';
 *
 * See individual module documentation for detailed API information.
 * ============================================================================
 */

export { authModule } from './auth';
export { resourcesModule } from './resources';
export { categoriesModule } from './categories';
export { userModule } from './user';
export { journeysModule } from './journeys';
export { adminModule } from './admin';
export { githubSyncModule } from './github-sync';
export { enrichmentModule } from './enrichment';
