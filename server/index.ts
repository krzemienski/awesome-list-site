import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
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

// BUG-006 (run13): gzip/brotli-negotiated response compression. The
// awesome-list JSON is ~3 MB uncompressed; without this every page load pays
// the full transfer. Skip event-stream responses (compression buffering
// breaks SSE-style streaming if ever added).
app.use(
  compression({
    filter: (req, res) => {
      const type = String(res.getHeader("Content-Type") || "");
      if (type.includes("text/event-stream")) return false;
      return compression.filter(req, res);
    },
  }),
);

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
  next();
});

// July 2026 audit BUG-003 (run8): the SPA HTML document carries a per-request
// CSP nonce, but static sendFile stamps a template-based ETag that never
// changes. A browser revalidation then gets 304 → it keeps the CACHED body
// (old nonce) while adopting the fresh CSP header (new nonce), so every
// inline script is blocked ("Executing inline script violates ...", 4× on
// /admin). Nonce'd HTML must never be served via 304: drop the conditional
// request headers for document navigations so sendFile always answers 200
// with a body whose stamped nonce matches its own CSP header. API routes and
// hashed /assets/* (extension'd paths) keep normal conditional caching.
app.use((req, _res, next) => {
  if (
    req.method === "GET" &&
    !req.path.startsWith("/api") &&
    (!path.extname(req.path) || req.path.endsWith(".html"))
  ) {
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];
  }
  next();
});

app.use((_req, res, next) => {
  const nonce = String(res.locals.cspNonce || "");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("X-Frame-Options", "DENY");
    // Run16 BUG-094 set an app-level HSTS header, but Replit's edge already
    // sends its own Strict-Transport-Security — the two copies arrived as
    // duplicate headers with conflicting directives (Run17 BUG-051). The edge
    // owns TLS termination, so it owns HSTS; the app copy is dropped.
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
        // Run3 audit R3-18/R3-19: style-src dropped the nonce in favor of
        // 'unsafe-inline'. Browsers IGNORE 'unsafe-inline' whenever a nonce is
        // present in the same directive, so there is no "nonce + fallback"
        // option — and the platform-injected Replit feedback widget (plus other
        // third-party snippets we don't render) sets inline style="" attributes
        // that can never carry our nonce, producing a CSP violation on every
        // page load and an unstyled widget. Inline STYLE injection is a far
        // weaker vector than script injection; script-src keeps its strict
        // nonce policy.
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
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

// R4-061: URLs with an explicit default port ("https://awesome.video:443/...")
// serve the same document as the canonical host, creating a duplicate-host
// variant whose on-page canonical disagrees with the address bar. 301 GET/HEAD
// requests to the portless host. Only the DEFAULT port for the scheme is
// stripped — a genuinely nonstandard port (e.g. dev :5000) never matches.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const host = req.headers.host || "";
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const isDefaultPort =
    (proto === "https" && host.endsWith(":443")) ||
    (proto === "http" && host.endsWith(":80"));
  if (isDefaultPort) {
    const bareHost = host.replace(/:(443|80)$/, "");
    return res.redirect(301, `${proto}://${bareHost}${req.originalUrl}`);
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
    // BUG-022 (run19): /settings is a links-only hub (no account data) while
    // its child /settings/theme was already public — a gated parent with a
    // public child turned the Theme page's "Settings" breadcrumb into a
    // one-click login wall. The whole /settings tree is public now; the
    // account-specific destinations it links to (/profile, /bookmarks) keep
    // their own gates.
    // BUG-017: /profile is a per-user page (same trust level as /bookmarks);
    // gate it server-side so anonymous deep links get 302 → /login instead of
    // the SPA shell.
    /^\/profile(\/|$)/,
  ];
  const isProtected = protectedPatterns.some(p => p.test(req.path));
  if (isProtected && !req.headers.cookie?.includes('connect.sid')) {
    // BUG-008 (run14): carry the originally requested page in ?next= so the
    // login page can return the user there after sign-in (Login already
    // validates the param against open-redirect payloads).
    return res.redirect(302, `/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
});

// BUG-v3-L02 (run12): unsupported/WebDAV-style HTTP methods (PROPFIND, TRACE,
// etc.) previously fell through to the SPA catch-all and answered 200 + HTML.
// Answer 405 with an Allow header instead — no route in the app serves them.
const SUPPORTED_METHODS = new Set([
  "GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
]);
app.use((req, res, next) => {
  if (!SUPPORTED_METHODS.has(req.method)) {
    return res
      .status(405)
      .set("Allow", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS")
      .json({ message: "Method not allowed" });
  }
  next();
});

// Run17 BUG-054: CSRF hardening for cookie-authed mutations. Browsers always
// attach an Origin header to cross-origin POST/PUT/PATCH/DELETE, so rejecting
// mutations whose Origin host differs from the request Host blocks cross-site
// forgery without breaking curl / server-to-server clients (no Origin header).
// `Origin: null` (sandboxed iframes, cross-origin redirect chains) is also
// rejected — it is a known CSRF vector and never legitimate for this app.
// Defense-in-depth alongside SameSite=Lax session cookies.
app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  const origin = req.headers.origin;
  if (!origin) return next();
  // Normalize away default ports: run15 BUG-038 showed the Replit edge can
  // surface hosts with an explicit `:443`, so `awesome.video` must compare
  // equal to `awesome.video:443` (and `:80` for http) or every browser
  // mutation in prod would 403.
  const stripDefaultPort = (host: string | undefined) =>
    host?.replace(/:(443|80)$/, "") ?? "";
  try {
    const originHost = stripDefaultPort(new URL(origin).host);
    if (originHost === stripDefaultPort(req.headers.host)) return next();
    // Fallback allowlist: PUBLIC_SITE_URL is the server's canonical site var
    // (same one og-middleware uses; defaults to https://awesome.video).
    const siteUrl = process.env.PUBLIC_SITE_URL || "https://awesome.video";
    if (originHost === stripDefaultPort(new URL(siteUrl).host)) return next();
  } catch {
    // fall through to rejection (malformed Origin)
  }
  return res.status(403).json({ message: "Cross-origin request rejected" });
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
    // Run16 BUG-016: Vite emits content-hashed filenames under /assets, so
    // they are safe to cache for a year as immutable. serveStatic
    // (server/vite.ts, unmodifiable) mounts express.static with the default
    // maxAge=0 — and send() overwrites any pre-set Cache-Control — so a
    // dedicated static handler for /assets must run FIRST.
    app.use(
      "/assets",
      express.static(path.resolve(import.meta.dirname, "public", "assets"), {
        immutable: true,
        maxAge: "1y",
      }),
    );
    // NB-009 (run18): unknown FILE-LIKE paths (/.env, /backup.zip, dead hashed
    // /assets/*.js) used to fall through to the SPA fallback and answer 200 +
    // index.html (soft-404 that masks dead assets and "confirms" sensitive
    // filenames). If the last path segment contains a dot and no real file
    // exists under the static root, answer 404 before serveStatic's fallback.
    // Extension-less SPA routes are untouched. Dev is exempt on purpose: the
    // Vite dev pipeline serves dotted module paths (/src/App.tsx, /@vite/…).
    const staticRoot = path.resolve(import.meta.dirname, "public");
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      const lastSegment = req.path.split("/").pop() ?? "";
      if (!lastSegment.includes(".")) return next();
      try {
        const decoded = decodeURIComponent(req.path);
        const candidate = path.resolve(staticRoot, "." + decoded);
        // Path-traversal guard: the resolved file must stay inside the root.
        if (candidate.startsWith(staticRoot + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return next();
        }
      } catch {
        // malformed encoding → treat as not found
      }
      return res.status(404).type("text/plain").send("Not Found");
    });
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
