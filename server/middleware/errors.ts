/**
 * ============================================================================
 * ERRORS.TS - Custom Error Classes for API Error Handling
 * ============================================================================
 *
 * This module defines custom error classes for consistent API error handling
 * across the application. All errors extend the base AppError class which
 * provides consistent structure and behavior.
 *
 * ERROR HIERARCHY:
 * - AppError (base class)
 *   - BadRequestError (400)
 *   - UnauthorizedError (401)
 *   - ForbiddenError (403)
 *   - NotFoundError (404)
 *   - ConflictError (409)
 *   - ValidationError (422)
 *   - InternalServerError (500)
 *   - ServiceUnavailableError (503)
 *
 * USAGE:
 * ```typescript
 * import { NotFoundError, ValidationError } from './middleware/errors';
 *
 * // Simple error
 * throw new NotFoundError('Resource not found');
 *
 * // Error with validation details
 * throw new ValidationError('Invalid input', { field: 'email', message: 'Invalid email format' });
 * ```
 *
 * See errorHandler.ts for how these errors are processed and returned to clients.
 * ============================================================================
 */

/**
 * Base application error class
 * All custom errors should extend this class
 *
 * @description Base class for all application errors. Provides consistent structure
 * with HTTP status codes and operational error flagging. Maintains proper stack traces
 * and prototype chains for instanceof checks.
 *
 * @example
 * ```typescript
 * throw new AppError('Something went wrong', 500);
 * ```
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  /**
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (default: 500)
   */
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 400 Bad Request - Client sent invalid data
 *
 * @description Use when the client sends malformed or semantically invalid data.
 * Examples: missing required fields, invalid format, logical errors.
 *
 * @example
 * ```typescript
 * throw new BadRequestError('Missing required field: name');
 * ```
 */
export class BadRequestError extends AppError {
  /**
   * @param message - Human-readable error message (default: "Bad Request")
   */
  constructor(message: string = "Bad Request") {
    super(message, 400);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 *
 * @description Use when authentication is required but not provided or invalid.
 * Examples: missing token, invalid credentials, expired session.
 *
 * @example
 * ```typescript
 * throw new UnauthorizedError('Invalid authentication token');
 * ```
 */
export class UnauthorizedError extends AppError {
  /**
   * @param message - Human-readable error message (default: "Unauthorized")
   */
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 *
 * @description Use when the user is authenticated but lacks permission for the resource.
 * Examples: non-admin accessing admin routes, user accessing another user's data.
 *
 * @example
 * ```typescript
 * throw new ForbiddenError('Admin access required');
 * ```
 */
export class ForbiddenError extends AppError {
  /**
   * @param message - Human-readable error message (default: "Forbidden")
   */
  constructor(message: string = "Forbidden") {
    super(message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found - Resource not found
 *
 * @description Use when a requested resource does not exist.
 * Examples: invalid ID, deleted resource, non-existent route.
 *
 * @example
 * ```typescript
 * throw new NotFoundError('Category not found');
 * ```
 */
export class NotFoundError extends AppError {
  /**
   * @param message - Human-readable error message (default: "Resource not found")
   */
  constructor(message: string = "Resource not found") {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 Conflict - Request conflicts with current state
 *
 * @description Use when the request conflicts with the current server state.
 * Examples: duplicate resource, concurrent modification, resource locked.
 *
 * @example
 * ```typescript
 * throw new ConflictError('Resource already exists');
 * ```
 */
export class ConflictError extends AppError {
  /**
   * @param message - Human-readable error message (default: "Conflict")
   */
  constructor(message: string = "Conflict") {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 *
 * @description Use when request data fails validation rules.
 * Optionally include detailed validation errors for each field.
 *
 * @example
 * ```typescript
 * throw new ValidationError('Invalid input', [
 *   { field: 'email', message: 'Invalid email format' },
 *   { field: 'age', message: 'Must be 18 or older' }
 * ]);
 * ```
 */
export class ValidationError extends AppError {
  public readonly errors?: any;

  /**
   * @param message - Human-readable error message (default: "Validation failed")
   * @param errors - Optional detailed validation errors
   */
  constructor(message: string = "Validation failed", errors?: any) {
    super(message, 422);
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 *
 * @description Use when an unexpected error occurs on the server.
 * Examples: database errors, unhandled exceptions, system failures.
 *
 * @example
 * ```typescript
 * throw new InternalServerError('Database connection failed');
 * ```
 */
export class InternalServerError extends AppError {
  /**
   * @param message - Human-readable error message (default: "Internal Server Error")
   */
  constructor(message: string = "Internal Server Error") {
    super(message, 500);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 503 Service Unavailable - External service unavailable
 *
 * @description Use when an external service is temporarily unavailable.
 * Examples: third-party API down, database unavailable, rate limit exceeded.
 *
 * @example
 * ```typescript
 * throw new ServiceUnavailableError('GitHub API is currently unavailable');
 * ```
 */
export class ServiceUnavailableError extends AppError {
  /**
   * @param message - Human-readable error message (default: "Service Unavailable")
   */
  constructor(message: string = "Service Unavailable") {
    super(message, 503);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}
