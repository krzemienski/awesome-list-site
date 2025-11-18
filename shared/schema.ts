import { pgTable, text, serial, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Resource schema
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  subSubcategory: text("sub_subcategory"),
});

export const insertResourceSchema = createInsertSchema(resources).pick({
  title: true,
  url: true,
  description: true,
  category: true,
  subcategory: true,
  subSubcategory: true,
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

// Extend the user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
