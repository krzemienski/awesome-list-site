// Authentication routes: local login, registration, current-user, logout.
// Extracted verbatim from registerRoutes. Passport/session SETUP stays in
// routes.ts (must run before these handlers); this module only registers the
// /api/auth/* request handlers.
import type { Express } from "express";
import passport from "passport";
import { hashPassword, validateEmail, validatePassword } from "../passwordUtils";
import { checkLock, recordFailure, clearOnSuccess } from "../loginLockout";
import { userRepo } from "./deps";

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/local/login", (req, res, next) => {
    const loginEmail = typeof req.body?.email === "string" ? req.body.email : "";

    // Brute-force guard: short-circuit while the account is in a cooldown window.
    const lock = checkLock(loginEmail);
    if (lock.locked) {
      res.setHeader("Retry-After", String(lock.retryAfterSec));
      return res.status(423).json({
        message: "Account temporarily locked due to repeated failed login attempts. Try again later.",
        retryAfter: lock.retryAfterSec,
      });
    }

    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.log('[local/login] Authentication error:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!user) {
        // Count this failure toward the lockout threshold (generic message — no enumeration).
        recordFailure(loginEmail);
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

          // Successful login clears any accumulated failure/lock state for this email.
          clearOnSuccess(loginEmail);

          // Fetch user from database to get the role
          const dbUser = await userRepo.getUser(user.claims.sub);
          
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

  // Self-service account registration for local auth. Additive to the login cluster:
  // creates a role=user account, never touches the existing login/session handlers.
  // Email delivery (verification) is out of scope until an email transport is configured.
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body ?? {};

      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return res.status(400).json({ message: pwCheck.error || "Invalid password" });
      }

      const existing = await userRepo.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashed = await hashPassword(password);
      const created = await userRepo.upsertUser({ email, password: hashed, role: "user" });

      // Never return the password hash.
      return res.status(201).json({
        id: created.id,
        email: created.email,
        role: created.role,
      });
    } catch (error) {
      console.error("[/api/auth/register] Error:", error);
      return res.status(500).json({ message: "Failed to create account" });
    }
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
        dbUser = await userRepo.getUser(userId);
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
