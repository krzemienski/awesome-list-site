import type { Request, RequestHandler } from "express";
import { storage } from "../storage";
import { asyncHandler } from "./asyncHandler";

/**
 * API Key Authentication Middleware
 *
 * Validates API keys from the Authorization header and attaches the key's
 * owner and metadata to the request.
 *
 * Expected header format: Authorization: Bearer <api-key>
 *
 * Validation checks:
 * 1. API key exists in database (looked up by SHA-256 hash)
 * 2. API key is not revoked (revokedAt is null)
 * 3. API key is not expired (expiresAt is null or in the future)
 * 4. Associated user exists
 *
 * Entitlement is SERVER-OWNED: every valid key is on the "standard" tier.
 * The key's scopes are user-chosen labels and never raise access or limits.
 *
 * On successful validation:
 * - Attaches the owner row to req.dbUser
 * - Attaches API key metadata to req.apiKey (id, name, scopes, tier)
 * - Updates lastUsedAt timestamp in background
 *
 * On validation failure:
 * - Returns 401 Unauthorized with descriptive error message
 */

/** The only tier a key can hold; assigned by the server, never by the caller. */
export const API_KEY_TIER = "standard" as const;

type ApiKeyResolution =
  | { ok: true }
  | { ok: false; message: string };

async function resolveApiKey(req: Request, authHeader: string): Promise<ApiKeyResolution> {
  // Expected format: "Bearer <api-key>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return { ok: false, message: "Unauthorized: Invalid Authorization header format. Expected: Bearer <api-key>" };
  }

  const apiKeyValue = parts[1];
  if (!apiKeyValue || apiKeyValue.trim() === "") {
    return { ok: false, message: "Unauthorized: API key is empty" };
  }

  const apiKey = await storage.getApiKey(apiKeyValue);
  if (!apiKey) {
    return { ok: false, message: "Unauthorized: Invalid API key" };
  }
  if (apiKey.revokedAt) {
    return { ok: false, message: "Unauthorized: API key has been revoked" };
  }
  if (apiKey.expiresAt && new Date() > new Date(apiKey.expiresAt)) {
    return { ok: false, message: "Unauthorized: API key has expired" };
  }

  const user = await storage.getUser(apiKey.userId);
  if (!user) {
    return { ok: false, message: "Unauthorized: Associated user not found" };
  }

  req.dbUser = user;
  (req as any).apiKey = {
    id: apiKey.id,
    name: apiKey.name,
    scopes: apiKey.scopes,
    userId: apiKey.userId,
    tier: API_KEY_TIER,
  };

  // Update lastUsedAt timestamp in background (don't await to avoid blocking)
  storage.updateApiKeyLastUsed(apiKey.id).catch((err: any) => {
    console.error("Failed to update API key lastUsedAt:", err);
  });

  return { ok: true };
}

/** Require a valid API key; 401 when it is missing or invalid. */
export const requireApiKey: RequestHandler = asyncHandler(async function requireApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).set("Cache-Control", "no-store").json({ message: "Unauthorized: Missing Authorization header" });
  }
  try {
    const result = await resolveApiKey(req, authHeader);
    if (!result.ok) return res.status(401).set("Cache-Control", "no-store").json({ message: result.message });
    return next();
  } catch (error) {
    console.error("API key authentication error:", error);
    return res.status(500).json({ message: "Internal server error during authentication" });
  }
});

/**
 * Optional API key for the public developer API. No Authorization header →
 * anonymous (free tier, IP bucket). A presented key must be valid: an
 * invalid, revoked or expired key is a 401 rather than a silent downgrade,
 * so integrators learn their key stopped working.
 */
export const optionalApiKey: RequestHandler = asyncHandler(async function optionalApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  try {
    const result = await resolveApiKey(req, authHeader);
    if (!result.ok) return res.status(401).set("Cache-Control", "no-store").json({ message: result.message });
    return next();
  } catch (error) {
    console.error("API key authentication error:", error);
    return res.status(500).json({ message: "Internal server error during authentication" });
  }
});
