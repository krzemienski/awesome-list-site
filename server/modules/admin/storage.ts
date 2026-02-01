/**
 * ============================================================================
 * ADMIN MODULE STORAGE INTERFACE
 * ============================================================================
 *
 * This module defines the storage interface for administrative operations.
 * It provides a focused subset of the main IStorage interface specifically
 * for admin dashboard, user management, and resource moderation.
 *
 * DESIGN PATTERN:
 * - Interface-based: Defines all admin-related operations for testability
 * - Delegation: Can be implemented by delegating to main storage instance
 * - Separation of Concerns: Admin module only depends on admin operations
 *
 * KEY OPERATIONS:
 * - Dashboard Statistics: getAdminStats (users, resources, journeys, pending counts)
 * - User Management: listUsers, updateUserRole
 * - Resource Moderation: getPendingResources, approveResource, rejectResource
 * - Resource Edit Moderation: getPendingResourceEdits, approveResourceEdit, rejectResourceEdit
 * - Audit Logging: getResourceAuditLog (track all admin actions)
 *
 * USAGE:
 * - Import this interface in admin routes/handlers
 * - Pass main storage instance (which implements IStorage) to admin module
 * - Admin module uses only the methods defined here
 *
 * See /docs/ARCHITECTURE.md for module architecture diagrams.
 * ============================================================================
 */

import { type User, type Resource, type ResourceEdit } from "@shared/schema";

/**
 * Admin statistics for dashboard
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
 * Storage interface for administrative operations
 */
export interface IAdminStorage {
  // Dashboard Statistics
  getAdminStats(): Promise<AdminStats>;

  // User Management
  listUsers(page: number, limit: number): Promise<{ users: User[]; total: number }>;
  updateUserRole(userId: string, role: string): Promise<User>;

  // Resource Moderation
  getPendingResources(): Promise<{ resources: Resource[]; total: number }>;
  approveResource(id: number, approvedBy: string): Promise<Resource>;
  rejectResource(id: number, adminId: string, reason: string): Promise<void>;

  // Resource Edit Moderation
  getPendingResourceEdits(): Promise<ResourceEdit[]>;
  approveResourceEdit(editId: number, adminId: string): Promise<void>;
  rejectResourceEdit(editId: number, adminId: string, reason: string): Promise<void>;

  // Audit Log
  getResourceAuditLog(resourceId: number | null, limit?: number): Promise<any[]>;
}
