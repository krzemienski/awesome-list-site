import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { PgRateLimitStore } from "./pgRateLimitStore";

/**
 * Rate Limiting Middleware
 *
 * Public developer API (/api/public/*) tiers. The tier is SERVER-OWNED: it is
 * derived only from whether a valid API key was presented, never from the
 * key's user-chosen scopes (a self-created key used to be able to claim a
 * "premium" scope).
 *
 * - Free tier: 60 requests per hour, keyed by client IP (no API key)
 * - Standard tier: 1,000 requests per hour, keyed by API key id (any valid,
 *   unrevoked, unexpired key)
 *
 * There is no premium tier.
 *
 * Response headers (IETF draft, express-rate-limit standardHeaders):
 * - RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset
 * - Retry-After on 429 responses
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
} as const;

/**
 * Custom key generator for rate limiting
 *
 * Uses API key ID if available (set by the API key middleware),
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
 * BUG-001 (Audit 2, Aug 2026): honest, content-negotiated 429 responses.
 *
 * The audit flagged bare unstyled "Too many requests" text pages with no
 * Retry-After header. App-level limiters always had Retry-After + RateLimit-*
 * (express-rate-limit standardHeaders), but a browser NAVIGATING to a
 * rate-limited /api URL still received raw JSON. This shared handler serves:
 * - a styled, self-contained HTML page when the client accepts text/html
 *   (no inline <script> — script-src is nonce-gated; meta refresh retries
 *   automatically once the window resets), or
 * - the documented JSON error shape ({ message, error, retryAfter }) for
 *   API/fetch clients.
 * Retry-After is guaranteed on both variants.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render429Page(message: string, retryAfterSec: number): string {
  const refreshIn = Math.min(Math.max(retryAfterSec, 5), 300) + 1;
  const waitCopy =
    retryAfterSec >= 90
      ? `about ${Math.ceil(retryAfterSec / 60)} minutes`
      : `about ${retryAfterSec} seconds`;
  // Brand tokens mirror client/src/styles/design-system.css editorial defaults
  // (self-contained on purpose: this page must render even if every other
  // request from this client is being throttled).
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark">
<meta http-equiv="refresh" content="${refreshIn}">
<title>Taking a quick breather — awesome.video</title>
<style>
  :root { color-scheme:dark; --bg:#000; --text:#f4f3ee; --text-2:rgba(244,243,238,.66); --accent:#ff3d52; --border:rgba(244,243,238,.16); }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:'Inter',system-ui,-apple-system,sans-serif;
         min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  main { max-width:520px; border:1px solid var(--border); padding:48px 40px; text-align:center; }
  .code { font-size:13px; letter-spacing:.18em; color:var(--accent); font-weight:600; margin-bottom:16px; }
  h1 { font-family:Georgia,'Fraunces',serif; font-weight:500; font-size:28px; letter-spacing:-0.02em; line-height:1.1; margin-bottom:14px; }
  p { color:var(--text-2); font-size:15px; line-height:1.55; }
  p + p { margin-top:10px; }
  a { color:var(--text); text-decoration:underline; text-underline-offset:3px; }
  a:hover { color:var(--accent); }
  .foot { margin-top:28px; font-size:13px; color:var(--text-2); }
</style>
</head>
<body>
<main data-testid="rate-limit-page">
  <div class="code">429 — RATE LIMITED</div>
  <h1>Taking a quick breather</h1>
  <p>${escapeHtml(message)}</p>
  <p>This page retries automatically in ${waitCopy}, or you can head <a href="/">back to the homepage</a>.</p>
  <div class="foot">awesome.video</div>
</main>
</body>
</html>`;
}

/**
 * Send a content-negotiated 429 on an arbitrary response. Preserves an
 * already-set Retry-After header (falling back to 60s so the header is ALWAYS
 * present), serves the styled HTML page to text/html clients and the
 * documented JSON shape to everyone else. Manual throttles (password reset,
 * daily AI quota) share this exact contract with the express-rate-limit
 * instances.
 */
export function send429(
  req: Request,
  res: Response,
  message = "Too many requests. Please slow down and try again shortly.",
): void {
  let retryAfterSec = Number(res.getHeader("Retry-After"));
  if (!Number.isFinite(retryAfterSec) || retryAfterSec <= 0) {
    retryAfterSec = 60;
    res.setHeader("Retry-After", String(retryAfterSec));
  }
  const accept = String(req.headers.accept || "");
  if (accept.includes("text/html")) {
    res
      .status(429)
      .type("html")
      .send(render429Page(message, retryAfterSec));
    return;
  }
  res.status(429).json({
    message,
    error: "Rate limit exceeded",
    retryAfter: retryAfterSec,
  });
}

/**
 * Shared 429 handler factory for every express-rate-limit instance in the app.
 * express-rate-limit sets Retry-After before invoking the handler; send429
 * keeps a defensive fallback so the header can never go missing.
 *
 * @param message - Human-readable copy for this limiter (shown in both variants)
 * @returns express-rate-limit `handler` implementation
 */
export function negotiated429Handler(
  message = "Too many requests. Please slow down and try again shortly.",
) {
  return (req: Request, res: Response): void => send429(req, res, message);
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
    handler: negotiated429Handler("Too many requests, please try again later"),
    // Don't skip any requests - apply to all
    skip: () => false,
    // Task #279: shared Postgres-backed store — counters live in the
    // rate_limit_hits table, so the documented limit holds across every
    // Autoscale instance (fail-open to per-instance memory on DB trouble).
    store: new PgRateLimitStore(`tier:${tier.name}`),
  });
}

/**
 * Pre-configured rate limiters for each tier. Each owns a distinct store
 * prefix, and exactly one runs per request (see publicApiRateLimiter), so the
 * shared Postgres store never double-counts.
 */
const freeTierLimiter = createRateLimiter(RATE_LIMIT_TIERS.free);
const standardTierLimiter = createRateLimiter(RATE_LIMIT_TIERS.standard);

/**
 * Public developer API limiter. Must run AFTER optionalApiKey: a request that
 * presented a valid key (req.apiKey set) is counted in that key's own
 * standard-tier bucket; every other request shares its IP's free-tier bucket.
 */
export function publicApiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const limiter = (req as any).apiKey?.id ? standardTierLimiter : freeTierLimiter;
  return limiter(req, res, next);
}
