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
import type { ValidationStorageItem, ValidationResults } from "../storage";

/**
 * Admin statistics interface
 */
export interface AdminStats {
  totalUsers: number;
  totalResources: number;
  pendingResources: number;
  totalCategories: number;
  totalJourneys: number;
  activeUsers: number;
}

/**
 * A single stored validation/link-check run. Newer shape added on main to
 * support both awesome-lint and link-check results through one entry point.
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
  lastUpdated?: string;
}

/**
 * Latest validation results, held in process memory and shared across all
 * AdminRepository instances. Validation output (awesome-lint + link-check) is
 * transient diagnostic data with no schema table, so it lives here rather than
 * in the database; it is re-derivable on demand by re-running validation.
 */
const latestValidation: ValidationResults = {
  awesomeLint: undefined,
  linkCheck: undefined,
  lastUpdated: undefined,
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
      totalCategories: categoryCount.count,
      totalJourneys: journeyCount.count,
      activeUsers: activeCount.count
    };
  }

  /**
   * Store the result of an awesome-lint or link-check run so the admin
   * validation-status panel can retrieve the most recent outcome.
   */
  async storeValidationResult(result: ValidationStorageItem): Promise<void> {
    if (result.type === 'awesome-lint') {
      latestValidation.awesomeLint = result.result;
    } else if (result.type === 'link-check') {
      latestValidation.linkCheck = result.result;
    }
    latestValidation.lastUpdated = result.timestamp;
  }

  /**
   * Get the most recent awesome-lint and link-check results.
   */
  async getLatestValidationResults(): Promise<ValidationResults> {
    return {
      awesomeLint: latestValidation.awesomeLint,
      linkCheck: latestValidation.linkCheck,
      lastUpdated: latestValidation.lastUpdated,
    };
  }
}
