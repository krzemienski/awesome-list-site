# Repository Pattern Documentation

## Overview

The repository pattern provides a domain-based data access layer for the Awesome List application. This architecture replaced a monolithic 2,033-line `storage.ts` file with 11 focused, single-responsibility repository modules.

## Why Repository Pattern?

### Problems with Monolithic Storage

The original `server/storage.ts` file had several issues:

- **Size**: 2,033 lines handling 10+ distinct domains
- **Single Responsibility Violation**: One file managed users, resources, categories, audit logs, GitHub sync, AI enrichment, learning journeys, tags, bookmarks, and admin operations
- **Difficult Navigation**: Finding specific functionality required searching through thousands of lines
- **Testing Challenges**: Mocking required stubbing the entire storage module
- **Merge Conflicts**: Multiple developers editing the same large file
- **Cognitive Load**: Understanding the full scope was overwhelming

### Benefits of Repository Pattern

- **Single Responsibility**: Each repository handles one domain
- **Improved Testability**: Mock individual repositories, not the entire data layer
- **Better Maintainability**: Smaller files (50-300 lines each) are easier to understand
- **Parallel Development**: Teams can work on different repositories simultaneously
- **Clear Dependencies**: Import only what you need
- **Type Safety**: Each repository exports domain-specific types
- **Reduced Cognitive Load**: Focus on one domain at a time

## Repository Modules

### 1. UserRepository (`UserRepository.ts`)

**Responsibility**: User authentication, user management, and role administration

**Key Operations**:
- `getUser(id)` - Retrieve user by ID
- `upsertUser(userData)` - Create or update user (first user becomes admin)
- `getUserByEmail(email)` - Find user by email address
- `listUsers(page, limit)` - Paginated user listing
- `updateUserRole(userId, role)` - Update user's role (admin/user)

**Special Behaviors**:
- First user created is automatically assigned admin role (bootstrap)
- OAuth-based user management (no passwords)

**Example**:
```typescript
import { UserRepository } from './repositories';

const userRepo = new UserRepository();
const user = await userRepo.getUser('user-123');
```

### 2. ResourceRepository (`ResourceRepository.ts`)

**Responsibility**: Resource CRUD operations, approval workflow, and status management

**Key Operations**:
- `listResources(options)` - Paginated listing with filtering
- `getResource(id)` - Get by ID
- `getResourceByUrl(url)` - Get by URL
- `getResourceCount()` - Total count
- `createResource(data, userId)` - Create with audit log
- `updateResource(id, updates, userId)` - Update with audit log
- `deleteResource(id, userId)` - Delete with audit log
- `getPendingResources()` - Resources awaiting approval
- `approveResource(id, userId)` - Approve pending resource
- `rejectResource(id, userId, reason)` - Reject with reason

**Special Behaviors**:
- All modifications automatically logged to `resource_audit_log` table
- Status transitions: `pending` → `approved`/`rejected`
- Supports filtering by status, category, subcategory, user, and search term

**Example**:
```typescript
import { ResourceRepository } from './repositories';

const resourceRepo = new ResourceRepository();
const resources = await resourceRepo.listResources({
  status: 'approved',
  category: 'AI',
  page: 1,
  limit: 20
});
```

### 3. CategoryRepository (`CategoryRepository.ts`)

**Responsibility**: 3-level category hierarchy management (categories → subcategories → sub-subcategories)

**Key Operations**:
- `listCategories()` - Get all categories
- `getCategoryBySlug(slug)` - Find category by slug
- `createCategory(data)` - Create new category
- `updateCategory(id, updates)` - Update category
- `deleteCategory(id)` - Delete with validation
- `listSubcategories(categoryId)` - Get subcategories for a category
- `createSubcategory(data)` - Create subcategory
- `updateSubcategory(id, updates)` - Update subcategory
- `deleteSubcategory(id)` - Delete with validation
- `listSubSubcategories(subcategoryId)` - Get sub-subcategories
- `createSubSubcategory(data)` - Create sub-subcategory
- `updateSubSubcategory(id, updates)` - Update sub-subcategory
- `deleteSubSubcategory(id)` - Delete with validation
- `getCategoryResourceCount(slug)` - Count resources in category

**Special Behaviors**:
- Validates slug uniqueness at each hierarchy level
- Prevents deletion when child categories or resources exist (cascade protection)
- Counts resources at each level for analytics

**Example**:
```typescript
import { CategoryRepository } from './repositories';

const categoryRepo = new CategoryRepository();
const categories = await categoryRepo.listCategories();
const subcategories = await categoryRepo.listSubcategories(categoryId);
```

### 4. TagRepository (`TagRepository.ts`)

**Responsibility**: Tag management and resource-tag associations

**Key Operations**:
- `listTags()` - Get all tags
- `getTag(id)` - Get tag by ID
- `createTag(name)` - Create new tag
- `deleteTag(id)` - Delete tag
- `addResourceTag(resourceId, tagId)` - Associate tag with resource
- `removeResourceTag(resourceId, tagId)` - Remove association
- `getResourceTags(resourceId)` - Get all tags for a resource

**Example**:
```typescript
import { TagRepository } from './repositories';

const tagRepo = new TagRepository();
const tags = await tagRepo.getResourceTags(resourceId);
```

### 5. LearningJourneyRepository (`LearningJourneyRepository.ts`)

**Responsibility**: Learning journey and step management

**Key Operations**:
- `listJourneys()` - Get all learning journeys
- `getJourney(id)` - Get journey by ID
- `createJourney(data)` - Create new journey
- `updateJourney(id, updates)` - Update journey
- `deleteJourney(id)` - Delete journey
- `listJourneySteps(journeyId)` - Get all steps for a journey
- `getJourneyStep(id)` - Get step by ID
- `createJourneyStep(data)` - Create step
- `updateJourneyStep(id, updates)` - Update step
- `deleteJourneyStep(id)` - Delete step

**Example**:
```typescript
import { LearningJourneyRepository } from './repositories';

const journeyRepo = new LearningJourneyRepository();
const journeys = await journeyRepo.listJourneys();
const steps = await journeyRepo.listJourneySteps(journeyId);
```

### 6. UserFeatureRepository (`UserFeatureRepository.ts`)

**Responsibility**: User-specific features (favorites, bookmarks, journey progress, preferences)

**Key Operations**:
- `addFavorite(userId, resourceId)` - Add resource to favorites
- `removeFavorite(userId, resourceId)` - Remove from favorites
- `getUserFavorites(userId)` - Get user's favorites with resource details
- `addBookmark(userId, resourceId, notes?)` - Bookmark resource with optional notes
- `removeBookmark(userId, resourceId)` - Remove bookmark
- `getUserBookmarks(userId)` - Get bookmarks with notes and resource details
- `startUserJourney(userId, journeyId)` - Begin a learning journey
- `updateUserJourneyProgress(userId, journeyId, completedSteps)` - Update progress
- `getUserJourneyProgress(userId, journeyId)` - Get progress for specific journey
- `listUserJourneyProgress(userId)` - Get all journey progress for user
- `getUserPreferences(userId)` - Get user preferences

**Special Behaviors**:
- Favorites use `onConflictDoNothing` to prevent duplicates
- Bookmarks support optional notes field
- Journey progress tracks completion percentage and completed steps array
- Automatically calculates `isCompleted` when all steps are done

**Example**:
```typescript
import { UserFeatureRepository } from './repositories';

const userFeatureRepo = new UserFeatureRepository();
await userFeatureRepo.addFavorite(userId, resourceId);
const favorites = await userFeatureRepo.getUserFavorites(userId);
```

### 7. AuditRepository (`AuditRepository.ts`)

**Responsibility**: Audit logging and resource edit workflow

**Key Operations**:
- `logResourceAudit(resourceId, userId, action, changes?)` - Log resource changes
- `getResourceAuditLog(resourceId, limit?)` - Get audit history
- `createResourceEdit(data)` - Create edit suggestion
- `getResourceEdit(id)` - Get edit by ID
- `getResourceEditsByResource(resourceId)` - Get all edits for resource
- `getResourceEditsByUser(userId)` - Get edits by user
- `getPendingResourceEdits()` - Get pending edit suggestions
- `approveResourceEdit(id, userId)` - Approve edit suggestion
- `rejectResourceEdit(id, userId, reason)` - Reject edit with reason

**Special Behaviors**:
- Automatically records who made changes and when
- Tracks before/after state for updates via `changes` JSONB field
- Edit suggestions workflow: `pending` → `approved`/`rejected`

**Example**:
```typescript
import { AuditRepository } from './repositories';

const auditRepo = new AuditRepository();
await auditRepo.logResourceAudit(resourceId, userId, 'update', {
  before: { title: 'Old Title' },
  after: { title: 'New Title' }
});
```

### 8. GithubSyncRepository (`GithubSyncRepository.ts`)

**Responsibility**: GitHub synchronization queue and history

**Key Operations**:
- `addToSyncQueue(url, userId)` - Queue repository for import
- `getSyncQueue()` - Get pending sync jobs
- `updateSyncStatus(id, status, metadata?)` - Update job status
- `removeSyncJob(id)` - Remove from queue
- `getSyncHistory(limit?)` - Get recent sync history
- `getSyncJobById(id)` - Get specific job
- `getSyncJobByUrl(url)` - Find job by repository URL

**Special Behaviors**:
- Status transitions: `pending` → `processing` → `completed`/`failed`
- Stores sync metadata (commits processed, resources imported, errors)
- Maintains history of all sync operations

**Example**:
```typescript
import { GithubSyncRepository } from './repositories';

const githubRepo = new GithubSyncRepository();
const job = await githubRepo.addToSyncQueue('https://github.com/user/repo', userId);
```

### 9. EnrichmentRepository (`EnrichmentRepository.ts`)

**Responsibility**: AI enrichment job management and queue

**Key Operations**:
- `createEnrichmentJob(data)` - Create enrichment job
- `getEnrichmentJob(id)` - Get job by ID
- `updateEnrichmentJob(id, updates)` - Update job status/result
- `listEnrichmentJobs(status?, limit?)` - List jobs with optional filtering
- `getPendingEnrichmentJobs()` - Get jobs pending processing
- `addToEnrichmentQueue(resourceId, userId)` - Queue resource for enrichment
- `getEnrichmentQueue()` - Get pending enrichment queue
- `removeEnrichmentQueueItem(id)` - Remove from queue

**Special Behaviors**:
- Job status: `pending` → `processing` → `completed`/`failed`
- Stores AI-generated descriptions, summaries, and metadata
- Queue system for batch processing

**Example**:
```typescript
import { EnrichmentRepository } from './repositories';

const enrichmentRepo = new EnrichmentRepository();
await enrichmentRepo.addToEnrichmentQueue(resourceId, userId);
const jobs = await enrichmentRepo.getPendingEnrichmentJobs();
```

### 10. AdminRepository (`AdminRepository.ts`)

**Responsibility**: Administrative statistics and operations

**Key Operations**:
- `getAdminStats()` - Get comprehensive admin dashboard statistics

**Returns**:
- Total users, resources, categories (all levels)
- Pending resource count
- Recent activity counts
- System health metrics

**Example**:
```typescript
import { AdminRepository } from './repositories';

const adminRepo = new AdminRepository();
const stats = await adminRepo.getAdminStats();
console.log(`Total users: ${stats.totalUsers}`);
```

### 11. LegacyRepository (`LegacyRepository.ts`)

**Responsibility**: Legacy database-driven awesome list (deprecated)

**Key Operations**:
- `getAwesomeListFromDatabase()` - Build hierarchical category structure from database

**Special Behaviors**:
- **DEPRECATED**: This method is maintained for backward compatibility only
- Builds complete 3-level category hierarchy with approved resources
- New code should use individual repository methods instead

**Example**:
```typescript
import { LegacyRepository } from './repositories';

const legacyRepo = new LegacyRepository();
// DEPRECATED: Use CategoryRepository and ResourceRepository instead
const awesomeList = await legacyRepo.getAwesomeListFromDatabase();
```

## Usage Patterns

### Direct Repository Usage (Recommended)

Import only the repositories you need for better tree-shaking and clearer dependencies:

```typescript
import {
  UserRepository,
  ResourceRepository,
  CategoryRepository
} from './repositories';

export async function getUserResources(userId: string) {
  const userRepo = new UserRepository();
  const resourceRepo = new ResourceRepository();

  const user = await userRepo.getUser(userId);
  if (!user) throw new Error('User not found');

  const { resources } = await resourceRepo.listResources({
    userId,
    status: 'approved',
    page: 1,
    limit: 50
  });

  return resources;
}
```

### Storage Facade (Backward Compatible)

The `storage.ts` facade provides a unified interface for gradual migration:

```typescript
import { storage } from './storage';

// All repository methods available through storage facade
const user = await storage.getUser(userId);
const resources = await storage.listResources({ status: 'approved' });
```

**Note**: The storage facade is maintained for backward compatibility. New code should import repositories directly.

## Testing

### Mocking Individual Repositories

```typescript
import { UserRepository } from './repositories';

// Mock the repository
jest.mock('./repositories/UserRepository');

const mockUserRepo = {
  getUser: jest.fn().mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
    role: 'user'
  }),
  upsertUser: jest.fn(),
};

// Use in tests
const user = await mockUserRepo.getUser('user-123');
expect(user.email).toBe('test@example.com');
```

### Integration Testing

```typescript
import { db } from '../db';
import { UserRepository } from './repositories';

describe('UserRepository', () => {
  let userRepo: UserRepository;

  beforeEach(() => {
    userRepo = new UserRepository();
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(users).where(eq(users.email, 'test@example.com'));
  });

  it('should create first user as admin', async () => {
    const user = await userRepo.upsertUser({
      id: 'test-123',
      email: 'test@example.com',
      firstName: 'Test'
    });

    expect(user.role).toBe('admin');
  });
});
```

## Migration Guide

### From Storage Facade to Direct Repository Usage

**Before** (using storage facade):
```typescript
import { storage } from './storage';

export async function approveResource(resourceId: string, userId: string) {
  await storage.approveResource(resourceId, userId);
  const resource = await storage.getResource(resourceId);
  await storage.logResourceAudit(resourceId, userId, 'approve');
  return resource;
}
```

**After** (using repositories directly):
```typescript
import { ResourceRepository, AuditRepository } from './repositories';

export async function approveResource(resourceId: string, userId: string) {
  const resourceRepo = new ResourceRepository();
  const auditRepo = new AuditRepository();

  await resourceRepo.approveResource(resourceId, userId);
  const resource = await resourceRepo.getResource(resourceId);
  await auditRepo.logResourceAudit(resourceId, userId, 'approve');
  return resource;
}
```

**Benefits of Migration**:
- Explicit dependencies make code easier to understand
- Better IDE autocomplete and type checking
- Easier to mock specific repositories in tests
- Reduced bundle size through tree-shaking
- Clear separation of concerns

## Architecture Details

### Database Layer

All repositories use [Drizzle ORM](https://orm.drizzle.team/) for type-safe database operations:

```typescript
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async getUser(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}
```

### Type Safety

Each repository imports types from `@shared/schema`:

```typescript
import {
  resources,
  type Resource,
  type InsertResource,
} from '@shared/schema';
```

### Singleton Pattern

Repositories can be instantiated multiple times or used as singletons:

```typescript
// Multiple instances (useful for testing)
const userRepo1 = new UserRepository();
const userRepo2 = new UserRepository();

// Singleton pattern (consistent state)
export const userRepository = new UserRepository();
```

### Transaction Support

For multi-repository operations, use Drizzle's transaction API:

```typescript
import { db } from '../db';
import { ResourceRepository, AuditRepository } from './repositories';

export async function createAndLogResource(data: InsertResource, userId: string) {
  return await db.transaction(async (tx) => {
    const resourceRepo = new ResourceRepository();
    const auditRepo = new AuditRepository();

    const resource = await resourceRepo.createResource(data, userId);
    await auditRepo.logResourceAudit(resource.id, userId, 'create');

    return resource;
  });
}
```

## File Structure

```
server/repositories/
├── README.md                      # This file
├── index.ts                       # Barrel exports
├── UserRepository.ts              # ~100 lines
├── ResourceRepository.ts          # ~300 lines
├── CategoryRepository.ts          # ~400 lines
├── TagRepository.ts               # ~100 lines
├── LearningJourneyRepository.ts   # ~250 lines
├── UserFeatureRepository.ts       # ~300 lines
├── AuditRepository.ts             # ~280 lines
├── GithubSyncRepository.ts        # ~120 lines
├── EnrichmentRepository.ts        # ~175 lines
├── AdminRepository.ts             # ~100 lines
└── LegacyRepository.ts            # ~200 lines (deprecated)
```

**Total**: ~2,325 lines across 12 files (vs. 2,033 lines in one file)

## Best Practices

### 1. Import Only What You Need

```typescript
// ✅ Good - Clear dependencies
import { UserRepository } from './repositories';

// ❌ Avoid - Unclear what's being used
import { storage } from './storage';
```

### 2. Use Descriptive Variable Names

```typescript
// ✅ Good
const userRepo = new UserRepository();
const resourceRepo = new ResourceRepository();

// ❌ Avoid
const repo1 = new UserRepository();
const r = new ResourceRepository();
```

### 3. Handle Errors Appropriately

```typescript
const userRepo = new UserRepository();
const user = await userRepo.getUser(userId);

if (!user) {
  throw new Error('User not found');
}

// Proceed with user operations
```

### 4. Document Complex Operations

```typescript
/**
 * Approves a resource and logs the approval to audit trail
 * @throws {Error} If resource not found or already approved
 */
export async function approveResourceWithAudit(
  resourceId: string,
  userId: string
) {
  // Implementation
}
```

### 5. Keep Repository Methods Focused

Each method should do one thing well. If a method is doing multiple unrelated operations, consider splitting it or creating a service layer.

## Future Improvements

### Potential Enhancements

1. **Service Layer**: Add service classes that orchestrate multiple repositories
2. **Caching**: Add Redis caching layer for frequently accessed data
3. **Event System**: Emit events for cross-domain operations (e.g., resource.approved)
4. **Repository Interfaces**: Define interfaces for easier testing and mocking
5. **Query Builders**: Add fluent query builders for complex filtering
6. **Soft Deletes**: Implement soft delete pattern across repositories
7. **Audit Automation**: Automatic audit logging via decorators or interceptors

### Deprecation Plan

1. **Phase 4 Complete** ✅: All consumers updated to use repositories directly
2. **Phase 5 (Current)**: Document repository pattern and benefits
3. **Future**: Consider removing `storage.ts` facade entirely once all code is migrated

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- Project Architecture: `/docs/ARCHITECTURE.md`

## Support

For questions or issues:
1. Review this documentation
2. Check existing repository implementations for patterns
3. Consult `/docs/ARCHITECTURE.md` for system architecture
4. Review `server/storage.ts` for facade pattern usage

---

**Last Updated**: 2026-02-01
**Refactor Completed**: Phase 1-4 (✅ Repository creation, facade, verification, migration)
**Current Phase**: Phase 5 (Cleanup and documentation)
