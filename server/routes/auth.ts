/**
 * ============================================================================
 * AUTH ROUTES - Authentication and Authorization
 * ============================================================================
 *
 * This module handles user authentication and authorization routes:
 * - Local authentication (username/password login)
 * - User session management
 * - Admin authorization middleware
 *
 * ROUTES:
 * - POST /api/auth/local/login - Login with email/password
 * - GET /api/auth/user - Get current authenticated user
 * - POST /api/auth/logout - Logout and destroy session
 *
 * MIDDLEWARE:
 * - isAdmin - Verify user has admin role
 *
 * Note: Replit OAuth routes (/api/login, /api/callback) are set up in setupAuth()
 * ============================================================================
 */

import type { Express, Response } from "express";
import { storage } from "../storage";
import passport from "passport";

/**
 * Middleware to check if user is admin
 * Verifies user is authenticated and has admin role in database
 */
export const isAdmin = async (req: any, res: Response, next: any) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking admin status" });
  }
};

/**
 * Register authentication routes on Express app
 *
 * @param app - Express application instance
 */
export function registerAuthRoutes(app: Express): void {
  // POST /api/auth/local/login - Local authentication with email/password
  app.post("/api/auth/local/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.log('[local/login] Authentication error:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!user) {
        console.log('[local/login] Authentication failed:', info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      console.log('[local/login] User authenticated, establishing session for:', user.claims?.sub);

      req.logIn(user, async (err) => {
        if (err) {
          console.log('[local/login] Login failed:', err);
          return res.status(500).json({ message: "Login failed" });
        }

        console.log('[local/login] Session established, saving to store...');

        // Explicitly save the session to ensure it's persisted before sending response
        req.session.save(async (saveErr) => {
          if (saveErr) {
            console.log('[local/login] Session save failed:', saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }

          console.log('[local/login] Session saved successfully, session ID:', req.sessionID);

          // Fetch user from database to get the role
          const dbUser = await storage.getUser(user.claims.sub);

          console.log('[local/login] Returning user response with role:', dbUser?.role);

          return res.json({
            user: {
              id: user.claims.sub,
              email: user.claims.email,
              firstName: user.claims.first_name,
              lastName: user.claims.last_name,
              profileImageUrl: user.claims.profile_image_url,
              role: dbUser?.role || 'user',
            }
          });
        });
      });
    })(req, res, next);
  });

  // GET /api/auth/user - Get current user (public endpoint)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      console.log('[/api/auth/user] Request received');
      console.log('[/api/auth/user] isAuthenticated:', req.isAuthenticated?.());
      console.log('[/api/auth/user] req.user?.dbUser:', req.user?.dbUser);
      console.log('[/api/auth/user] req.user?.claims?.sub:', req.user?.claims?.sub);

      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        console.log('[/api/auth/user] User not authenticated, returning null');
        return res.json({ user: null, isAuthenticated: false });
      }

      // Use DB user from session (populated by deserializeUser) or fetch if not available
      let dbUser = req.user.dbUser;
      if (!dbUser) {
        const userId = req.user.claims.sub;
        console.log('[/api/auth/user] dbUser not in session, fetching from DB, userId:', userId);
        dbUser = await storage.getUser(userId);
      }

      if (!dbUser) {
        console.log('[/api/auth/user] User not found in DB');
        return res.json({ user: null, isAuthenticated: false });
      }

      console.log('[/api/auth/user] DB user found:', {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role
      });

      // Map database fields to frontend-expected format
      const user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.firstName && dbUser.lastName
          ? `${dbUser.firstName} ${dbUser.lastName}`
          : dbUser.firstName || dbUser.email?.split('@')[0] || 'User',
        avatar: dbUser.profileImageUrl,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
      };

      console.log('[/api/auth/user] Returning user:', user);
      res.json({ user, isAuthenticated: true });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // POST /api/auth/logout - Logout user
  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      req.logout(() => {
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });
}
