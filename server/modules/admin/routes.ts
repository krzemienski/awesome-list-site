/**
 * ============================================================================
 * ADMIN MODULE ROUTES - Administrative Endpoints
 * ============================================================================
 *
 * This module defines all admin-related API endpoints including dashboard
 * statistics, user management, resource moderation, and system operations.
 *
 * ENDPOINTS:
 * - GET  /api/admin/stats              - Dashboard statistics
 * - GET  /api/admin/users              - List users with pagination
 * - PUT  /api/admin/users/:id/role     - Change user role
 *
 * AUTHENTICATION:
 * - All admin routes require authentication AND admin role
 * - Uses isAuthenticated + isAdmin middleware on all endpoints
 *
 * AUTHORIZATION:
 * - Admin role required for all operations
 * - Role validation performed on every request
 * - Audit logging for all admin actions
 *
 * ERROR HANDLING:
 * - 400 Bad Request: Invalid data or validation errors
 * - 401 Unauthorized: Authentication required
 * - 403 Forbidden: Admin access required
 * - 404 Not Found: Resource doesn't exist
 * - 500 Internal Server Error: Server-side errors
 *
 * See /docs/ADMIN-GUIDE.md for administrative procedures.
 * ============================================================================
 */

import type { Express, Response } from 'express';
import type { AuthenticatedRequest, Module } from '../types';
import { storage } from '../../storage';
import { isAuthenticated, isAdmin, sendError, sendSuccess } from '../middleware';

/**
 * GET /api/admin/stats - Dashboard statistics
 *
 * Returns high-level metrics for the admin dashboard including
 * user count, resource count, journeys count, and pending approvals.
 *
 * @returns 200 - Statistics object
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function getAdminStats(req: AuthenticatedRequest, res: Response) {
  try {
    const stats = await storage.getAdminStats();

    // Map backend property names to frontend expectations
    res.json({
      users: stats.totalUsers,
      resources: stats.totalResources,
      journeys: stats.totalJourneys,
      pendingApprovals: stats.pendingResources,
    });
  } catch (error) {
    console.error('[Admin] Error fetching admin stats:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch admin statistics', error);
  }
}

/**
 * GET /api/admin/users - List users with pagination
 *
 * Returns paginated list of all users with their details.
 * Supports pagination via query parameters.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 *
 * @returns 200 - Paginated user list
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function listUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await storage.listUsers(page, limit);
    res.json(result);
  } catch (error) {
    console.error('[Admin] Error fetching users:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch users', error);
  }
}

/**
 * PUT /api/admin/users/:id/role - Change user role
 *
 * Updates a user's role. Valid roles are: user, admin, moderator.
 * Performs validation on role value before updating.
 *
 * @param id - User ID (path parameter)
 * @body role - New role ('user' | 'admin' | 'moderator')
 * @returns 200 - Updated user object
 * @returns 400 - Invalid role
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function updateUserRole(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // Validate role
    if (!role || !['user', 'admin', 'moderator'].includes(role)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid role. Must be one of: user, admin, moderator');
    }

    const user = await storage.updateUserRole(userId, role);
    res.json(user);
  } catch (error) {
    console.error('[Admin] Error updating user role:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to update user role', error);
  }
}

/**
 * GET /api/admin/pending-resources - Get all pending resources for approval
 *
 * Returns list of resources awaiting admin approval.
 * Used by the admin moderation queue interface.
 *
 * @returns 200 - Array of pending resources
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function getPendingResources(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await storage.getPendingResources();
    res.json(result);
  } catch (error) {
    console.error('[Admin] Error fetching pending resources:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch pending resources', error);
  }
}

/**
 * POST /api/admin/resources/:id/approve - Approve a pending resource
 *
 * Changes resource status from 'pending' to 'approved'.
 * Records the admin user who performed the approval.
 *
 * @param id - Resource ID (path parameter)
 * @returns 200 - Updated resource
 * @returns 400 - Invalid resource ID
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function approveResource(req: AuthenticatedRequest, res: Response) {
  try {
    const resourceId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (isNaN(resourceId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid resource ID');
    }

    const updatedResource = await storage.approveResource(resourceId, userId);
    res.json(updatedResource);
  } catch (error) {
    console.error('[Admin] Error approving resource:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to approve resource', error);
  }
}

/**
 * POST /api/admin/resources/:id/reject - Reject a pending resource
 *
 * Changes resource status from 'pending' to 'rejected'.
 * Requires a reason for rejection (minimum 10 characters).
 *
 * @param id - Resource ID (path parameter)
 * @body reason - Rejection reason (minimum 10 characters)
 * @returns 200 - Updated resource
 * @returns 400 - Invalid resource ID or missing/short reason
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function rejectResource(req: AuthenticatedRequest, res: Response) {
  try {
    const resourceId = parseInt(req.params.id);
    const userId = req.user?.claims?.sub;
    const { reason } = req.body;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (isNaN(resourceId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid resource ID');
    }

    if (!reason || reason.trim().length < 10) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Rejection reason is required (minimum 10 characters)');
    }

    const updatedResource = await storage.rejectResource(resourceId, userId, reason);
    res.json(updatedResource);
  } catch (error) {
    console.error('[Admin] Error rejecting resource:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to reject resource', error);
  }
}

/**
 * Register all admin routes with the Express app
 *
 * All routes require both authentication and admin role.
 * Middleware is applied in order: isAuthenticated → isAdmin → handler
 *
 * @param app - Express application instance
 */
function registerRoutes(app: Express): void {
  // Dashboard statistics
  app.get('/api/admin/stats', isAuthenticated, isAdmin, getAdminStats);

  // User management
  app.get('/api/admin/users', isAuthenticated, isAdmin, listUsers);
  app.put('/api/admin/users/:id/role', isAuthenticated, isAdmin, updateUserRole);

  // Resource moderation
  app.get('/api/admin/pending-resources', isAuthenticated, isAdmin, getPendingResources);
  app.post('/api/admin/resources/:id/approve', isAuthenticated, isAdmin, approveResource);
  app.post('/api/admin/resources/:id/reject', isAuthenticated, isAdmin, rejectResource);

  console.log('[Admin Module] Routes registered: 6 admin endpoints');
}

/**
 * Admin module export
 * Implements the Module interface for registration with the module system
 */
export const adminModule: Module = {
  name: 'admin',
  description: 'Administrative operations and user management',
  version: '1.0.0',
  registerRoutes,
};
