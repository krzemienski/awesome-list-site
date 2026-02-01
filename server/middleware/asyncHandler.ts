/**
 * Async Handler Wrapper
 *
 * Wraps async route handlers to automatically catch errors and forward them
 * to Express error handling middleware. This eliminates the need for try-catch
 * blocks in every route handler.
 *
 * Usage:
 *   app.get('/api/resource', asyncHandler(async (req, res) => {
 *     const data = await someAsyncOperation();
 *     res.json(data);
 *   }));
 *
 * Any errors thrown in the async handler will be caught and passed to next(err),
 * allowing centralized error handling middleware to process them.
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Type for async route handlers
 * Supports handlers with or without explicit next parameter
 */
type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps an async route handler to catch errors and forward to error middleware
 *
 * @param fn - The async route handler function
 * @returns Express middleware function that handles errors
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
