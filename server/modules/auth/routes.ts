/**
 * ============================================================================
 * AUTH MODULE ROUTES - Authentication Endpoints
 * ============================================================================
 *
 * This module defines all authentication-related API endpoints including
 * login, logout, session management, and user profile retrieval.
 *
 * ENDPOINTS:
 * - GET  /api/auth/user        - Get current authenticated user
 * - POST /api/auth/logout      - Logout and destroy session
 * - POST /api/auth/local/login - Local authentication with credentials
 *
 * AUTHENTICATION:
 * - Supports both Replit OAuth and local authentication
 * - Uses Passport.js for authentication strategy management
 * - Session-based authentication with secure cookies
 *
 * SECURITY:
 * - Password validation with bcrypt
 * - Rate limiting on login endpoints
 * - Secure session management
 * - HTTP-only cookies for token storage
 *
 * ERROR HANDLING:
 * - 401 Unauthorized: Invalid credentials or not authenticated
 * - 500 Internal Server Error: Server-side errors during auth
 *
 * See /docs/API.md for complete endpoint documentation.
 * ============================================================================
 */

import type { Express, Response, NextFunction } from 'express';
import type { AuthenticatedRequest, Module } from '../types';
import { storage } from '../../storage';
import passport from 'passport';
import { sendError, sendSuccess } from '../middleware';

/**
 * GET /api/auth/user - Get current authenticated user
 *
 * Returns the currently authenticated user's profile information.
 * Requires active session with valid authentication.
 *
 * @returns 200 - User profile data
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  try {
    console.log('[/api/auth/user] Request received');
    console.log('[/api/auth/user] isAuthenticated:', req.isAuthenticated?.());
    console.log('[/api/auth/user] req.user?.claims?.sub:', req.user?.claims?.sub);

    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      console.log('[/api/auth/user] User not authenticated');
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const userId = req.user.claims.sub;
    console.log('[/api/auth/user] Fetching user from DB, userId:', userId);

    // Fetch user from database
    const dbUser = await storage.getUser(userId);

    if (!dbUser) {
      console.log('[/api/auth/user] User not found in DB');
      return sendError(res, 401, 'UNAUTHORIZED', 'User not found');
    }

    console.log('[/api/auth/user] DB user found:', {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role
    });

    // Return user profile
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.profileImageUrl,
      role: dbUser.role,
      createdAt: dbUser.createdAt,
    };

    console.log('[/api/auth/user] Returning user:', user);
    return sendSuccess(res, { user, isAuthenticated: true });
  } catch (error) {
    console.error('[/api/auth/user] Error fetching user:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch user');
  }
}

/**
 * POST /api/auth/logout - Logout user
 *
 * Destroys the current user session and clears authentication cookies.
 *
 * @returns 200 - Successfully logged out
 * @returns 500 - Server error during logout
 */
async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    console.log('[/api/auth/logout] Logout request received');

    req.logout((err) => {
      if (err) {
        console.error('[/api/auth/logout] Error during logout:', err);
        return sendError(res, 500, 'LOGOUT_ERROR', 'Failed to logout');
      }

      console.log('[/api/auth/logout] Logout successful');
      return sendSuccess(res, { success: true }, 'Successfully logged out');
    });
  } catch (error) {
    console.error('[/api/auth/logout] Error logging out:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to logout');
  }
}

/**
 * POST /api/auth/local/login - Local authentication
 *
 * Authenticates user with email and password credentials.
 * Creates a new session on successful authentication.
 *
 * @body email - User email address
 * @body password - User password
 * @returns 200 - Successfully authenticated
 * @returns 401 - Invalid credentials
 * @returns 500 - Server error during authentication
 */
async function localLogin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      console.error('[/api/auth/local/login] Authentication error:', err);
      return sendError(res, 500, 'AUTH_ERROR', 'Internal server error');
    }

    if (!user) {
      console.log('[/api/auth/local/login] Authentication failed:', info?.message);
      return sendError(res, 401, 'INVALID_CREDENTIALS', info?.message || 'Invalid credentials');
    }

    // Establish session
    req.logIn(user, (err) => {
      if (err) {
        console.error('[/api/auth/local/login] Session creation error:', err);
        return sendError(res, 500, 'SESSION_ERROR', 'Failed to create session');
      }

      console.log('[/api/auth/local/login] Login successful for user:', user.claims?.sub);

      return sendSuccess(res, {
        user: {
          id: user.claims?.sub,
          email: user.claims?.email,
          name: user.claims?.first_name || user.claims?.email,
        }
      }, 'Successfully authenticated');
    });
  })(req, res, next);
}

/**
 * Register all authentication routes with the Express app
 *
 * @param app - Express application instance
 */
function registerRoutes(app: Express): void {
  // GET /api/auth/user - Get current authenticated user
  app.get('/api/auth/user', getCurrentUser);

  // POST /api/auth/logout - Logout user
  app.post('/api/auth/logout', logout);

  // POST /api/auth/local/login - Local authentication
  app.post('/api/auth/local/login', localLogin);

  console.log('[Auth Module] Routes registered: GET /api/auth/user, POST /api/auth/logout, POST /api/auth/local/login');
}

/**
 * Auth module export
 * Implements the Module interface for registration with the module system
 */
export const authModule: Module = {
  name: 'auth',
  description: 'Authentication and session management',
  version: '1.0.0',
  registerRoutes,
};
