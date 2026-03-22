/**
 * ============================================================================
 * ERRORHANDLER.TS - Centralized Express Error Handling Middleware
 * ============================================================================
 *
 * This module provides centralized error handling for the Express application.
 * It processes different error types and returns consistent JSON responses.
 *
 * ERROR HANDLING:
 * - AppError instances: Returns statusCode and message from the error
 * - ZodError instances: Converts to 422 validation error with field details
 * - Unknown errors: Returns 500 Internal Server Error
 *
 * LOGGING:
 * - Client errors (4xx): Logged as info with basic message
 * - Server errors (5xx): Logged as errors with full stack trace
 * - Validation errors: Logged with field-level details
 *
 * USAGE:
 * ```typescript
 * import { errorHandler } from './middleware/errorHandler';
 *
 * // Register as the last middleware in Express
 * app.use(errorHandler);
 * ```
 *
 * See errors.ts for available error classes and asyncHandler.ts for async route handling.
 * ============================================================================
 */

import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "./errors";
import { ZodError } from "zod";

/**
 * Centralized error handling middleware for Express
 *
 * @description Processes all errors thrown in the application and returns
 * consistent JSON responses. Handles AppError instances, ZodError validation
 * errors, and unknown errors with appropriate status codes and logging.
 *
 * @param err - Error object to handle
 * @param _req - Express request object (unused but required for error middleware signature)
 * @param res - Express response object
 * @param _next - Express next function (unused but required for error middleware signature)
 * @returns void - Sends JSON response to client
 *
 * @example
 * ```typescript
 * import { errorHandler } from './middleware/errorHandler';
 * app.use(errorHandler);
 * ```
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = new ValidationError(
      "Validation failed",
      err.errors
    );

    res.status(validationError.statusCode).json({
      message: validationError.message,
      errors: validationError.errors,
    });

    console.error("Validation error:", {
      message: validationError.message,
      errors: validationError.errors,
    });

    return;
  }

  // Handle AppError instances (operational errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err instanceof ValidationError && err.errors ? { errors: err.errors } : {}),
    });

    // Only log non-client errors (5xx) as errors
    if (err.statusCode >= 500) {
      console.error("Application error:", {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
      });
    } else {
      console.log(`Client error (${err.statusCode}):`, err.message);
    }

    return;
  }

  // Handle unknown/unexpected errors (non-operational)
  console.error("Unexpected error:", {
    message: err.message,
    stack: err.stack,
    error: err,
  });

  // Don't leak error details in production for unknown errors
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  res.status(500).json({ message });
}
