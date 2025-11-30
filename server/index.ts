import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { handleSSR } from "./ssr";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting configuration (Bug #8 fix - Session 7)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 60, // 60 requests per minute per IP
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // Stricter: 10 auth attempts per minute
  message: { message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // In production, serve static files (pure CSR)
    // SSR disabled: renderAppWithData(null) returns empty HTML causing hydration errors
    // React errors #418, #423 corrupt rendering, blocking modals
    // Removed 2025-11-30 to unblock UI testing
    // TODO: Implement proper SSR or migrate to Next.js based on SEO metrics
    serveStatic(app);
  }

  // Serve on PORT from environment (default 5000)
  // In Docker: PORT=3000
  const port = parseInt(process.env.PORT || '5000');
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
