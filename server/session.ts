import session from "express-session";
import type { RequestHandler } from "express";
import connectPg from "connect-pg-simple";

export interface SessionUser {
  claims: {
    sub: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_image_url: string;
  };
  expires_at: number;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  // Secure cookies require HTTPS. The container itself serves plain HTTP (the
  // host port, the Docker healthcheck, and direct/non-proxied access are all
  // http), so gating `secure` on NODE_ENV=production silently breaks every
  // session inside Docker — the browser drops a Secure cookie sent over http,
  // so login succeeds but no session persists. Drive it from an explicit flag
  // instead: leave it off by default (works in Docker/local) and set
  // COOKIE_SECURE=true only when running behind a TLS-terminating proxy.
  const secureCookie = process.env.COOKIE_SECURE === "true";
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

// Expiry-only authentication guard. The session user is minted by
// passport-local with an `expires_at` (unix seconds); reject anything that is
// unauthenticated or past its expiry. No token refresh — local auth has no
// refresh token.
export const isAuthenticated: RequestHandler = (req, res, next) => {
  const user = req.user as SessionUser | undefined;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
};
