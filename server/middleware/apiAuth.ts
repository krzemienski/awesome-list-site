import type { RequestHandler } from "express";
import { storage } from "../storage";

/**
 * API Key Authentication Middleware
 *
 * Validates API keys from the Authorization header and attaches the authenticated
 * user to the request object. This middleware is used to protect public API endpoints
 * and enforce rate limits based on API key tiers.
 *
 * Expected header format: Authorization: Bearer <api-key>
 *
 * Validation checks:
 * 1. API key exists in database
 * 2. API key is not revoked (revokedAt is null)
 * 3. API key is not expired (expiresAt is null or in the future)
 * 4. Associated user exists
 *
 * On successful validation:
 * - Attaches user object to req.user
 * - Attaches API key metadata to req.apiKey (scopes, etc.)
 * - Updates lastUsedAt timestamp in background
 *
 * On validation failure:
 * - Returns 401 Unauthorized with descriptive error message
 */
export const requireApiKey: RequestHandler = async (req, res, next) => {
  // Extract API key from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Unauthorized: Missing Authorization header"
    });
  }

  // Expected format: "Bearer <api-key>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      message: "Unauthorized: Invalid Authorization header format. Expected: Bearer <api-key>"
    });
  }

  const apiKeyValue = parts[1];

  if (!apiKeyValue || apiKeyValue.trim() === "") {
    return res.status(401).json({
      message: "Unauthorized: API key is empty"
    });
  }

  try {
    // Fetch API key from database
    const apiKey = await storage.getApiKey(apiKeyValue);

    if (!apiKey) {
      return res.status(401).json({
        message: "Unauthorized: Invalid API key"
      });
    }

    // Check if API key is revoked
    if (apiKey.revokedAt) {
      return res.status(401).json({
        message: "Unauthorized: API key has been revoked"
      });
    }

    // Check if API key is expired
    if (apiKey.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(apiKey.expiresAt);

      if (now > expiresAt) {
        return res.status(401).json({
          message: "Unauthorized: API key has expired"
        });
      }
    }

    // Fetch the associated user
    const user = await storage.getUser(apiKey.userId);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized: Associated user not found"
      });
    }

    // Attach user and API key metadata to request
    req.user = user as any;
    (req as any).apiKey = {
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      userId: apiKey.userId,
    };

    // Update lastUsedAt timestamp in background (don't await to avoid blocking)
    storage.updateApiKeyLastUsed(apiKey.id).catch(err => {
      // Silently log errors in background update (don't fail the request)
      console.error("Failed to update API key lastUsedAt:", err);
    });

    // Authentication successful
    return next();

  } catch (error) {
    console.error("API key authentication error:", error);
    return res.status(500).json({
      message: "Internal server error during authentication"
    });
  }
};
