/**
 * Custom API Error Classes
 *
 * Provides a hierarchy of error classes for consistent error handling across the API.
 * All errors extend the base ApiError class which includes HTTP status codes.
 */

/**
 * Base API Error class
 * All custom API errors should extend this class
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors?: any;

  constructor(statusCode: number, message: string, errors?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 400 Bad Request - Validation Error
 * Used for input validation failures, malformed requests, or invalid data
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', errors?: any) {
    super(400, message, errors);
  }
}

/**
 * 401 Unauthorized - Authentication Error
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

/**
 * 403 Forbidden - Authorization Error
 * Used when user is authenticated but lacks permission for the requested resource
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

/**
 * 404 Not Found - Resource Not Found Error
 * Used when a requested resource does not exist
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

/**
 * 500 Internal Server Error
 * Used for unexpected server errors
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(500, message);
  }
}
