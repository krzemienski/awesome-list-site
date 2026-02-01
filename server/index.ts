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
const { Pool } = pkg;

const app = express();
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

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // Single connection for migration
    connectionTimeoutMillis: 15000, // Longer timeout for Neon cold starts
  });

  pool.on('error', (err) => {
    console.error('Database pool error during migration:', err.message);
  });

  try {
    const db = drizzle(pool);
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('✓ Migrations completed successfully');
    await pool.end();
  } catch (error) {
    await pool.end();
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
