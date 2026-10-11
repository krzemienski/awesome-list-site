/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middleware/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import https from 'https';
import type { RequestHandler } from 'express';

const CLERK_FAPI = 'https://frontend-api.clerk.dev';
export const CLERK_PROXY_PATH = '/api/__clerk';

/**
 * Returns the first effective public hostname for the given request,
 * preferring x-forwarded-host over the Host header so callers behind a
 * proxy see the original client-facing host.
 *
 * x-forwarded-host can take three shapes:
 *   - undefined (no proxy involved)
 *   - a single string (one proxy hop)
 *   - a comma-delimited string when an upstream appended rather than
 *     replaced the header (Node folds duplicate headers this way), or a
 *     string[] in some Express typings
 * In the multi-value case, the leftmost value is the original client-
 * facing host. Take that one in all forms. Exported so that app.ts
 * (clerkMiddleware callback) and this proxy middleware agree on which
 * hostname is canonical — otherwise multi-domain/custom-domain flows
 * break.
 */
export function getClerkProxyHost(req: {
  headers: IncomingHttpHeaders;
}): string | undefined {
  const forwarded = req.headers['x-forwarded-host'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstHop = raw?.split(',')[0]?.trim();
  return firstHop || req.headers.host?.trim() || undefined;
}

// Hop-by-hop headers (RFC 7230 §6.1) are never forwarded in either direction.
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export function clerkProxyMiddleware(): RequestHandler {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (process.env.NODE_ENV !== 'production') {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  const target = new URL(CLERK_FAPI);

  return (req, res) => {
    // Mounted at CLERK_PROXY_PATH, so req.url is already the path below it.
    const upstreamPath = req.url || '/';

    const headers: OutgoingHttpHeaders = {};
    for (const [name, value] of Object.entries(req.headers)) {
      if (value === undefined || HOP_BY_HOP.has(name)) continue;
      headers[name] = value;
    }
    headers.host = target.host;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = getClerkProxyHost(req) || '';
    headers['clerk-proxy-url'] = `${protocol}://${host}${CLERK_PROXY_PATH}`;
    headers['clerk-secret-key'] = secretKey;

    const xff = req.headers['x-forwarded-for'];
    const clientIp =
      (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '';
    if (clientIp) headers['x-forwarded-for'] = clientIp;

    const upstream = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        method: req.method,
        path: upstreamPath,
        headers,
      },
      (proxyRes) => {
        const resHeaders: OutgoingHttpHeaders = {};
        for (const [name, value] of Object.entries(proxyRes.headers)) {
          if (value === undefined || HOP_BY_HOP.has(name)) continue;
          resHeaders[name] = value;
        }

        const status = proxyRes.statusCode ?? 502;
        // Content-Length is forbidden on 1xx/204; HEAD/304 may keep theirs.
        if (status < 200 || status === 204) delete resHeaders['content-length'];

        // Clerk's dynamic Frontend API responses (/v1/environment, /v1/client,
        // JWKS, ...) arrive without a Content-Length, so relaying them would
        // use Transfer-Encoding: chunked — which the deployment edge (Cloud
        // Run) rejects, turning the app's 200 into a 500. Buffer only those so
        // they can be re-sent with a Content-Length; the body is forwarded
        // untouched so Content-Encoding is preserved. Length-known and
        // body-less responses stream through without buffering.
        const bodyless =
          req.method === 'HEAD' || status < 200 || status === 204 || status === 304;
        if (resHeaders['content-length'] !== undefined || bodyless) {
          res.writeHead(status, resHeaders);
          // Headers are already sent, so abort the response if the upstream
          // stream errors mid-pipe rather than leaving a hung client.
          proxyRes.on('error', () => res.destroy());
          proxyRes.pipe(res);
          return;
        }

        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const body = Buffer.concat(chunks);
          resHeaders['content-length'] = String(body.length);
          res.writeHead(status, resHeaders);
          res.end(body);
        });
        proxyRes.on('error', () => sendBadGateway());
      },
    );

    // Set a length so the empty 502 isn't sent chunked (which the deployment
    // edge would reject just like the original response).
    function sendBadGateway() {
      if (!res.headersSent) res.writeHead(502, { 'content-length': '0' });
      res.end();
    }

    upstream.on('error', sendBadGateway);
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  };
}
