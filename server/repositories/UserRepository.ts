/**
 * ============================================================================
 * USER REPOSITORY - User Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for user operations.
 * It encapsulates all database queries related to users.
 *
 * KEY OPERATIONS:
 * - getUser: Retrieve user by ID
 * - upsertUser: Create or update user (with first-user admin bootstrap)
 * - getUserByEmail: Retrieve user by email address
 * - listUsers: Paginated user listing
 * - updateUserRole: Update user's role (admin/user)
 *
 * DESIGN NOTES:
 * - First user created is automatically assigned admin role
 * - Uses Drizzle ORM for type-safe database operations
 * - Supports OAuth-based user management (no passwords)
 * ============================================================================
 */

import {
  users,
  apiKeys,
  type User,
  type UpsertUser,
  type ApiKey,
  type InsertApiKey,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, asc, desc, sql, or, ilike, type SQL } from "drizzle-orm";
import { generateApiKey, hashApiKey } from "../apiKeyUtils";

/**
 * Repository class for user-related database operations
 */
export class UserRepository {
  /**
   * Get a user by their ID
   * @param id - User ID (from OAuth provider)
   * @returns User object or undefined if not found
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Create or update a user (upsert operation)
   *
   * Note: there is intentionally NO first-user admin bootstrap here. Admin
   * accounts are provisioned exclusively by the env-driven seeding path
   * (seedAdminUser + ADMIN_PASSWORD secret) or by an existing admin via the
   * role-management API. Auto-promoting the first registrant would let an
   * anonymous caller of the public register endpoint claim admin on a fresh
   * database.
   * @param userData - User data to insert or update
   * @returns The created or updated user
   */
  async upsertUser(userData: UpsertUser): Promise<User> {
    const userDataWithRole = {
      ...userData,
      role: userData.role || 'user',
    };

    const [user] = await db
      .insert(users)
      .values(userDataWithRole)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();

    return user;
  }

  /**
   * Get a user by their email address (case-insensitive).
   * Run15 BUG-001: emails are one logical identity regardless of case —
   * lookups for login/register/reset must match Foo@X.com to foo@x.com.
   * Emails are stored lowercase going forward (migration 0034 lowercased
   * historical rows), but the lookup stays case-insensitive defensively.
   * @param email - Email address to search for
   * @returns User object or undefined if not found
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalized = email.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalized}`);
    return user;
  }

  /**
   * List users with pagination
   * @param page - Page number (1-indexed)
   * @param limit - Number of users per page
   * @returns Object containing users array and total count
   */
  async listUsers(
    page = 1,
    limit = 20,
    q?: string,
    sortBy?: string,
    sortDir?: string,
  ): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    // Optional search filter across email + first/last name (M17). A single
    // combined predicate keeps count and page queries in lockstep.
    const searchFilter = q && q.trim()
      ? or(
          ilike(users.email, `%${q.trim()}%`),
          ilike(users.firstName, `%${q.trim()}%`),
          ilike(users.lastName, `%${q.trim()}%`),
        )
      : undefined;

    const totalQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    const [totalResult] = searchFilter
      ? await totalQuery.where(searchFilter)
      : await totalQuery;

    // Run16 BUG-087: sortable columns. The sort key is validated against an
    // explicit whitelist — anything else falls back to createdAt — so the raw
    // query-string value never reaches SQL. Case-insensitive text ordering,
    // NULLS LAST so blank names/emails sink regardless of direction.
    const dirDesc = sortDir !== "asc";
    const textCol = (col: typeof users.email | typeof users.role) =>
      dirDesc
        ? sql`lower(${col}) DESC NULLS LAST`
        : sql`lower(${col}) ASC NULLS LAST`;
    let orderExpr: SQL;
    switch (sortBy) {
      case "email":
        orderExpr = textCol(users.email);
        break;
      case "name":
        orderExpr = dirDesc
          ? sql`lower(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')) DESC NULLS LAST`
          : sql`lower(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')) ASC NULLS LAST`;
        break;
      case "role":
        orderExpr = textCol(users.role);
        break;
      case "createdAt":
      default:
        orderExpr = dirDesc ? desc(users.createdAt) : asc(users.createdAt);
        break;
    }

    const userList = searchFilter
      ? await db
          .select()
          .from(users)
          .where(searchFilter)
          .orderBy(orderExpr)
          .limit(limit)
          .offset(offset)
      : await db
          .select()
          .from(users)
          .orderBy(orderExpr)
          .limit(limit)
          .offset(offset);

    return { users: userList, total: totalResult.count };
  }

  /**
   * List ALL users (no pagination) — used by the admin CSV export (L08).
   */
  async listAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  /**
   * Update a user's role
   * @param userId - User ID to update
   * @param role - New role (e.g., 'admin', 'user')
   * @returns Updated user object
   */
  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  /**
   * Update a user's display name (Run15 BUG-049: self-service profile edit).
   * Only firstName/lastName are settable through this path — role, email and
   * password have their own guarded flows.
   * @param userId - User ID to update
   * @param profile - firstName/lastName (null clears the field)
   * @returns Updated user object
   */
  async updateUserProfile(
    userId: string,
    profile: { firstName?: string | null; lastName?: string | null },
  ): Promise<User> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (profile.firstName !== undefined) set.firstName = profile.firstName;
    if (profile.lastName !== undefined) set.lastName = profile.lastName;
    const [user] = await db
      .update(users)
      .set(set)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  /**
   * Set or clear the account-deletion request marker (Run22 BUG-020).
   * A timestamp = pending private deletion request; NULL = none. Idempotent:
   * re-requesting keeps the ORIGINAL request time (first-come queue order),
   * cancelling when nothing is pending is a no-op.
   * @param userId - User ID
   * @param requested - true to request deletion, false to withdraw
   * @returns Updated user object (undefined if user not found)
   */
  async setDeletionRequested(userId: string, requested: boolean): Promise<User | undefined> {
    const set = requested
      ? { deletionRequestedAt: sql`COALESCE(${users.deletionRequestedAt}, NOW())`, updatedAt: new Date() }
      : { deletionRequestedAt: null, updatedAt: new Date() };
    const [user] = await db
      .update(users)
      .set(set as any)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  /**
   * Delete a user with full FK cleanup (NEW-004: admin user deletion).
   *
   * Content is preserved: the user's submitted/approved resources are
   * DETACHED (submitted_by/approved_by nulled) instead of cascade-deleted, so
   * deleting an account never removes public catalog entries. Their pending
   * resource-edit suggestions are deleted (meaningless without a submitter);
   * job/sync attributions are nulled. Personal rows (bookmarks, favorites,
   * interactions, journey progress, preferences, API keys, password-reset
   * tokens) cascade via their FKs. resource_audit_log.performed_by is
   * ON DELETE SET NULL, so audit history survives with attribution removed.
   *
   * @param userId - ID of the user to delete
   * @returns Counts of detached resources and deleted edit suggestions
   */
  async deleteUserWithCleanup(userId: string): Promise<{ resourcesDetached: number; editsDeleted: number }> {
    return await db.transaction(async (tx) => {
      const detachedSubmitted = await tx.execute(
        sql`UPDATE resources SET submitted_by = NULL WHERE submitted_by = ${userId}`
      );
      const detachedApproved = await tx.execute(
        sql`UPDATE resources SET approved_by = NULL WHERE approved_by = ${userId}`
      );
      const editsDeleted = await tx.execute(
        sql`DELETE FROM resource_edits WHERE submitted_by = ${userId}`
      );
      await tx.execute(sql`UPDATE resource_edits SET handled_by = NULL WHERE handled_by = ${userId}`);
      await tx.execute(sql`UPDATE github_sync_history SET performed_by = NULL WHERE performed_by = ${userId}`);
      await tx.execute(sql`UPDATE enrichment_jobs SET started_by = NULL WHERE started_by = ${userId}`);
      await tx.execute(sql`UPDATE research_jobs SET started_by = NULL WHERE started_by = ${userId}`);
      await tx.delete(users).where(eq(users.id, userId));
      return {
        resourcesDetached: (detachedSubmitted.rowCount ?? 0) + (detachedApproved.rowCount ?? 0),
        editsDeleted: editsDeleted.rowCount ?? 0,
      };
    });
  }

  /**
   * Legacy method - Get user by username
   * @deprecated Not used with OAuth-based authentication
   * @param username - Username to search for
   * @returns Always returns undefined (not supported)
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    // Legacy method - not used with OAuth
    return undefined;
  }

  /**
   * Legacy method - Create a new user
   * @deprecated Use upsertUser instead for OAuth compatibility
   * @param userData - User data to create
   * @returns The created user
   */
  async createUser(userData: UpsertUser): Promise<User> {
    // Legacy method - use upsertUser instead for OAuth
    return this.upsertUser(userData);
  }

  /**
   * Get an API key record by its raw key value
   * @param key - The API key string
   * @returns The ApiKey record or undefined if not found
   */
  async getApiKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, hashApiKey(key)));
    return apiKey;
  }

  /**
   * Create a new API key for a user.
   * Generates a high-entropy plaintext key, stores only its SHA-256 hash, and
   * returns the plaintext exactly once (it can never be recovered afterwards).
   * @returns The created record plus the one-time plaintext key.
   */
  async createApiKey(params: {
    userId: string;
    name: string;
    scopes?: string[];
    expiresAt?: Date | null;
  }): Promise<{ apiKey: ApiKey; plaintextKey: string }> {
    const plaintextKey = generateApiKey();
    const insert: InsertApiKey = {
      userId: params.userId,
      key: hashApiKey(plaintextKey),
      name: params.name,
      scopes: params.scopes ?? [],
      expiresAt: params.expiresAt ?? null,
    };
    const [apiKey] = await db.insert(apiKeys).values(insert).returning();
    return { apiKey, plaintextKey };
  }

  /**
   * List a user's API keys, newest first. The stored hash is never returned.
   */
  async listApiKeys(userId: string): Promise<Omit<ApiKey, "key">[]> {
    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
    return rows.map(({ key, ...rest }) => rest);
  }

  /**
   * Revoke (soft-delete) an API key owned by the given user.
   * @returns true if a matching key was found and revoked.
   */
  async revokeApiKey(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
      .returning({ id: apiKeys.id });
    return result.length > 0;
  }

  /**
   * Update the lastUsedAt timestamp for an API key
   * @param id - The API key ID
   */
  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }
}
