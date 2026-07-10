/**
 * ============================================================================
 * ADMIN REPOSITORY - Administrative Operations Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for administrative operations.
 * It encapsulates all database queries related to system-wide statistics
 * and administrative insights.
 *
 * KEY OPERATIONS:
 * - getAdminStats: Retrieve system-wide statistics for admin dashboard
 *
 * STATISTICS PROVIDED:
 * - Total users count
 * - Total resources count
 * - Pending resources count (awaiting approval)
 * - Total categories count
 * - Total learning journeys count
 * - Active users count (logged in within last 30 days)
 *
 * DESIGN NOTES:
 * - Uses aggregated SQL queries for efficient counting
 * - Active users are determined by updatedAt timestamp (within 30 days)
 * - All counts are returned as integers for consistent typing
 * ============================================================================
 */

import {
  users,
  resources,
  categories,
  learningJourneys,
} from "@shared/schema";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";

/**
 * Admin statistics interface
 */
export interface AdminStats {
  totalUsers: number;
  totalResources: number;
  pendingResources: number;
  totalPublic: number;
  totalPending: number;
  totalDeleted: number;
  totalCategories: number;
  totalJourneys: number;
  activeUsers: number;
}

/**
 * A single stored validation/link-check run.
 */
export interface ValidationStorageItem {
  type: 'awesome-lint' | 'link-check';
  result: any;
  markdown?: string;
  timestamp: string;
}

/**
 * The latest validation results, keyed by run type.
 */
export interface ValidationResults {
  awesomeLint?: any;
  linkCheck?: any;
  lastUpdated?: string | null;
}

/**
 * In-memory holder for the most recent validation results. Validation status is
 * ephemeral (regenerated on demand from the live resource set), so it does not
 * warrant a database table — it only needs to survive between a validate/check
 * run and the subsequent status read within the same server process.
 */
const latestValidationResults: ValidationResults = {
  awesomeLint: null,
  linkCheck: null,
  lastUpdated: null,
};

/**
 * Repository class for administrative operations
 */
export class AdminRepository {
  /**
   * Get system-wide statistics for the admin dashboard
   * @returns Object containing various system metrics
   */
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

    const [publicCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.status, 'approved'));

    const [deletedCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.status, 'rejected'));

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
      totalPublic: publicCount.count,
      totalPending: pendingCount.count,
      totalDeleted: deletedCount.count,
      totalCategories: categoryCount.count,
      totalJourneys: journeyCount.count,
      activeUsers: activeCount.count
    };
  }

  /**
   * Store the result of a validation or link-check run for later retrieval.
   * @param result - The validation result to persist (awesome-lint or link-check)
   */
  async storeValidationResult(result: ValidationStorageItem): Promise<void> {
    if (result.type === 'awesome-lint') {
      latestValidationResults.awesomeLint = result.result;
    } else if (result.type === 'link-check') {
      latestValidationResults.linkCheck = result.result;
    }
    latestValidationResults.lastUpdated = result.timestamp;
  }

  /**
   * Retrieve the most recent validation results.
   * @returns The latest awesome-lint and link-check results with last-updated time
   */
  async getLatestValidationResults(): Promise<ValidationResults> {
    return { ...latestValidationResults };
  }
}
