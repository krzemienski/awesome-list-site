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
  // BUG-v3-M06 (run12): malformed JSON bodies. express.json() (body-parser)
  // throws a SyntaxError carrying `status: 400` and the offending `body` when
  // the payload fails to parse. That is a client error — answer 400 with a
  // generic message instead of falling through to the 500 branch.
  if (
    err instanceof SyntaxError &&
    (err as any).status === 400 &&
    "body" in err
  ) {
    res.status(400).json({ message: "Invalid JSON payload" });
    console.log("Client error (400): malformed JSON body");
    return;
  }

  // R5-047 (run24): body-parser rejects oversize payloads with a
  // `PayloadTooLargeError` (type "entity.too.large", status 413). It is a
  // client error — answer 413 explicitly instead of a stack-logged 500.
  if ((err as any)?.type === "entity.too.large" || (err as any)?.status === 413) {
    res.status(413).json({ message: "Request body too large" });
    console.log("Client error (413): request body too large");
    return;
  }

  // R5-047: PostgreSQL 22021 "invalid byte sequence" — raw NUL bytes (\u0000)
  // inside a string that reached a text column. The bytes came from the
  // client, so this is a 400, not a server fault. NARROW backstop: only this
  // exact SQLSTATE; every other PG error still surfaces as a 500 so real
  // server bugs stay loud.
  if ((err as any)?.code === "22021") {
    res.status(400).json({ message: "Request contains invalid characters" });
    console.log("Client error (400): invalid byte sequence for PG (22021)");
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = new ValidationError(
      "Validation failed",
      err.issues
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
