#!/usr/bin/env node
/**
 * Audit 567's compiled-document measurement server.
 *
 * This is intentionally a small audit harness, not a second production
 * composition root.  It imports only the two document middleware pieces that
 * are being measured:
 *
 *   - ogInjectionMiddleware(), which reads the catalog through server/storage
 *     itself; it does not need the product route registrar to resolve metadata
 *     or inject semantic HTML.
 *   - handleSSR(), whose compiled import.meta.dirname is dist/ at runtime, so
 *     its renderer and template resolve from dist/ssr and dist/public.
 *
 * The API surface is deliberately only a GET proxy to the already-running
 * development server.  No product routes, auth setup, migration runner,
 * schedulers, or background initialization are imported here.
 *
 * Build and run:
 *
 *   npm run build && \
 *   npx esbuild scripts/validation/audit-567-compiled-server.ts \
 *     --bundle --platform=node --packages=external --format=esm \
 *     --outfile=dist/audit-567-server.mjs && \
 *   NODE_ENV=production node dist/audit-567-server.mjs
 *
 * The process binds only to 127.0.0.1:5101.  Use the category/resource paths
 * printed at startup for the semantic-document curls; they are selected from
 * the actual catalog storage rather than from a placeholder route.
 */

import "dotenv/config";
import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import compression from "compression";
import { ogInjectionMiddleware } from "../../server/og-middleware";
import {
  handleSSR,
  prewarmSSRRenderer,
  validateHomeSSRAssets,
} from "../../server/ssr";
import { storage } from "../../server/storage";
import { pool } from "../../server/db";
import { parsePublishableKey } from "@clerk/shared/keys";

const DIST_DIR = path.resolve(import.meta.dirname);
const PUBLIC_DIR = path.join(DIST_DIR, "public");
const SSR_DIR = path.join(DIST_DIR, "ssr");
const INDEX_FILE = path.join(PUBLIC_DIR, "index.html");
const SSR_ENTRY = path.join(SSR_DIR, "entry-server.js");
const API_ORIGIN = new URL(process.env.AUDIT_567_API_ORIGIN ?? "http://127.0.0.1:5000");
const HOST = "127.0.0.1";
const PORT = 5101;

function assertLoopbackApiOrigin(origin: URL): void {
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    !["127.0.0.1", "localhost", "::1"].includes(origin.hostname)
  ) {
    throw new Error("AUDIT_567_API_ORIGIN must be a loopback http(s) origin");
  }
}

/**
 * This mirrors the production document security contract relevant to this
 * measurement: the nonce is minted here and og-middleware stamps it onto the
 * inline SSR/static-shell tags.  The configured development Clerk Frontend API
 * origin is resolved with Clerk's actual parser and included in the same three
 * directives as production.  The audit server is not a deployment parity
 * server: Clerk's request middleware, edge headers, auth return handling, and
 * the platform-injected widget are intentionally outside this process.
 */
function configuredClerkDevelopmentOrigin(): string | null {
  const parsed = parsePublishableKey(process.env.VITE_CLERK_PUBLISHABLE_KEY);
  if (!parsed || parsed.instanceType !== "development") return null;
  try {
    const api = parsed.frontendApi;
    const url = new URL(api.includes("://") ? api : `https://${api}`);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

const clerkDevelopmentOrigin = configuredClerkDevelopmentOrigin();
const clerkDevelopmentCspSource = clerkDevelopmentOrigin ? ` ${clerkDevelopmentOrigin}` : "";

function productionCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://cdn.mxpnl.com https://us-assets.i.posthog.com https://cdn.amplitude.com https://replit.com https://replit-cdn.com https://challenges.cloudflare.com${clerkDevelopmentCspSource}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    `connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.google.com https://api-js.mixpanel.com https://api.mixpanel.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.amplitude.com https://replit.com https://replit-cdn.com https://challenges.cloudflare.com${clerkDevelopmentCspSource}`,
    `frame-src 'self' https://challenges.cloudflare.com${clerkDevelopmentCspSource}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}

function installSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.cspNonce = nonce;
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", productionCsp(nonce));
  }
  next();
}

function proxyApiGet(req: Request, res: Response): void {
  if (req.method !== "GET") {
    res.status(405).set("Allow", "GET").type("text/plain").send("Audit API proxy only accepts GET");
    return;
  }

  const transport = API_ORIGIN.protocol === "https:" ? https : http;
  const requestUrl = new URL(req.originalUrl || req.url, "http://audit.invalid");
  const headers = { ...req.headers };
  headers.host = API_ORIGIN.host;
  delete headers.connection;
  delete headers["content-length"];

  const upstream = transport.request(
    {
      protocol: API_ORIGIN.protocol,
      hostname: API_ORIGIN.hostname,
      port: API_ORIGIN.port || undefined,
      method: "GET",
      path: `${requestUrl.pathname}${requestUrl.search}`,
      headers,
    },
    (upstreamResponse) => {
      if (res.headersSent) return;
      res.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(res);
    },
  );

  upstream.once("error", () => {
    if (!res.headersSent) {
      res
        .status(502)
        .type("text/plain")
        .send("Audit API proxy could not reach the development server");
    } else {
      res.destroy();
    }
  });
  req.once("aborted", () => upstream.destroy());
  res.once("close", () => upstream.destroy());
  upstream.end();
}

function countResources(node: any): number {
  return (
    (Array.isArray(node?.resources) ? node.resources.length : 0) +
    (node?.subcategories ?? []).reduce(
      (total: number, child: any) => total + countResources(child),
      0,
    ) +
    (node?.subSubcategories ?? []).reduce(
      (total: number, child: any) => total + countResources(child),
      0,
    )
  );
}

function firstResource(node: any): any | undefined {
  const direct = (Array.isArray(node?.resources) ? node.resources : []).find(
    (resource: any) => Number.isInteger(Number(resource?.id)) && Number(resource.id) > 0,
  );
  if (direct) return direct;
  for (const child of node?.subcategories ?? []) {
    const resource = firstResource(child);
    if (resource) return resource;
  }
  for (const child of node?.subSubcategories ?? []) {
    const resource = firstResource(child);
    if (resource) return resource;
  }
  return undefined;
}

type SemanticProbe = {
  categoryPath: string;
  resourcePath: string;
  categorySlug: string;
  resourceId: number;
};

/**
 * Read the same catalog facade consumed by ogInjectionMiddleware.  Failing
 * closed here prevents this measurement process from quietly serving an empty
 * SPA shell when the requested semantic proof cannot be backed by real data.
 */
async function readSemanticProbe(): Promise<SemanticProbe> {
  let catalog: any;
  try {
    catalog = await storage.getAwesomeListFromDatabase();
  } catch {
    throw new Error("Audit server could not read catalog storage for semantic probes");
  }

  const category = (catalog?.categories ?? []).find(
    (candidate: any) =>
      typeof candidate?.slug === "string" &&
      candidate.slug.length > 0 &&
      countResources(candidate) > 0,
  );
  const resource =
    (catalog?.resources ?? []).find(
      (candidate: any) => Number.isInteger(Number(candidate?.id)) && Number(candidate.id) > 0,
    ) ?? firstResource(category);

  if (
    !category ||
    !resource ||
    !Number.isInteger(Number(resource.id)) ||
    Number(resource.id) <= 0
  ) {
    throw new Error("Audit server requires a non-empty category and resource in catalog storage");
  }

  return {
    categoryPath: `/category/${encodeURIComponent(category.slug)}`,
    resourcePath: `/resource/${Number(resource.id)}`,
    categorySlug: category.slug,
    resourceId: Number(resource.id),
  };
}

function assertCompiledBuild(): void {
  if (!fs.existsSync(INDEX_FILE)) {
    throw new Error(`Compiled public shell is missing: ${INDEX_FILE}`);
  }
  if (!fs.existsSync(SSR_ENTRY)) {
    throw new Error(`Compiled SSR entry is missing: ${SSR_ENTRY}`);
  }
}

function auditSSR(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> | void {
  if (req.method !== "GET" || req.path !== "/") {
    return handleSSR(req, res, next);
  }
  // The measured first GET / must never silently become a static SPA shell.
  // handleSSR calls next() on any request-time render/data failure; convert
  // that fallthrough into an explicit audit failure instead of continuing.
  return handleSSR(req, res, () => {
    if (!res.headersSent) {
      res.status(503).type("text/plain").send("Compiled Home SSR unavailable");
    }
  });
}

async function main(): Promise<void> {
  assertCompiledBuild();
  assertLoopbackApiOrigin(API_ORIGIN);
  // Mirror production readiness: the compiled SSR module must be loaded
  // before this audit server advertises its listening endpoint. This does not
  // load request data or warm catalog/database state. Unlike production, the
  // audit exits through main().catch() when this precondition fails because
  // measuring the SSR document without its renderer would be invalid.
  await prewarmSSRRenderer();
  // Validate the exact manifest/template/CSS contract before listening.
  await validateHomeSSRAssets();
  const probe = await readSemanticProbe();

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  app.use(
    compression({
      filter: (_req, res) => {
        const type = String(res.getHeader("Content-Type") || "");
        if (type.includes("text/event-stream")) return false;
        return compression.filter(_req, res);
      },
    }),
  );
  app.use(installSecurityHeaders);

  // This is intentionally the only API behavior: GETs are forwarded to the
  // existing dev server so the browser harness can use the same API responses.
  // No route registrar is needed by either document middleware.
  app.use("/api", proxyApiGet);

  // The ordering is the production document ordering that matters here:
  // OG captures the eventual HTML response, then SSR/static provides it.
  app.use(ogInjectionMiddleware());
  app.use(auditSSR);
  app.use(express.static(PUBLIC_DIR, { index: false }));
  app.get("*", (_req, res, next) => {
    res.sendFile(INDEX_FILE, (error) => {
      if (error) next(error);
    });
  });

  // Do not expose internal errors (which can contain connection details) in
  // this local measurement process.
  app.use((_error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (!res.headersSent) {
      res.status(500).type("text/plain").send("Audit document server error");
    }
  });

  const server = app.listen(PORT, HOST, () => {
    console.log(
      `[audit-567] compiled server listening on http://${HOST}:${PORT}; ` +
        `SSR=dist/ssr/entry-server.js; static=dist/public`,
    );
    console.log(
      `[audit-567] semantic probes category=${probe.categoryPath} ` +
        `resource=${probe.resourcePath}`,
    );
    console.log(
      `[audit-567] API GET proxy=${API_ORIGIN.origin}; ` +
        `audit-only composition (not full deployment parity)`,
    );
  });

  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown startup error";
  console.error(`[audit-567] ${message}`);
  process.exitCode = 1;
  void pool
    .end()
    .catch((cleanupError: unknown) => {
      const cleanupMessage =
        cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      console.error(`[audit-567] failed to close database pool after startup failure: ${cleanupMessage}`);
    });
});
