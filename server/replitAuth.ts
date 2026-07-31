import * as client from "openid-client";
import { Strategy, type VerifyFunctionWithRequest } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { UserRepository } from "./repositories";
import { trackConsentedServerEvent } from "./lib/mixpanelServer";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

/**
 * Create-or-update the user row from OIDC claims.
 * @returns true when this call CREATED the account (first-ever Replit login),
 *          false for a routine upsert of an existing user. The flag comes
 *          atomically from the upsert itself (xmax = 0), so concurrent or
 *          retried callbacks can never both report creation. Task #235 uses
 *          it to emit the sign_up_completed conversion only on genuine
 *          account creation, never on subsequent logins.
 */
// ---------------------------------------------------------------------------
// Task #235: analytics consent transport for the OIDC redirect flow.
//
// Browser redirects can't carry custom headers, so before navigating to
// /api/login the client POSTs its consent state (and current Mixpanel
// distinct_id) to /api/auth/oidc-analytics-consent using the SAME header
// channel the register path uses (x-analytics-consent /
// x-mixpanel-distinct-id, built by serverConversionHeaders()). The endpoint
// stashes them in the session; the OIDC verify callback consumes them
// one-shot. CSRF safety: the global Origin-check middleware rejects
// cross-origin POSTs, and a cross-site form/nav can't set custom headers, so
// consent can never be injected via a top-level GET the way query params
// could be.
// ---------------------------------------------------------------------------

// Flags older than this are ignored — an abandoned redirect must not leave a
// consent grant lying around indefinitely (e.g. across a later revocation).
export const OIDC_CONSENT_TTL_MS = 15 * 60 * 1000;

/** Store (or clear) the pending analytics consent for an upcoming OIDC login. */
export function setOidcAnalyticsConsent(session: any, req: { get(name: string): string | undefined }): void {
  // Always reset first: the latest click's consent state is authoritative.
  delete session.analyticsConsent;
  delete session.analyticsConsentAt;
  delete session.mixpanelDistinctId;
  if (req.get("x-analytics-consent") === "granted") {
    session.analyticsConsent = "granted";
    session.analyticsConsentAt = Date.now();
    const did = req.get("x-mixpanel-distinct-id");
    if (typeof did === "string" && did.length > 0 && did.length <= 255) {
      session.mixpanelDistinctId = did;
    }
  }
}

/**
 * One-shot read of the pending consent: clears the flags unconditionally
 * (fresh or stale, granted or not) and reports whether a still-fresh grant
 * was present, plus the client's Mixpanel distinct_id when it sent one.
 */
export function consumeOidcAnalyticsConsent(session: any): { consented: boolean; mixpanelDistinctId?: string } {
  const granted = session?.analyticsConsent === "granted";
  const at = session?.analyticsConsentAt;
  const fresh = typeof at === "number" && Date.now() - at <= OIDC_CONSENT_TTL_MS;
  const mixpanelDistinctId: string | undefined = session?.mixpanelDistinctId;
  if (session) {
    delete session.analyticsConsent;
    delete session.analyticsConsentAt;
    delete session.mixpanelDistinctId;
  }
  return granted && fresh ? { consented: true, mixpanelDistinctId } : { consented: false };
}

async function upsertUser(
  claims: any,
): Promise<boolean> {
  const userRepo = new UserRepository();
  const { created } = await userRepo.upsertUserDetectingCreation({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
  return created;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunctionWithRequest = async (
    req,
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    const claims = tokens.claims();
    const isNewAccount = await upsertUser(claims);

    // Task #235: count Replit-OIDC sign-ups, not just email registrations.
    // Consent was stashed pre-redirect via POST /api/auth/oidc-analytics-consent
    // (see setOidcAnalyticsConsent above). One-shot + TTL'd: read + clear.
    try {
      const { consented, mixpanelDistinctId } = consumeOidcAnalyticsConsent(req.session as any);
      if (isNewAccount && consented && claims?.["sub"]) {
        trackConsentedServerEvent(
          "sign_up_completed",
          mixpanelDistinctId ?? String(claims["sub"]),
          { sign_up_method: "replit" },
        );
      }
    } catch {
      // Analytics must never break the login flow.
    }

    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
          passReqToCallback: true,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser(async (user: Express.User, cb) => {
    try {
      // Fetch fresh user data from DB to ensure we have the latest role
      const { UserRepository } = await import('./repositories/index.js');
      const userRepo = new UserRepository();
      const userId = (user as any).claims?.sub;
      if (userId) {
        const dbUser = await userRepo.getUser(userId);
        if (dbUser) {
          // Attach DB user data to session user object
          (user as any).dbUser = dbUser;
        }
      }
      cb(null, user);
    } catch (error) {
      cb(error);
    }
  });

  // Task #235: same-origin, header-based consent hand-off for the OIDC flow.
  // The client calls this right before navigating to /api/login (see
  // primeOidcAnalyticsConsent() in client/src/lib/mixpanel.ts). No consent
  // header → flags cleared → no event. Protected against cross-site abuse by
  // the global Origin-check middleware (server/index.ts) plus the fact that
  // cross-site requests can't attach custom headers without a CORS preflight.
  app.post("/api/auth/oidc-analytics-consent", (req, res) => {
    setOidcAnalyticsConsent(req.session as any, req);
    // Persist before the client navigates away — the OIDC redirect races the
    // session store write otherwise.
    req.session.save(() => res.status(204).end());
  });

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    // On failure, land back on the app's login page (NOT /api/login, which
    // would bounce straight back to the OIDC screen in an endless loop —
    // e.g. when the Replit account's email already belongs to a local
    // email/password account and the upsert hits the unique-email constraint).
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login?error=oauth",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

/**
 * Shape of the authenticated user attached to `req.user`.
 *
 * Two auth paths populate this: Replit OIDC (claims + tokens) and local
 * email/password login (the DB user record). The fields are therefore all
 * optional and an index signature keeps ad-hoc access permissive.
 */
export interface SessionUser {
  claims?: {
    sub?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    exp?: number;
    [key: string]: any;
  };
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  id?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  [key: string]: any;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};