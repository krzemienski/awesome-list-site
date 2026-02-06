/**
 * ============================================================================
 * MODULE TYPES - Core Type Definitions for Modular Architecture
 * ============================================================================
 *
 * This file defines the base types and interfaces used across all modules
 * in the awesome-list backend architecture.
 *
 * CORE CONCEPTS:
 * - Module: Self-contained feature unit with routes, services, and storage
 * - ModuleConfig: Configuration options for module registration
 * - AuthenticatedRequest: Express Request extended with user information
 *
 * TYPE CATEGORIES:
 * - Express Types: Re-exported for convenience (Request, Response, etc.)
 * - Auth Types: User authentication and session data
 * - Module Types: Module structure and configuration
 * - Response Types: Standardized API response formats
 *
 * USAGE:
 * import { Module, AuthenticatedRequest, isAuthenticated } from './types';
 *
 * export const myModule: Module = {
 *   name: 'my-feature',
 *   registerRoutes: (app) => {
 *     app.get('/api/my-feature', isAuthenticated, handler);
 *   }
 * };
 *
 * ============================================================================
 */

import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import type { User } from '@shared/schema';

/**
 * Express type re-exports for convenience
 * Modules can import these from types.ts instead of express directly
 */
export type {
  Express,
  Request,
  Response,
  NextFunction,
  RequestHandler
};

/**
 * User information attached to authenticated requests
 * Populated by Passport.js authentication middleware
 */
export interface UserSession {
  claims?: {
    sub: string;           // User ID (subject)
    email?: string;        // User email
    exp?: number;          // Token expiration timestamp
    first_name?: string;   // User first name
    last_name?: string;    // User last name
    profile_image_url?: string; // Profile image URL
  };
  access_token?: string;   // OAuth access token
  refresh_token?: string;  // OAuth refresh token
  expires_at?: number;     // Token expiration timestamp
}

/**
 * Express Request extended with user authentication data
 * Use this type instead of Request for authenticated routes
 */
export interface AuthenticatedRequest extends Request {
  user?: UserSession;
  isAuthenticated(): boolean;
}

/**
 * Module interface - defines the structure of a feature module
 * Each module must implement this interface to be registered
 */
export interface Module {
  /** Module name (used for logging and debugging) */
  name: string;

  /** Module description (optional, for documentation) */
  description?: string;

  /** Module version (optional, for tracking) */
  version?: string;

  /**
   * Register module routes with the Express app
   * Called during application startup
   */
  registerRoutes: (app: Express) => void | Promise<void>;

  /**
   * Initialize module (optional)
   * Called before route registration for setup tasks
   * (database connections, service initialization, etc.)
   */
  initialize?: () => void | Promise<void>;

  /**
   * Cleanup module resources (optional)
   * Called during graceful shutdown
   */
  cleanup?: () => void | Promise<void>;
}

/**
 * Module configuration options
 * Used when registering modules with the module system
 */
export interface ModuleConfig {
  /** Module instance */
  module: Module;

  /** Whether module is enabled (default: true) */
  enabled?: boolean;

  /** Module dependencies (other module names that must load first) */
  dependencies?: string[];

  /** Module priority (lower numbers load first, default: 100) */
  priority?: number;
}

/**
 * Standardized API success response
 * Use this for consistent response formatting across modules
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    page?: number;
    pageSize?: number;
    total?: number;
    [key: string]: any;
  };
}

/**
 * Standardized API error response
 * Use this for consistent error formatting across modules
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string; // Only in development
  };
}

/**
 * Type guard to check if request is authenticated
 */
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}

/**
 * Helper to get user ID from authenticated request
 * Returns null if not authenticated
 */
export function getUserId(req: Request): string | null {
  if (isAuthenticatedRequest(req)) {
    return req.user?.claims?.sub || null;
  }
  return null;
}

/**
 * Helper to get full user from authenticated request
 * Returns null if not authenticated
 */
export function getUserSession(req: Request): UserSession | null {
  if (isAuthenticatedRequest(req)) {
    return req.user || null;
  }
  return null;
}
