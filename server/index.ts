import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, runBackgroundInitialization } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { handleSSR } from "./ssr";
import { errorHandler } from "./middleware/errorHandler";
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
import { initializeLinkHealthScheduler } from "./jobs/linkHealthScheduler";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const { Pool } = pkg;
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
        `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://replit.com`,
        // BUG-014: nonce-based styles — no 'unsafe-inline'. The SSR shell's
        // <style> and the static inline <style> tags are stamped with this same
        // nonce by stampNonce() in og-middleware (which reads res.locals.cspNonce),
        // so a nonce-based style-src is fully functional — no 'unsafe-inline'
        // fallback is needed.
        `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
        "font-src 'self' https://fonts.gstatic.com",
        // BUG-014: tighten img-src from a blanket https: to a known allowlist.
        "img-src 'self' data: https://img.youtube.com https://*.ytimg.com https://avatars.githubusercontent.com https://repository-images.githubusercontent.com https://www.google.com https://www.gstatic.com",
        "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
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
  ];
  const isProtected = protectedPatterns.some(p => p.test(req.path));
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

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL is required');
  }

  // Check multiple possible migration folder locations
  const possiblePaths = [
    './migrations',
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '..', 'migrations'),
    path.join(process.cwd(), 'migrations'),
  ];

  let migrationsFolder: string | null = null;
  for (const p of possiblePaths) {
    const journalPath = path.join(p, 'meta', '_journal.json');
    if (fs.existsSync(journalPath)) {
      migrationsFolder = p;
      console.log(`Found migrations at: ${p}`);
      break;
    }
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  pool.on('error', (err) => {
    console.error('Database pool error during migration:', err.message);
  });

  // If no migrations folder found, verify database is already set up
  if (!migrationsFolder) {
    console.log('⚠️ No migrations folder found, checking if database is already configured...');
    try {
      const client = await pool.connect();
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'resources'
        ) as exists
      `);
      client.release();
      await pool.end();
      
      if (result.rows[0]?.exists) {
        console.log('✓ Database schema already exists (configured via db:push)');
        return;
      } else {
        throw new Error('Migrations folder not found and database schema is missing. Please run db:push or ensure migrations are included in build.');
      }
    } catch (error: any) {
      await pool.end();
      throw error;
    }
  }

  try {
    const db = drizzle(pool);
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder });
    console.log('✓ Migrations completed successfully');
    await pool.end();
  } catch (error: any) {
    await pool.end();
    // Handle case where relation/table already exists (PostgreSQL error code 42P07)
    const isAlreadyExistsError = error?.code === '42P07' || 
      (error?.message?.includes('already exists') && error?.message?.includes('relation'));
    if (isAlreadyExistsError) {
      console.log('✓ Database schema already up to date');
      return;
    }
    console.error('Migration failed:', error);
    throw error;
  }
}

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
