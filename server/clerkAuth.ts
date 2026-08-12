/**
 * Clerk authentication core (Task #307 — migrated from Replit OIDC + local
 * email/password auth).
 *
 * Bridge model (ID bridge): `users.id` equals the legacy subject id, which
 * Clerk carries as `externalId` and exposes on the session token as
 * `sessionClaims.userId`. All application lookups use that bridge id.
 * `auth.userId` (the Clerk-native `user_...` id) is ONLY for Clerk API calls.
 *
 * Request flow:
 *  - `clerkMiddleware()` (mounted in server/index.ts) verifies the session
 *    cookie cryptographically and populates `getAuth(req)`.
 *  - `clerkUserContext` (below) resolves the local DB row for the signed-in
 *    user on every relevant request — the same job Passport's deserializeUser
 *    did before — and JIT-provisions a row for first-time Clerk users
 *    (replaces the old upsert-on-login / register flows).
 *  - `requireAuth` gates protected endpoints: 401 when anonymous, 503-style
 *    error propagation when the DB lookup itself failed (so an outage is not
 *    misreported as "signed out").
 */
import type { Request, RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, type User } from "@shared/schema";
import { trackServerEvent } from "./lib/mixpanelServer";

export interface ClerkSessionIdentity {
  /** Legacy bridge id — equals users.id for migrated users. */
  bridgeUserId: string;
  /** Clerk-native user id (user_...). Use ONLY for Clerk API calls. */
  clerkUserId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Local application user row for the signed-in visitor (fresh per request). */
      dbUser?: User;
      /** Clerk session identity (set whenever a valid Clerk session exists). */
      clerkIdentity?: ClerkSessionIdentity;
    }
  }
}

function claimString(claims: Record<string, unknown>, key: string): string | undefined {
  const value = claims[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Extract the session identity from a Clerk-verified request (null = anonymous). */
export function getSessionIdentity(req: Request): ClerkSessionIdentity | null {
  const auth = getAuth(req);
  if (!auth?.userId) return null;
  const claims = (auth.sessionClaims ?? {}) as Record<string, unknown>;
  return {
    bridgeUserId: claimString(claims, "userId") ?? auth.userId,
    clerkUserId: auth.userId,
    email: claimString(claims, "email"),
    firstName: claimString(claims, "firstName") ?? claimString(claims, "first_name"),
    lastName: claimString(claims, "lastName") ?? claimString(claims, "last_name"),
    imageUrl: claimString(claims, "imageUrl") ?? claimString(claims, "image_url"),
  };
}

/**
 * Resolve (and JIT-provision) the local user row for a Clerk session.
 *
 * - Migrated users: found directly by the bridge id.
 * - First-time Clerk users: inserted once with identity snapshot from the
 *   session claims (identity stays Clerk-owned afterwards; the row is never
 *   re-synced). `onConflictDoNothing` + re-select keeps this race-safe.
 * - Email collision (a pre-existing local row owns the email but has a
 *   different id): FAIL CLOSED. Session email claims are not proof of
 *   ownership strong enough to bind a session to an existing account —
 *   automatic binding would let a Clerk session carrying someone else's
 *   email inherit that account's role/bookmarks/API keys. All migrated
 *   users resolve via the bridge id, so a collision here is either stale
 *   data or an attack; it needs manual/admin reconciliation, not a bridge.
 */
export async function ensureDbUser(
  req: Request,
  identity: ClerkSessionIdentity,
): Promise<User | undefined> {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, identity.bridgeUserId))
    .limit(1);
  if (existing) return existing;

  await db
    .insert(users)
    .values({
      id: identity.bridgeUserId,
      email: identity.email ?? null,
      firstName: identity.firstName ?? null,
      lastName: identity.lastName ?? null,
      profileImageUrl: identity.imageUrl ?? null,
      role: "user",
    })
    .onConflictDoNothing();

  const [created] = await db
    .select()
    .from(users)
    .where(eq(users.id, identity.bridgeUserId))
    .limit(1);
  if (created) {
    // Row genuinely created by this request (or a concurrent twin) — this is
    // the Clerk-era "sign_up_completed" moment. Consent-gated internally.
    trackServerEvent(req, "sign_up_completed", created.id, {
      sign_up_method: "clerk",
    });
    return created;
  }

  // Insert was swallowed by a conflict that wasn't the primary key — almost
  // certainly the UNIQUE(email) constraint colliding with an existing row
  // under a different id. Deliberately fail closed (no email-based binding);
  // the visitor stays effectively signed out of app data until reconciled.
  console.error(
    `[clerkAuth] JIT provisioning conflict for bridge id ${identity.bridgeUserId}: ` +
      `an existing account owns this session's email. Refusing to auto-bind; ` +
      `manual reconciliation required.`,
  );
  return undefined;
}

/** Paths that never need a DB-backed user context (static assets etc.). */
function skipUserContext(req: Request): boolean {
  if (req.path.startsWith("/assets/")) return true;
  if (req.path.startsWith("/api/__clerk")) return true;
  const dot = req.path.lastIndexOf(".");
  if (dot > req.path.lastIndexOf("/") && !req.path.endsWith(".html")) return true;
  return false;
}

/**
 * Global middleware: attaches `req.dbUser` for signed-in visitors.
 * On DB failure it records the error in res.locals so `requireAuth` can
 * surface an honest 503 instead of a false 401.
 */
export const clerkUserContext: RequestHandler = async (req, res, next) => {
  if (skipUserContext(req)) return next();
  const identity = getSessionIdentity(req);
  if (!identity) return next();
  req.clerkIdentity = identity;
  try {
    req.dbUser = await ensureDbUser(req, identity);
  } catch (error) {
    console.error("[clerkAuth] Failed to resolve local user for Clerk session:", error);
    res.locals.clerkUserLookupError = error;
  }
  next();
};

/**
 * Auth gate for protected endpoints. Canonical 401 body matches the legacy
 * middleware: { message: "Unauthorized" }.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.dbUser) return next();
  if (res.locals.clerkUserLookupError) return next(res.locals.clerkUserLookupError);
  return res.status(401).json({ message: "Unauthorized" });
};
