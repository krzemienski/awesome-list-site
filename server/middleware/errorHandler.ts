import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "./errors";
import { ZodError } from "zod";

/**
 * Centralized error handling middleware for Express
 *
 * Handles different error types and returns consistent JSON responses:
 * - AppError instances: Use statusCode and message from error
 * - ZodError instances: Convert to 422 validation error with field details
 * - Unknown errors: Return 500 Internal Server Error
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
