import { sql } from 'drizzle-orm';
import { 
  pgTable, 
  text, 
  serial, 
  varchar, 
  timestamp, 
  integer, 
  boolean, 
  jsonb,
  index,
  uuid,
  unique,
  primaryKey
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth (MANDATORY)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table for Replit Auth (MANDATORY - Updated for OAuth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").default("user"), // user, admin, moderator
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Resource schema (Enhanced with status and submission tracking)
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  subSubcategory: text("sub_subcategory"),
  status: text("status").default("approved"), // pending, approved, rejected, archived
  submittedBy: varchar("submitted_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  githubSynced: boolean("github_synced").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResourceSchema = createInsertSchema(resources).pick({
  title: true,
  url: true,
  description: true,
  category: true,
  subcategory: true,
  subSubcategory: true,
  status: true,
  submittedBy: true,
});

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

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

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Subcategory schema
export const subcategories = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  categoryId: serial("category_id").references(() => categories.id),
});

export const insertSubcategorySchema = createInsertSchema(subcategories).pick({
  name: true,
  slug: true,
  categoryId: true,
});

export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type Subcategory = typeof subcategories.$inferSelect;

// Sub-subcategory schema (Level 3)
export const subSubcategories = pgTable("sub_subcategories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  subcategoryId: serial("subcategory_id").references(() => subcategories.id),
});

export const insertSubSubcategorySchema = createInsertSchema(subSubcategories).pick({
  name: true,
  slug: true,
  subcategoryId: true,
});

export type InsertSubSubcategory = z.infer<typeof insertSubSubcategorySchema>;
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

// Resource Tags (Many-to-Many)
export const resourceTags = pgTable(
  "resource_tags",
  {
    resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }),
    tagId: integer("tag_id").references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.resourceId, table.tagId] }),
  })
);

// Learning Journeys table (Enhanced from learningPaths)
export const learningJourneys = pgTable("learning_journeys", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  estimatedDuration: text("estimated_duration"),
  icon: text("icon"),
  orderIndex: integer("order_index"),
  status: text("status").default("published"), // draft, published, archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLearningJourneySchema = createInsertSchema(learningJourneys).pick({
  title: true,
  description: true,
  category: true,
  difficulty: true,
  estimatedDuration: true,
  icon: true,
  orderIndex: true,
  status: true,
});

export type InsertLearningJourney = z.infer<typeof insertLearningJourneySchema>;
export type LearningJourney = typeof learningJourneys.$inferSelect;

// Journey Steps table
export const journeySteps = pgTable("journey_steps", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").references(() => learningJourneys.id, { onDelete: "cascade" }),
  resourceId: integer("resource_id").references(() => resources.id),
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isOptional: boolean("is_optional").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

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

// User Favorites table
export const userFavorites = pgTable(
  "user_favorites",
  {
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
    resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.resourceId] }),
  })
);

// User Bookmarks table
export const userBookmarks = pgTable(
  "user_bookmarks",
  {
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
    resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.resourceId] }),
  })
);

// User Journey Progress table
export const userJourneyProgress = pgTable(
  "user_journey_progress",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
    journeyId: integer("journey_id").references(() => learningJourneys.id, { onDelete: "cascade" }),
    currentStepId: integer("current_step_id").references(() => journeySteps.id),
    completedSteps: jsonb("completed_steps").$type<number[]>().default([]),
    startedAt: timestamp("started_at").defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    userJourneyUnique: unique().on(table.userId, table.journeyId),
  })
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
  performedBy: varchar("performed_by").references(() => users.id),
  changes: jsonb("changes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResourceAuditLogSchema = createInsertSchema(resourceAuditLog).pick({
  resourceId: true,
  action: true,
  performedBy: true,
  changes: true,
  notes: true,
});

export type InsertResourceAuditLog = z.infer<typeof insertResourceAuditLogSchema>;
export type ResourceAuditLog = typeof resourceAuditLog.$inferSelect;

// GitHub Sync Queue
export const githubSyncQueue = pgTable("github_sync_queue", {
  id: serial("id").primaryKey(),
  resourceIds: jsonb("resource_ids").$type<number[]>().default([]),
  status: text("status").default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertGithubSyncQueueSchema = createInsertSchema(githubSyncQueue).pick({
  resourceIds: true,
  status: true,
  errorMessage: true,
});

export type InsertGithubSyncQueue = z.infer<typeof insertGithubSyncQueueSchema>;
export type GithubSyncQueue = typeof githubSyncQueue.$inferSelect;

// Awesome List Configuration
export const awesomeListConfig = pgTable("awesome_list_config", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  repoUrl: text("repo_url").notNull(),
  branch: text("branch").default("main"),
  githubToken: text("github_token"), // Encrypted
  autoSync: boolean("auto_sync").default(false),
  syncInterval: integer("sync_interval").default(24), // hours
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAwesomeListConfigSchema = createInsertSchema(awesomeListConfig).pick({
  userId: true,
  repoUrl: true,
  branch: true,
  githubToken: true,
  autoSync: true,
  syncInterval: true,
});

export type InsertAwesomeListConfig = z.infer<typeof insertAwesomeListConfigSchema>;
export type AwesomeListConfig = typeof awesomeListConfig.$inferSelect;

// User preferences schema for personalization
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Using session ID for anonymous users
  preferredCategories: jsonb("preferred_categories").$type<string[]>().default([]),
  skillLevel: text("skill_level").notNull().default("beginner"), // beginner, intermediate, advanced
  learningGoals: jsonb("learning_goals").$type<string[]>().default([]),
  preferredResourceTypes: jsonb("preferred_resource_types").$type<string[]>().default([]),
  timeCommitment: text("time_commitment").default("flexible"), // daily, weekly, flexible
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
export const userInteractions = pgTable("user_interactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  resourceId: text("resource_id").notNull(),
  interactionType: text("interaction_type").notNull(), // view, click, bookmark, rate, complete
  interactionValue: integer("interaction_value"), // rating (1-5) or time spent
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserInteractionSchema = createInsertSchema(userInteractions).pick({
  userId: true,
  resourceId: true,
  interactionType: true,
  interactionValue: true,
  metadata: true,
});

export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;
export type UserInteraction = typeof userInteractions.$inferSelect;

// Learning paths schema
export const learningPaths = pgTable("learning_paths", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  skillLevel: text("skill_level").notNull(),
  estimatedHours: integer("estimated_hours").default(0),
  resourceIds: jsonb("resource_ids").$type<string[]>().default([]),
  prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
  learningObjectives: jsonb("learning_objectives").$type<string[]>().default([]),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLearningPathSchema = createInsertSchema(learningPaths).pick({
  title: true,
  description: true,
  category: true,
  skillLevel: true,
  estimatedHours: true,
  resourceIds: true,
  prerequisites: true,
  learningObjectives: true,
  isPublic: true,
});

export type InsertLearningPath = z.infer<typeof insertLearningPathSchema>;
export type LearningPath = typeof learningPaths.$inferSelect;

// User learning path progress
export const userLearningProgress = pgTable("user_learning_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  learningPathId: integer("learning_path_id").references(() => learningPaths.id),
  completedResourceIds: jsonb("completed_resource_ids").$type<string[]>().default([]),
  currentResourceId: text("current_resource_id"),
  progressPercentage: integer("progress_percentage").default(0),
  startedAt: timestamp("started_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertUserLearningProgressSchema = createInsertSchema(userLearningProgress).pick({
  userId: true,
  learningPathId: true,
  completedResourceIds: true,
  currentResourceId: true,
  progressPercentage: true,
});

export type InsertUserLearningProgress = z.infer<typeof insertUserLearningProgressSchema>;
export type UserLearningProgress = typeof userLearningProgress.$inferSelect;
