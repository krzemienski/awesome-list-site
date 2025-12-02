import { sql } from 'drizzle-orm';
import { pgTable, text, serial, varchar, timestamp, integer, boolean, jsonb, index, uuid, primaryKey, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for Replit Auth and local authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"), // For local authentication (hashed with bcrypt)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").default("user"), // user, admin, moderator
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Resource schema (enhanced with approval workflow)
export const resources = pgTable(
  "resources",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    subSubcategory: text("sub_subcategory"),
    status: text("status").default("approved"), // pending, approved, rejected, archived
    submittedBy: varchar("submitted_by").references(() => users.id, { onDelete: "cascade" }),
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    githubSynced: boolean("github_synced").default(false),
    lastSyncedAt: timestamp("last_synced_at"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_resources_status").on(table.status),
    index("idx_resources_status_category").on(table.status, table.category),
    index("idx_resources_category").on(table.category),
  ]
);

export const insertResourceSchema = createInsertSchema(resources).pick({
  title: true,
  url: true,
  description: true,
  category: true,
  subcategory: true,
  subSubcategory: true,
  status: true,
  submittedBy: true,
  metadata: true,
});

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

// Resource Edits - Suggest edit workflow
export const resourceEdits = pgTable(
  "resource_edits",
  {
    id: serial("id").primaryKey(),
    resourceId: integer("resource_id").references(() => resources.id).notNull(),
    submittedBy: varchar("submitted_by").references(() => users.id).notNull(),
    status: text("status").$type<"pending" | "approved" | "rejected">().default("pending").notNull(),
    
    originalResourceUpdatedAt: timestamp("original_resource_updated_at").notNull(),
    
    proposedChanges: jsonb("proposed_changes").$type<Record<string, { old: any; new: any }>>().notNull(),
    proposedData: jsonb("proposed_data").$type<Partial<Resource>>().notNull(),
    
    claudeMetadata: jsonb("claude_metadata").$type<{
      suggestedTitle?: string;
      suggestedDescription?: string;
      suggestedTags?: string[];
      suggestedCategory?: string;
      suggestedSubcategory?: string;
      confidence?: number;
      keyTopics?: string[];
    }>(),
    claudeAnalyzedAt: timestamp("claude_analyzed_at"),
    
    handledBy: varchar("handled_by").references(() => users.id),
    handledAt: timestamp("handled_at"),
    rejectionReason: text("rejection_reason"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_resource_edits_resource_id").on(table.resourceId),
    index("idx_resource_edits_status").on(table.status),
    index("idx_resource_edits_submitted_by").on(table.submittedBy),
  ]
);

export const insertResourceEditSchema = createInsertSchema(resourceEdits).pick({
  resourceId: true,
  submittedBy: true,
  status: true,
  originalResourceUpdatedAt: true,
  proposedChanges: true,
  proposedData: true,
  claudeMetadata: true,
  claudeAnalyzedAt: true,
});

export type InsertResourceEdit = z.infer<typeof insertResourceEditSchema>;
export type ResourceEdit = typeof resourceEdits.$inferSelect;

// Category schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  slug: true,
});

export const updateCategorySchema = insertCategorySchema.partial();

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Subcategory schema
export const subcategories = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }),
});

export const insertSubcategorySchema = createInsertSchema(subcategories).pick({
  name: true,
  slug: true,
  categoryId: true,
});

export const updateSubcategorySchema = insertSubcategorySchema.partial();

export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type UpdateSubcategory = z.infer<typeof updateSubcategorySchema>;
export type Subcategory = typeof subcategories.$inferSelect;

// Sub-subcategory schema (Level 3)
export const subSubcategories = pgTable("sub_subcategories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  subcategoryId: integer("subcategory_id").references(() => subcategories.id, { onDelete: "cascade" }),
});

export const insertSubSubcategorySchema = createInsertSchema(subSubcategories).pick({
  name: true,
  slug: true,
  subcategoryId: true,
});

export const updateSubSubcategorySchema = insertSubSubcategorySchema.partial();

export type InsertSubSubcategory = z.infer<typeof insertSubSubcategorySchema>;
export type UpdateSubSubcategory = z.infer<typeof updateSubSubcategorySchema>;
export type SubSubcategory = typeof subSubcategories.$inferSelect;

// AwesomeList schema
export const awesomeLists = pgTable("awesome_lists", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  repoUrl: text("repo_url").notNull(),
  sourceUrl: text("source_url").notNull(),
});

export const insertAwesomeListSchema = createInsertSchema(awesomeLists).pick({
  title: true,
  description: true,
  repoUrl: true,
  sourceUrl: true,
});

export type InsertAwesomeList = z.infer<typeof insertAwesomeListSchema>;
export type AwesomeList = typeof awesomeLists.$inferSelect;

// Tags table
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTagSchema = createInsertSchema(tags).pick({
  name: true,
  slug: true,
});

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

// Resource Tags (many-to-many)
export const resourceTags = pgTable(
  "resource_tags",
  {
    resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }).notNull(),
    tagId: integer("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.resourceId, table.tagId] }),
  })
);

// Learning Journeys (structured learning paths)
export const learningJourneys = pgTable("learning_journeys", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").default("beginner"), // beginner, intermediate, advanced
  estimatedDuration: text("estimated_duration"), // e.g., "20 hours"
  icon: text("icon"),
  orderIndex: integer("order_index"),
  category: text("category").notNull(),
  status: text("status").default("published"), // draft, published, archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLearningJourneySchema = createInsertSchema(learningJourneys).pick({
  title: true,
  description: true,
  difficulty: true,
  estimatedDuration: true,
  icon: true,
  orderIndex: true,
  category: true,
  status: true,
});

export type InsertLearningJourney = z.infer<typeof insertLearningJourneySchema>;
export type LearningJourney = typeof learningJourneys.$inferSelect;

// Journey Steps
export const journeySteps = pgTable(
  "journey_steps",
  {
    id: serial("id").primaryKey(),
    journeyId: integer("journey_id").references(() => learningJourneys.id, { onDelete: "cascade" }).notNull(),
    resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    isOptional: boolean("is_optional").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_journey_steps_journey_id").on(table.journeyId),
    index("idx_journey_steps_resource_id").on(table.resourceId),
  ]
);

export const insertJourneyStepSchema = createInsertSchema(journeySteps).pick({
  journeyId: true,
  resourceId: true,
  stepNumber: true,
  title: true,
  description: true,
  isOptional: true,
});

export type InsertJourneyStep = z.infer<typeof insertJourneyStepSchema>;
export type JourneyStep = typeof journeySteps.$inferSelect;

// User Favorites
export const userFavorites = pgTable(
  "user_favorites",
  {
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.resourceId] }),
  })
);

// User Bookmarks
export const userBookmarks = pgTable(
  "user_bookmarks",
  {
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.resourceId] }),
  })
);

// User Journey Progress
export const userJourneyProgress = pgTable(
  "user_journey_progress",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    journeyId: integer("journey_id").references(() => learningJourneys.id, { onDelete: "cascade" }).notNull(),
    currentStepId: integer("current_step_id").references(() => journeySteps.id),
    completedSteps: jsonb("completed_steps").$type<number[]>().default([]),
    startedAt: timestamp("started_at").defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    unique("user_journey_unique").on(table.userId, table.journeyId),
    index("idx_user_journey_progress_user_id").on(table.userId),
    index("idx_user_journey_progress_journey_id").on(table.journeyId),
  ]
);

export const insertUserJourneyProgressSchema = createInsertSchema(userJourneyProgress).pick({
  userId: true,
  journeyId: true,
  currentStepId: true,
  completedSteps: true,
});

export type InsertUserJourneyProgress = z.infer<typeof insertUserJourneyProgressSchema>;
export type UserJourneyProgress = typeof userJourneyProgress.$inferSelect;

// Resource Audit Log
export const resourceAuditLog = pgTable("resource_audit_log", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // created, updated, approved, rejected, synced
  performedBy: varchar("performed_by").references(() => users.id, { onDelete: "cascade" }),
  changes: jsonb("changes").$type<Record<string, any>>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// GitHub Sync Queue
export const githubSyncQueue = pgTable(
  "github_sync_queue",
  {
    id: serial("id").primaryKey(),
    repositoryUrl: text("repository_url").notNull(),
    branch: text("branch").default("main"),
    resourceIds: jsonb("resource_ids").$type<number[]>().default([]),
    action: text("action").notNull(), // import, export
    status: text("status").default("pending"), // pending, processing, completed, failed
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    createdAt: timestamp("created_at").defaultNow(),
    processedAt: timestamp("processed_at"),
  },
  (table) => [
    index("idx_github_sync_queue_status").on(table.status),
  ]
);

export const insertGithubSyncQueueSchema = createInsertSchema(githubSyncQueue).pick({
  repositoryUrl: true,
  branch: true,
  resourceIds: true,
  action: true,
  status: true,
  metadata: true,
});

export type InsertGithubSyncQueue = z.infer<typeof insertGithubSyncQueueSchema>;
export type GithubSyncQueue = typeof githubSyncQueue.$inferSelect;

// User preferences schema for personalization
export const userPreferences = pgTable(
  "user_preferences",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    preferredCategories: jsonb("preferred_categories").$type<string[]>().default([]),
    skillLevel: text("skill_level").notNull().default("beginner"), // beginner, intermediate, advanced
    learningGoals: jsonb("learning_goals").$type<string[]>().default([]),
    preferredResourceTypes: jsonb("preferred_resource_types").$type<string[]>().default([]),
    timeCommitment: text("time_commitment").default("flexible"), // daily, weekly, flexible
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_user_preferences_user_id").on(table.userId),
    unique("user_preferences_user_id_unique").on(table.userId),
  ]
);

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  preferredCategories: true,
  skillLevel: true,
  learningGoals: true,
  preferredResourceTypes: true,
  timeCommitment: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// User interactions schema for tracking behavior
export const userInteractions = pgTable(
  "user_interactions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }).notNull(),
    interactionType: text("interaction_type").notNull(), // view, click, bookmark, rate, complete
    interactionValue: integer("interaction_value"), // rating (1-5) or time spent
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    timestamp: timestamp("timestamp").defaultNow(),
  },
  (table) => [
    index("idx_user_interactions_user_id").on(table.userId),
    index("idx_user_interactions_resource_id").on(table.resourceId),
    index("idx_user_interactions_type").on(table.interactionType),
  ]
);

export const insertUserInteractionSchema = createInsertSchema(userInteractions).pick({
  userId: true,
  resourceId: true,
  interactionType: true,
  interactionValue: true,
  metadata: true,
});

export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;
export type UserInteraction = typeof userInteractions.$inferSelect;

// GitHub Sync History - Track version changes and diffs
export const githubSyncHistory = pgTable(
  "github_sync_history",
  {
    id: serial("id").primaryKey(),
    repositoryUrl: text("repository_url").notNull(),
    direction: text("direction").notNull(), // export, import
    commitSha: text("commit_sha"),
    commitMessage: text("commit_message"),
    commitUrl: text("commit_url"),
    resourcesAdded: integer("resources_added").default(0),
    resourcesUpdated: integer("resources_updated").default(0),
    resourcesRemoved: integer("resources_removed").default(0),
    totalResources: integer("total_resources").default(0),
    performedBy: varchar("performed_by").references(() => users.id),
    snapshot: jsonb("snapshot").$type<Record<string, any>>().default({}), // Resource snapshot
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_github_sync_history_repo").on(table.repositoryUrl),
    index("idx_github_sync_history_direction").on(table.direction),
  ]
);

export const insertGithubSyncHistorySchema = createInsertSchema(githubSyncHistory).pick({
  repositoryUrl: true,
  direction: true,
  commitSha: true,
  commitMessage: true,
  commitUrl: true,
  resourcesAdded: true,
  resourcesUpdated: true,
  resourcesRemoved: true,
  totalResources: true,
  performedBy: true,
  snapshot: true,
  metadata: true,
});

export type InsertGithubSyncHistory = z.infer<typeof insertGithubSyncHistorySchema>;
export type GithubSyncHistory = typeof githubSyncHistory.$inferSelect;

// Enrichment Jobs - Batch AI metadata enrichment tracking
export const enrichmentJobs = pgTable(
  "enrichment_jobs",
  {
    id: serial("id").primaryKey(),
    status: text("status").notNull().default("pending"), // pending, processing, completed, failed, cancelled
    filter: text("filter").default("all"), // all, unenriched
    batchSize: integer("batch_size").default(10),
    totalResources: integer("total_resources").default(0),
    processedResources: integer("processed_resources").default(0),
    successfulResources: integer("successful_resources").default(0),
    failedResources: integer("failed_resources").default(0),
    skippedResources: integer("skipped_resources").default(0),
    processedResourceIds: jsonb("processed_resource_ids").$type<number[]>().default([]),
    failedResourceIds: jsonb("failed_resource_ids").$type<number[]>().default([]),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    startedBy: varchar("started_by").references(() => users.id),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_enrichment_jobs_status").on(table.status),
    index("idx_enrichment_jobs_started_by").on(table.startedBy),
  ]
);

export const insertEnrichmentJobSchema = createInsertSchema(enrichmentJobs).pick({
  filter: true,
  batchSize: true,
  startedBy: true,
});

export type InsertEnrichmentJob = z.infer<typeof insertEnrichmentJobSchema>;
export type EnrichmentJob = typeof enrichmentJobs.$inferSelect;

// Enrichment Queue - Individual resource enrichment tasks
export const enrichmentQueue = pgTable(
  "enrichment_queue",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id").references(() => enrichmentJobs.id, { onDelete: "cascade" }).notNull(),
    resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }).notNull(),
    status: text("status").notNull().default("pending"), // pending, processing, completed, failed, skipped
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    errorMessage: text("error_message"),
    aiMetadata: jsonb("ai_metadata").$type<{
      suggestedTitle?: string;
      suggestedDescription?: string;
      suggestedTags?: string[];
      suggestedCategory?: string;
      suggestedSubcategory?: string;
      confidence?: number;
      keyTopics?: string[];
    }>(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_enrichment_queue_job_id").on(table.jobId),
    index("idx_enrichment_queue_resource_id").on(table.resourceId),
    index("idx_enrichment_queue_status").on(table.status),
  ]
);

export const insertEnrichmentQueueSchema = createInsertSchema(enrichmentQueue).pick({
  jobId: true,
  resourceId: true,
  status: true,
  retryCount: true,
  maxRetries: true,
});

export type InsertEnrichmentQueue = z.infer<typeof insertEnrichmentQueueSchema>;
export type EnrichmentQueueItem = typeof enrichmentQueue.$inferSelect;
