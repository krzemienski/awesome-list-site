/**
 * ============================================================================
 * ROUTES.TS - Express API Route Definitions
 * ============================================================================
 * 
 * This is the main routing module for the Awesome Video Resource Viewer API.
 * It defines 75+ REST endpoints organized into logical sections:
 * 
 * SECTIONS:
 * - Authentication: local passport-local login (/api/auth/*)
 * - Resources: CRUD operations for video resources (/api/resources/*)
 * - Categories: Hierarchical category management (/api/categories/*)
 * - Admin: Dashboard, user management, auditing (/api/admin/*)
 * - GitHub Sync: Import/export with awesome lists (/api/github/*)
 * - AI Services: Claude-powered enrichment (/api/admin/enrichment/*)
 * - Learning: Personalized journeys (/api/journeys/*)
 * - SEO: Sitemap, RSS feed, schema.org (/sitemap.xml, /feed.xml)
 * 
 * AUTHENTICATION:
 * - Public routes: resource browsing, awesome-list, search
 * - Auth required: bookmarks, favorites, profile, suggestions
 * - Admin required: all /api/admin/* routes, GitHub sync, enrichment
 * 
 * KEY FUNCTIONS:
 * - registerRoutes(): Main function that sets up all Express routes
 * - runBackgroundInitialization(): Seeds database if empty on startup
 * 
 * See /docs/API.md for complete endpoint documentation.
 * ============================================================================
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { getSession, isAuthenticated } from "./session";
import { setupLocalAuth } from "./localAuth";
import { hashPassword, comparePassword, validatePassword } from "./passwordUtils";
import passport from "passport";
import { fetchAwesomeList } from "./parser";
import { fetchAwesomeVideoData } from "./awesome-video-parser-clean";
import { RecommendationEngine, UserProfile } from "./recommendation-engine";
import { fetchAwesomeLists, searchAwesomeLists } from "./github-api";
import { insertResourceSchema, EDITABLE_RESOURCE_FIELDS, insertJourneyStepSchema } from "@shared/schema";
import { ensureSubSubcategoryExists } from "./repositories/ensureSubSubcategory";
import { z } from "zod";
import { syncService } from "./github/syncService";
import { recommendationEngine, UserProfile as AIUserProfile } from "./ai/recommendationEngine";
import { learningPathGenerator } from "./ai/learningPathGenerator";
import { claudeService } from "./ai/claudeService";
import { AwesomeListFormatter } from "./github/formatter";
import { validateAwesomeList, formatValidationReport } from "./validation/awesomeLint";
import { checkResourceLinks, formatLinkCheckReport } from "./validation/linkChecker";
import { seedDatabase } from "./seed";
import { enrichmentService } from "./ai/enrichmentService";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { registerPublicApiRoutes } from "./api/public";

const AWESOME_RAW_URL = process.env.AWESOME_RAW_URL || "https://raw.githubusercontent.com/avelino/awesome-go/main/README.md";

// Repository singletons + the isAdmin middleware now live in ./routes/deps.ts
// so domain route modules can share the same instances without a circular
// import back through this file.
import {
  userRepo,
  resourceRepo,
  categoryRepo,
  tagRepo,
  learningJourneyRepo,
  userFeatureRepo,
  auditRepo,
  githubSyncRepo,
  enrichmentRepo,
  adminRepo,
  legacyRepo,
  isAdmin,
} from "./routes/deps";

// SEO + OpenGraph + slug-title helpers now live in ./routes/helpers.ts
import {
  generateSitemap,
  generateOpenGraphImage,
  generateOpenGraphImagePng,
  getCategoryTitleFromSlug,
  getSubcategoryTitleFromSlug,
  getSubSubcategoryTitleFromSlug,
} from "./routes/helpers";
import { registerAuthRoutes } from "./routes/auth";
import { registerResourceRoutes } from "./routes/resources";
import { registerCategoryRoutes } from "./routes/categories";
import { registerInteractionRoutes } from "./routes/interactions";
import { registerUserRoutes } from "./routes/user";
import { registerJourneyRoutes } from "./routes/journeys";
import { registerAdminJourneyRoutes } from "./routes/admin-journeys";
import { registerAdminRoutes } from "./routes/admin";
import { registerAuditRoutes } from "./routes/audit";
import { registerResourceApprovalRoutes } from "./routes/resource-approval";
import { registerResourceEditRoutes } from "./routes/resource-edits";
import { registerCategoryMgmtRoutes } from "./routes/admin-categories";
import { registerSubcategoryMgmtRoutes } from "./routes/admin-subcategories";
import { registerSubSubcategoryMgmtRoutes } from "./routes/admin-subsubcategories";
import { registerGithubRoutes } from "./routes/github";
import { registerExportRoutes } from "./routes/export";
import { registerLinkHealthRoutes } from "./routes/link-health";
import { registerEnrichmentRoutes } from "./routes/enrichment";
import { registerResearcherRoutes } from "./routes/researcher";
import { registerDatabaseDrivenRoutes } from "./routes/database-driven";
import { registerRecommendationRoutes } from "./routes/recommendations";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session + passport-local authentication.
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));
  setupLocalAuth();

  // Public read-only API surface (rate-limited, documented in OpenAPI).
  registerPublicApiRoutes(app);

  // Local authentication + session routes (login, register, current-user, logout).
  registerAuthRoutes(app);


  // ============= Resource Routes =============
  registerResourceRoutes(app);
  // ============= Category Routes =============
  registerCategoryRoutes(app);
  // ============= User Interaction Routes =============
  registerInteractionRoutes(app);
  // ============= User Profile & Progress Routes =============
  registerUserRoutes(app);
  // ============= Learning Journey Routes =============
  registerJourneyRoutes(app);
  // ============= Admin Journey & Step Routes =============
  registerAdminJourneyRoutes(app);
  // ============= Admin Routes =============
  registerAdminRoutes(app);
  // ============= Audit Log Routes =============
  registerAuditRoutes(app);
  // ============= Resource Approval Routes =============
  registerResourceApprovalRoutes(app);
  // ============= Resource Edit Management Routes =============
  registerResourceEditRoutes(app);
  // ============= Category Management Routes =============
  registerCategoryMgmtRoutes(app);
  // ============= Subcategory Management Routes =============
  registerSubcategoryMgmtRoutes(app);
  // ============= Sub-subcategory Management Routes =============
  registerSubSubcategoryMgmtRoutes(app);
  // ============= GitHub Sync Routes =============
  registerGithubRoutes(app);
  // ============= Awesome List Export & Validation Routes =============
  registerExportRoutes(app);
  // ============= Link Health Check Routes =============
  registerLinkHealthRoutes(app);
  // ============= Enrichment API Routes =============
  registerEnrichmentRoutes(app);
  // ============= AI Researcher Routes =============
  registerResearcherRoutes(app);
  // ============= Database-Driven Routes =============
  registerDatabaseDrivenRoutes(app);
  // ============= AI Recommendation Routes =============
  registerRecommendationRoutes(app);
  app.use('/api', (req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Run background initialization tasks AFTER the server has started listening.
 * This ensures fast startup for production deployments.
 * These tasks are non-blocking and run in the background.
 * 
 * NOTE: /api/awesome-list now serves data from the PostgreSQL database
 * directly via legacyRepo.getAwesomeListFromDatabase(). No static JSON loading required.
 */
// Helper to retry database operations with exponential backoff (for Neon cold starts)
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = error.message?.includes('too many clients') ||
                          error.message?.includes('connection') ||
                          error.message?.includes('ECONNREFUSED');
      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }
      console.log(`⏳ Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }
  throw new Error('Retry logic failed unexpectedly');
}

export async function runBackgroundInitialization(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`🔄 Running background initialization (${isProduction ? 'production' : 'development'} mode)...`);
  console.log('📊 Note: /api/awesome-list now serves from PostgreSQL database');

  // Orphan-job watchdog: any enrichment_jobs / github_sync_queue stuck in
  // 'pending' or 'processing' for more than 5 minutes were almost certainly
  // killed by the last server restart. Mark them failed so the admin UIs
  // (Enrichment, GitHub) don't show fictitious "processing" forever.
  try {
    const { runOrphanWatchdogStartup } = await import('./jobs/orphanJobWatchdog');
    await runOrphanWatchdogStartup();
  } catch (err) {
    console.error('Failed to import/run orphan watchdog (non-fatal):', err);
  }

  // Both dev and production: Check and seed database if needed
  // This ensures data consistency across environments
  try {
    console.log('Checking if database needs seeding...');

    // Use retry logic for initial database check (handles Neon cold starts)
    const categories = await withRetry(() => categoryRepo.listCategories());
    const actualResourceCount = await withRetry(() => resourceRepo.getResourceCount());

    // Reseed when the database is empty OR when a prior seed died partway through
    // (e.g. S3/network dropped after categories landed but before resources did).
    // A healthy seed yields ~1950 resources; a count far below that with no user
    // edits indicates a partial seed that should self-heal. Preserve genuine user
    // changes by only treating a near-empty resource set as "needs reseeding".
    const PARTIAL_SEED_THRESHOLD = 100;
    const needsReseeding =
      (categories.length === 0 && actualResourceCount === 0) ||
      (categories.length > 0 && actualResourceCount < PARTIAL_SEED_THRESHOLD);

    if (needsReseeding) {
      console.log(`📦 Database needs seeding (categories: ${categories.length}, resources: ${actualResourceCount})...`);
      console.log(`⚙️  Running database seeding in ${isProduction ? 'production' : 'development'} mode...`);
      const seedResult = await seedDatabase({ clearExisting: actualResourceCount > 0 ? true : false });

      console.log('✅ Auto-seeding completed successfully:');
      console.log(`   - Categories: ${seedResult.categoriesInserted}`);
      console.log(`   - Subcategories: ${seedResult.subcategoriesInserted}`);
      console.log(`   - Sub-subcategories: ${seedResult.subSubcategoriesInserted}`);
      console.log(`   - Resources: ${seedResult.resourcesInserted}`);

      if (seedResult.errors.length > 0) {
        console.warn(`⚠️  Seeding completed with ${seedResult.errors.length} errors`);
      }
    } else {
      console.log(`✓ Database already populated: ${categories.length} categories, ${actualResourceCount} resources`);
    }
  } catch (error) {
    console.error('❌ Error during auto-seeding (non-fatal):', error);
    console.log('Server will continue without seeding. You can manually seed via /api/admin/seed-database');
  }

  console.log('✅ Background initialization complete');
}