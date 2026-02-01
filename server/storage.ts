/**
 * ============================================================================
 * STORAGE FACADE - Unified Interface to Repository Layer
 * ============================================================================
 *
 * This module provides a backward-compatible facade over the domain-based
 * repository architecture. It implements the IStorage interface by delegating
 * operations to specialized repository classes.
 *
 * ARCHITECTURE:
 * - Facade Pattern: Provides a unified interface to a set of repositories
 * - Delegation: Each method delegates to the appropriate repository
 * - Backward Compatibility: Maintains the same IStorage interface
 * - Singleton: Single storage instance exported for app-wide use
 *
 * REPOSITORY MAPPING:
 * - User operations → UserRepository
 * - Resource operations → ResourceRepository
 * - Category operations → CategoryRepository
 * - Tag operations → TagRepository
 * - Learning journey operations → LearningJourneyRepository
 * - User features (favorites, bookmarks, preferences) → UserFeatureRepository
 * - Audit operations → AuditRepository
 * - GitHub sync operations → GithubSyncRepository
 * - Enrichment operations → EnrichmentRepository
 * - Admin statistics → AdminRepository
 *
 * BENEFITS:
 * - Single point of access for all data operations
 * - Maintains existing API contracts
 * - Enables gradual migration to direct repository usage
 * - Simplifies testing via repository mocking
 *
 * MIGRATION PATH:
 * New code should import repositories directly for better modularity:
 *
 * import { UserRepository } from './repositories';
 * const userRepo = new UserRepository();
 * const user = await userRepo.getUser(userId);
 *
 * This storage facade will eventually be deprecated once all consumers
 * are migrated to direct repository usage.
 *
 * See /server/repositories/README.md for detailed repository documentation.
 * ============================================================================
 */

import {
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
  type EnrichmentJob,
  type InsertEnrichmentJob,
  type EnrichmentQueueItem,
  type InsertEnrichmentQueue,
} from "@shared/schema";

import {
  UserRepository,
  ResourceRepository,
  CategoryRepository,
  TagRepository,
  LearningJourneyRepository,
  UserFeatureRepository,
  AuditRepository,
  GithubSyncRepository,
  EnrichmentRepository,
  AdminRepository,
  type AdminStats,
} from "./repositories";

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export interface ListResourceOptions {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  subcategory?: string;
  userId?: string;
  search?: string;
}

export interface ValidationStorageItem {
  type: 'awesome-lint' | 'link-check';
  result: any;
  markdown?: string;
  timestamp: string;
}

export interface ValidationResults {
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

export { AdminStats };

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

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
  getResourceByUrl(url: string): Promise<Resource | undefined>;
  getResourceCount(): Promise<number>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource>;
  updateResourceStatus(id: number, status: string, approvedBy?: string): Promise<Resource>;
  deleteResource(id: number): Promise<void>;

  // Pending resource approval
  getPendingResources(): Promise<{ resources: Resource[]; total: number }>;
  approveResource(id: number, approvedBy: string): Promise<Resource>;
  rejectResource(id: number, adminId: string, reason: string): Promise<void>;

  // Category management
  listCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  getCategoryResourceCount(categoryName: string): Promise<number>;

  // Subcategory management
  listSubcategories(categoryId?: number): Promise<Subcategory[]>;
  getSubcategory(id: number): Promise<Subcategory | undefined>;
  getSubcategoryByName(name: string, categoryId: number): Promise<Subcategory | undefined>;
  createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory>;
  updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory>;
  deleteSubcategory(id: number): Promise<void>;
  getSubcategoryResourceCount(subcategoryName: string): Promise<number>;

  // Sub-subcategory management
  listSubSubcategories(subcategoryId?: number): Promise<SubSubcategory[]>;
  getSubSubcategory(id: number): Promise<SubSubcategory | undefined>;
  getSubSubcategoryByName(name: string, subcategoryId: number): Promise<SubSubcategory | undefined>;
  createSubSubcategory(subSubcategory: InsertSubSubcategory): Promise<SubSubcategory>;
  updateSubSubcategory(id: number, subSubcategory: Partial<InsertSubSubcategory>): Promise<SubSubcategory>;
  deleteSubSubcategory(id: number): Promise<void>;
  getSubSubcategoryResourceCount(subSubcategoryName: string): Promise<number>;

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
  getResourceAuditLog(resourceId: number | null, limit?: number): Promise<any[]>;

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

// ============================================================================
// STORAGE FACADE IMPLEMENTATION
// ============================================================================

/**
 * Storage facade that delegates to domain-based repositories.
 * This class implements the IStorage interface by coordinating
 * calls across multiple specialized repository classes.
 */
export class DatabaseStorage implements IStorage {
  // Repository instances
  private userRepo: UserRepository;
  private resourceRepo: ResourceRepository;
  private categoryRepo: CategoryRepository;
  private tagRepo: TagRepository;
  private learningJourneyRepo: LearningJourneyRepository;
  private userFeatureRepo: UserFeatureRepository;
  private auditRepo: AuditRepository;
  private githubSyncRepo: GithubSyncRepository;
  private enrichmentRepo: EnrichmentRepository;
  private adminRepo: AdminRepository;

  // In-memory storage for awesome list compatibility (legacy)
  private awesomeListData: any = null;

  constructor() {
    // Initialize all repository instances
    this.userRepo = new UserRepository();
    this.resourceRepo = new ResourceRepository();
    this.categoryRepo = new CategoryRepository();
    this.tagRepo = new TagRepository();
    this.learningJourneyRepo = new LearningJourneyRepository();
    this.userFeatureRepo = new UserFeatureRepository();
    this.auditRepo = new AuditRepository();
    this.githubSyncRepo = new GithubSyncRepository();
    this.enrichmentRepo = new EnrichmentRepository();
    this.adminRepo = new AdminRepository();
  }

  // ==========================================================================
  // USER OPERATIONS (delegate to UserRepository)
  // ==========================================================================

  async getUser(id: string): Promise<User | undefined> {
    return this.userRepo.getUser(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    return this.userRepo.upsertUser(user);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepo.getUserByEmail(email);
  }

  async listUsers(page: number, limit: number): Promise<{ users: User[]; total: number }> {
    return this.userRepo.listUsers(page, limit);
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    return this.userRepo.updateUserRole(userId, role);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.userRepo.getUserByUsername(username);
  }

  async createUser(user: UpsertUser): Promise<User> {
    return this.userRepo.createUser(user);
  }

  // ==========================================================================
  // RESOURCE OPERATIONS (delegate to ResourceRepository)
  // ==========================================================================

  async listResources(options: ListResourceOptions): Promise<{ resources: Resource[]; total: number }> {
    return this.resourceRepo.listResources(options);
  }

  async getResource(id: number): Promise<Resource | undefined> {
    return this.resourceRepo.getResource(id);
  }

  async getResourceByUrl(url: string): Promise<Resource | undefined> {
    return this.resourceRepo.getResourceByUrl(url);
  }

  async getResourceCount(): Promise<number> {
    return this.resourceRepo.getResourceCount();
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    return this.resourceRepo.createResource(resource);
  }

  async updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource> {
    return this.resourceRepo.updateResource(id, resource);
  }

  async updateResourceStatus(id: number, status: string, approvedBy?: string): Promise<Resource> {
    return this.resourceRepo.updateResourceStatus(id, status, approvedBy);
  }

  async deleteResource(id: number): Promise<void> {
    return this.resourceRepo.deleteResource(id);
  }

  async getPendingResources(): Promise<{ resources: Resource[]; total: number }> {
    return this.resourceRepo.getPendingResources();
  }

  async approveResource(id: number, approvedBy: string): Promise<Resource> {
    return this.resourceRepo.approveResource(id, approvedBy);
  }

  async rejectResource(id: number, adminId: string, reason: string): Promise<void> {
    return this.resourceRepo.rejectResource(id, adminId, reason);
  }

  async getAllApprovedResources(): Promise<Resource[]> {
    return this.resourceRepo.getAllApprovedResources();
  }

  // ==========================================================================
  // CATEGORY OPERATIONS (delegate to CategoryRepository)
  // ==========================================================================

  async listCategories(): Promise<Category[]> {
    return this.categoryRepo.listCategories();
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categoryRepo.getCategory(id);
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    return this.categoryRepo.getCategoryByName(name);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return this.categoryRepo.getCategoryBySlug(slug);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    return this.categoryRepo.createCategory(category);
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    return this.categoryRepo.updateCategory(id, category);
  }

  async deleteCategory(id: number): Promise<void> {
    return this.categoryRepo.deleteCategory(id);
  }

  async getCategoryResourceCount(categoryName: string): Promise<number> {
    return this.categoryRepo.getCategoryResourceCount(categoryName);
  }

  async listSubcategories(categoryId?: number): Promise<Subcategory[]> {
    return this.categoryRepo.listSubcategories(categoryId);
  }

  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    return this.categoryRepo.getSubcategory(id);
  }

  async getSubcategoryByName(name: string, categoryId: number): Promise<Subcategory | undefined> {
    return this.categoryRepo.getSubcategoryByName(name, categoryId);
  }

  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    return this.categoryRepo.createSubcategory(subcategory);
  }

  async updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory> {
    return this.categoryRepo.updateSubcategory(id, subcategory);
  }

  async deleteSubcategory(id: number): Promise<void> {
    return this.categoryRepo.deleteSubcategory(id);
  }

  async getSubcategoryResourceCount(subcategoryName: string): Promise<number> {
    return this.categoryRepo.getSubcategoryResourceCount(subcategoryName);
  }

  async listSubSubcategories(subcategoryId?: number): Promise<SubSubcategory[]> {
    return this.categoryRepo.listSubSubcategories(subcategoryId);
  }

  async getSubSubcategory(id: number): Promise<SubSubcategory | undefined> {
    return this.categoryRepo.getSubSubcategory(id);
  }

  async getSubSubcategoryByName(name: string, subcategoryId: number): Promise<SubSubcategory | undefined> {
    return this.categoryRepo.getSubSubcategoryByName(name, subcategoryId);
  }

  async createSubSubcategory(subSubcategory: InsertSubSubcategory): Promise<SubSubcategory> {
    return this.categoryRepo.createSubSubcategory(subSubcategory);
  }

  async updateSubSubcategory(id: number, subSubcategory: Partial<InsertSubSubcategory>): Promise<SubSubcategory> {
    return this.categoryRepo.updateSubSubcategory(id, subSubcategory);
  }

  async deleteSubSubcategory(id: number): Promise<void> {
    return this.categoryRepo.deleteSubSubcategory(id);
  }

  async getSubSubcategoryResourceCount(subSubcategoryName: string): Promise<number> {
    return this.categoryRepo.getSubSubcategoryResourceCount(subSubcategoryName);
  }

  async getAwesomeListFromDatabase(): Promise<AwesomeListData> {
    return this.categoryRepo.getAwesomeListFromDatabase();
  }

  // ==========================================================================
  // TAG OPERATIONS (delegate to TagRepository)
  // ==========================================================================

  async listTags(): Promise<Tag[]> {
    return this.tagRepo.listTags();
  }

  async getTag(id: number): Promise<Tag | undefined> {
    return this.tagRepo.getTag(id);
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    return this.tagRepo.createTag(tag);
  }

  async deleteTag(id: number): Promise<void> {
    return this.tagRepo.deleteTag(id);
  }

  async addTagToResource(resourceId: number, tagId: number): Promise<void> {
    return this.tagRepo.addTagToResource(resourceId, tagId);
  }

  async removeTagFromResource(resourceId: number, tagId: number): Promise<void> {
    return this.tagRepo.removeTagFromResource(resourceId, tagId);
  }

  async getResourceTags(resourceId: number): Promise<Tag[]> {
    return this.tagRepo.getResourceTags(resourceId);
  }

  // ==========================================================================
  // LEARNING JOURNEY OPERATIONS (delegate to LearningJourneyRepository)
  // ==========================================================================

  async listLearningJourneys(category?: string): Promise<LearningJourney[]> {
    return this.learningJourneyRepo.listLearningJourneys(category);
  }

  async getLearningJourney(id: number): Promise<LearningJourney | undefined> {
    return this.learningJourneyRepo.getLearningJourney(id);
  }

  async createLearningJourney(journey: InsertLearningJourney): Promise<LearningJourney> {
    return this.learningJourneyRepo.createLearningJourney(journey);
  }

  async updateLearningJourney(id: number, journey: Partial<InsertLearningJourney>): Promise<LearningJourney> {
    return this.learningJourneyRepo.updateLearningJourney(id, journey);
  }

  async deleteLearningJourney(id: number): Promise<void> {
    return this.learningJourneyRepo.deleteLearningJourney(id);
  }

  async listJourneySteps(journeyId: number): Promise<JourneyStep[]> {
    return this.learningJourneyRepo.listJourneySteps(journeyId);
  }

  async listJourneyStepsBatch(journeyIds: number[]): Promise<Map<number, JourneyStep[]>> {
    return this.learningJourneyRepo.listJourneyStepsBatch(journeyIds);
  }

  async createJourneyStep(step: InsertJourneyStep): Promise<JourneyStep> {
    return this.learningJourneyRepo.createJourneyStep(step);
  }

  async updateJourneyStep(id: number, step: Partial<InsertJourneyStep>): Promise<JourneyStep> {
    return this.learningJourneyRepo.updateJourneyStep(id, step);
  }

  async deleteJourneyStep(id: number): Promise<void> {
    return this.learningJourneyRepo.deleteJourneyStep(id);
  }

  // ==========================================================================
  // USER FEATURE OPERATIONS (delegate to UserFeatureRepository)
  // ==========================================================================

  async addFavorite(userId: string, resourceId: number): Promise<void> {
    return this.userFeatureRepo.addFavorite(userId, resourceId);
  }

  async removeFavorite(userId: string, resourceId: number): Promise<void> {
    return this.userFeatureRepo.removeFavorite(userId, resourceId);
  }

  async getUserFavorites(userId: string): Promise<Array<Resource & { favoritedAt: Date }>> {
    return this.userFeatureRepo.getUserFavorites(userId);
  }

  async addBookmark(userId: string, resourceId: number, notes?: string): Promise<void> {
    return this.userFeatureRepo.addBookmark(userId, resourceId, notes);
  }

  async removeBookmark(userId: string, resourceId: number): Promise<void> {
    return this.userFeatureRepo.removeBookmark(userId, resourceId);
  }

  async getUserBookmarks(userId: string): Promise<Array<Resource & { notes?: string; bookmarkedAt: Date }>> {
    return this.userFeatureRepo.getUserBookmarks(userId);
  }

  async startUserJourney(userId: string, journeyId: number): Promise<UserJourneyProgress> {
    return this.userFeatureRepo.startUserJourney(userId, journeyId);
  }

  async updateUserJourneyProgress(userId: string, journeyId: number, stepId: number): Promise<UserJourneyProgress> {
    return this.userFeatureRepo.updateUserJourneyProgress(userId, journeyId, stepId);
  }

  async getUserJourneyProgress(userId: string, journeyId: number): Promise<UserJourneyProgress | undefined> {
    return this.userFeatureRepo.getUserJourneyProgress(userId, journeyId);
  }

  async listUserJourneyProgress(userId: string): Promise<UserJourneyProgress[]> {
    return this.userFeatureRepo.listUserJourneyProgress(userId);
  }

  async getUserPreferences(userId: string): Promise<any | undefined> {
    return this.userFeatureRepo.getUserPreferences(userId);
  }

  // ==========================================================================
  // AUDIT OPERATIONS (delegate to AuditRepository)
  // ==========================================================================

  async logResourceAudit(resourceId: number | null, action: string, performedBy?: string, changes?: any, notes?: string): Promise<void> {
    return this.auditRepo.logResourceAudit(resourceId, action, performedBy, changes, notes);
  }

  async getResourceAuditLog(resourceId: number | null, limit?: number): Promise<any[]> {
    return this.auditRepo.getResourceAuditLog(resourceId, limit);
  }

  async createResourceEdit(data: InsertResourceEdit): Promise<ResourceEdit> {
    return this.auditRepo.createResourceEdit(data);
  }

  async getResourceEdit(id: number): Promise<ResourceEdit | undefined> {
    return this.auditRepo.getResourceEdit(id);
  }

  async getResourceEditsByResource(resourceId: number): Promise<ResourceEdit[]> {
    return this.auditRepo.getResourceEditsByResource(resourceId);
  }

  async getResourceEditsByUser(userId: string): Promise<ResourceEdit[]> {
    return this.auditRepo.getResourceEditsByUser(userId);
  }

  async getPendingResourceEdits(): Promise<ResourceEdit[]> {
    return this.auditRepo.getPendingResourceEdits();
  }

  async approveResourceEdit(editId: number, adminId: string): Promise<void> {
    return this.auditRepo.approveResourceEdit(editId, adminId);
  }

  async rejectResourceEdit(editId: number, adminId: string, reason: string): Promise<void> {
    return this.auditRepo.rejectResourceEdit(editId, adminId, reason);
  }

  // ==========================================================================
  // GITHUB SYNC OPERATIONS (delegate to GithubSyncRepository)
  // ==========================================================================

  async addToGithubSyncQueue(item: InsertGithubSyncQueue): Promise<GithubSyncQueue> {
    return this.githubSyncRepo.addToGithubSyncQueue(item);
  }

  async getGithubSyncQueue(status?: string): Promise<GithubSyncQueue[]> {
    return this.githubSyncRepo.getGithubSyncQueue(status);
  }

  async updateGithubSyncStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    return this.githubSyncRepo.updateGithubSyncStatus(id, status, errorMessage);
  }

  async getLastSyncHistory(repositoryUrl: string, direction: 'export' | 'import'): Promise<GithubSyncHistory | undefined> {
    return this.githubSyncRepo.getLastSyncHistory(repositoryUrl, direction);
  }

  async saveSyncHistory(item: InsertGithubSyncHistory): Promise<GithubSyncHistory> {
    return this.githubSyncRepo.saveSyncHistory(item);
  }

  async getSyncHistory(repositoryUrl?: string, limit?: number): Promise<GithubSyncHistory[]> {
    return this.githubSyncRepo.getSyncHistory(repositoryUrl, limit);
  }

  // ==========================================================================
  // ENRICHMENT OPERATIONS (delegate to EnrichmentRepository)
  // ==========================================================================

  async createEnrichmentJob(data: InsertEnrichmentJob): Promise<EnrichmentJob> {
    return this.enrichmentRepo.createEnrichmentJob(data);
  }

  async getEnrichmentJob(id: number): Promise<EnrichmentJob | undefined> {
    return this.enrichmentRepo.getEnrichmentJob(id);
  }

  async listEnrichmentJobs(limit?: number): Promise<EnrichmentJob[]> {
    return this.enrichmentRepo.listEnrichmentJobs(limit);
  }

  async updateEnrichmentJob(id: number, data: Partial<EnrichmentJob>): Promise<EnrichmentJob> {
    return this.enrichmentRepo.updateEnrichmentJob(id, data);
  }

  async cancelEnrichmentJob(id: number): Promise<void> {
    return this.enrichmentRepo.cancelEnrichmentJob(id);
  }

  async createEnrichmentQueueItem(data: InsertEnrichmentQueue): Promise<EnrichmentQueueItem> {
    return this.enrichmentRepo.createEnrichmentQueueItem(data);
  }

  async getEnrichmentQueueItemsByJob(jobId: number): Promise<EnrichmentQueueItem[]> {
    return this.enrichmentRepo.getEnrichmentQueueItemsByJob(jobId);
  }

  async getPendingEnrichmentQueueItems(jobId: number, limit?: number): Promise<EnrichmentQueueItem[]> {
    return this.enrichmentRepo.getPendingEnrichmentQueueItems(jobId, limit);
  }

  async updateEnrichmentQueueItem(id: number, data: Partial<EnrichmentQueueItem>): Promise<EnrichmentQueueItem> {
    return this.enrichmentRepo.updateEnrichmentQueueItem(id, data);
  }

  // ==========================================================================
  // ADMIN OPERATIONS (delegate to AdminRepository)
  // ==========================================================================

  async getAdminStats(): Promise<AdminStats> {
    return this.adminRepo.getAdminStats();
  }

  async storeValidationResult(result: ValidationStorageItem): Promise<void> {
    return this.adminRepo.storeValidationResult(result);
  }

  async getLatestValidationResults(): Promise<ValidationResults> {
    return this.adminRepo.getLatestValidationResults();
  }

  // ==========================================================================
  // LEGACY IN-MEMORY OPERATIONS (TO BE REMOVED)
  // ==========================================================================

  setAwesomeListData(data: any): void {
    this.awesomeListData = data;
  }

  getAwesomeListData(): any | null {
    return this.awesomeListData;
  }

  getCategories(): any[] {
    if (!this.awesomeListData) return [];
    return this.awesomeListData.categories || [];
  }

  getResources(): any[] {
    if (!this.awesomeListData) return [];
    return this.awesomeListData.resources || [];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton storage instance for app-wide use.
 * This provides backward compatibility with existing code.
 *
 * @example
 * import { storage } from './storage';
 * const user = await storage.getUser(userId);
 */
export const storage = new DatabaseStorage();
