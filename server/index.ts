import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, runBackgroundInitialization } from "./routes";
import { serveStatic, log } from "./vite";
import { handleSSR } from "./ssr";
import { errorHandler } from "./middleware/errorHandler";
import { runMigrations } from "./migrate";
import { initializeLinkHealthScheduler } from "./jobs/linkHealthScheduler";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// BUG-020: don't advertise the Express server via the X-Powered-By header.
app.disable("x-powered-by");

// BUG-019 / BUG-014: baseline security headers. The always-on set is safe in
// every environment; the stricter frame/CSP policy is production-only so it
// never interferes with the Replit dev iframe / Vite HMR.
//
// BUG-014: the CSP no longer relies on 'unsafe-inline'. A fresh per-request
// nonce is minted here and exposed on res.locals.cspNonce. The og-middleware
// stamps that nonce onto every inline <script>/<style> it flushes (both the
// static client/index.html boot scripts and the SSR shell <style>), so inline
// code executes under 'nonce-<value>' instead of the blanket 'unsafe-inline'.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  // BUG-014: per-request CSP nonce, applied to script-src and style-src. Always
  // generated (even in dev) so downstream middleware can read it unconditionally;
  // the CSP header itself stays production-only per the BUG-019 rationale above.
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.cspNonce = nonce;
  if (process.env.NODE_ENV === "production") {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        // BUG-014: nonce-based scripts — no 'unsafe-inline'.
        // July 2026 audit BUG-003: Replit's deployment platform injects
        // <script src="https://replit-cdn.com/feedback-widget/widget.global.js">
        // into the served HTML (it is NOT in our source, so we cannot nonce or
        // remove it) — allowlist the origin so the widget loads cleanly.
        `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://replit.com https://replit-cdn.com`,
        // BUG-014: nonce-based styles — no 'unsafe-inline'. The SSR shell's
        // <style> and the static inline <style> tags are stamped with this same
        // nonce by stampNonce() in og-middleware (which reads res.locals.cspNonce),
        // so a nonce-based style-src is fully functional — no 'unsafe-inline'
        // fallback is needed.
        `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
        "font-src 'self' https://fonts.gstatic.com",
        // MERGE NOTE (July 10, 2026): BUG-014 proposed an img-src allowlist, but
        // ResourceCard renders arbitrary external metadata.ogImage URLs via <img>,
        // so a fixed allowlist would break resource preview images in production.
        // Keeping the blanket https: for img-src (it covers the allowlist hosts too).
        "img-src 'self' data: https:",
        // M1 audit fix: allow www.google.com in connect-src (prod console CSP report).
        // BUG-003: replit.com + replit-cdn.com so the platform feedback widget
        // can phone home without spawning new CSP violations once its script loads.
        "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.google.com https://replit.com https://replit-cdn.com",
        "frame-ancestors 'none'",
        // BUG-014: add the missing hardening directives.
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ].join("; "),
    );
  }
  next();
});

// BUG-015: server-side route guard for auth-gated pages.
// Without a connect.sid cookie, redirect to /login (302) instead of serving
// the SPA shell (which only redirects client-side via JS).
app.use((req, res, next) => {
  const protectedPatterns = [
    /^\/admin(\/|$)/,
    /^\/bookmarks(\/|$)/,
    /^\/settings(\/|$)/,
    // BUG-017: /profile is a per-user page (same trust level as /bookmarks);
    // gate it server-side so anonymous deep links get 302 → /login instead of
    // the SPA shell.
    /^\/profile(\/|$)/,
  ];
  // July 2026 audit BUG-002: /settings/theme is a public, localStorage-only
  // appearance page (no account data) — exempt it so anonymous visitors can
  // change the theme instead of hitting a login wall.
  const publicExceptions = [/^\/settings\/theme(\/|$)/];
  const isProtected =
    protectedPatterns.some(p => p.test(req.path)) &&
    !publicExceptions.some(p => p.test(req.path));
  if (isProtected && !req.headers.cookie?.includes('connect.sid')) {
    return res.redirect(302, '/login');
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Run migrations before starting server in production
  if (isProduction) {
    try {
      await runMigrations();
    } catch (error) {
      console.error('❌ Failed to run migrations, cannot start server');
      process.exit(1);
    }
  }

  const server = await registerRoutes(app);

  // Centralized error handling middleware
  app.use(errorHandler);

  // Per-route Open Graph / Twitter / SEO metadata injection.
  // Must run AFTER registerRoutes (so /api/* and /og-image.png are handled by
  // their real handlers, not intercepted) but BEFORE vite/static so the HTML
  // response is rewritten with route-specific tags for crawlers that don't
  // execute JavaScript (Twitter, Facebook, Slack, iMessage, LinkedIn, etc.).
  const { ogInjectionMiddleware } = await import("./og-middleware");
  app.use(ogInjectionMiddleware());

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    // Development-only import keeps Vite and its plugins out of the production
    // runtime dependency graph.
    const { setupVite } = await import("./vite-dev");
    await setupVite(app, server);
  } else {
    // In production, add SSR handler before serving static files
    app.use(handleSSR);
    serveStatic(app);
  }

  // Use PORT environment variable in production (Replit autoscale), fallback to 5000 in development
  // Production deployments set PORT automatically for health checks
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

  const platform = process.platform;
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };

  // reusePort only supported on Linux
  if (platform === 'linux') {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on port ${port} (${isProduction ? 'production' : 'development'} mode)`);

    // Run background initialization AFTER server is listening
    // This ensures fast startup for production deployments
    runBackgroundInitialization().catch((error) => {
      console.error('❌ Background initialization error (non-fatal):', error);
    });

    // Initialize link health monitoring cron job
    initializeLinkHealthScheduler();
  }).on('error', (err) => {
    console.error(`❌ Server failed to start on port ${port}:`, err);
    process.exit(1);
  });
})();
