import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { handleSSR } from "./ssr";

const app = express();

// CORS Configuration (SEC-003 fix - Session 10)
// Origin whitelist for production security
const allowedOrigins = [
  'http://localhost:3000',      // Docker production
  'http://localhost:5000',      // Local development
  'http://localhost:5173',      // Vite dev server
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
];

// Add production domain from environment if configured
if (process.env.PRODUCTION_DOMAIN) {
  allowedOrigins.push(`https://${process.env.PRODUCTION_DOMAIN}`);
  allowedOrigins.push(`https://www.${process.env.PRODUCTION_DOMAIN}`);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: [
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
  ],
  maxAge: 86400, // Preflight cache: 24 hours (in seconds)
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

// Enhanced Security Headers (Session 10 - beyond helmet defaults)
// Includes: CSP, Permissions-Policy, CORP, COEP, strict helmet config
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Vite needs unsafe-inline for dev
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://jeyldoypdkgsrfdhdcmm.supabase.co",
        "wss://jeyldoypdkgsrfdhdcmm.supabase.co", // Supabase realtime
        "https://api.anthropic.com"
      ],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"], // Prevent embedding in iframes (clickjacking)
      objectSrc: ["'none'"],
      baseUri: ["'self'"], // Prevent base tag hijacking
      formAction: ["'self'"], // Restrict form submissions
      upgradeInsecureRequests: [], // Force HTTPS for all resources
      blockAllMixedContent: [], // Block HTTP resources on HTTPS pages
      workerSrc: ["'self'", "blob:"], // Service workers
      manifestSrc: ["'self'"], // Web app manifest
      mediaSrc: ["'self'"], // Audio/video sources
    },
    reportOnly: false
  },
  hsts: {
    maxAge: 63072000, // 2 years (increased from 1 year)
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hidePoweredBy: true,
  xssFilter: true, // X-XSS-Protection (legacy but harmless)
  dnsPrefetchControl: { allow: false }, // Prevent DNS prefetching leaks
  ieNoOpen: true, // Prevent IE from executing downloads
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }, // Block Adobe cross-domain
  crossOriginEmbedderPolicy: false, // COEP: Set manually below for flexibility
  crossOriginOpenerPolicy: { policy: 'same-origin' }, // COOP: Isolate browsing context
  crossOriginResourcePolicy: { policy: 'same-origin' }, // CORP: Prevent cross-origin reads
  originAgentCluster: true // Request process isolation
}));

// Additional security headers not covered by helmet
app.use((_req, res, next) => {
  // Permissions-Policy: Restrict browser feature access
  res.setHeader('Permissions-Policy', [
    'accelerometer=()',           // Disable accelerometer
    'ambient-light-sensor=()',    // Disable light sensor
    'autoplay=(self)',            // Allow autoplay only on same origin
    'battery=()',                 // Disable battery status
    'camera=()',                  // Disable camera
    'display-capture=()',         // Disable screen capture
    'document-domain=()',         // Disable document.domain
    'encrypted-media=(self)',     // DRM only on same origin
    'fullscreen=(self)',          // Fullscreen only on same origin
    'gamepad=()',                 // Disable gamepad
    'geolocation=()',             // Disable geolocation
    'gyroscope=()',               // Disable gyroscope
    'magnetometer=()',            // Disable magnetometer
    'microphone=()',              // Disable microphone
    'midi=()',                    // Disable MIDI
    'payment=()',                 // Disable payment request
    'picture-in-picture=(self)',  // PiP only on same origin
    'publickey-credentials-get=(self)', // WebAuthn only on same origin
    'screen-wake-lock=()',        // Disable wake lock
    'speaker-selection=()',       // Disable speaker selection
    'usb=()',                     // Disable USB
    'web-share=(self)',           // Web Share only on same origin
    'xr-spatial-tracking=()'      // Disable XR tracking
  ].join(', '));

  // Cross-Origin-Embedder-Policy: credentialless for better compatibility
  // (require-corp is stricter but breaks third-party resources)
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');

  // Cache-Control for security-sensitive responses
  if (!res.getHeader('Cache-Control')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }

  next();
});

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
