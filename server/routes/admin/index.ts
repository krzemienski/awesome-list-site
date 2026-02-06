/**
 * ============================================================================
 * ADMIN ROUTES - Administration and Management
 * ============================================================================
 *
 * This module aggregates all administrative routes for managing the application.
 * Routes are organized by functional area for better maintainability.
 *
 * ROUTE MODULES:
 * - stats.ts          - Dashboard statistics
 * - users.ts          - User management
 * - resources.ts      - Resource approval and CRUD
 * - edits.ts          - Resource edit management
 * - categories.ts     - Category hierarchy management
 * - export.ts         - Export and validation operations
 * - database.ts       - Database management (seeding, import)
 * - enrichment.ts     - AI enrichment operations
 *
 * All routes require admin authentication (isAuthenticated + isAdmin middleware)
 * ============================================================================
 */
import type { Express } from "express";
import { registerStatsRoutes } from "./stats";
import { registerUserRoutes } from "./users";
import { registerResourceRoutes } from "./resources";
import { registerEditRoutes } from "./edits";
import { registerCategoryRoutes } from "./categories";
import { registerExportRoutes } from "./export";
import { registerDatabaseRoutes } from "./database";
import { registerEnrichmentRoutes } from "./enrichment";

/**
 * Register all admin routes on Express app
 *
 * @param app - Express application instance
 */
export function registerAdminRoutes(app: Express): void {
  registerStatsRoutes(app);
  registerUserRoutes(app);
  registerResourceRoutes(app);
  registerEditRoutes(app);
  registerCategoryRoutes(app);
  registerExportRoutes(app);
  registerDatabaseRoutes(app);
  registerEnrichmentRoutes(app);
}
