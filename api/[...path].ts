import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { storage } from "../server/storage";
import { setupLocalAuth } from "../server/localAuth";

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration (in-memory for serverless - consider Redis for production)
app.use(session({
  secret: process.env.SESSION_SECRET || 'awesome-list-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Setup local authentication
setupLocalAuth(app);

// Serialize/deserialize user
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// Auth status endpoint
app.get("/api/auth/status", (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const session = req.user as any;
    const claims = session.claims || {};
    res.json({
      authenticated: true,
      user: {
        id: claims.sub,
        email: claims.email,
        firstName: claims.first_name,
        lastName: claims.last_name,
        profileImageUrl: claims.profile_image_url,
      },
    });
  } else {
    res.json({ authenticated: false, user: null });
  }
});

// Check admin status
app.get("/api/auth/admin-status", async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.json({ isAdmin: false });
  }
  
  const session = req.user as any;
  const userId = session.claims?.sub;
  
  if (!userId) {
    return res.json({ isAdmin: false });
  }
  
  try {
    const user = await storage.getUser(userId);
    res.json({ isAdmin: user?.role === 'admin' });
  } catch (error) {
    res.json({ isAdmin: false });
  }
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    req.session.destroy((destroyErr) => {
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Export handler for Vercel
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
