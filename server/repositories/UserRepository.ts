/**
 * ============================================================================
 * USER REPOSITORY - CRUD Operations for User Management
 * ============================================================================
 *
 * This repository provides type-safe CRUD operations for user data.
 * It handles user authentication, profile management, and role assignment.
 *
 * DESIGN PATTERN:
 * - Repository pattern with dependency injection
 * - Type-safe operations using Drizzle ORM types
 * - Supports OAuth upsert pattern (create or update)
 * - First user bootstrap: automatically assigns admin role to first user
 *
 * KEY OPERATIONS:
 * - getUser: Retrieve user by ID (primary key lookup)
 * - upsertUser: Create or update user (OAuth pattern)
 * - getUserByEmail: Lookup user by email address
 * - listUsers: Paginated user listing with total count
 * - updateUserRole: Admin operation to change user permissions
 *
 * USAGE:
 * ```typescript
 * const userRepo = new UserRepository(db);
 * const user = await userRepo.getUser(userId);
 * const newUser = await userRepo.upsertUser({
 *   id: 'oauth-provider-id',
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, desc, sql } from "drizzle-orm";
import { users, type User, type UpsertUser } from "@shared/schema";

/**
 * Repository for user CRUD operations
 *
 * Provides type-safe database operations for user management.
 * Handles OAuth authentication flow and role-based access control.
 */
export class UserRepository {
  /**
   * Creates a new UserRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {}

  /**
   * Get user by ID
   *
   * Retrieves a single user by their primary key (OAuth provider ID).
   *
   * @param id - The user's unique identifier from OAuth provider
   * @returns The user if found, undefined otherwise
   *
   * @example
   * const user = await userRepo.getUser('github|12345');
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Create or update a user (OAuth upsert pattern)
   *
   * This method implements the OAuth authentication flow:
   * - If the user doesn't exist, creates a new user
   * - If the user exists, updates their information
   * - First user is automatically assigned 'admin' role
   * - Subsequent users default to 'user' role unless specified
   *
   * @param userData - User data from OAuth provider or manual creation
   * @returns The created or updated user with all columns populated
   *
   * @example
   * // Create/update user from OAuth callback
   * const user = await userRepo.upsertUser({
   *   id: 'github|12345',
   *   email: 'user@example.com',
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   profileImageUrl: 'https://avatars.githubusercontent.com/...'
   * });
   */
  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if this is the first user (bootstrap admin)
    const [userCountResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const isFirstUser = userCountResult.count === 0;

    // If this is the first user, make them an admin
    const userDataWithRole = {
      ...userData,
      role: isFirstUser ? 'admin' : (userData.role || 'user'),
    };

    const [user] = await this.db
      .insert(users)
      .values(userDataWithRole as any)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();

    return user;
  }

  /**
   * Get user by email address
   *
   * Searches for a user by their email address. Useful for
   * user lookup, verification, and duplicate checking.
   *
   * @param email - The email address to search for
   * @returns The user if found, undefined otherwise
   *
   * @example
   * const user = await userRepo.getUserByEmail('user@example.com');
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  /**
   * List users with pagination
   *
   * Returns a paginated list of users ordered by creation date (newest first).
   * Includes total count for pagination UI.
   *
   * @param page - Page number (1-indexed)
   * @param limit - Number of users per page
   * @returns Object containing users array and total count
   *
   * @example
   * // Get first page of users (20 per page)
   * const { users, total } = await userRepo.listUsers(1, 20);
   * const totalPages = Math.ceil(total / 20);
   */
  async listUsers(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const userList = await this.db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return { users: userList, total: totalResult.count };
  }

  /**
   * Update user role
   *
   * Changes a user's role for access control purposes.
   * This is an admin-only operation in the application layer.
   *
   * Common roles: 'user', 'admin', 'moderator'
   *
   * @param userId - The ID of the user to update
   * @param role - The new role to assign
   * @returns The updated user with all columns populated
   *
   * @example
   * // Promote user to admin
   * const admin = await userRepo.updateUserRole('github|12345', 'admin');
   */
  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}
