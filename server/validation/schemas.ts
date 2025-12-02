/**
 * Comprehensive Input Validation Schemas
 *
 * This file contains Zod schemas for all POST/PUT endpoints.
 * All inputs are validated for:
 * - Required fields
 * - Field types
 * - String lengths (min/max)
 * - URL formats
 * - UUID formats
 * - Enum values
 * - Array constraints
 *
 * Security Note: These schemas provide defense-in-depth against:
 * - SQL injection (via parameterized queries + type validation)
 * - XSS (via strict type enforcement)
 * - Buffer overflow (via length limits)
 * - Mass assignment (via explicit field whitelisting)
 */

import { z } from "zod";

// ============= Common Validators =============

// UUID validation (v4 format)
export const uuidSchema = z.string().uuid("Invalid UUID format");

// URL validation with protocol enforcement
export const urlSchema = z
  .string()
  .url("Invalid URL format")
  .max(2048, "URL too long (max 2048 characters)")
  .refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    "URL must start with http:// or https://"
  );

// Safe text field (no control characters)
export const safeTextSchema = (maxLength: number, fieldName: string) =>
  z
    .string()
    .max(maxLength, `${fieldName} too long (max ${maxLength} characters)`)
    .refine(
      (text) => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text),
      `${fieldName} contains invalid control characters`
    );

// Slug validation (URL-safe identifier)
export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(100, "Slug too long (max 100 characters)")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format (use lowercase letters, numbers, and hyphens)");

// Pagination parameters
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============= Resource Schemas =============

// Status enum
export const resourceStatusSchema = z.enum(["pending", "approved", "rejected", "archived"]);

// Resource creation schema (enhanced from insertResourceSchema)
export const createResourceSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title too long (max 200 characters)")
    .trim(),
  url: urlSchema,
  description: z
    .string()
    .max(2000, "Description too long (max 2000 characters)")
    .default(""),
  category: z
    .string()
    .min(1, "Category is required")
    .max(100, "Category too long (max 100 characters)"),
  subcategory: z
    .string()
    .max(100, "Subcategory too long (max 100 characters)")
    .optional()
    .nullable(),
  subSubcategory: z
    .string()
    .max(100, "Sub-subcategory too long (max 100 characters)")
    .optional()
    .nullable(),
  metadata: z.record(z.any()).optional().default({}),
});

// Resource update schema (admin)
export const updateResourceSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title too long (max 200 characters)")
    .trim()
    .optional(),
  url: urlSchema.optional(),
  description: z
    .string()
    .max(2000, "Description too long (max 2000 characters)")
    .optional(),
  category: z
    .string()
    .min(1, "Category cannot be empty")
    .max(100, "Category too long (max 100 characters)")
    .optional(),
  subcategory: z
    .string()
    .max(100, "Subcategory too long (max 100 characters)")
    .optional()
    .nullable(),
  subSubcategory: z
    .string()
    .max(100, "Sub-subcategory too long (max 100 characters)")
    .optional()
    .nullable(),
  status: resourceStatusSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

// Resource edit suggestion schema
export const createResourceEditSchema = z.object({
  proposedChanges: z.record(
    z.object({
      old: z.any().optional(),
      new: z.any().optional(),
    })
  ),
  proposedData: z.object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title too long (max 200 characters)")
      .trim()
      .optional(),
    description: z
      .string()
      .max(2000, "Description too long (max 2000 characters)")
      .optional(),
    url: urlSchema.optional(),
    tags: z
      .array(z.string().max(50, "Tag too long (max 50 characters)"))
      .max(20, "Too many tags (max 20)")
      .optional(),
    category: z
      .string()
      .max(100, "Category too long (max 100 characters)")
      .optional(),
    subcategory: z
      .string()
      .max(100, "Subcategory too long (max 100 characters)")
      .optional(),
    subSubcategory: z
      .string()
      .max(100, "Sub-subcategory too long (max 100 characters)")
      .optional(),
  }),
  claudeMetadata: z
    .object({
      suggestedTitle: z.string().max(200).optional(),
      suggestedDescription: z.string().max(2000).optional(),
      suggestedTags: z.array(z.string().max(50)).max(20).optional(),
      suggestedCategory: z.string().max(100).optional(),
      suggestedSubcategory: z.string().max(100).optional(),
      confidence: z.number().min(0).max(1).optional(),
      keyTopics: z.array(z.string().max(100)).max(20).optional(),
    })
    .optional(),
  triggerClaudeAnalysis: z.boolean().optional().default(false),
});

// ============= Bulk Operations Schemas =============

// Bulk action enum
export const bulkActionSchema = z.enum(["approve", "reject", "archive", "delete", "tag"]);

// Bulk operations schema
export const bulkOperationSchema = z.object({
  action: bulkActionSchema,
  resourceIds: z
    .array(uuidSchema)
    .min(1, "At least one resource ID required")
    .max(100, "Maximum 100 resources per bulk operation"),
  data: z
    .object({
      tags: z
        .array(z.string().max(50, "Tag too long (max 50 characters)"))
        .max(20, "Too many tags (max 20)")
        .optional(),
    })
    .optional(),
});

// ============= User & Auth Schemas =============

// Role enum
export const userRoleSchema = z.enum(["user", "admin", "moderator"]);

// Update user role schema
export const updateUserRoleSchema = z.object({
  role: userRoleSchema,
});

// Bookmark schema
export const createBookmarkSchema = z.object({
  notes: z
    .string()
    .max(1000, "Notes too long (max 1000 characters)")
    .optional()
    .nullable(),
});

// ============= Learning Journey Schemas =============

// Difficulty enum
export const difficultySchema = z.enum(["beginner", "intermediate", "advanced"]);

// Journey progress update schema
export const updateJourneyProgressSchema = z.object({
  stepId: uuidSchema,
});

// Create learning journey schema
export const createLearningJourneySchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title too long (max 200 characters)")
    .trim(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description too long (max 2000 characters)"),
  difficulty: difficultySchema.default("beginner"),
  estimatedDuration: z
    .string()
    .max(50, "Duration too long (max 50 characters)")
    .optional(),
  icon: z.string().max(50, "Icon name too long (max 50 characters)").optional(),
  orderIndex: z.number().int().min(0).max(1000).optional(),
  category: z
    .string()
    .min(1, "Category is required")
    .max(100, "Category too long (max 100 characters)"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

// ============= GitHub Sync Schemas =============

// GitHub repository URL validation
export const githubRepoUrlSchema = z
  .string()
  .url("Invalid URL format")
  .max(500, "URL too long (max 500 characters)")
  .refine(
    (url) => /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/.test(url),
    "Must be a valid GitHub repository URL"
  );

// GitHub configure schema
export const githubConfigureSchema = z.object({
  repositoryUrl: githubRepoUrlSchema,
  token: z
    .string()
    .max(500, "Token too long")
    .optional(),
});

// GitHub import/export schema
export const githubSyncSchema = z.object({
  repositoryUrl: githubRepoUrlSchema,
  options: z
    .object({
      dryRun: z.boolean().optional().default(false),
      clearExisting: z.boolean().optional().default(false),
      branch: z.string().max(100).optional().default("main"),
    })
    .optional()
    .default({}),
});

// ============= Admin Export Schemas =============

export const exportOptionsSchema = z.object({
  title: z.string().max(200, "Title too long (max 200 characters)").optional(),
  description: z.string().max(2000, "Description too long").optional(),
  includeContributing: z.boolean().optional().default(true),
  includeLicense: z.boolean().optional().default(true),
  websiteUrl: urlSchema.optional(),
  repoUrl: githubRepoUrlSchema.optional(),
});

export const linkCheckOptionsSchema = z.object({
  timeout: z.number().int().min(1000).max(60000).optional().default(10000),
  concurrent: z.number().int().min(1).max(20).optional().default(5),
  retryCount: z.number().int().min(0).max(5).optional().default(1),
});

export const seedDatabaseSchema = z.object({
  clearExisting: z.boolean().optional().default(false),
});

// ============= AI & Recommendations Schemas =============

// Skill level enum
export const skillLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

// Time commitment enum
export const timeCommitmentSchema = z.enum(["daily", "weekly", "flexible"]);

// User preferences schema (moved here to use skillLevelSchema and timeCommitmentSchema)
export const updateUserPreferencesSchema = z.object({
  preferredCategories: z
    .array(z.string().max(100))
    .max(20, "Too many categories (max 20)")
    .optional(),
  skillLevel: skillLevelSchema.optional(),
  learningGoals: z
    .array(z.string().max(200))
    .max(10, "Too many goals (max 10)")
    .optional(),
  preferredResourceTypes: z
    .array(z.string().max(50))
    .max(10, "Too many resource types (max 10)")
    .optional(),
  timeCommitment: timeCommitmentSchema.optional(),
});

// User profile schema for recommendations
export const userProfileSchema = z.object({
  userId: z.string().max(100).optional().default("anonymous"),
  preferredCategories: z
    .array(z.string().max(100))
    .max(20, "Too many categories (max 20)")
    .optional()
    .default([]),
  skillLevel: skillLevelSchema.optional().default("intermediate"),
  learningGoals: z
    .array(z.string().max(200))
    .max(10, "Too many goals (max 10)")
    .optional()
    .default([]),
  preferredResourceTypes: z
    .array(z.string().max(50))
    .max(10, "Too many resource types (max 10)")
    .optional()
    .default([]),
  timeCommitment: timeCommitmentSchema.optional().default("flexible"),
  viewHistory: z.array(z.string()).max(1000).optional().default([]),
  bookmarks: z.array(z.string()).max(1000).optional().default([]),
  completedResources: z.array(z.string()).max(1000).optional().default([]),
  ratings: z.record(z.number().min(1).max(5)).optional().default({}),
});

// Recommendation feedback schema
export const recommendationFeedbackSchema = z.object({
  userId: z.string().min(1, "User ID is required").max(100),
  resourceId: uuidSchema,
  feedback: z.enum(["clicked", "dismissed", "completed"]),
  rating: z.number().int().min(1).max(5).optional(),
});

// Learning path generation schema
export const generateLearningPathSchema = z.object({
  userProfile: userProfileSchema,
  category: z.string().max(100).optional(),
  customGoals: z.array(z.string().max(200)).max(10).optional(),
});

// Claude URL analysis schema
export const claudeAnalyzeSchema = z.object({
  url: urlSchema,
});

// User interaction tracking schema
export const userInteractionSchema = z.object({
  userId: z.string().min(1, "User ID is required").max(100),
  resourceId: uuidSchema,
  interactionType: z.enum(["view", "click", "bookmark", "rate", "complete"]),
  interactionValue: z.number().int().min(1).max(5).optional(),
  metadata: z.record(z.any()).optional().default({}),
});

// ============= Enrichment Schemas =============

// Enrichment filter enum
export const enrichmentFilterSchema = z.enum(["all", "unenriched"]);

// Start enrichment job schema
export const startEnrichmentSchema = z.object({
  filter: enrichmentFilterSchema.optional().default("unenriched"),
  batchSize: z.number().int().min(1).max(100).optional().default(10),
});

// Cleanup enrichment jobs schema
export const cleanupEnrichmentSchema = z.object({
  daysOld: z.coerce.number().int().min(1).max(365).optional().default(30),
});

// ============= Cache Management Schemas =============

export const cacheTypeSchema = z.enum([
  "all",
  "resources",
  "categories",
  "journeys",
  "stats",
]);

export const clearCacheSchema = z.object({
  type: cacheTypeSchema,
});

// ============= Resource Rejection Schema =============

export const rejectResourceSchema = z.object({
  reason: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters")
    .max(1000, "Rejection reason too long (max 1000 characters)"),
});

// ============= Query Parameter Schemas =============

// Generic search/filter params
export const resourceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: resourceStatusSchema.optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
});

// Admin resource query params
export const adminResourceQuerySchema = resourceQuerySchema.extend({
  submittedBy: z.string().max(100).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// Export all schemas for easy importing
export const schemas = {
  // Common
  uuid: uuidSchema,
  url: urlSchema,
  slug: slugSchema,
  pagination: paginationSchema,

  // Resources
  createResource: createResourceSchema,
  updateResource: updateResourceSchema,
  createResourceEdit: createResourceEditSchema,
  resourceStatus: resourceStatusSchema,
  rejectResource: rejectResourceSchema,
  resourceQuery: resourceQuerySchema,
  adminResourceQuery: adminResourceQuerySchema,

  // Bulk
  bulkOperation: bulkOperationSchema,
  bulkAction: bulkActionSchema,

  // Users
  userRole: userRoleSchema,
  updateUserRole: updateUserRoleSchema,
  createBookmark: createBookmarkSchema,
  updateUserPreferences: updateUserPreferencesSchema,

  // Journeys
  difficulty: difficultySchema,
  updateJourneyProgress: updateJourneyProgressSchema,
  createLearningJourney: createLearningJourneySchema,

  // GitHub
  githubRepoUrl: githubRepoUrlSchema,
  githubConfigure: githubConfigureSchema,
  githubSync: githubSyncSchema,

  // Admin
  exportOptions: exportOptionsSchema,
  linkCheckOptions: linkCheckOptionsSchema,
  seedDatabase: seedDatabaseSchema,
  clearCache: clearCacheSchema,
  cacheType: cacheTypeSchema,

  // AI
  skillLevel: skillLevelSchema,
  timeCommitment: timeCommitmentSchema,
  userProfile: userProfileSchema,
  recommendationFeedback: recommendationFeedbackSchema,
  generateLearningPath: generateLearningPathSchema,
  claudeAnalyze: claudeAnalyzeSchema,
  userInteraction: userInteractionSchema,

  // Enrichment
  enrichmentFilter: enrichmentFilterSchema,
  startEnrichment: startEnrichmentSchema,
  cleanupEnrichment: cleanupEnrichmentSchema,
};

// Type exports for TypeScript
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type CreateResourceEditInput = z.infer<typeof createResourceEditSchema>;
export type BulkOperationInput = z.infer<typeof bulkOperationSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;
export type UpdateJourneyProgressInput = z.infer<typeof updateJourneyProgressSchema>;
export type CreateLearningJourneyInput = z.infer<typeof createLearningJourneySchema>;
export type GithubConfigureInput = z.infer<typeof githubConfigureSchema>;
export type GithubSyncInput = z.infer<typeof githubSyncSchema>;
export type ExportOptionsInput = z.infer<typeof exportOptionsSchema>;
export type LinkCheckOptionsInput = z.infer<typeof linkCheckOptionsSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type RecommendationFeedbackInput = z.infer<typeof recommendationFeedbackSchema>;
export type GenerateLearningPathInput = z.infer<typeof generateLearningPathSchema>;
export type ClaudeAnalyzeInput = z.infer<typeof claudeAnalyzeSchema>;
export type UserInteractionInput = z.infer<typeof userInteractionSchema>;
export type StartEnrichmentInput = z.infer<typeof startEnrichmentSchema>;
export type RejectResourceInput = z.infer<typeof rejectResourceSchema>;
