import { pgTable, text, serial, varchar } from "drizzle-orm/pg-core";
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
});

export const insertResourceSchema = createInsertSchema(resources).pick({
  title: true,
  url: true,
  description: true,
  category: true,
  subcategory: true,
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
