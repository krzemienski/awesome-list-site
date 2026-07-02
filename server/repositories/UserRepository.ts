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
import { eq, and, desc, sql } from "drizzle-orm";
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
   * Get a user by their email address
   * @param email - Email address to search for
   * @returns User object or undefined if not found
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  /**
   * List users with pagination
   * @param page - Page number (1-indexed)
   * @param limit - Number of users per page
   * @returns Object containing users array and total count
   */
  async listUsers(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const userList = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return { users: userList, total: totalResult.count };
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
