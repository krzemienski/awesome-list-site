/**
 * ----------------------------------------------------------------------------
 * DOMAIN ROUTER: auth-user
 * ----------------------------------------------------------------------------
 *
 * Task #303 (Major improvement 10: safer modular API architecture).
 *
 * This module is an EXACT extraction of the local-auth + Replit-auth surface
 * from server/routes.ts (source lines ~881-1441). Route order, middleware
 * arrays, and status/header/body behavior are preserved verbatim. The only
 * structural change is that the endpoints are wrapped in a registrar function
 * that accepts `app` and an explicit `AuthUserRoutesContext` carrying the
 * limiters, shared middleware, repositories, and helpers the copied handlers
 * reference (which live in the `registerRoutes` closure in routes.ts).
 *
 * The composition root wires this registrar after the API backstop limiter and
 * passes the process-wide repositories and existing auth middleware explicitly.
 *
 * Endpoints (in original order):
 *   POST /api/auth/local/login   (loginBurstLimiter, authLimiter)
 *   POST /api/auth/register      (authLimiter)
 *   POST /api/auth/forgot-password (authLimiter)
 *   POST /api/auth/reset-password  (authLimiter)
 *   GET  /api/auth/user
 *   GET  /api/auth/me
 *   POST /api/auth/logout
 *   POST /api/auth/logout-all    (isAuthenticated)
 *   GET  /api/auth/status
 *   ALL  /api/auth/login
 *   GET  /api/auth/replit-probe
 * ----------------------------------------------------------------------------
 */

import type { Express, RequestHandler } from "express";
import crypto from "crypto";
import passport from "passport";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { UserRepository, AuditRepository } from "../../repositories";
import {
  validateEmail,
  validateLoginPassword,
  validateNewPassword,
  hashPassword,
} from "../../passwordUtils";
import { checkLock, recordFailure, clearOnSuccess, allowResetRequest } from "../../loginLockout";
import { sendPasswordResetEmail } from "../../email";
import { passwordResetTokens } from "@shared/schema";
import { stripInvisible, DISPLAY_NAME_MAX } from "@shared/validation";
import { trackServerEvent } from "../../lib/mixpanelServer";
import { SITE_URL } from "../../og-middleware";
import {
  enforceConcurrentSessionLimit,
  revokeAllUserSessions,
} from "../../sessionPolicy";
import { send429 } from "../../middleware/rateLimit";

/**
 * Everything the copied auth handlers reference from the `registerRoutes`
 * closure in server/routes.ts. The registrar takes these explicitly so the
 * module carries no hidden globals.
 */
export interface AuthUserRoutesContext {
  /** IP burst limiter for login (5/min/IP). */
  loginBurstLimiter: RequestHandler;
  /** 15-min cluster auth limiter (20/15min/IP). */
  authLimiter: RequestHandler;
  /** Passport-session auth guard. */
  isAuthenticated: RequestHandler;
  userRepo: UserRepository;
  auditRepo: AuditRepository;
}

export function registerAuthUserRoutes(
  app: Express,
  ctx: AuthUserRoutesContext,
): void {
  const { loginBurstLimiter, authLimiter, isAuthenticated, userRepo, auditRepo } = ctx;

  // Local authentication routes
  app.post("/api/auth/local/login", loginBurstLimiter, authLimiter, (req, res, next) => {
    const loginEmail = typeof req.body?.email === "string" ? req.body.email : "";
    const loginPassword = req.body?.password;
    const attackerKey = req.ip || req.socket.remoteAddress || "unknown";

    // Request-shape errors are caller errors (400), while a well-formed but
    // incorrect credential pair remains the generic, non-enumerating 401.
    if (
      !validateEmail(loginEmail) ||
      typeof loginPassword !== "string" ||
      !loginPassword ||
      !validateLoginPassword(loginPassword)
    ) {
      return res.status(400).json({ message: "Invalid login request" });
    }

    // Brute-force cooldown is scoped to attacker IP + email, never the account
    // alone. No exact unlock time is exposed in a body or Retry-After header.
    const lock = checkLock(loginEmail, attackerKey);
    if (lock.locked) {
      return res.status(423).json({
        message: "Too many failed login attempts from this client. Try again later.",
      });
    }

    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.log('[local/login] Authentication error:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!user) {
        // Count this failure toward the lockout threshold (generic message — no enumeration).
        recordFailure(loginEmail, attackerKey);
        console.log('[local/login] Authentication failed:', info?.message);
        // Run16 BUG-042: security-relevant auth events now hit the audit trail.
        // performedBy stays null — the attempted email may not map to any user
        // (FK to users.id), so the identity attempted lives in `changes`.
        auditRepo.logResourceAudit(null, 'auth.login_failed', undefined, { email: loginEmail }, 'Local login failed')
          .catch((e) => console.error('[audit] login_failed log error:', e));
        // NB-050 (run23): ONE generic 401 string on every login-failure path —
        // the old fallback "Invalid credentials" differed from the strategy's
        // "Invalid email or password", a distinguishable pair.
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
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

          try {
            await enforceConcurrentSessionLimit(user.claims.sub, req.sessionID);
          } catch (policyError) {
            console.error("[local/login] Session policy enforcement failed:", policyError);
            return req.session.destroy(() => {
              res.clearCookie("connect.sid", { path: "/" });
              res.status(500).json({ message: "Failed to save session" });
            });
          }

          // Successful login clears only this attacker's accumulated failures.
          clearOnSuccess(loginEmail, attackerKey);

          // Run16 BUG-042: record successful logins in the audit trail.
          auditRepo.logResourceAudit(null, 'auth.login', user.claims.sub, { email: user.claims.email }, 'Local login success')
            .catch((e) => console.error('[audit] login log error:', e));

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
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { email: rawEmail, password } = req.body ?? {};

      if (typeof rawEmail !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
      }
      // Run15 BUG-001: emails are one logical identity regardless of case.
      // Store lowercase so QATEST+CASE1@x.com and qatest+case1@x.com can never
      // become two accounts (getUserByEmail is case-insensitive to match).
      const email = rawEmail.trim().toLowerCase();
      if (!validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const pwCheck = validateNewPassword(password);
      if (!pwCheck.valid) {
        return res.status(400).json({ message: pwCheck.error || "Invalid password" });
      }

      const existing = await userRepo.getUserByEmail(email);
      if (existing) {
        // NB-048 (run23): the explicit 409 "already exists" was an
        // account-enumeration oracle (login/forgot-password are generic, so
        // register was the one path that confirmed an email). Burn a hash for
        // timing parity with the success path and answer generically. Note:
        // without an email-verification flow the 201-vs-400 status itself
        // remains a weak oracle; the message no longer confirms anything.
        await hashPassword(password);
        return res.status(400).json({
          message:
            "Unable to create an account with these details. If you already have an account, sign in or reset your password.",
        });
      }

      const hashed = await hashPassword(password);
      // BUG-009 (run19): the register UI promises "your display name starts as
      // the part before the @" (Run17 BUG-040 hint) but nothing ever stored it,
      // so every local account had name NULL and the admin Users table showed
      // an unidentifiable wall of "—". Derive it here so the promise is true.
      // Run21 R4-050: ONE display-name cap everywhere (register derivation,
      // profile editor, admin name endpoint) — DISPLAY_NAME_MAX from the
      // shared validation module, so a derived name can always be re-saved.
      const derivedFirstName = stripInvisible(email.split("@")[0]).slice(0, DISPLAY_NAME_MAX);
      const created = await userRepo.upsertUser({ email, password: hashed, role: "user", firstName: derivedFirstName });

      // Run16 BUG-042: record account creation in the audit trail.
      auditRepo.logResourceAudit(null, 'auth.register', created.id, { email: created.email }, 'Local account created')
        .catch((e) => console.error('[audit] register log error:', e));

      // Task #233: server-side conversion event — survives ad blockers.
      // Consent-gated inside trackServerEvent (x-analytics-consent header);
      // the client no longer emits this Mixpanel event itself. No PII.
      trackServerEvent(req, 'sign_up_completed', created.id, { sign_up_method: 'password' });

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

  // Self-service password reset — request stage. ALWAYS responds with the same
  // generic 200 (no account enumeration) and does the token/email work
  // fire-and-forget so response timing doesn't leak whether the account exists.
  // OAuth-only accounts (no local password) are silently skipped. Throttled per
  // email AND per IP before any lookup.
  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    const GENERIC = { message: "If an account with that email exists, we've sent a password reset link." };
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      if (!email || !validateEmail(email)) {
        return res.status(400).json({ message: "A valid email address is required" });
      }

      const ip =
        req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
        req.ip ||
        "unknown";
      if (!allowResetRequest(email, ip)) {
        // BUG-001 (Audit 2): manual throttles share the negotiated 429
        // contract (styled HTML for browser navigations, JSON otherwise),
        // keeping this path's 15-minute Retry-After.
        res.setHeader("Retry-After", "900");
        return send429(req, res, "Too many reset requests. Please try again in a little while.");
      }

      // Respond immediately with the generic message; do the real work after.
      res.status(200).json(GENERIC);

      // Fire-and-forget so DB/email latency can't be used to enumerate accounts.
      void (async () => {
        try {
          const user = await userRepo.getUserByEmail(email);
          if (!user || !user.password || !user.email) return; // no account, or OAuth-only

          const rawToken = crypto.randomBytes(32).toString("hex");
          const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

          await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

          // In production always use the server-authoritative SITE_URL — never
          // the client-controlled Host header (password-reset poisoning vector).
          // The Host fallback is dev-only so the localhost console link works.
          const base = (
            process.env.NODE_ENV === "production"
              ? SITE_URL
              : process.env.SITE_URL || `${req.protocol}://${req.get("host")}`
          ).replace(/\/+$/, "");
          const resetUrl = `${base}/reset-password?token=${rawToken}`;
          await sendPasswordResetEmail(user.email, resetUrl);
        } catch (e) {
          console.error("[/api/auth/forgot-password] async work error:", e);
        }
      })();
    } catch (error) {
      console.error("[/api/auth/forgot-password] Error:", error);
      if (!res.headersSent) return res.status(200).json(GENERIC);
    }
  });

  // Self-service password reset — redemption stage. Validates the new password
  // FIRST (so a weak password never burns a valid token), then atomically claims
  // the token in a single UPDATE ... RETURNING (closes the double-use race). On
  // success it rotates the password, kills ALL of the user's sessions (the person
  // resetting is not signed in), voids their other outstanding tokens, and clears
  // any login lockout.
  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, newPassword } = req.body ?? {};
      if (typeof token !== "string" || !token || typeof newPassword !== "string") {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const pwCheck = validateNewPassword(newPassword);
      if (!pwCheck.valid) {
        return res.status(400).json({ message: pwCheck.error || "Invalid password" });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      // Atomic single-use claim: only succeeds if unused AND unexpired.
      const claim = await db.execute(sql`
        UPDATE password_reset_tokens
        SET used_at = now()
        WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
        RETURNING user_id
      `);
      const claimedRows = (claim as any).rows ?? [];
      if (claimedRows.length === 0) {
        return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
      }
      const userId = claimedRows[0].user_id as string;

      const user = await userRepo.getUser(userId);
      if (!user) {
        return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
      }

      const hashed = await hashPassword(newPassword);
      await userRepo.upsertUser({ id: user.id, email: user.email, password: hashed, role: user.role });

      // Kill EVERY session for this user (no current-session exclusion — the
      // resetter is not authenticated) and void their other pending tokens.
      await db.execute(sql`
        DELETE FROM sessions
        WHERE sess->'passport'->'user'->'claims'->>'sub' = ${userId}
      `);
      await db.execute(sql`
        DELETE FROM password_reset_tokens
        WHERE user_id = ${userId} AND used_at IS NULL
      `);

      // Let them sign in immediately even if the account was in a lockout window.
      if (user.email) clearOnSuccess(user.email);

      return res.status(200).json({ message: "Your password has been reset. You can now sign in." });
    } catch (error) {
      console.error("[/api/auth/reset-password] Error:", error);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Note: Database seeding and data initialization moved to runBackgroundInitialization()
  // This ensures the server starts quickly for production deployments

  // --- Auth Routes (from Replit Auth blueprint) ---
  
  // GET /api/auth/user - Get current user (public endpoint)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      console.log('[/api/auth/user] Request received');
      console.log('[/api/auth/user] isAuthenticated:', req.isAuthenticated?.());
      console.log('[/api/auth/user] req.user?.dbUser:', req.user?.dbUser
        ? { id: req.user.dbUser.id, email: req.user.dbUser.email, role: req.user.dbUser.role }
        : undefined);
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
        // Run22 BUG-038: join whichever name parts exist — the old
        // `firstName && lastName` ternary dropped lastName entirely when
        // firstName was cleared (showed the email prefix instead of "User").
        name: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ')
          || dbUser.email?.split('@')[0] || 'User',
        avatar: dbUser.profileImageUrl,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
        // Run22 BUG-020: lets the Profile page show a pending private
        // deletion request without an extra round-trip.
        deletionRequestedAt: dbUser.deletionRequestedAt ?? null,
      };

      console.log('[/api/auth/user] Returning user:', user);
      res.json({ user, isAuthenticated: true });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // GET /api/auth/me - Authenticated-user alias (NEW-017). Unlike /api/auth/user
  // (which always 200s with { user: null } so the SPA can boot anonymously),
  // /me follows REST convention: 401 when unauthenticated, else the mapped user.
  app.get('/api/auth/me', async (req: any, res) => {
    try {
      // NB-023 (run23): /api/auth/user is the ONE canonical identity endpoint
      // (200 + { user, isAuthenticated } always, so the SPA can boot
      // anonymously). This REST-style alias stays for API consumers but is
      // formally deprecated to stop the three-contracts drift.
      res.setHeader('Deprecation', 'true');
      res.setHeader('Link', '</api/auth/user>; rel="successor-version"');
      // BUG-051 (run14): canonical 401 body everywhere is
      // { message: "Unauthorized" } — matches isAuthenticated middleware.
      if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      let dbUser = req.user.dbUser;
      if (!dbUser) {
        dbUser = await userRepo.getUser(req.user.claims.sub);
      }
      if (!dbUser) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      res.json({
        id: dbUser.id,
        email: dbUser.email,
        // Run22 BUG-038: same fix as /api/auth/user — never drop lastName.
        name: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ')
          || dbUser.email?.split('@')[0] || 'User',
        avatar: dbUser.profileImageUrl,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
      });
    } catch (error) {
      console.error('Error fetching user (me):', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // POST /api/auth/logout - Logout user
  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      // BUG-092/094: req.logout() alone only clears passport's req.user — it does
      // NOT destroy the session record or clear the connect.sid cookie. Because the
      // server-side route guard (server/index.ts) gates protected pages on cookie
      // PRESENCE, a lingering connect.sid let deep-links to /admin, /profile etc.
      // stay reachable after logout. Destroy the session and clear the cookie so
      // logout actually invalidates the session end-to-end.
      // Run16 BUG-042: capture identity BEFORE logout/destroy wipes req.user.
      const logoutUserId: string | undefined = req.user?.claims?.sub;
      req.logout((logoutErr: any) => {
        if (logoutErr) {
          console.error("Error during req.logout:", logoutErr);
          return res.status(500).json({ message: "Failed to logout" });
        }
        req.session?.destroy((destroyErr: any) => {
          if (destroyErr) {
            console.error("Error destroying session:", destroyErr);
            return res.status(500).json({ message: "Failed to logout" });
          }
          res.clearCookie("connect.sid", { path: "/" });
          if (logoutUserId) {
            auditRepo.logResourceAudit(null, 'auth.logout', logoutUserId, undefined, 'Logout')
              .catch((e) => console.error('[audit] logout log error:', e));
          }
          res.json({ success: true });
        });
      });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // POST /api/auth/logout-all - Revoke this account's sessions on every device.
  app.post('/api/auth/logout-all', isAuthenticated, async (req: any, res) => {
    const logoutUserId: string | undefined = req.user?.claims?.sub;
    if (!logoutUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // The store deletion is the authoritative all-device revocation. Do it
      // before mutating Passport state so a database failure leaves the
      // current session genuinely intact and the client's failure message is
      // truthful. Once this succeeds, the current row is already invalid.
      const revokedSessions = await revokeAllUserSessions(logoutUserId);
      req.session.destroy((destroyError: any) => {
        if (destroyError) {
          // The authoritative DELETE above already removed the current row;
          // a second idempotent store deletion failure cannot restore it.
          console.error("Error finalizing current session cleanup:", destroyError);
        }
        res.clearCookie("connect.sid", { path: "/" });
        return res.json({ success: true, revokedSessions });
      });
    } catch (error) {
      console.error("Error revoking account sessions:", error);
      return res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Run3 audit R3-10: consistent /api/auth/* surface.
  // GET /api/auth/status — lightweight session probe (no user payload).
  app.get('/api/auth/status', (req: any, res) => {
    // NB-023 (run23): deprecated alias — see /api/auth/user (canonical).
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</api/auth/user>; rel="successor-version"');
    res.json({ authenticated: Boolean(req.isAuthenticated?.() && req.user) });
  });
  // /api/auth/login was probed by auditors and 404'd; answer with a 405 that
  // documents the real login endpoints instead.
  app.all('/api/auth/login', (_req, res) => {
    res.status(405).set('Allow', 'POST').json({
      message:
        'Use POST /api/auth/local/login (email/password) or GET /api/login (Replit OAuth).',
    });
  });

  // BUG-006: content-validating Replit sign-in preflight.
  // The client CANNOT validate replit.com reachability itself: a browser
  // `no-cors` fetch returns an opaque response that resolves even for a
  // Cloudflare/WAF 403 challenge, so a blocked user would still be redirected
  // into /api/login and strand on the challenge page. This server-side probe
  // fetches the OIDC discovery document (a fixed, non-user URL — no SSRF
  // surface) and only reports reachable when BOTH the status is 200 AND the
  // body is JSON carrying the stable OIDC markers (`issuer` +
  // `authorization_endpoint`). A WAF/challenge/login-block/malformed body has
  // none of those markers, so it fails CLOSED. The client keeps the user in
  // the app and shows the email-signin fallback when this returns ok:false.
  let replitProbeCache: { at: number; ok: boolean } | null = null;
  const REPLIT_PROBE_TTL = 30_000; // cache reachability for 30s to avoid abuse
  app.get('/api/auth/replit-probe', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (replitProbeCache && Date.now() - replitProbeCache.at < REPLIT_PROBE_TTL) {
      return res.json({ ok: replitProbeCache.ok });
    }
    const issuer = process.env.ISSUER_URL ?? 'https://replit.com/oidc';
    const discoveryUrl = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    const finish = (ok: boolean) => {
      replitProbeCache = { at: Date.now(), ok };
      res.json({ ok });
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(discoveryUrl, {
        signal: controller.signal as any,
        redirect: 'follow',
        headers: { Accept: 'application/json' },
      });
      // Status must be 200 — a 403 challenge, 5xx, or redirect-to-login all fail.
      if (response.status !== 200) return finish(false);
      // A Cloudflare/WAF challenge is served as text/html, never JSON.
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) return finish(false);
      const raw = await response.text();
      let doc: any;
      try {
        doc = JSON.parse(raw);
      } catch {
        return finish(false); // malformed / challenge body masquerading as JSON
      }
      // Stable, documented OIDC discovery markers. Their presence proves we
      // reached the real authorization server, not an interstitial page.
      const ok =
        typeof doc?.issuer === 'string' &&
        typeof doc?.authorization_endpoint === 'string' &&
        doc.authorization_endpoint.startsWith('http');
      return finish(ok);
    } catch {
      // Timeout / DNS block / network failure → fail closed.
      return finish(false);
    } finally {
      clearTimeout(timer);
    }
  });

  // Note: /api/login, /api/callback are set up in setupAuth()
}
