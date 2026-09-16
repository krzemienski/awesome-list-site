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
  resourceEdits,
} from "@shared/schema";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Admin statistics interface
 */
export interface AdminStats {
  totalUsers: number;
  totalResources: number;
  pendingResources: number;
  pendingEdits: number;
  totalPublic: number;
  totalPending: number;
  /** Rows with status='rejected'. Audit2 BUG-050: previously misnamed `totalDeleted`. */
  totalRejected: number;
  totalCategories: number;
  totalJourneys: number;
  activeUsers: number;
}

/** Per-table storage row for the admin Database panel (real pg_catalog data). */
export interface DatabaseTableOverview {
  name: string;
  /** Exact `count(*)` of the table. */
  rows: number;
  /** `pg_total_relation_size` in bytes (heap + indexes + toast). */
  bytes: number;
  /** Newest `updated_at`/`created_at` the table records, or null when it has neither column. */
  lastWriteAt: string | null;
}

export interface DatabaseOverview {
  /** Base tables in the public schema. */
  tables: number;
  /** Exact `count(*)` summed over every public base table. */
  totalRows: number;
  /** `pg_database_size` of the connected database in bytes. */
  diskBytes: number;
  migrations: {
    /** Rows recorded in drizzle.__drizzle_migrations. */
    applied: number;
    /** Entries in migrations/meta/_journal.json, or null when the journal is not shipped. */
    journaled: number | null;
  };
  tableStats: DatabaseTableOverview[];
}

/** The six tables the Database panel lists, in display order. */
export const DATABASE_PANEL_TABLES = [
  "resources",
  "categories",
  "subcategories",
  "users",
  "resource_audit_log",
  "enrichment_jobs",
] as const;

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

let journaledMigrationCount: number | null | undefined;
/** Entries in migrations/meta/_journal.json (same lookup order as server/migrate.ts); cached per process. */
function readJournaledMigrationCount(): number | null {
  if (journaledMigrationCount !== undefined) return journaledMigrationCount;
  const candidates = [
    path.join(process.cwd(), "migrations", "meta", "_journal.json"),
    path.join(__dirname, "..", "..", "migrations", "meta", "_journal.json"),
    path.join(__dirname, "migrations", "meta", "_journal.json"),
  ];
  journaledMigrationCount = null;
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8")) as { entries?: unknown[] };
      journaledMigrationCount = Array.isArray(parsed.entries) ? parsed.entries.length : null;
    } catch {
      journaledMigrationCount = null;
    }
    break;
  }
  return journaledMigrationCount;
}

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

    // BUG-041 (run22): the Edits tab had no pending badge, so waiting
    // suggested edits were invisible until an admin clicked into the tab.
    const [pendingEditCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resourceEdits)
      .where(eq(resourceEdits.status, 'pending'));

    // Audit2 BUG-050: this counts status='rejected' rows and is exposed as
    // `totalRejected` — it used to ship as `totalDeleted`, making the
    // dashboard's "N rejected" label look wrong against the API field name.
    const [rejectedCount] = await db
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
      pendingEdits: pendingEditCount.count,
      totalPublic: publicCount.count,
      totalPending: pendingCount.count,
      totalRejected: rejectedCount.count,
      totalCategories: categoryCount.count,
      totalJourneys: journeyCount.count,
      activeUsers: activeCount.count
    };
  }

  /**
   * Real storage metrics for the admin Database panel: pg_catalog sizes and
   * counts, never placeholders. Table names are a fixed allowlist, so the
   * dynamic identifiers below are never user input.
   */
  async getDatabaseOverview(): Promise<DatabaseOverview> {
    const [summary] = await db.execute<{
      tables: number;
      total_rows: number;
      disk_bytes: number;
    }>(sql`
      SELECT
        (SELECT count(*)::int FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables,
        (SELECT coalesce(sum(row_count), 0)::bigint FROM (
          SELECT (xpath('/row/c/text()', query_to_xml(
            format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, ''
          )))[1]::text::bigint AS row_count
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ) counts) AS total_rows,
        pg_database_size(current_database())::bigint AS disk_bytes
    `).then((result) => result.rows);

    const [journal] = await db.execute<{ applied: number }>(sql`
      SELECT CASE WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL THEN 0
        ELSE (SELECT count(*)::int FROM drizzle.__drizzle_migrations) END AS applied
    `).then((result) => result.rows);

    const columnRows = await db.execute<{ table_name: string; column_name: string }>(sql`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (${sql.join(DATABASE_PANEL_TABLES.map((name) => sql`${name}`), sql`, `)})
        AND column_name IN ('updated_at', 'created_at')
    `).then((result) => result.rows);
    const columnsByTable = new Map<string, Set<string>>();
    for (const row of columnRows) {
      if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, new Set());
      columnsByTable.get(row.table_name)!.add(row.column_name);
    }

    const tableStats: DatabaseTableOverview[] = [];
    for (const name of DATABASE_PANEL_TABLES) {
      const columns = columnsByTable.get(name);
      if (!columns) continue; // table absent from this schema: list nothing rather than a fake row
      const writeColumn = columns.has("updated_at") ? "updated_at" : columns.has("created_at") ? "created_at" : null;
      const lastWrite = writeColumn ? sql`max(${sql.identifier(writeColumn)})::text` : sql`NULL::text`;
      const [row] = await db.execute<{ rows: number; bytes: number; last_write: string | null }>(sql`
        SELECT count(*)::int AS rows,
               pg_total_relation_size(${sql.raw(`'public.${name}'`)}::regclass)::bigint AS bytes,
               ${lastWrite} AS last_write
        FROM ${sql.identifier(name)}
      `).then((result) => result.rows);
      tableStats.push({
        name,
        rows: Number(row.rows),
        bytes: Number(row.bytes),
        lastWriteAt: row.last_write ? new Date(row.last_write).toISOString() : null,
      });
    }

    return {
      tables: Number(summary.tables),
      totalRows: Number(summary.total_rows),
      diskBytes: Number(summary.disk_bytes),
      migrations: { applied: Number(journal.applied), journaled: readJournaledMigrationCount() },
      tableStats,
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
