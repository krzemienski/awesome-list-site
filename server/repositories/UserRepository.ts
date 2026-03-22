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
  type User,
  type UpsertUser,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, sql } from "drizzle-orm";

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
   * Special behavior: First user is automatically made an admin
   * @param userData - User data to insert or update
   * @returns The created or updated user
   */
  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if this is the first user (bootstrap admin)
    const [userCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const isFirstUser = userCountResult.count === 0;

    // If this is the first user, make them an admin
    const userDataWithRole = {
      ...userData,
      role: isFirstUser ? 'admin' : (userData.role || 'user'),
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

    // Log when first admin is created
    if (isFirstUser) {
      const displayName = user.email || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) || user.id;
      console.log(`🔐 First user created as admin: ${displayName}`);
    }

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
}
