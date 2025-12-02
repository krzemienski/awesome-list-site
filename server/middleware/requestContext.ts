/**
 * Request Context Middleware
 *
 * Provides comprehensive request tracking for audit logging:
 * - Generates unique request IDs for tracing
 * - Extracts client IP address (handles proxies)
 * - Captures user agent information
 * - Tracks endpoint and HTTP method
 *
 * Usage: Import getAuditContext(req) to extract audit metadata from any request
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import type { AuditContext } from '@shared/schema';

// Extend Express Request type to include audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: AuditContext;
      requestId?: string;
    }
  }
}

/**
 * Extract client IP address from request
 * Handles various proxy configurations (X-Forwarded-For, CF-Connecting-IP, etc.)
 */
function extractClientIp(req: Request): string {
  // Check various headers in order of preference
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2...
    // The first one is the original client
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0];
    return ips.trim();
  }

  // Cloudflare header
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }

  // True-Client-IP (Akamai and some CDNs)
  const trueClientIp = req.headers['true-client-ip'];
  if (trueClientIp) {
    return Array.isArray(trueClientIp) ? trueClientIp[0] : trueClientIp;
  }

  // X-Real-IP (nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to socket remote address
  const socketAddr = req.socket?.remoteAddress || req.ip || 'unknown';

  // Handle IPv6-mapped IPv4 addresses (::ffff:127.0.0.1 -> 127.0.0.1)
  if (socketAddr.startsWith('::ffff:')) {
    return socketAddr.substring(7);
  }

  return socketAddr;
}

/**
 * Extract user agent, truncating if too long
 */
function extractUserAgent(req: Request): string {
  const userAgent = req.headers['user-agent'] || 'unknown';
  // Truncate very long user agents to prevent storage issues
  const maxLength = 500;
  return userAgent.length > maxLength
    ? userAgent.substring(0, maxLength) + '...'
    : userAgent;
}

/**
 * Extract session ID from request if available
 * Checks authorization header for JWT session info
 */
function extractSessionId(req: Request): string | undefined {
  // Check for Supabase session ID in custom header
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    return Array.isArray(sessionId) ? sessionId[0] : sessionId;
  }

  // Could extract from JWT claims if needed
  // For now, we use the request ID as a correlation ID
  return undefined;
}

/**
 * Get the route pattern (with :params) instead of actual values
 * This helps group audit logs by endpoint type
 */
function getEndpointPattern(req: Request): string {
  // Express stores the matched route pattern
  if (req.route?.path) {
    return req.baseUrl + req.route.path;
  }
  // Fall back to original URL
  return req.originalUrl.split('?')[0]; // Remove query string
}

/**
 * Middleware to attach request context for audit logging
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = randomUUID();

  // Attach to request for use in route handlers
  req.requestId = requestId;

  // Set response header for client-side tracing
  res.setHeader('X-Request-ID', requestId);

  // Build audit context (endpoint will be updated after route matching)
  req.auditContext = {
    requestId,
    ipAddress: extractClientIp(req),
    userAgent: extractUserAgent(req),
    endpoint: req.originalUrl.split('?')[0], // Initial value, updated later
    httpMethod: req.method,
    sessionId: extractSessionId(req),
  };

  next();
}

/**
 * Get audit context from request
 * Safe to call even if middleware wasn't applied
 */
export function getAuditContext(req: Request): AuditContext {
  if (req.auditContext) {
    // Update endpoint with matched route pattern if available
    return {
      ...req.auditContext,
      endpoint: getEndpointPattern(req),
    };
  }

  // Fallback: generate context on-demand if middleware wasn't applied
  return {
    requestId: req.requestId || randomUUID(),
    ipAddress: extractClientIp(req),
    userAgent: extractUserAgent(req),
    endpoint: getEndpointPattern(req),
    httpMethod: req.method,
    sessionId: extractSessionId(req),
  };
}

/**
 * Create audit context for non-HTTP operations (background jobs, cron, etc.)
 */
export function createSystemAuditContext(operation: string): AuditContext {
  return {
    requestId: randomUUID(),
    ipAddress: 'system',
    userAgent: 'system-background-job',
    endpoint: operation,
    httpMethod: 'SYSTEM',
    sessionId: undefined,
  };
}

export default requestContextMiddleware;
