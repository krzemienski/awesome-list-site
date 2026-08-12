/**
 * ----------------------------------------------------------------------------
 * OPERATIONS.TS - Operational / Meta Route Registrar
 * ----------------------------------------------------------------------------
 *
 * Domain router module extracted from server/routes.ts (Task #303). It mounts
 * the operational and API-meta surfaces that were previously registered inline
 * at the tail of registerRoutes() (former routes.ts lines ~8016-8240):
 *
 *   - Liveness / readiness health probes (/api/health, /api/health/live,
 *     /api/health/ready, /api/admin/operations/health, /api/health/ai)
 *   - Public developer API mount (registerPublicApiRoutes)
 *   - Wrong-method 405 handlers for the public collection routes
 *   - Non-numeric /api/resources/:id 404/405 handler
 *   - OpenAPI spec + human-readable docs (/api/openapi.json, /api/docs)
 *   - JSON 404/405 catch-all for unmatched /api/* routes
 *
 * IMPORTANT: this registrar MUST run at the very end of route registration —
 * the trailing app.all()/app.use('/api', ...) fallbacks only behave correctly
 * when every real route is already mounted. Behavior is copied verbatim; route
 * ordering is preserved. The registrar accepts an `app` plus a context object
 * supplying the shared middleware + repositories the handlers need.
 * ----------------------------------------------------------------------------
 */

import type { Express, RequestHandler } from "express";
import { pool } from "../../db";
import { getSwaggerSpec } from "../../openapi";
import { claudeService } from "../../ai/claudeService";
import { registerPublicApiRoutes } from "../../api/public";
import { checkReadiness, getReadinessSnapshot } from "../../health";
import { getHeavyWorkSnapshot } from "../../ops/heavyWork";
import { getOperationalTelemetrySnapshot } from "../../ops/operationalTelemetry";
import { getPublicCacheSnapshot } from "../../cache/publicCache";
import type { UserRepository } from "../../repositories";

/**
 * Dependencies the operational handlers need from the composing module. These
 * mirror the values that live in the registerRoutes() closure so the extracted
 * handlers keep behaving identically.
 */
export interface OperationsRouteContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
  userRepo: UserRepository;
}

/**
 * Registers the operational + API-meta route surfaces onto `app`.
 * MUST be invoked LAST so the trailing 405/404 fallbacks only match requests no
 * real route handled. Ordering is identical to the original inline block.
 */
export function registerOperationsRoutes(
  app: Express,
  context: OperationsRouteContext,
): void {
  const { isAuthenticated, isAdmin, userRepo } = context;

  // Compatibility liveness plus explicit process-only liveness. Neither route
  // touches the database, so an orchestrator can distinguish a live process
  // from a process that is ready to serve database-dependent traffic.
  app.get("/api/health", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ status: "ok" });
  });
  app.get("/api/health/live", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ status: "ok" });
  });
  app.get("/api/health/ready", async (_req, res) => {
    const readiness = await checkReadiness();
    res.set("Cache-Control", "no-store");
    if (!readiness.ready) res.set("Retry-After", "1");
    res.status(readiness.ready ? 200 : 503).json({
      status: readiness.ready ? "ready" : "not_ready",
    });
  });

  app.get(
    "/api/admin/operations/health",
    isAuthenticated,
    isAdmin,
    async (_req, res) => {
      const readiness = await checkReadiness();
      res.set("Cache-Control", "no-store");
      res.json({
        status: readiness.ready ? "ready" : "degraded",
        readiness: getReadinessSnapshot(),
        databasePool: {
          max: 3,
          total: pool.totalCount,
          idle: pool.idleCount,
          active: Math.max(0, pool.totalCount - pool.idleCount),
          waiting: pool.waitingCount,
        },
        publicCache: getPublicCacheSnapshot(),
        heavyWork: getHeavyWorkSnapshot(),
        telemetry: getOperationalTelemetrySnapshot(),
      });
    },
  );

  // AI service health check (documented in docs/AI-SERVICES.md).
  // NB-005/NB-057 (run23): anonymous callers get availability status ONLY.
  // Internal counters (requestCount/cacheSize/cacheHitRate) are admin-only,
  // and ?deep=1 — which spends a real paid Claude round-trip — requires an
  // admin session (anonymous → 401, non-admin → 403). Before this, any
  // visitor could trigger paid API calls in a loop and read internal stats.
  app.get("/api/health/ai", async (req: any, res) => {
    try {
      const stats = claudeService.getStats();
      const deep = req.query.deep === '1' || req.query.deep === 'true';

      const sessionUserId = req.dbUser?.id;
      const sessionUser = sessionUserId ? await userRepo.getUser(sessionUserId) : undefined;
      const isAdminUser = !!sessionUser && sessionUser.role === 'admin';

      if (!isAdminUser) {
        if (deep) {
          return sessionUserId
            ? res.status(403).json({ message: 'Forbidden: Admin access required' })
            : res.status(401).json({ message: 'Unauthorized' });
        }
        // Public shape: availability only, no internal counters.
        return res.json({ status: stats.available ? 'healthy' : 'unavailable' });
      }

      if (!deep) {
        return res.json({
          status: stats.available ? 'healthy' : 'unavailable',
          ...stats,
        });
      }

      const isConnected = await claudeService.testConnection();
      res.json({
        status: isConnected ? 'healthy' : 'unavailable',
        connectionOk: isConnected,
        ...stats,
      });
    } catch (error) {
      console.error('Error checking AI health:', error);
      res.status(500).json({ status: 'error', error: 'Failed to check AI service health' });
    }
  });

  // Public developer API (read-only, rate-limited) + API-key identity endpoint.
  // Registered here so its concrete /api/public/* routes are matched before the
  // catch-all 404 below.
  registerPublicApiRoutes(app);

  // Run16 BUG-091: wrong-method requests on existing endpoints used to return
  // 404 as if the path didn't exist. These app.all() handlers sit AFTER the
  // real routes, so they only see methods no real route matched → 405 + Allow.
  // OPTIONS passes through (preflight/introspection stays untouched).
  const PUBLIC_METHOD_ALLOW: Array<[string, string]> = [
    ['/api/resources', 'GET, POST'],
    ['/api/search', 'GET'],
    ['/api/categories', 'GET'],
    ['/api/journeys', 'GET'],
    ['/api/awesome-list', 'GET'],
    ['/api/awesome-list/nav', 'GET'],
  ];
  for (const [routePath, allow] of PUBLIC_METHOD_ALLOW) {
    app.all(routePath, (req, res, next) => {
      if (req.method === 'OPTIONS') return next();
      res.set('Allow', allow);
      res.status(405).json({ message: `Method ${req.method} not allowed. Allowed: ${allow}` });
    });
  }

  // Run16 BUG-091: one "not found" body per semantic — /api/resources/abc used
  // to fall to the generic catch-all ('Not found') while /api/resources/0 said
  // 'Resource not found'. A non-numeric id is still a resource lookup. Non-GET
  // methods on the detail path get 405 like the collections above.
  app.all('/api/resources/:id', (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (req.method === 'GET' || req.method === 'HEAD') {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.set('Allow', 'GET');
    return res.status(405).json({ message: `Method ${req.method} not allowed. Allowed: GET` });
  });

  // NB-025 / NB-056 (run23): the OpenAPI spec (server/openapi.ts) existed but
  // was never mounted, while docs/API.md and the /api/public/* module header
  // pointed readers at /api/docs (404). Serve the machine-readable spec at
  // /api/openapi.json and a CSP-safe (no external scripts) human-readable
  // index at /api/docs.
  app.get('/api/openapi.json', (_req, res) => {
    res.json(getSwaggerSpec());
  });
  app.get('/api/docs', (_req, res) => {
    const swaggerSpec = getSwaggerSpec();
    const esc = (s: string) =>
      String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows: string[] = [];
    const paths = (swaggerSpec.paths ?? {}) as Record<string, Record<string, any>>;
    for (const [p, methods] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(methods)) {
        rows.push(
          `<tr><td><code>${method.toUpperCase()}</code></td><td><code>${esc(p)}</code></td><td>${esc(op?.summary ?? '')}</td></tr>`
        );
      }
    }
    res
      .status(200)
      .type('html')
      .send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(swaggerSpec.info?.title ?? 'Public API')} — API Documentation</title>
<style>
body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0e0d0c;color:#e8e6e3;margin:2rem auto;max-width:60rem;padding:0 1rem;line-height:1.5}
a{color:#ff3d52}table{border-collapse:collapse;width:100%;margin:1rem 0}
td,th{border:1px solid #333;padding:.5rem;text-align:left}code{color:#5eddf2}
</style>
</head>
<body>
<h1>${esc(swaggerSpec.info?.title ?? 'Public API')}</h1>
<p>Version ${esc(swaggerSpec.info?.version ?? '')} — machine-readable spec: <a href="/api/openapi.json">/api/openapi.json</a> (OpenAPI 3.0)</p>
<h2>Endpoints</h2>
<table><thead><tr><th>Method</th><th>Path</th><th>Summary</th></tr></thead><tbody>
${rows.join('\n')}
</tbody></table>
<p>Each operation documents whether it requires the session cookie or an <code>Authorization: Bearer &lt;api-key&gt;</code> header. Validation errors use the field-level <code>{ "error": "validation_failed", "message": string, "fieldErrors": object, "errors": array }</code> envelope. Rate-limit state is exposed via <code>RateLimit-*</code> response headers.</p>
</body>
</html>`);
  });

  // JSON 404/405 fallback for unmatched /api/* routes.
  // Must be registered after all other /api/* handlers so it only catches
  // requests that no real route handled. Without this, unknown /api paths
  // would fall through to Vite's HTML catch-all and return a 200 with the
  // React app's HTML, masking client routing typos.
  // NB-049 (run23): if the PATH exists under other methods, answer a uniform
  // 405 + Allow header (canonical {message} envelope) instead of a misleading
  // 404 — DELETE /api/resources/1 and PUT /api/search used to claim the
  // route didn't exist at all.
  app.use('/api', (req, res) => {
    const fullPath = ((req.baseUrl || '') + (req.path || '')).replace(/\/+$/, '') || '/';
    const allowed = new Set<string>();
    // R5-060 (run24): track whether EVERY route registered on this path mounts
    // an auth guard. If so, an anonymous wrong-method probe must get the same
    // 401 the right verb would give — the old unconditional 405 + Allow header
    // let anyone enumerate the admin surface's route + verb map with no session.
    let sawMatch = false;
    let allMatchesRequireAuth = true;
    const stack: any[] = (app as any)._router?.stack ?? [];
    for (const layer of stack) {
      const route = layer?.route;
      if (!route || !layer.regexp) continue;
      if (!layer.regexp.test(fullPath) && !layer.regexp.test(fullPath + '/')) continue;
      sawMatch = true;
      const hasAuthGuard = (route.stack ?? []).some((h: any) => {
        const n = h?.handle?.name || h?.name || '';
        return n === 'isAuthenticated' || n === 'isAdmin';
      });
      if (!hasAuthGuard) allMatchesRequireAuth = false;
      for (const m of Object.keys(route.methods || {})) {
        if (m === '_all') continue;
        allowed.add(m.toUpperCase());
      }
    }
    if (allowed.size > 0 && !allowed.has(req.method)) {
      const isAuthed =
        typeof (req as any).isAuthenticated === 'function' && (req as any).isAuthenticated();
      if (sawMatch && allMatchesRequireAuth && !isAuthed) {
        // Uniform envelope with the real handlers' anonymous answer.
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (allowed.has('GET')) allowed.add('HEAD');
      const allowHeader = Array.from(allowed).sort().join(', ');
      return res
        .status(405)
        .set('Allow', allowHeader)
        .json({ message: `Method Not Allowed. Allowed: ${allowHeader}` });
    }
    res.status(404).json({ message: 'Not found' });
  });
}
