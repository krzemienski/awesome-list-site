import {
  users,
  resources,
  categories,
  subcategories,
  subSubcategories,
  tags,
  resourceTags,
  learningJourneys,
  journeySteps,
  userFavorites,
  userBookmarks,
  userJourneyProgress,
  userPreferences,
  resourceAuditLog,
  githubSyncQueue,
  githubSyncHistory,
  resourceEdits,
  enrichmentJobs,
  enrichmentQueue,
  type User,
  type UpsertUser,
  type Resource,
  type InsertResource,
  type Category,
  type InsertCategory,
  type Subcategory,
  type InsertSubcategory,
  type SubSubcategory,
  type InsertSubSubcategory,
  type Tag,
  type InsertTag,
  type LearningJourney,
  type InsertLearningJourney,
  type JourneyStep,
  type InsertJourneyStep,
  type UserJourneyProgress,
  type InsertUserJourneyProgress,
  type GithubSyncQueue,
  type InsertGithubSyncQueue,
  type GithubSyncHistory,
  type InsertGithubSyncHistory,
  type ResourceEdit,
  type InsertResourceEdit,
  type UserPreferences,
  type EnrichmentJob,
  type InsertEnrichmentJob,
  type EnrichmentQueueItem,
  type InsertEnrichmentQueue,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, asc, inArray, like, or, isNull, isNotNull } from "drizzle-orm";
import { mapCategoryName } from "@shared/categoryMapping";

// Interface for storage operations
export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations
  getUserByEmail(email: string): Promise<User | undefined>;
  listUsers(page: number, limit: number): Promise<{ users: User[]; total: number }>;
  updateUserRole(userId: string, role: string): Promise<User>;
  
  // Resource CRUD operations
  listResources(options: ListResourceOptions): Promise<{ resources: Resource[]; total: number }>;
  getResource(id: number): Promise<Resource | undefined>;
  getResourceCount(): Promise<number>; // Get total count directly from database
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource>;
  updateResourceStatus(id: number, status: string, approvedBy?: string): Promise<Resource>;
  deleteResource(id: number): Promise<void>;
  
  // Category management
  listCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  
  // Subcategory management
  listSubcategories(categoryId?: number): Promise<Subcategory[]>;
  getSubcategory(id: number): Promise<Subcategory | undefined>;
  createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory>;
  updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory>;
  deleteSubcategory(id: number): Promise<void>;
  
  // Sub-subcategory management
  listSubSubcategories(subcategoryId?: number): Promise<SubSubcategory[]>;
  getSubSubcategory(id: number): Promise<SubSubcategory | undefined>;
  createSubSubcategory(subSubcategory: InsertSubSubcategory): Promise<SubSubcategory>;
  updateSubSubcategory(id: number, subSubcategory: Partial<InsertSubSubcategory>): Promise<SubSubcategory>;
  deleteSubSubcategory(id: number): Promise<void>;
  
  // Tag management
  listTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: number): Promise<void>;
  
  // Resource Tags
  addTagToResource(resourceId: number, tagId: number): Promise<void>;
  removeTagFromResource(resourceId: number, tagId: number): Promise<void>;
  getResourceTags(resourceId: number): Promise<Tag[]>;
  
  // Learning Journeys
  listLearningJourneys(category?: string): Promise<LearningJourney[]>;
  getLearningJourney(id: number): Promise<LearningJourney | undefined>;
  createLearningJourney(journey: InsertLearningJourney): Promise<LearningJourney>;
  updateLearningJourney(id: number, journey: Partial<InsertLearningJourney>): Promise<LearningJourney>;
  deleteLearningJourney(id: number): Promise<void>;
  
  // Journey Steps
  listJourneySteps(journeyId: number): Promise<JourneyStep[]>;
  listJourneyStepsBatch(journeyIds: number[]): Promise<Map<number, JourneyStep[]>>;
  createJourneyStep(step: InsertJourneyStep): Promise<JourneyStep>;
  updateJourneyStep(id: number, step: Partial<InsertJourneyStep>): Promise<JourneyStep>;
  deleteJourneyStep(id: number): Promise<void>;
  
  // User Favorites
  addFavorite(userId: string, resourceId: number): Promise<void>;
  removeFavorite(userId: string, resourceId: number): Promise<void>;
  getUserFavorites(userId: string): Promise<Array<Resource & { favoritedAt: Date }>>;
  
  // User Bookmarks
  addBookmark(userId: string, resourceId: number, notes?: string): Promise<void>;
  removeBookmark(userId: string, resourceId: number): Promise<void>;
  getUserBookmarks(userId: string): Promise<Array<Resource & { notes?: string; bookmarkedAt: Date }>>;
  
  // User Journey Progress
  startUserJourney(userId: string, journeyId: number): Promise<UserJourneyProgress>;
  updateUserJourneyProgress(userId: string, journeyId: number, stepId: number): Promise<UserJourneyProgress>;
  getUserJourneyProgress(userId: string, journeyId: number): Promise<UserJourneyProgress | undefined>;
  listUserJourneyProgress(userId: string): Promise<UserJourneyProgress[]>;
  
  // Resource Audit Log
  logResourceAudit(resourceId: number | null, action: string, performedBy?: string, changes?: any, notes?: string): Promise<void>;
  getResourceAuditLog(resourceId: number, limit?: number): Promise<any[]>;
  
  // Resource Edits
  createResourceEdit(data: InsertResourceEdit): Promise<ResourceEdit>;
  getResourceEdit(id: number): Promise<ResourceEdit | undefined>;
  getResourceEditsByResource(resourceId: number): Promise<ResourceEdit[]>;
  getResourceEditsByUser(userId: string): Promise<ResourceEdit[]>;
  getPendingResourceEdits(): Promise<ResourceEdit[]>;
  approveResourceEdit(editId: number, adminId: string): Promise<void>;
  rejectResourceEdit(editId: number, adminId: string, reason: string): Promise<void>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<any | undefined>;
  
  // GitHub Sync Queue
  addToGithubSyncQueue(item: InsertGithubSyncQueue): Promise<GithubSyncQueue>;
  getGithubSyncQueue(status?: string): Promise<GithubSyncQueue[]>;
  updateGithubSyncStatus(id: number, status: string, errorMessage?: string): Promise<void>;
  
  // GitHub Sync History
  getLastSyncHistory(repositoryUrl: string, direction: 'export' | 'import'): Promise<GithubSyncHistory | undefined>;
  saveSyncHistory(item: InsertGithubSyncHistory): Promise<GithubSyncHistory>;
  getSyncHistory(repositoryUrl?: string, limit?: number): Promise<GithubSyncHistory[]>;
  
  // Admin Statistics
  getAdminStats(): Promise<AdminStats>;
  
  // Validation and Export
  getAllApprovedResources(): Promise<Resource[]>;
  storeValidationResult(result: ValidationStorageItem): Promise<void>;
  getLatestValidationResults(): Promise<ValidationResults>;
  
  // Enrichment Jobs
  createEnrichmentJob(data: InsertEnrichmentJob): Promise<EnrichmentJob>;
  getEnrichmentJob(id: number): Promise<EnrichmentJob | undefined>;
  listEnrichmentJobs(limit?: number): Promise<EnrichmentJob[]>;
  updateEnrichmentJob(id: number, data: Partial<EnrichmentJob>): Promise<EnrichmentJob>;
  cancelEnrichmentJob(id: number): Promise<void>;
  
  // Enrichment Queue
  createEnrichmentQueueItem(data: InsertEnrichmentQueue): Promise<EnrichmentQueueItem>;
  getEnrichmentQueueItemsByJob(jobId: number): Promise<EnrichmentQueueItem[]>;
  getPendingEnrichmentQueueItems(jobId: number, limit?: number): Promise<EnrichmentQueueItem[]>;
  updateEnrichmentQueueItem(id: number, data: Partial<EnrichmentQueueItem>): Promise<EnrichmentQueueItem>;
  
  // Database-driven awesome list hierarchy
  getAwesomeListFromDatabase(): Promise<AwesomeListData>;
  
  // Legacy methods for awesome list (in-memory) - TO BE REMOVED
  setAwesomeListData(data: any): void;
  getAwesomeListData(): any | null;
  getCategories(): any[];
  getResources(): any[];
  
  // Legacy methods - kept for backward compatibility
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
}

// Types
interface ListResourceOptions {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  subcategory?: string;
  userId?: string;
  search?: string;
}

interface AdminStats {
  totalUsers: number;
  totalResources: number;
  pendingResources: number;
  totalCategories: number;
  totalJourneys: number;
  activeUsers: number;
}

interface ValidationStorageItem {
  type: 'awesome-lint' | 'link-check';
  result: any;
  markdown?: string;
  timestamp: string;
}

interface ValidationResults {
  awesomeLint?: any;
  linkCheck?: any;
  lastUpdated?: string;
}

// Hierarchical category structure for frontend
export interface HierarchicalSubSubcategory {
  name: string;
  slug: string;
  resources: Resource[];
}

export interface HierarchicalSubcategory {
  name: string;
  slug: string;
  resources: Resource[];
  subSubcategories: HierarchicalSubSubcategory[];
}

export interface HierarchicalCategory {
  name: string;
  slug: string;
  resources: Resource[];
  subcategories: HierarchicalSubcategory[];
}

export interface AwesomeListData {
  title: string;
  description: string;
  repoUrl: string;
  resources: Resource[];
  categories: HierarchicalCategory[];
}

export class DatabaseStorage implements IStorage {
  // In-memory storage for awesome list compatibility
  private awesomeListData: any = null;

  // User operations (MANDATORY for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if this is the first user (bootstrap admin)
    const [userCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    
    const isFirstUser = userCountResult.count === 0;
    
    // If this is the first user, make them an admin
    const userDataWithRole = {
      ...userData,
      role: isFirstUser ? 'admin' : (userData.role || 'user'),
    };
    
    const [user] = await db
      .insert(users)
      .values(userDataWithRole)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // Log when first admin is created
    if (isFirstUser) {
      const displayName = user.email || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) || user.id;
      console.log(`🔐 First user created as admin: ${displayName}`);
    }
    
    return user;
  }
  
  // Legacy methods - kept for backward compatibility
  async getUserByUsername(username: string): Promise<User | undefined> {
    // Legacy method - not used with OAuth
    return undefined;
  }
  
  async createUser(userData: UpsertUser): Promise<User> {
    // Legacy method - use upsertUser instead for OAuth
    return this.upsertUser(userData);
  }
  
  // Additional user operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async listUsers(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    
    const userList = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    
    return { users: userList, total: totalResult.count };
  }
  
  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // Resource CRUD operations
  async listResources(options: ListResourceOptions): Promise<{ resources: Resource[]; total: number }> {
    const { page = 1, limit = 20, status, category, subcategory, userId, search } = options;
    const offset = (page - 1) * limit;
    
    let query = db.select().from(resources);
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(resources);
    
    const conditions = [];
    
    if (status) {
      conditions.push(eq(resources.status, status));
    }
    
    if (category) {
      conditions.push(eq(resources.category, category));
    }
    
    if (subcategory) {
      conditions.push(eq(resources.subcategory, subcategory));
    }
    
    if (userId) {
      conditions.push(eq(resources.submittedBy, userId));
    }
    
    if (search) {
      conditions.push(
        or(
          like(resources.title, `%${search}%`),
          like(resources.description, `%${search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    
    const [totalResult] = await countQuery;
    
    const resourceList = await query
      .orderBy(desc(resources.createdAt))
      .limit(limit)
      .offset(offset);
    
    return { resources: resourceList, total: totalResult.count };
  }
  
  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }
  
  async getResourceCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(resources);
    return result.count;
  }
  
  async createResource(resource: InsertResource): Promise<Resource> {
    const [newResource] = await db.insert(resources).values(resource).returning();
    
    // Log the creation
    await this.logResourceAudit(newResource.id, 'created', resource.submittedBy ?? undefined);
    
    return newResource;
  }
  
  async updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource> {
    const [updatedResource] = await db
      .update(resources)
      .set({ ...resource, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();
    
    // Log the update
    await this.logResourceAudit(id, 'updated', resource.submittedBy ?? undefined, resource);
    
    return updatedResource;
  }
  
  async updateResourceStatus(id: number, status: string, approvedBy?: string): Promise<Resource> {
    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }
    
    const [updatedResource] = await db
      .update(resources)
      .set(updateData)
      .where(eq(resources.id, id))
      .returning();
    
    // Log the status change
    await this.logResourceAudit(id, status, approvedBy, { status });
    
    return updatedResource;
  }
  
  async deleteResource(id: number): Promise<void> {
    await db.delete(resources).where(eq(resources.id, id));
  }
  
  // Category management
  async listCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }
  
  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }
  
  // Subcategory management
  async listSubcategories(categoryId?: number): Promise<Subcategory[]> {
    let query = db.select().from(subcategories);
    
    if (categoryId) {
      query = query.where(eq(subcategories.categoryId, categoryId)) as any;
    }
    
    return await query.orderBy(asc(subcategories.name));
  }
  
  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    const [subcategory] = await db.select().from(subcategories).where(eq(subcategories.id, id));
    return subcategory;
  }
  
  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    const [newSubcategory] = await db.insert(subcategories).values(subcategory).returning();
    return newSubcategory;
  }
  
  async updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory> {
    const [updatedSubcategory] = await db
      .update(subcategories)
      .set(subcategory)
      .where(eq(subcategories.id, id))
      .returning();
    return updatedSubcategory;
  }
  
  async deleteSubcategory(id: number): Promise<void> {
    await db.delete(subcategories).where(eq(subcategories.id, id));
  }
  
  // Sub-subcategory management
  async listSubSubcategories(subcategoryId?: number): Promise<SubSubcategory[]> {
    let query = db.select().from(subSubcategories);
    
    if (subcategoryId) {
      query = query.where(eq(subSubcategories.subcategoryId, subcategoryId)) as any;
    }
    
    return await query.orderBy(asc(subSubcategories.name));
  }
  
  async getSubSubcategory(id: number): Promise<SubSubcategory | undefined> {
    const [subSubcategory] = await db.select().from(subSubcategories).where(eq(subSubcategories.id, id));
    return subSubcategory;
  }
  
  async createSubSubcategory(subSubcategory: InsertSubSubcategory): Promise<SubSubcategory> {
    const [newSubSubcategory] = await db.insert(subSubcategories).values(subSubcategory).returning();
    return newSubSubcategory;
  }
  
  async updateSubSubcategory(id: number, subSubcategory: Partial<InsertSubSubcategory>): Promise<SubSubcategory> {
    const [updatedSubSubcategory] = await db
      .update(subSubcategories)
      .set(subSubcategory)
      .where(eq(subSubcategories.id, id))
      .returning();
    return updatedSubSubcategory;
  }
  
  async deleteSubSubcategory(id: number): Promise<void> {
    await db.delete(subSubcategories).where(eq(subSubcategories.id, id));
  }
  
  // Tag management
  async listTags(): Promise<Tag[]> {
    return await db.select().from(tags).orderBy(asc(tags.name));
  }
  
  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }
  
  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db.insert(tags).values(tag).returning();
    return newTag;
  }
  
  async deleteTag(id: number): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }
  
  // Resource Tags
  async addTagToResource(resourceId: number, tagId: number): Promise<void> {
    await db
      .insert(resourceTags)
      .values({ resourceId, tagId })
      .onConflictDoNothing();
  }
  
  async removeTagFromResource(resourceId: number, tagId: number): Promise<void> {
    await db
      .delete(resourceTags)
      .where(
        and(
          eq(resourceTags.resourceId, resourceId),
          eq(resourceTags.tagId, tagId)
        )
      );
  }
  
  async getResourceTags(resourceId: number): Promise<Tag[]> {
    const result = await db
      .select({ tag: tags })
      .from(resourceTags)
      .innerJoin(tags, eq(resourceTags.tagId, tags.id))
      .where(eq(resourceTags.resourceId, resourceId));
    
    return result.map(r => r.tag);
  }
  
  // Learning Journeys
  async listLearningJourneys(category?: string): Promise<LearningJourney[]> {
    let query = db.select().from(learningJourneys);
    
    if (category) {
      query = query.where(eq(learningJourneys.category, category)) as any;
    }
    
    return await query
      .where(eq(learningJourneys.status, 'published'))
      .orderBy(asc(learningJourneys.orderIndex));
  }
  
  async getLearningJourney(id: number): Promise<LearningJourney | undefined> {
    const [journey] = await db.select().from(learningJourneys).where(eq(learningJourneys.id, id));
    return journey;
  }
  
  async createLearningJourney(journey: InsertLearningJourney): Promise<LearningJourney> {
    const [newJourney] = await db.insert(learningJourneys).values(journey).returning();
    return newJourney;
  }
  
  async updateLearningJourney(id: number, journey: Partial<InsertLearningJourney>): Promise<LearningJourney> {
    const [updatedJourney] = await db
      .update(learningJourneys)
      .set({ ...journey, updatedAt: new Date() })
      .where(eq(learningJourneys.id, id))
      .returning();
    return updatedJourney;
  }
  
  async deleteLearningJourney(id: number): Promise<void> {
    await db.delete(learningJourneys).where(eq(learningJourneys.id, id));
  }
  
  // Journey Steps
  async listJourneySteps(journeyId: number): Promise<JourneyStep[]> {
    return await db
      .select()
      .from(journeySteps)
      .where(eq(journeySteps.journeyId, journeyId))
      .orderBy(asc(journeySteps.stepNumber));
  }
  
  async createJourneyStep(step: InsertJourneyStep): Promise<JourneyStep> {
    const [newStep] = await db.insert(journeySteps).values(step).returning();
    return newStep;
  }
  
  async updateJourneyStep(id: number, step: Partial<InsertJourneyStep>): Promise<JourneyStep> {
    const [updatedStep] = await db
      .update(journeySteps)
      .set(step)
      .where(eq(journeySteps.id, id))
      .returning();
    return updatedStep;
  }
  
  async deleteJourneyStep(id: number): Promise<void> {
    await db.delete(journeySteps).where(eq(journeySteps.id, id));
  }
  
  async listJourneyStepsBatch(journeyIds: number[]): Promise<Map<number, JourneyStep[]>> {
    if (journeyIds.length === 0) {
      return new Map();
    }
    
    const steps = await db
      .select()
      .from(journeySteps)
      .where(inArray(journeySteps.journeyId, journeyIds))
      .orderBy(asc(journeySteps.stepNumber));
    
    // Group steps by journeyId
    const grouped = new Map<number, JourneyStep[]>();
    for (const step of steps) {
      if (!grouped.has(step.journeyId)) {
        grouped.set(step.journeyId, []);
      }
      grouped.get(step.journeyId)!.push(step);
    }
    
    return grouped;
  }
  
  // User Favorites
  async addFavorite(userId: string, resourceId: number): Promise<void> {
    await db
      .insert(userFavorites)
      .values({ userId, resourceId })
      .onConflictDoNothing();
  }
  
  async removeFavorite(userId: string, resourceId: number): Promise<void> {
    await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.resourceId, resourceId)
        )
      );
  }
  
  async getUserFavorites(userId: string): Promise<Array<Resource & { favoritedAt: Date }>> {
    const result = await db
      .select({
        resource: resources,
        favoritedAt: userFavorites.createdAt
      })
      .from(userFavorites)
      .innerJoin(resources, eq(userFavorites.resourceId, resources.id))
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.createdAt));
    
    return result.map(r => ({ 
      ...r.resource, 
      favoritedAt: r.favoritedAt! 
    }));
  }
  
  // User Bookmarks
  async addBookmark(userId: string, resourceId: number, notes?: string): Promise<void> {
    await db
      .insert(userBookmarks)
      .values({ userId, resourceId, notes })
      .onConflictDoUpdate({
        target: [userBookmarks.userId, userBookmarks.resourceId],
        set: { notes, createdAt: new Date() }
      });
  }
  
  async removeBookmark(userId: string, resourceId: number): Promise<void> {
    await db
      .delete(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId)
        )
      );
  }
  
  async getUserBookmarks(userId: string): Promise<Array<Resource & { notes?: string; bookmarkedAt: Date }>> {
    const result = await db
      .select({
        resource: resources,
        notes: userBookmarks.notes,
        bookmarkedAt: userBookmarks.createdAt
      })
      .from(userBookmarks)
      .innerJoin(resources, eq(userBookmarks.resourceId, resources.id))
      .where(eq(userBookmarks.userId, userId))
      .orderBy(desc(userBookmarks.createdAt));
    
    return result.map(r => ({ 
      ...r.resource, 
      notes: r.notes || undefined,
      bookmarkedAt: r.bookmarkedAt!
    }));
  }
  
  // User Journey Progress
  async startUserJourney(userId: string, journeyId: number): Promise<UserJourneyProgress> {
    const [progress] = await db
      .insert(userJourneyProgress)
      .values({
        userId,
        journeyId,
        completedSteps: []
      })
      .onConflictDoUpdate({
        target: [userJourneyProgress.userId, userJourneyProgress.journeyId],
        set: { lastAccessedAt: new Date() }
      })
      .returning();
    
    return progress;
  }
  
  async updateUserJourneyProgress(userId: string, journeyId: number, stepId: number): Promise<UserJourneyProgress> {
    // First get current progress
    const [current] = await db
      .select()
      .from(userJourneyProgress)
      .where(
        and(
          eq(userJourneyProgress.userId, userId),
          eq(userJourneyProgress.journeyId, journeyId)
        )
      );
    
    const completedSteps = current?.completedSteps || [];
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }
    
    // Check if all steps are completed
    const allSteps = await this.listJourneySteps(journeyId);
    const allCompleted = allSteps.every(step => 
      step.isOptional || completedSteps.includes(step.id)
    );
    
    const [updated] = await db
      .update(userJourneyProgress)
      .set({
        currentStepId: stepId,
        completedSteps,
        lastAccessedAt: new Date(),
        completedAt: allCompleted ? new Date() : null
      })
      .where(
        and(
          eq(userJourneyProgress.userId, userId),
          eq(userJourneyProgress.journeyId, journeyId)
        )
      )
      .returning();
    
    return updated;
  }
  
  async getUserJourneyProgress(userId: string, journeyId: number): Promise<UserJourneyProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userJourneyProgress)
      .where(
        and(
          eq(userJourneyProgress.userId, userId),
          eq(userJourneyProgress.journeyId, journeyId)
        )
      );
    
    // Normalize completedSteps to numbers
    if (progress && progress.completedSteps) {
      progress.completedSteps = progress.completedSteps.map(id => Number(id));
    }
    
    return progress;
  }
  
  async listUserJourneyProgress(userId: string): Promise<UserJourneyProgress[]> {
    const progressList = await db
      .select()
      .from(userJourneyProgress)
      .where(eq(userJourneyProgress.userId, userId))
      .orderBy(desc(userJourneyProgress.lastAccessedAt));
    
    // Normalize completedSteps to numbers for each progress entry
    return progressList.map(progress => ({
      ...progress,
      completedSteps: progress.completedSteps ? progress.completedSteps.map(id => Number(id)) : []
    }));
  }
  
  // Resource Audit Log
  async logResourceAudit(
    resourceId: number | null,
    action: string,
    performedBy?: string,
    changes?: any,
    notes?: string
  ): Promise<void> {
    await db.insert(resourceAuditLog).values({
      resourceId,
      action,
      performedBy,
      changes,
      notes
    });
  }
  
  async getResourceAuditLog(resourceId: number, limit = 50): Promise<any[]> {
    return await db
      .select()
      .from(resourceAuditLog)
      .where(eq(resourceAuditLog.resourceId, resourceId))
      .orderBy(desc(resourceAuditLog.createdAt))
      .limit(limit);
  }
  
  // Resource Edits
  async createResourceEdit(data: InsertResourceEdit): Promise<ResourceEdit> {
    const [edit] = await db.insert(resourceEdits).values([data as any]).returning();
    
    await this.logResourceAudit(
      data.resourceId,
      'edit_suggested',
      data.submittedBy,
      { proposedChanges: data.proposedChanges },
      'User submitted edit suggestion'
    );
    
    return edit;
  }
  
  async getResourceEdit(id: number): Promise<ResourceEdit | undefined> {
    const [edit] = await db.select().from(resourceEdits).where(eq(resourceEdits.id, id));
    return edit;
  }
  
  async getResourceEditsByResource(resourceId: number): Promise<ResourceEdit[]> {
    return await db
      .select()
      .from(resourceEdits)
      .where(eq(resourceEdits.resourceId, resourceId))
      .orderBy(desc(resourceEdits.createdAt));
  }
  
  async getPendingResourceEdits(): Promise<ResourceEdit[]> {
    return await db
      .select()
      .from(resourceEdits)
      .where(eq(resourceEdits.status, 'pending'))
      .orderBy(asc(resourceEdits.createdAt));
  }
  
  async approveResourceEdit(editId: number, adminId: string): Promise<void> {
    const edit = await this.getResourceEdit(editId);
    if (!edit || edit.status !== 'pending') {
      throw new Error('Edit not found or already processed');
    }
    
    // SECURITY FIX: Re-fetch CURRENT resource state (not cached) (ISSUE 2)
    const currentResource = await this.getResource(edit.resourceId);
    if (!currentResource) {
      throw new Error('Resource not found');
    }
    
    // CONFLICT CHECK: Compare timestamps
    const editTimestamp = new Date(edit.originalResourceUpdatedAt).getTime();
    const currentTimestamp = new Date(currentResource.updatedAt ? currentResource.updatedAt : new Date()).getTime();
    
    if (editTimestamp < currentTimestamp) {
      // Resource was modified after edit was created - REJECT merge
      throw new Error('Merge conflict detected: Resource was modified after this edit was submitted. Please review and resubmit.');
    }
    
    // SAFE MERGE: Only update whitelisted fields from proposedData
    const EDITABLE_FIELDS = ['title', 'description', 'url', 'tags', 'category', 'subcategory', 'subSubcategory'];
    const updates: Record<string, any> = {};
    
    const proposedData = edit.proposedData as any;
    for (const field of EDITABLE_FIELDS) {
      if (proposedData && field in proposedData) {
        updates[field] = proposedData[field];
      }
    }
    
    // Apply vetted updates only
    await this.updateResource(edit.resourceId, updates);
    
    await db
      .update(resourceEdits)
      .set({
        status: 'approved',
        handledBy: adminId,
        handledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(resourceEdits.id, editId));
    
    await this.logResourceAudit(
      edit.resourceId,
      'edit_approved',
      adminId,
      { changes: edit.proposedChanges },
      `Edit #${editId} approved and merged`
    );
  }
  
  async rejectResourceEdit(editId: number, adminId: string, reason: string): Promise<void> {
    const edit = await this.getResourceEdit(editId);
    if (!edit) {
      throw new Error('Edit not found');
    }
    
    if (edit.status !== 'pending') {
      throw new Error('Edit is not pending');
    }
    
    if (!reason || reason.trim().length < 10) {
      throw new Error('Rejection reason must be at least 10 characters');
    }
    
    await db
      .update(resourceEdits)
      .set({
        status: 'rejected',
        handledBy: adminId,
        handledAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(resourceEdits.id, editId));
    
    await this.logResourceAudit(
      edit.resourceId,
      'edit_rejected',
      adminId,
      { reason },
      `Edit #${editId} rejected: ${reason}`
    );
  }

  async getResourceEditsByUser(userId: string): Promise<ResourceEdit[]> {
    return await db
      .select()
      .from(resourceEdits)
      .where(eq(resourceEdits.submittedBy, userId))
      .orderBy(desc(resourceEdits.createdAt));
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs;
  }
  
  // GitHub Sync Queue
  async addToGithubSyncQueue(item: InsertGithubSyncQueue): Promise<GithubSyncQueue> {
    const [queueItem] = await db.insert(githubSyncQueue).values(item as any).returning();
    return queueItem;
  }
  
  async getGithubSyncQueue(status?: string): Promise<GithubSyncQueue[]> {
    let query = db.select().from(githubSyncQueue);
    
    if (status) {
      query = query.where(eq(githubSyncQueue.status, status)) as any;
    }
    
    return await query.orderBy(asc(githubSyncQueue.createdAt));
  }
  
  async updateGithubSyncStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(githubSyncQueue)
      .set({
        status,
        errorMessage,
        processedAt: status === 'completed' || status === 'failed' ? new Date() : null
      })
      .where(eq(githubSyncQueue.id, id));
  }
  
  // GitHub Sync History
  async getLastSyncHistory(repositoryUrl: string, direction: 'export' | 'import'): Promise<GithubSyncHistory | undefined> {
    const results = await db
      .select()
      .from(githubSyncHistory)
      .where(
        and(
          eq(githubSyncHistory.repositoryUrl, repositoryUrl),
          eq(githubSyncHistory.direction, direction)
        )
      )
      .orderBy(desc(githubSyncHistory.createdAt))
      .limit(1);
    
    return results[0];
  }
  
  async saveSyncHistory(item: InsertGithubSyncHistory): Promise<GithubSyncHistory> {
    const [historyItem] = await db.insert(githubSyncHistory).values(item).returning();
    return historyItem;
  }
  
  async getSyncHistory(repositoryUrl?: string, limit: number = 20): Promise<GithubSyncHistory[]> {
    let query = db.select().from(githubSyncHistory);
    
    if (repositoryUrl) {
      query = query.where(eq(githubSyncHistory.repositoryUrl, repositoryUrl)) as any;
    }
    
    return await query
      .orderBy(desc(githubSyncHistory.createdAt))
      .limit(limit);
  }
  

  // Database-driven awesome list hierarchy - builds complete category tree from database
  async getAwesomeListFromDatabase(): Promise<AwesomeListData> {
    // 1. Get all approved resources
    const allResources = await db
      .select()
      .from(resources)
      .where(eq(resources.status, 'approved'))
      .orderBy(resources.category, resources.subcategory, resources.subSubcategory, resources.title);
    
    // 2. Get all categories, subcategories, and sub-subcategories from database
    const dbCategories = await db.select().from(categories).orderBy(asc(categories.name));
    const dbSubcategories = await db.select().from(subcategories).orderBy(asc(subcategories.name));
    const dbSubSubcategories = await db.select().from(subSubcategories).orderBy(asc(subSubcategories.name));
    
    // 3. Group resources by category hierarchy with normalized category names
    const resourcesByCategory = new Map<string, Resource[]>();
    const resourcesBySubcategory = new Map<string, Resource[]>();
    const resourcesBySubSubcategory = new Map<string, Resource[]>();
    
    allResources.forEach(resource => {
      // Normalize and group by category
      const mappedCategory = mapCategoryName(resource.category);
      if (mappedCategory) {
        if (!resourcesByCategory.has(mappedCategory)) {
          resourcesByCategory.set(mappedCategory, []);
        }
        resourcesByCategory.get(mappedCategory)!.push(resource);
      }
      
      // By subcategory (use as-is)
      if (resource.subcategory) {
        if (!resourcesBySubcategory.has(resource.subcategory)) {
          resourcesBySubcategory.set(resource.subcategory, []);
        }
        resourcesBySubcategory.get(resource.subcategory)!.push(resource);
      }
      
      // By sub-subcategory (use as-is)
      if (resource.subSubcategory) {
        if (!resourcesBySubSubcategory.has(resource.subSubcategory)) {
          resourcesBySubSubcategory.set(resource.subSubcategory, []);
        }
        resourcesBySubSubcategory.get(resource.subSubcategory)!.push(resource);
      }
    });
    
    // 4. Build hierarchical structure
    const hierarchicalCategories: HierarchicalCategory[] = [];
    
    for (const dbCategory of dbCategories) {
      // Get subcategories for this category
      const catSubcategories = dbSubcategories.filter(sub => sub.categoryId === dbCategory.id);
      
      const hierarchicalSubcategories: HierarchicalSubcategory[] = [];
      
      for (const dbSubcat of catSubcategories) {
        // Get sub-subcategories for this subcategory
        const subcatSubSubcategories = dbSubSubcategories.filter(
          subSub => subSub.subcategoryId === dbSubcat.id
        );
        
        const hierarchicalSubSubcategories: HierarchicalSubSubcategory[] = subcatSubSubcategories.map(subSub => ({
          name: subSub.name,
          slug: subSub.slug,
          resources: resourcesBySubSubcategory.get(subSub.name) || []
        }));
        
        hierarchicalSubcategories.push({
          name: dbSubcat.name,
          slug: dbSubcat.slug,
          resources: resourcesBySubcategory.get(dbSubcat.name) || [],
          subSubcategories: hierarchicalSubSubcategories
        });
      }
      
      hierarchicalCategories.push({
        name: dbCategory.name,
        slug: dbCategory.slug,
        resources: resourcesByCategory.get(dbCategory.name) || [],
        subcategories: hierarchicalSubcategories
      });
    }
    
    return {
      title: "Awesome Video",
      description: "A curated list of awesome video frameworks, libraries, and software for video processing, streaming, and manipulation",
      repoUrl: "https://github.com/krzemienski/awesome-video",
      resources: allResources,
      categories: hierarchicalCategories
    };
  }
  
  // Admin Statistics
  async getAdminStats(): Promise<AdminStats> {
    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    
    const [resourceCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources);
    
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.status, 'pending'));
    
    const [categoryCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories);
    
    const [journeyCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(learningJourneys);
    
    // Active users (those who logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [activeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.updatedAt} > ${thirtyDaysAgo}`);
    
    return {
      totalUsers: userCount.count,
      totalResources: resourceCount.count,
      pendingResources: pendingCount.count,
      totalCategories: categoryCount.count,
      totalJourneys: journeyCount.count,
      activeUsers: activeCount.count
    };
  }
  
  // Validation and Export implementations
  async getAllApprovedResources(): Promise<Resource[]> {
    return await db
      .select()
      .from(resources)
      .where(eq(resources.status, 'approved'))
      .orderBy(resources.category, resources.subcategory, resources.title);
  }
  
  private validationResults: Map<string, ValidationStorageItem> = new Map();
  
  async storeValidationResult(result: ValidationStorageItem): Promise<void> {
    this.validationResults.set(result.type, result);
  }
  
  async getLatestValidationResults(): Promise<ValidationResults> {
    const awesomeLint = this.validationResults.get('awesome-lint');
    const linkCheck = this.validationResults.get('link-check');
    
    return {
      awesomeLint: awesomeLint?.result,
      linkCheck: linkCheck?.result,
      lastUpdated: awesomeLint?.timestamp || linkCheck?.timestamp || undefined
    };
  }
  
  // Legacy methods for awesome list (in-memory)
  setAwesomeListData(data: any): void {
    this.awesomeListData = data;
  }

  getAwesomeListData(): any | null {
    return this.awesomeListData;
  }

  getCategories(): any[] {
    if (!this.awesomeListData) return [];
    
    const categories = new Map();
    this.awesomeListData.resources.forEach((resource: any) => {
      if (resource.category) {
        if (!categories.has(resource.category)) {
          categories.set(resource.category, {
            name: resource.category,
            slug: resource.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            resources: [],
            subcategories: new Map()
          });
        }
        
        const category = categories.get(resource.category);
        category.resources.push(resource);
        
        if (resource.subcategory) {
          if (!category.subcategories.has(resource.subcategory)) {
            category.subcategories.set(resource.subcategory, {
              name: resource.subcategory,
              slug: resource.subcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              resources: []
            });
          }
          category.subcategories.get(resource.subcategory).resources.push(resource);
        }
      }
    });
    
    return Array.from(categories.values()).map(cat => ({
      ...cat,
      subcategories: Array.from(cat.subcategories.values())
    }));
  }

  getResources(): any[] {
    return this.awesomeListData?.resources || [];
  }
  
  // Enrichment Jobs
  async createEnrichmentJob(data: InsertEnrichmentJob): Promise<EnrichmentJob> {
    const [job] = await db
      .insert(enrichmentJobs)
      .values(data)
      .returning();
    return job;
  }
  
  async getEnrichmentJob(id: number): Promise<EnrichmentJob | undefined> {
    const [job] = await db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.id, id));
    return job;
  }
  
  async listEnrichmentJobs(limit: number = 50): Promise<EnrichmentJob[]> {
    const jobs = await db
      .select()
      .from(enrichmentJobs)
      .orderBy(desc(enrichmentJobs.createdAt))
      .limit(limit);
    return jobs;
  }
  
  async updateEnrichmentJob(id: number, data: Partial<EnrichmentJob>): Promise<EnrichmentJob> {
    const [job] = await db
      .update(enrichmentJobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(enrichmentJobs.id, id))
      .returning();
    return job;
  }
  
  async cancelEnrichmentJob(id: number): Promise<void> {
    await db
      .update(enrichmentJobs)
      .set({ 
        status: 'cancelled', 
        completedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(enrichmentJobs.id, id));
  }
  
  // Enrichment Queue
  async createEnrichmentQueueItem(data: InsertEnrichmentQueue): Promise<EnrichmentQueueItem> {
    const [item] = await db
      .insert(enrichmentQueue)
      .values(data)
      .returning();
    return item;
  }
  
  async getEnrichmentQueueItemsByJob(jobId: number): Promise<EnrichmentQueueItem[]> {
    const items = await db
      .select()
      .from(enrichmentQueue)
      .where(eq(enrichmentQueue.jobId, jobId))
      .orderBy(asc(enrichmentQueue.id));
    return items;
  }
  
  async getPendingEnrichmentQueueItems(jobId: number, limit: number = 10): Promise<EnrichmentQueueItem[]> {
    const items = await db
      .select()
      .from(enrichmentQueue)
      .where(
        and(
          eq(enrichmentQueue.jobId, jobId),
          eq(enrichmentQueue.status, 'pending')
        )
      )
      .orderBy(asc(enrichmentQueue.id))
      .limit(limit);
    return items;
  }
  
  async updateEnrichmentQueueItem(id: number, data: Partial<EnrichmentQueueItem>): Promise<EnrichmentQueueItem> {
    const [item] = await db
      .update(enrichmentQueue)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(enrichmentQueue.id, id))
      .returning();
    return item;
  }
}

// For backward compatibility, export both MemStorage and DatabaseStorage
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private awesomeListData: any = null;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Legacy method - not used with OAuth
    return undefined;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    // Legacy method - use upsertUser instead for OAuth
    const user: User = {
      id: insertUser.id || String(this.currentId++),
      email: insertUser.email || null,
      password: null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async upsertUser(insertUser: UpsertUser): Promise<User> {
    const user: User = {
      id: insertUser.id || String(this.currentId++),
      email: insertUser.email || null,
      password: null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }
  
  // Stub implementations for all other methods (not used in memory mode)
  async getUserByEmail(email: string): Promise<User | undefined> { return undefined; }
  async listUsers(page: number, limit: number): Promise<{ users: User[]; total: number }> { 
    return { users: [], total: 0 }; 
  }
  async updateUserRole(userId: string, role: string): Promise<User> { 
    throw new Error("Not implemented in memory storage"); 
  }
  
  async listResources(options: ListResourceOptions): Promise<{ resources: Resource[]; total: number }> {
    return { resources: [], total: 0 };
  }
  async getResource(id: number): Promise<Resource | undefined> { return undefined; }
  async getResourceCount(): Promise<number> { return 0; }
  async createResource(resource: InsertResource): Promise<Resource> {
    throw new Error("Not implemented in memory storage");
  }
  async updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource> {
    throw new Error("Not implemented in memory storage");
  }
  async updateResourceStatus(id: number, status: string, approvedBy?: string): Promise<Resource> {
    throw new Error("Not implemented in memory storage");
  }
  async deleteResource(id: number): Promise<void> {}
  
  async listCategories(): Promise<Category[]> { return []; }
  async getCategory(id: number): Promise<Category | undefined> { return undefined; }
  async createCategory(category: InsertCategory): Promise<Category> {
    throw new Error("Not implemented in memory storage");
  }
  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    throw new Error("Not implemented in memory storage");
  }
  async deleteCategory(id: number): Promise<void> {}
  
  async listSubcategories(categoryId?: number): Promise<Subcategory[]> { return []; }
  async getSubcategory(id: number): Promise<Subcategory | undefined> { return undefined; }
  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    throw new Error("Not implemented in memory storage");
  }
  async updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory> {
    throw new Error("Not implemented in memory storage");
  }
  async deleteSubcategory(id: number): Promise<void> {}
  
  async listSubSubcategories(subcategoryId?: number): Promise<SubSubcategory[]> { return []; }
  async getSubSubcategory(id: number): Promise<SubSubcategory | undefined> { return undefined; }
  async createSubSubcategory(subSubcategory: InsertSubSubcategory): Promise<SubSubcategory> {
    throw new Error("Not implemented in memory storage");
  }
  async updateSubSubcategory(id: number, subSubcategory: Partial<InsertSubSubcategory>): Promise<SubSubcategory> {
    throw new Error("Not implemented in memory storage");
  }
  async deleteSubSubcategory(id: number): Promise<void> {}
  
  async listTags(): Promise<Tag[]> { return []; }
  async getTag(id: number): Promise<Tag | undefined> { return undefined; }
  async createTag(tag: InsertTag): Promise<Tag> {
    throw new Error("Not implemented in memory storage");
  }
  async deleteTag(id: number): Promise<void> {}
  
  async addTagToResource(resourceId: number, tagId: number): Promise<void> {}
  async removeTagFromResource(resourceId: number, tagId: number): Promise<void> {}
  async getResourceTags(resourceId: number): Promise<Tag[]> { return []; }
  
  async listLearningJourneys(category?: string): Promise<LearningJourney[]> { return []; }
  async getLearningJourney(id: number): Promise<LearningJourney | undefined> { return undefined; }
  async createLearningJourney(journey: InsertLearningJourney): Promise<LearningJourney> {
    throw new Error("Not implemented in memory storage");
  }
  async updateLearningJourney(id: number, journey: Partial<InsertLearningJourney>): Promise<LearningJourney> {
    throw new Error("Not implemented in memory storage");
  }
  async deleteLearningJourney(id: number): Promise<void> {}
  
  async listJourneySteps(journeyId: number): Promise<JourneyStep[]> { return []; }
  async listJourneyStepsBatch(journeyIds: number[]): Promise<Map<number, JourneyStep[]>> {
    return new Map();
  }
  async createJourneyStep(step: InsertJourneyStep): Promise<JourneyStep> {
    throw new Error("Not implemented in memory storage");
  }
  async updateJourneyStep(id: number, step: Partial<InsertJourneyStep>): Promise<JourneyStep> {
    throw new Error("Not implemented in memory storage");
  }
  async deleteJourneyStep(id: number): Promise<void> {}
  
  async addFavorite(userId: string, resourceId: number): Promise<void> {}
  async removeFavorite(userId: string, resourceId: number): Promise<void> {}
  async getUserFavorites(userId: string): Promise<Array<Resource & { favoritedAt: Date }>> { return []; }
  
  async addBookmark(userId: string, resourceId: number, notes?: string): Promise<void> {}
  async removeBookmark(userId: string, resourceId: number): Promise<void> {}
  async getUserBookmarks(userId: string): Promise<Array<Resource & { notes?: string; bookmarkedAt: Date }>> { return []; }
  
  async startUserJourney(userId: string, journeyId: number): Promise<UserJourneyProgress> {
    throw new Error("Not implemented in memory storage");
  }
  async updateUserJourneyProgress(userId: string, journeyId: number, stepId: number): Promise<UserJourneyProgress> {
    throw new Error("Not implemented in memory storage");
  }
  async getUserJourneyProgress(userId: string, journeyId: number): Promise<UserJourneyProgress | undefined> {
    return undefined;
  }
  async listUserJourneyProgress(userId: string): Promise<UserJourneyProgress[]> { return []; }
  
  async logResourceAudit(resourceId: number | null, action: string, performedBy?: string, changes?: any, notes?: string): Promise<void> {}
  async getResourceAuditLog(resourceId: number, limit?: number): Promise<any[]> { return []; }
  
  async createResourceEdit(data: InsertResourceEdit): Promise<ResourceEdit> {
    throw new Error("Not implemented in memory storage");
  }
  async getResourceEdit(id: number): Promise<ResourceEdit | undefined> { return undefined; }
  async getResourceEditsByResource(resourceId: number): Promise<ResourceEdit[]> { return []; }
  async getResourceEditsByUser(userId: string): Promise<ResourceEdit[]> { return []; }
  async getPendingResourceEdits(): Promise<ResourceEdit[]> { return []; }
  async approveResourceEdit(editId: number, adminId: string): Promise<void> {
    throw new Error("Not implemented in memory storage");
  }
  async rejectResourceEdit(editId: number, adminId: string, reason: string): Promise<void> {
    throw new Error("Not implemented in memory storage");
  }
  
  async getUserPreferences(userId: string): Promise<any | undefined> { return undefined; }
  
  async addToGithubSyncQueue(item: InsertGithubSyncQueue): Promise<GithubSyncQueue> {
    throw new Error("Not implemented in memory storage");
  }
  async getGithubSyncQueue(status?: string): Promise<GithubSyncQueue[]> { return []; }
  async updateGithubSyncStatus(id: number, status: string, errorMessage?: string): Promise<void> {}
  
  async getLastSyncHistory(repositoryUrl: string, direction: 'export' | 'import'): Promise<GithubSyncHistory | undefined> {
    return undefined;
  }
  async saveSyncHistory(item: InsertGithubSyncHistory): Promise<GithubSyncHistory> {
    throw new Error("Not implemented in memory storage");
  }
  
  async getSyncHistory(repositoryUrl?: string, limit: number = 20): Promise<GithubSyncHistory[]> {
    return [];
  }
  
  async getAdminStats(): Promise<AdminStats> {
    return {
      totalUsers: 0,
      totalResources: 0,
      pendingResources: 0,
      totalCategories: 0,
      totalJourneys: 0,
      activeUsers: 0
    };
  }
  
  // Validation and Export implementations
  async getAllApprovedResources(): Promise<Resource[]> {
    // Return empty array for memory storage
    return [];
  }
  
  private validationResults: Map<string, ValidationStorageItem> = new Map();
  
  async storeValidationResult(result: ValidationStorageItem): Promise<void> {
    this.validationResults.set(result.type, result);
  }
  
  async getLatestValidationResults(): Promise<ValidationResults> {
    const awesomeLint = this.validationResults.get('awesome-lint');
    const linkCheck = this.validationResults.get('link-check');
    
    return {
      awesomeLint: awesomeLint?.result,
      linkCheck: linkCheck?.result,
      lastUpdated: awesomeLint?.timestamp || linkCheck?.timestamp || undefined
    };
  }
  
  // Database-driven awesome list hierarchy - returns empty for MemStorage (not supported)
  async getAwesomeListFromDatabase(): Promise<AwesomeListData> {
    return {
      title: "Awesome Video",
      description: "A curated list of awesome video frameworks, libraries, and software",
      repoUrl: "https://github.com/krzemienski/awesome-video",
      resources: [],
      categories: []
    };
  }
  
  // Legacy methods for awesome list (in-memory) - TO BE REMOVED
  setAwesomeListData(data: any): void {
    this.awesomeListData = data;
  }

  getAwesomeListData(): any | null {
    return this.awesomeListData;
  }

  getCategories(): any[] {
    if (!this.awesomeListData) return [];
    
    const categoriesMap = new Map();
    this.awesomeListData.resources.forEach((resource: any) => {
      if (resource.category) {
        if (!categoriesMap.has(resource.category)) {
          categoriesMap.set(resource.category, {
            name: resource.category,
            slug: resource.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            resources: [],
            subcategories: new Map()
          });
        }
        
        const category = categoriesMap.get(resource.category);
        category.resources.push(resource);
        
        if (resource.subcategory) {
          if (!category.subcategories.has(resource.subcategory)) {
            category.subcategories.set(resource.subcategory, {
              name: resource.subcategory,
              slug: resource.subcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              resources: []
            });
          }
          category.subcategories.get(resource.subcategory).resources.push(resource);
        }
      }
    });
    
    return Array.from(categoriesMap.values()).map(cat => ({
      ...cat,
      subcategories: Array.from(cat.subcategories.values())
    }));
  }

  getResources(): any[] {
    return this.awesomeListData?.resources || [];
  }
  
  // Enrichment Jobs - Not implemented for MemStorage
  async createEnrichmentJob(data: InsertEnrichmentJob): Promise<EnrichmentJob> {
    throw new Error("Enrichment not implemented in memory storage");
  }
  async getEnrichmentJob(id: number): Promise<EnrichmentJob | undefined> { 
    return undefined; 
  }
  async listEnrichmentJobs(limit?: number): Promise<EnrichmentJob[]> { 
    return []; 
  }
  async updateEnrichmentJob(id: number, data: Partial<EnrichmentJob>): Promise<EnrichmentJob> {
    throw new Error("Enrichment not implemented in memory storage");
  }
  async cancelEnrichmentJob(id: number): Promise<void> {}
  
  // Enrichment Queue - Not implemented for MemStorage
  async createEnrichmentQueueItem(data: InsertEnrichmentQueue): Promise<EnrichmentQueueItem> {
    throw new Error("Enrichment not implemented in memory storage");
  }
  async getEnrichmentQueueItemsByJob(jobId: number): Promise<EnrichmentQueueItem[]> { 
    return []; 
  }
  async getPendingEnrichmentQueueItems(jobId: number, limit?: number): Promise<EnrichmentQueueItem[]> { 
    return []; 
  }
  async updateEnrichmentQueueItem(id: number, data: Partial<EnrichmentQueueItem>): Promise<EnrichmentQueueItem> {
    throw new Error("Enrichment not implemented in memory storage");
  }
}

// Use DatabaseStorage if DATABASE_URL exists, otherwise use MemStorage
export const storage: IStorage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();