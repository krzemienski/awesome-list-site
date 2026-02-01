/**
 * ============================================================================
 * ASYNCHANDLER.TS - Async Route Handler Wrapper Utility
 * ============================================================================
 *
 * This module provides a utility wrapper for Express async route handlers
 * that automatically catches errors and forwards them to the centralized
 * error handling middleware.
 *
 * BENEFITS:
 * - Eliminates try-catch boilerplate in every route handler
 * - Ensures all async errors are properly caught and handled
 * - Works seamlessly with custom error classes from errors.ts
 * - Maintains clean, readable route handler code
 *
 * USAGE:
 * ```typescript
 * import { asyncHandler } from './middleware/asyncHandler';
 * import { NotFoundError } from './middleware/errors';
 *
 * // Wrap async route handlers
 * app.get('/api/resource/:id', asyncHandler(async (req, res) => {
 *   const resource = await getResource(req.params.id);
 *   if (!resource) {
 *     throw new NotFoundError('Resource not found');
 *   }
 *   res.json(resource);
 * }));
 * ```
 *
 * See errorHandler.ts for error processing and errors.ts for available error classes.
 * ============================================================================
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Async handler wrapper utility
 *
 * @description Wraps async Express route handlers to automatically catch errors and pass them
 * to the centralized error handling middleware. This eliminates the need for
 * try-catch blocks in every route handler.
 *
 * @param fn - Async Express route handler function
 * @returns Express middleware function that catches async errors
 *
 * @example
 * ```typescript
 * import { asyncHandler } from './middleware/asyncHandler';
 * import { NotFoundError } from './middleware/errors';
 *
 * // Before (manual try-catch):
 * app.get('/api/resource/:id', async (req, res) => {
 *   try {
 *     const resource = await getResource(req.params.id);
 *     if (!resource) {
 *       return res.status(404).json({ message: 'Not found' });
 *     }
 *     res.json(resource);
 *   } catch (error) {
 *     res.status(500).json({ message: 'Error fetching resource' });
 *   }
 * });
 *
 * // After (with asyncHandler):
 * app.get('/api/resource/:id', asyncHandler(async (req, res) => {
 *   const resource = await getResource(req.params.id);
 *   if (!resource) {
 *     throw new NotFoundError('Resource not found');
 *   }
 *   res.json(resource);
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
