/**
 * ----------------------------------------------------------------------------
 * DOMAIN ROUTER: auth-user
 * ----------------------------------------------------------------------------
 *
 * Task #307 (Clerk migration): the legacy local-auth + Replit-OIDC surface
 * (local login, register, forgot/reset password, current-device logout,
 * replit-probe) is gone — Clerk owns credentials, sessions, sign-in/sign-up
 * UI, and password reset. What remains is the app-identity surface the SPA
 * uses to learn about the CURRENT user's application columns (role,
 * deletionRequestedAt, joined display name).
 *
 * Endpoints (in original order):
 *   GET  /api/auth/user    — canonical: always 200 { user, isAuthenticated }
 *   GET  /api/auth/me      — deprecated REST alias (401 style)
 *   GET  /api/auth/status  — deprecated lightweight probe
 *   POST /api/auth/logout-all — revoke every active Clerk session
 *   POST /api/auth/admin-login  — owner password sign-in (OWNER_PASSWORD)
 *   POST /api/auth/admin-logout — clear the owner password cookie
 *
 * Session state comes from `req.dbUser`, resolved by clerkUserContext
 * (server/clerkAuth.ts) after clerkMiddleware verifies the Clerk session.
 * ----------------------------------------------------------------------------
 */

import type { Express, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { clerkClient } from "@clerk/express";
import type { User } from "@shared/schema";
import { UserRepository } from "../../repositories";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  checkAdminPassword,
  issueAdminSessionToken,
} from "../../clerkAuth";
import { negotiated429Handler } from "../../middleware/rateLimit";
import { PgRateLimitStore } from "../../middleware/pgRateLimitStore";
import { asyncHandler } from "../../middleware/asyncHandler";

// Owner password sign-in: 10 attempts per 15 minutes per IP, on its own store
// prefix so hits never double-count against the /api backstop limiter.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new PgRateLimitStore("admin-login"),
  handler: negotiated429Handler("Too many sign-in attempts. Please try again later."),
});

const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export interface AuthUserRoutesContext {
  /** Clerk-backed auth gate (kept in the ctx for wiring symmetry). */
  isAuthenticated: RequestHandler;
  userRepo: UserRepository;
}

/** Map a DB row to the frontend-expected user shape. */
function toClientUser(dbUser: User) {
  return {
    id: dbUser.id,
    email: dbUser.email,
    // Run22 BUG-038: join whichever name parts exist — never drop lastName.
    name:
      [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") ||
      dbUser.email?.split("@")[0] ||
      "User",
    avatar: dbUser.profileImageUrl,
    role: dbUser.role,
    createdAt: dbUser.createdAt,
    // Run22 BUG-020: lets the Profile page show a pending private deletion
    // request without an extra round-trip.
    deletionRequestedAt: dbUser.deletionRequestedAt ?? null,
  };
}

export function registerAuthUserRoutes(
  app: Express,
  ctx: AuthUserRoutesContext,
): void {
  const { isAuthenticated } = ctx;
  // GET /api/auth/user — canonical identity endpoint (public: always 200 with
  // { user: null } for anonymous visitors so the SPA can boot anonymously).
  app.get("/api/auth/user", (req, res) => {
    if (res.locals.clerkUserLookupError) {
      // DB lookup failed while a Clerk session exists — don't misreport the
      // visitor as signed out; let the central handler answer 503.
      throw res.locals.clerkUserLookupError;
    }
    if (!req.dbUser) {
      return res.json({ user: null, isAuthenticated: false });
    }
    res.json({ user: toClientUser(req.dbUser), isAuthenticated: true });
  });

  // GET /api/auth/me — deprecated REST-style alias (401 when unauthenticated).
  // The 401 comes from the isAuthenticated guard (canonical body, BUG-051) so
  // the contract registry and /api/docs report this route as signed-in only.
  app.get(
    "/api/auth/me",
    (_req, res, next) => {
      res.setHeader("Deprecation", "true");
      res.setHeader("Link", '</api/auth/user>; rel="successor-version"');
      next();
    },
    isAuthenticated,
    (req, res) => {
      res.json(toClientUser(req.dbUser!));
    },
  );

  // POST /api/auth/logout-all — "sign out all devices": revoke every active
  // Clerk session for the caller. Uses the Clerk-native user id (NOT the
  // bridge id) because this talks to the Clerk API. A deliberate user action,
  // so a Clerk API round-trip here is fine (unlike per-request lookups).
  app.post("/api/auth/logout-all", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const clerkUserId = req.clerkIdentity?.clerkUserId;
      if (!clerkUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const sessions = await clerkClient.sessions.getSessionList({
        userId: clerkUserId,
        status: "active",
      });
      const list = Array.isArray((sessions as any)?.data)
        ? (sessions as any).data
        : (sessions as any);
      let revoked = 0;
      for (const session of list ?? []) {
        await clerkClient.sessions.revokeSession(session.id);
        revoked += 1;
      }
      res.json({ message: "Signed out everywhere", sessionsRevoked: revoked });
    } catch (error) {
      console.error("[/api/auth/logout-all] Error:", error);
      res.status(500).json({ message: "Failed to sign out everywhere" });
    }
  }));

  // POST /api/auth/admin-login — owner password sign-in (no Clerk). A correct
  // OWNER_PASSWORD sets a signed 12-hour HttpOnly cookie that resolves to the
  // admin@example.com row (see clerkUserContext). Disabled and wrong
  // passwords get the same 401 so the endpoint never reveals its config.
  app.post("/api/auth/admin-login", adminLoginLimiter, (req, res) => {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (password.length === 0 || password.length > 256 || !checkAdminPassword(password)) {
      console.warn(`[auth] admin password sign-in rejected from ${req.ip}`);
      return res.status(401).json({ message: "Incorrect password" });
    }
    const token = issueAdminSessionToken();
    if (!token) return res.status(401).json({ message: "Incorrect password" });
    console.log(`[auth] admin password sign-in succeeded from ${req.ip}`);
    res.cookie(ADMIN_SESSION_COOKIE, token, {
      ...adminCookieOptions,
      maxAge: ADMIN_SESSION_TTL_MS,
    });
    res.set("Cache-Control", "no-store");
    return res.json({ ok: true });
  });

  // POST /api/auth/admin-logout — clears the owner password cookie. Always
  // succeeds so the normal sign-out flow can call it unconditionally.
  app.post("/api/auth/admin-logout", (_req, res) => {
    res.clearCookie(ADMIN_SESSION_COOKIE, adminCookieOptions);
    res.set("Cache-Control", "no-store");
    return res.json({ ok: true });
  });

  // GET /api/auth/status — deprecated lightweight session probe.
  app.get("/api/auth/status", (req, res) => {
    res.setHeader("Deprecation", "true");
    res.setHeader("Link", '</api/auth/user>; rel="successor-version"');
    res.json({ authenticated: Boolean(req.dbUser) });
  });
}
