/**
 * Centralized Error Handling Middleware
 *
 * Express error middleware that provides consistent error responses across the API.
 * Handles ApiError instances, ZodError validation errors, and generic errors.
 *
 * Features:
 * - Consistent JSON error responses
 * - Appropriate HTTP status codes
 * - Error logging with detail levels
 * - Stack traces in development mode only
 * - Validation error formatting
 * - Prevents duplicate responses
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../errors/ApiError';

/**
 * Express error handling middleware
 * Must have 4 parameters (err, req, res, next) to be recognized as error middleware
 *
 * @param err - The error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent duplicate error responses
  if (res.headersSent) {
    return next(err);
  }

  // Default to 500 Internal Server Error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any = undefined;

  // Handle ApiError instances (custom error classes)
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.errors;
  }
  // Handle generic errors
  else if (err instanceof Error) {
    message = err.message || 'Internal Server Error';
    // Check for common error status code properties
    statusCode = (err as any).status || (err as any).statusCode || 500;
  }

  // Log errors based on severity
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logPrefix = `[ERROR ${statusCode}] ${req.method} ${req.path}`;

  if (statusCode >= 500) {
    // Server errors - log with full details
    console.error(logPrefix, {
      message,
      errors,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  } else if (isDevelopment) {
    // Client errors - log in development only
    console.log(logPrefix, message, errors);
  }

  // Build error response
  const errorResponse: any = {
    message,
  };

  // Include validation errors if present
  if (errors) {
    errorResponse.errors = errors;
  }

  // Include stack trace in development mode only
  if (isDevelopment && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}
