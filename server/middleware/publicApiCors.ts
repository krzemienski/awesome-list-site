import type { NextFunction, Request, Response } from "express";

/**
 * CORS for the read-only developer API (/api/public/*) and its spec
 * (/api/openapi.json, which Swagger tools load by URL).
 *
 * The API is cookie-less: callers identify with an explicit
 * `Authorization: Bearer <key>` header, so any origin may call it and no
 * credentials are ever allowed. Without this, browser clients — Swagger UI /
 * Editor "Try it out", docs playgrounds, client-side apps — failed on the
 * preflight (405) or on the missing Allow-Origin header while curl worked.
 * Preflights are answered here, before the auth and rate-limit layers, so they
 * never consume a caller's bucket.
 */
export function publicApiCors(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api/public/") && req.path !== "/api/openapi.json") return next();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, RateLimit-Policy, Retry-After",
  );
  if (req.method === "OPTIONS" && req.headers["access-control-request-method"]) {
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
  next();
}
