import type { Request, Response, NextFunction } from "express";

/**
 * Async handler wrapper utility
 *
 * Wraps async Express route handlers to automatically catch errors and pass them
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
