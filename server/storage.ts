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
  resourceAuditLog,
  githubSyncQueue,
  awesomeListConfig,
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
  type ResourceAuditLog,
  type InsertResourceAuditLog,
  type GithubSyncQueue,
  type InsertGithubSyncQueue,
  type AwesomeListConfig,
  type InsertAwesomeListConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, asc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserRole(userId: string, role: string): Promise<User>;
  
  // Resource operations
  getResources(filters?: { status?: string; category?: string; subcategory?: string }): Promise<Resource[]>;
  getResource(id: number): Promise<Resource | undefined>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource>;
  deleteResource(id: number): Promise<void>;
  approveResource(id: number, approvedBy: string): Promise<Resource>;
  rejectResource(id: number, rejectedBy: string, reason?: string): Promise<Resource>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Subcategory operations
  getSubcategories(categoryId?: number): Promise<Subcategory[]>;
  createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory>;
  
  // Sub-subcategory operations
  getSubSubcategories(subcategoryId?: number): Promise<SubSubcategory[]>;
  createSubSubcategory(subSubcategory: InsertSubSubcategory): Promise<SubSubcategory>;
  
  // Tag operations
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  addResourceTag(resourceId: number, tagId: number): Promise<void>;
  removeResourceTag(resourceId: number, tagId: number): Promise<void>;
  getResourceTags(resourceId: number): Promise<Tag[]>;
  
  // Learning Journey operations
  getJourneys(filters?: { category?: string; difficulty?: string }): Promise<LearningJourney[]>;
  getJourney(id: number): Promise<LearningJourney | undefined>;
  createJourney(journey: InsertLearningJourney): Promise<LearningJourney>;
  updateJourney(id: number, journey: Partial<InsertLearningJourney>): Promise<LearningJourney>;
  deleteJourney(id: number): Promise<void>;
  
  // Journey Step operations
  getJourneySteps(journeyId: number): Promise<JourneyStep[]>;
  createJourneyStep(step: InsertJourneyStep): Promise<JourneyStep>;
  updateJourneyStep(id: number, step: Partial<InsertJourneyStep>): Promise<JourneyStep>;
  deleteJourneyStep(id: number): Promise<void>;
  
  // User Favorites operations
  addFavorite(userId: string, resourceId: number): Promise<void>;
  removeFavorite(userId: string, resourceId: number): Promise<void>;
  getUserFavorites(userId: string): Promise<Resource[]>;
  isFavorite(userId: string, resourceId: number): Promise<boolean>;
  
  // User Bookmarks operations
  addBookmark(userId: string, resourceId: number, notes?: string): Promise<void>;
  removeBookmark(userId: string, resourceId: number): Promise<void>;
  updateBookmarkNotes(userId: string, resourceId: number, notes: string): Promise<void>;
  getUserBookmarks(userId: string): Promise<Array<Resource & { notes?: string }>>;
  isBookmarked(userId: string, resourceId: number): Promise<boolean>;
  
  // User Journey Progress operations
  startJourney(userId: string, journeyId: number): Promise<UserJourneyProgress>;
  updateJourneyProgress(userId: string, journeyId: number, progress: Partial<InsertUserJourneyProgress>): Promise<UserJourneyProgress>;
  completeJourneyStep(userId: string, journeyId: number, stepId: number): Promise<UserJourneyProgress>;
  getUserJourneyProgress(userId: string, journeyId?: number): Promise<UserJourneyProgress[]>;
  
  // Audit Log operations
  createAuditLog(log: InsertResourceAuditLog): Promise<ResourceAuditLog>;
  getAuditLogs(resourceId?: number): Promise<ResourceAuditLog[]>;
  
  // GitHub Sync operations
  createSyncQueueItem(item: InsertGithubSyncQueue): Promise<GithubSyncQueue>;
  getNextSyncQueueItem(): Promise<GithubSyncQueue | undefined>;
  updateSyncQueueItem(id: number, status: string, errorMessage?: string): Promise<GithubSyncQueue>;
  
  // Awesome List Config operations
  getAwesomeListConfig(userId: string): Promise<AwesomeListConfig | undefined>;
  upsertAwesomeListConfig(config: InsertAwesomeListConfig): Promise<AwesomeListConfig>;
  
  // Legacy methods for backward compatibility
  setAwesomeListData(data: any): void;
  getAwesomeListData(): any | null;
}

export class DatabaseStorage implements IStorage {
  private awesomeListData: any = null;
  
  // User operations (MANDATORY for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email!, email));
    return user;
  }
  
  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // Resource operations
  async getResources(filters?: { status?: string; category?: string; subcategory?: string }): Promise<Resource[]> {
    let query = db.select().from(resources);
    
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(resources.status, filters.status));
      if (filters.category) conditions.push(eq(resources.category, filters.category));
      if (filters.subcategory) conditions.push(eq(resources.subcategory!, filters.subcategory));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }
    
    return await query;
  }
  
  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }
  
  async createResource(resource: InsertResource): Promise<Resource> {
    const [newResource] = await db.insert(resources).values(resource).returning();
    return newResource;
  }
  
  async updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource> {
    const [updated] = await db
      .update(resources)
      .set({ ...resource, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();
    return updated;
  }
  
  async deleteResource(id: number): Promise<void> {
    await db.delete(resources).where(eq(resources.id, id));
  }
  
  async approveResource(id: number, approvedBy: string): Promise<Resource> {
    const [resource] = await db
      .update(resources)
      .set({
        status: "approved",
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))
      .returning();
    
    await this.createAuditLog({
      resourceId: id,
      action: "approved",
      performedBy: approvedBy,
    });
    
    return resource;
  }
  
  async rejectResource(id: number, rejectedBy: string, reason?: string): Promise<Resource> {
    const [resource] = await db
      .update(resources)
      .set({
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))
      .returning();
    
    await this.createAuditLog({
      resourceId: id,
      action: "rejected",
      performedBy: rejectedBy,
      notes: reason,
    });
    
    return resource;
  }
  
  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }
  
  // Subcategory operations
  async getSubcategories(categoryId?: number): Promise<Subcategory[]> {
    if (categoryId) {
      return await db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId));
    }
    return await db.select().from(subcategories);
  }
  
  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    const [newSubcategory] = await db.insert(subcategories).values(subcategory).returning();
    return newSubcategory;
  }
  
  // Sub-subcategory operations
  async getSubSubcategories(subcategoryId?: number): Promise<SubSubcategory[]> {
    if (subcategoryId) {
      return await db.select().from(subSubcategories).where(eq(subSubcategories.subcategoryId, subcategoryId));
    }
    return await db.select().from(subSubcategories);
  }
  
  async createSubSubcategory(subSubcategory: InsertSubSubcategory): Promise<SubSubcategory> {
    const [newSubSubcategory] = await db.insert(subSubcategories).values(subSubcategory).returning();
    return newSubSubcategory;
  }
  
  // Tag operations
  async getTags(): Promise<Tag[]> {
    return await db.select().from(tags);
  }
  
  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db.insert(tags).values(tag).returning();
    return newTag;
  }
  
  async addResourceTag(resourceId: number, tagId: number): Promise<void> {
    await db.insert(resourceTags).values({ resourceId, tagId }).onConflictDoNothing();
  }
  
  async removeResourceTag(resourceId: number, tagId: number): Promise<void> {
    await db.delete(resourceTags).where(
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
  
  // Learning Journey operations
  async getJourneys(filters?: { category?: string; difficulty?: string }): Promise<LearningJourney[]> {
    let query = db.select().from(learningJourneys);
    
    if (filters) {
      const conditions = [];
      if (filters.category) conditions.push(eq(learningJourneys.category, filters.category));
      if (filters.difficulty) conditions.push(eq(learningJourneys.difficulty, filters.difficulty));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }
    
    return await query;
  }
  
  async getJourney(id: number): Promise<LearningJourney | undefined> {
    const [journey] = await db.select().from(learningJourneys).where(eq(learningJourneys.id, id));
    return journey;
  }
  
  async createJourney(journey: InsertLearningJourney): Promise<LearningJourney> {
    const [newJourney] = await db.insert(learningJourneys).values(journey).returning();
    return newJourney;
  }
  
  async updateJourney(id: number, journey: Partial<InsertLearningJourney>): Promise<LearningJourney> {
    const [updated] = await db
      .update(learningJourneys)
      .set({ ...journey, updatedAt: new Date() })
      .where(eq(learningJourneys.id, id))
      .returning();
    return updated;
  }
  
  async deleteJourney(id: number): Promise<void> {
    await db.delete(learningJourneys).where(eq(learningJourneys.id, id));
  }
  
  // Journey Step operations
  async getJourneySteps(journeyId: number): Promise<JourneyStep[]> {
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
    const [updated] = await db
      .update(journeySteps)
      .set(step)
      .where(eq(journeySteps.id, id))
      .returning();
    return updated;
  }
  
  async deleteJourneyStep(id: number): Promise<void> {
    await db.delete(journeySteps).where(eq(journeySteps.id, id));
  }
  
  // User Favorites operations
  async addFavorite(userId: string, resourceId: number): Promise<void> {
    await db.insert(userFavorites).values({ userId, resourceId }).onConflictDoNothing();
  }
  
  async removeFavorite(userId: string, resourceId: number): Promise<void> {
    await db.delete(userFavorites).where(
      and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.resourceId, resourceId)
      )
    );
  }
  
  async getUserFavorites(userId: string): Promise<Resource[]> {
    const result = await db
      .select({ resource: resources })
      .from(userFavorites)
      .innerJoin(resources, eq(userFavorites.resourceId, resources.id))
      .where(eq(userFavorites.userId, userId));
    
    return result.map(r => r.resource);
  }
  
  async isFavorite(userId: string, resourceId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.resourceId, resourceId)
        )
      );
    return !!favorite;
  }
  
  // User Bookmarks operations
  async addBookmark(userId: string, resourceId: number, notes?: string): Promise<void> {
    await db.insert(userBookmarks).values({ userId, resourceId, notes }).onConflictDoNothing();
  }
  
  async removeBookmark(userId: string, resourceId: number): Promise<void> {
    await db.delete(userBookmarks).where(
      and(
        eq(userBookmarks.userId, userId),
        eq(userBookmarks.resourceId, resourceId)
      )
    );
  }
  
  async updateBookmarkNotes(userId: string, resourceId: number, notes: string): Promise<void> {
    await db
      .update(userBookmarks)
      .set({ notes })
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId)
        )
      );
  }
  
  async getUserBookmarks(userId: string): Promise<Array<Resource & { notes?: string }>> {
    const result = await db
      .select({ resource: resources, notes: userBookmarks.notes })
      .from(userBookmarks)
      .innerJoin(resources, eq(userBookmarks.resourceId, resources.id))
      .where(eq(userBookmarks.userId, userId));
    
    return result.map(r => ({ ...r.resource, notes: r.notes || undefined }));
  }
  
  async isBookmarked(userId: string, resourceId: number): Promise<boolean> {
    const [bookmark] = await db
      .select()
      .from(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId)
        )
      );
    return !!bookmark;
  }
  
  // User Journey Progress operations
  async startJourney(userId: string, journeyId: number): Promise<UserJourneyProgress> {
    const [progress] = await db
      .insert(userJourneyProgress)
      .values({ userId, journeyId })
      .onConflictDoUpdate({
        target: [userJourneyProgress.userId, userJourneyProgress.journeyId],
        set: {
          lastAccessedAt: new Date(),
        },
      })
      .returning();
    return progress;
  }
  
  async updateJourneyProgress(
    userId: string,
    journeyId: number,
    progress: Partial<InsertUserJourneyProgress>
  ): Promise<UserJourneyProgress> {
    const [updated] = await db
      .update(userJourneyProgress)
      .set({ ...progress, lastAccessedAt: new Date() })
      .where(
        and(
          eq(userJourneyProgress.userId, userId),
          eq(userJourneyProgress.journeyId, journeyId)
        )
      )
      .returning();
    return updated;
  }
  
  async completeJourneyStep(userId: string, journeyId: number, stepId: number): Promise<UserJourneyProgress> {
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
    
    const [updated] = await db
      .update(userJourneyProgress)
      .set({
        completedSteps,
        currentStepId: stepId,
        lastAccessedAt: new Date(),
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
  
  async getUserJourneyProgress(userId: string, journeyId?: number): Promise<UserJourneyProgress[]> {
    if (journeyId) {
      return await db
        .select()
        .from(userJourneyProgress)
        .where(
          and(
            eq(userJourneyProgress.userId, userId),
            eq(userJourneyProgress.journeyId, journeyId)
          )
        );
    }
    return await db.select().from(userJourneyProgress).where(eq(userJourneyProgress.userId, userId));
  }
  
  // Audit Log operations
  async createAuditLog(log: InsertResourceAuditLog): Promise<ResourceAuditLog> {
    const [newLog] = await db.insert(resourceAuditLog).values(log).returning();
    return newLog;
  }
  
  async getAuditLogs(resourceId?: number): Promise<ResourceAuditLog[]> {
    if (resourceId) {
      return await db
        .select()
        .from(resourceAuditLog)
        .where(eq(resourceAuditLog.resourceId, resourceId))
        .orderBy(desc(resourceAuditLog.createdAt));
    }
    return await db.select().from(resourceAuditLog).orderBy(desc(resourceAuditLog.createdAt));
  }
  
  // GitHub Sync operations
  async createSyncQueueItem(item: InsertGithubSyncQueue): Promise<GithubSyncQueue> {
    const [newItem] = await db.insert(githubSyncQueue).values(item).returning();
    return newItem;
  }
  
  async getNextSyncQueueItem(): Promise<GithubSyncQueue | undefined> {
    const [item] = await db
      .select()
      .from(githubSyncQueue)
      .where(eq(githubSyncQueue.status, "pending"))
      .orderBy(asc(githubSyncQueue.createdAt))
      .limit(1);
    return item;
  }
  
  async updateSyncQueueItem(id: number, status: string, errorMessage?: string): Promise<GithubSyncQueue> {
    const [updated] = await db
      .update(githubSyncQueue)
      .set({
        status,
        errorMessage,
        processedAt: status !== "pending" ? new Date() : undefined,
      })
      .where(eq(githubSyncQueue.id, id))
      .returning();
    return updated;
  }
  
  // Awesome List Config operations
  async getAwesomeListConfig(userId: string): Promise<AwesomeListConfig | undefined> {
    const [config] = await db
      .select()
      .from(awesomeListConfig)
      .where(eq(awesomeListConfig.userId!, userId));
    return config;
  }
  
  async upsertAwesomeListConfig(config: InsertAwesomeListConfig): Promise<AwesomeListConfig> {
    const [upserted] = await db
      .insert(awesomeListConfig)
      .values(config)
      .onConflictDoUpdate({
        target: awesomeListConfig.userId!,
        set: {
          ...config,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upserted;
  }
  
  // Legacy methods for backward compatibility
  setAwesomeListData(data: any): void {
    this.awesomeListData = data;
  }
  
  getAwesomeListData(): any | null {
    return this.awesomeListData;
  }
}

// Use database storage for production
export const storage = new DatabaseStorage();