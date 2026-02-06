import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

/**
 * Rate Limiting Middleware
 *
 * Implements tiered rate limiting for the public API based on API key scopes.
 * Prevents abuse while allowing legitimate usage from authenticated clients.
 *
 * Rate limit tiers:
 * - Free tier: 60 requests per hour (for unauthenticated or free API keys)
 * - Standard tier: 1,000 requests per hour (for standard API keys)
 * - Premium tier: 10,000 requests per hour (for premium API keys)
 *
 * Rate limiting is keyed by:
 * - API key if present (from req.apiKey.id set by requireApiKey middleware)
 * - IP address if no API key is present
 *
 * Response headers:
 * - X-RateLimit-Limit: Maximum requests allowed in window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Timestamp when the rate limit resets
 * - Retry-After: Seconds to wait before retrying (on 429 responses)
 */

export interface RateLimitTier {
  /** Maximum number of requests allowed in the time window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Tier name for logging/debugging */
  name: string;
}

/**
 * Rate limit tier configurations
 */
export const RATE_LIMIT_TIERS = {
  free: {
    name: "free",
    max: 60,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  standard: {
    name: "standard",
    max: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  premium: {
    name: "premium",
    max: 10000,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Custom key generator for rate limiting
 *
 * Uses API key ID if available (set by requireApiKey middleware),
 * otherwise falls back to IP address for unauthenticated requests.
 *
 * @param req - Express request object
 * @returns Unique key for rate limiting
 */
function generateRateLimitKey(req: Request): string {
  // Check if API key is present (set by requireApiKey middleware)
  const apiKey = (req as any).apiKey;

  if (apiKey?.id) {
    // Use API key ID as the rate limit key
    return `apikey:${apiKey.id}`;
  }

  // Fall back to IP address for unauthenticated requests
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return `ip:${ip}`;
}

/**
 * Custom handler for rate limit exceeded responses
 *
 * Returns a JSON response with rate limit information when the limit is exceeded.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
function rateLimitExceededHandler(req: Request, res: Response): void {
  res.status(429).json({
    message: "Too many requests, please try again later",
    error: "Rate limit exceeded",
    retryAfter: res.getHeader("Retry-After"),
  });
}

/**
 * Creates a rate limiter middleware with the specified tier configuration
 *
 * @param tier - Rate limit tier configuration
 * @returns Express middleware function for rate limiting
 */
export function createRateLimiter(tier: RateLimitTier) {
  return rateLimit({
    windowMs: tier.windowMs,
    max: tier.max,
    message: {
      message: `Rate limit exceeded for ${tier.name} tier`,
      error: "Too many requests",
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    keyGenerator: generateRateLimitKey,
    handler: rateLimitExceededHandler,
    // Don't skip any requests - apply to all
    skip: () => false,
    // Store rate limit data in memory (suitable for single-instance deployments)
    // For multi-instance deployments, consider using a shared store like Redis
  });
}

/**
 * Dynamic rate limiter that selects the appropriate tier based on API key scopes
 *
 * Checks the API key scopes (if present) and applies the appropriate rate limit:
 * - premium scope → Premium tier (10,000 req/hour)
 * - standard scope → Standard tier (1,000 req/hour)
 * - No API key or no special scope → Free tier (60 req/hour)
 *
 * Note: This middleware should be applied AFTER the requireApiKey middleware
 * (or used on routes where requireApiKey is optional) so that req.apiKey is available.
 */
export function dynamicRateLimiter(req: Request, res: Response, next: () => void) {
  const apiKey = (req as any).apiKey;

  let tier: RateLimitTier;

  if (apiKey?.scopes) {
    const scopes = apiKey.scopes as string[];

    if (scopes.includes("premium")) {
      tier = RATE_LIMIT_TIERS.premium;
    } else if (scopes.includes("standard")) {
      tier = RATE_LIMIT_TIERS.standard;
    } else {
      tier = RATE_LIMIT_TIERS.free;
    }
  } else {
    // No API key present - use free tier
    tier = RATE_LIMIT_TIERS.free;
  }

  // Apply the selected tier's rate limiter
  const limiter = createRateLimiter(tier);
  return limiter(req, res, next);
}

/**
 * Pre-configured rate limiters for each tier
 *
 * Use these for routes where the tier is fixed and doesn't depend on API key scopes.
 */
export const freeTierLimiter = createRateLimiter(RATE_LIMIT_TIERS.free);
export const standardTierLimiter = createRateLimiter(RATE_LIMIT_TIERS.standard);
export const premiumTierLimiter = createRateLimiter(RATE_LIMIT_TIERS.premium);
