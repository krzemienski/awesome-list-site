/**
 * ============================================================================
 * AUTH MODULE STORAGE INTERFACE
 * ============================================================================
 *
 * This module defines the storage interface for authentication operations.
 * It provides a focused subset of the main IStorage interface specifically
 * for user authentication and management.
 *
 * DESIGN PATTERN:
 * - Interface-based: Defines all auth-related operations for testability
 * - Delegation: Can be implemented by delegating to main storage instance
 * - Separation of Concerns: Auth module only depends on auth operations
 *
 * KEY OPERATIONS:
 * - User Authentication: getUser, upsertUser (MANDATORY for Replit Auth)
 * - User Management: getUserByEmail, listUsers, updateUserRole
 * - Legacy Support: getUserByUsername, createUser (for backward compatibility)
 *
 * USAGE:
 * - Import this interface in auth routes/handlers
 * - Pass main storage instance (which implements IStorage) to auth module
 * - Auth module uses only the methods defined here
 *
 * See /docs/ARCHITECTURE.md for module architecture diagrams.
 * ============================================================================
 */

import { type User, type UpsertUser } from "@shared/schema";

/**
 * Storage interface for authentication operations
 */
export interface IAuthStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Additional user operations
  getUserByEmail(email: string): Promise<User | undefined>;
  listUsers(page: number, limit: number): Promise<{ users: User[]; total: number }>;
  updateUserRole(userId: string, role: string): Promise<User>;

  // Legacy methods - kept for backward compatibility
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
}
