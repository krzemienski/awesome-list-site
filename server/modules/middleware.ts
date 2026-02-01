/**
 * ============================================================================
 * MODULE MIDDLEWARE - Shared Middleware Utilities
 * ============================================================================
 *
 * This file provides common middleware functions used across all modules
 * for authentication, authorization, error handling, and request validation.
 *
 * MIDDLEWARE CATEGORIES:
 * - Authentication: Verify user is logged in (isAuthenticated)
 * - Authorization: Verify user has required permissions (isAdmin, hasRole)
 * - Error Handling: Centralized error response formatting
 * - Validation: Request data validation helpers
 *
 * PATTERNS:
 * All middleware follows Express middleware signature:
 * (req, res, next) => void
 *
 * USAGE:
 * import { isAuthenticated, isAdmin } from './middleware';
 *
 * app.get('/api/protected', isAuthenticated, handler);
 * app.post('/api/admin/action', isAuthenticated, isAdmin, handler);
 *
 * ERROR HANDLING:
 * All middleware uses consistent error responses via sendError helper.
 * Errors are logged with context for debugging.
 *
 * ============================================================================
 */

import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, ApiErrorResponse } from './types';
import { storage } from '../storage';

/**
 * Middleware to verify user is authenticated
 * Returns 401 Unauthorized if no user session exists
 *
 * @example
 * app.get('/api/favorites', isAuthenticated, getFavoritesHandler);
 */
export const isAuthenticated = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    // User is authenticated, proceed to next middleware/route handler
    next();
  } catch (error) {
    sendError(res, 500, 'AUTH_ERROR', 'Error verifying authentication');
  }
};

/**
 * Middleware to verify user has admin role
 * Must be used AFTER isAuthenticated middleware
 * Returns 403 Forbidden if user is not an admin
 *
 * @example
 * app.post('/api/admin/resources/:id/approve', isAuthenticated, isAdmin, approveHandler);
 */
export const isAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Fetch user from database to check role
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return sendError(res, 403, 'FORBIDDEN', 'Admin access required');
    }

    // User is admin, proceed to next middleware/route handler
    next();
  } catch (error) {
    sendError(res, 500, 'AUTH_ERROR', 'Error checking admin status');
  }
};

/**
 * Middleware to verify user has a specific role
 * Returns 403 Forbidden if user doesn't have the required role
 *
 * @param allowedRoles - Array of allowed roles (e.g., ['admin', 'moderator'])
 * @example
 * app.post('/api/moderate', isAuthenticated, hasRole(['admin', 'moderator']), handler);
 */
export const hasRole = (allowedRoles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      }

      // Fetch user from database to check role
      const user = await storage.getUser(userId);

      if (!user || !allowedRoles.includes(user.role || 'user')) {
        return sendError(
          res,
          403,
          'FORBIDDEN',
          `Requires one of: ${allowedRoles.join(', ')}`
        );
      }

      // User has required role, proceed
      next();
    } catch (error) {
      sendError(res, 500, 'AUTH_ERROR', 'Error checking user role');
    }
  };
};

/**
 * Helper function to send standardized error responses
 * Logs errors with context and sends appropriate HTTP status
 *
 * @param res - Express Response object
 * @param status - HTTP status code (e.g., 400, 401, 403, 500)
 * @param code - Error code for client (e.g., 'UNAUTHORIZED', 'VALIDATION_ERROR')
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: any
): Response {
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details: details || undefined,
    }
  };

  // In development, include stack trace for debugging
  if (process.env.NODE_ENV === 'development' && details instanceof Error) {
    errorResponse.error.stack = details.stack;
  }

  return res.status(status).json(errorResponse);
}

/**
 * Helper function to send standardized success responses
 * Ensures consistent response format across all modules
 *
 * @param res - Express Response object
 * @param data - Response data
 * @param message - Optional success message
 * @param metadata - Optional metadata (pagination, etc.)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  metadata?: Record<string, any>
): Response {
  return res.json({
    success: true,
    data,
    message,
    metadata,
  });
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handling middleware
 * Prevents unhandled promise rejections
 *
 * @param fn - Async route handler function
 * @example
 * app.get('/api/resources', asyncHandler(async (req, res) => {
 *   const resources = await getResources();
 *   res.json(resources);
 * }));
 */
export function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 * Should be registered LAST in the middleware chain
 * Catches all errors and sends standardized error responses
 *
 * @example
 * app.use(errorHandler);
 */
export function errorHandler(
  err: Error,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Log error with context
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.claims?.sub,
  });

  // Send error response
  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    process.env.NODE_ENV === 'development' ? err : undefined
  );
}
