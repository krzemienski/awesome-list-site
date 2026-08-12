/**
 * ============================================================================
 * CONTRACTS/MIDDLEWARE.TS - Express observer + request-validation middleware
 * ============================================================================
 *
 * Task #303: two things, both opt-in and non-breaking:
 *
 *   1. observeRoutes(app) — an OBSERVER that walks Express' router after all
 *      routes are mounted and records every live `${METHOD} ${path}`. This is
 *      pure introspection: it never wraps a handler, so it can't change
 *      behavior. The recorded set feeds the drift helper (./drift.ts).
 *
 *   2. contractGuard(name) — a per-route middleware that validates
 *      params/query/body against a registered contract BEFORE the handler
 *      runs. On mismatch it answers 400 with the canonical validation envelope
 *      (identical to the existing validateBody shape). It only enforces when
 *      the contract's `enforceRequest` flag is set (or `{ enforce: true }` is
 *      passed), so mounting it on an existing route without opting in is a
 *      no-op that simply normalizes parsed values.
 *
 * Mounting order: call observeRoutes(app) LAST (after registerRoutes), and
 * mount contractGuard(...) inline on individual routes where desired. Neither
 * is wired automatically — integration is the parent agent's decision.
 * ============================================================================
 */
import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import {
  contracts,
  contractKey,
  HTTP_METHODS,
  type ApiContract,
  type HttpMethod,
} from "./registry";
import { buildValidationEnvelope } from "./envelope";

/** A live route discovered by the observer. */
export interface ObservedRoute {
  method: HttpMethod;
  path: string;
  key: string;
}

/**
 * Walk an Express app's router stack and return every registered route. Safe
 * across Express 4 internal shapes; unknown shapes are skipped rather than
 * throwing. This reads Express internals (`app._router` / `app.router`) which
 * are not typed, hence the localized `any`.
 */
export function collectExpressRoutes(app: Express): ObservedRoute[] {
  const out: ObservedRoute[] = [];
  const seen = new Set<string>();

  // Express 4 uses the lazily-built app._router. Reading app.router in Express
  // 4 invokes a deprecated getter that throws, so only probe it when _router is
  // absent (Express 5).
  let router: any = (app as any)._router;
  if (!router) {
    try {
      router = (app as any).router;
    } catch {
      router = undefined;
    }
  }
  const stack: any[] = router?.stack ?? [];

  const pushRoute = (method: string, path: string) => {
    const m = method.toLowerCase() as HttpMethod;
    const key = contractKey(m, path);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ method: m, path, key });
  };

  const walk = (layers: any[], prefix: string) => {
    for (const layer of layers) {
      if (layer?.route) {
        const rawRoutePaths: unknown[] = (
          Array.isArray(layer.route.path)
            ? layer.route.path
            : [layer.route.path]
        );
        const routePaths = rawRoutePaths
          .filter((path: unknown): path is string => typeof path === "string")
          .map((path: string) => joinPaths(prefix, path));
        const methods = layer.route.methods ?? {};
        // app.all() is used exclusively for terminal 404/405 compatibility
        // fallbacks. Express expands it to every protocol method (including
        // WebDAV verbs), so treating those as endpoint contracts would invent
        // hundreds of routes that no handler actually owns.
        if (
          methods._all ||
          Object.keys(methods).filter((method) => methods[method]).length >
            HTTP_METHODS.length
        ) {
          continue;
        }
        for (const method of Object.keys(methods)) {
          if (!HTTP_METHODS.includes(method as HttpMethod)) continue;
          if (methods[method]) {
            for (const routePath of routePaths) {
              pushRoute(method, routePath);
            }
          }
        }
      } else if (layer?.name === "router" && layer?.handle?.stack) {
        // A mounted sub-router: recover its mount path from the layer regexp.
        const mount = extractMountPath(layer);
        walk(layer.handle.stack, joinPaths(prefix, mount));
      }
    }
  };

  walk(stack, "");
  return out;
}

/** Join two path fragments, collapsing duplicate slashes. */
function joinPaths(a: string, b: string): string {
  const joined = `${a}${b}`.replace(/\/{2,}/g, "/");
  if (joined.length > 1 && joined.endsWith("/")) return joined.slice(0, -1);
  return joined || "/";
}

/**
 * Best-effort recovery of a sub-router's mount path from its layer regexp.
 * Express doesn't store the literal string, so we invert the common
 * fast-slash regexp; anything exotic falls back to "" (root), which is safe
 * for observation (paths may be slightly under-qualified but never wrong-typed).
 */
function extractMountPath(layer: any): string {
  const re: RegExp | undefined = layer?.regexp;
  if (!re) return "";
  const src = re.source;
  // Matches patterns like: ^\/api\/?(?=\/|$)
  const match = src.match(/^\^\\?\/?((?:[^\\/]|\\.)*?)\\?\/\?/);
  if (!match) return "";
  const raw = match[1]
    .replace(/\\\//g, "/")
    .replace(/\\\./g, ".")
    .replace(/[\\^$]/g, "");
  return raw ? `/${raw}` : "";
}

/**
 * OBSERVER: record every live route into the given sink (defaults to the
 * shared observed-route store). Returns the collected routes. Pure read;
 * call after all routes are mounted.
 */
export function observeRoutes(app: Express, sink: ObservedRouteStore = observedRoutes): ObservedRoute[] {
  const routes = collectExpressRoutes(app);
  sink.replaceAll(routes);
  return routes;
}

/** A tiny in-memory store of observed routes, consumed by drift.ts. */
export class ObservedRouteStore {
  private routes: ObservedRoute[] = [];

  replaceAll(routes: ObservedRoute[]): void {
    this.routes = routes.slice();
  }

  all(): ObservedRoute[] {
    return this.routes.slice();
  }

  keys(): string[] {
    return this.routes.map((r) => r.key);
  }

  clear(): void {
    this.routes = [];
  }
}

/** Shared observed-route store. */
export const observedRoutes = new ObservedRouteStore();

export interface ContractGuardOptions {
  /** Force enforcement regardless of the contract flag. */
  enforce?: boolean;
  /** Look contracts up in a custom registry (defaults to the shared one). */
  registry?: typeof contracts;
}

/**
 * Per-route request-validation middleware bound to a registered contract by
 * NAME. Parses params/query/body and, when enforcing, answers 400 with the
 * canonical validation envelope on mismatch.
 *
 * Non-breaking guarantees:
 *  - When neither the contract nor options enable enforcement, parse FAILURES
 *    are ignored (the original req values pass through untouched) — mounting
 *    it can never turn a previously-200 request into a 400.
 *  - On parse SUCCESS the normalized values are written back onto the request
 *    only for `query`/`params` via a non-destructive merge, and `body` is
 *    replaced (matching validateBody's existing behavior) — but only when
 *    enforcing, so opt-out mounting leaves the request byte-identical.
 */
export function contractGuard(name: string, options: ContractGuardOptions = {}): RequestHandler {
  const registry = options.registry ?? contracts;
  return (req: Request, res: Response, next: NextFunction) => {
    const contract = registry.getByName(name);
    if (!contract) {
      // Unknown contract name is a programming error; don't break traffic.
      return next();
    }
    const enforce = options.enforce ?? contract.enforceRequest ?? false;
    const result = validateRequestAgainstContract(req, contract);

    if (!result.ok) {
      if (!enforce) return next();
      return res.status(400).json(buildValidationEnvelope(result.error));
    }

    if (enforce) {
      if (result.params !== undefined) {
        // params is read-only in some Express versions — merge in place.
        Object.assign(req.params as Record<string, unknown>, result.params);
      }
      if (result.query !== undefined) {
        try {
          Object.assign(req.query as Record<string, unknown>, result.query);
        } catch {
          /* req.query may be a getter-only proxy in Express 5; ignore */
        }
      }
      if (result.body !== undefined) {
        req.body = result.body;
      }
    }
    return next();
  };
}

interface ValidateOk {
  ok: true;
  params?: unknown;
  query?: unknown;
  body?: unknown;
}
interface ValidateErr {
  ok: false;
  error: import("zod").ZodError;
}

/**
 * Validate a request against a contract's schemas. Returns parsed values on
 * success, or the FIRST failing zod error (params → query → body) so the
 * envelope reports the most upstream problem. Pure — never touches `req`.
 */
export function validateRequestAgainstContract(
  req: Request,
  contract: ApiContract,
): ValidateOk | ValidateErr {
  let params: unknown;
  let query: unknown;
  let body: unknown;

  if (contract.params) {
    const r = contract.params.safeParse(req.params ?? {});
    if (!r.success) return { ok: false, error: r.error };
    params = r.data;
  }
  if (contract.query) {
    const r = contract.query.safeParse(req.query ?? {});
    if (!r.success) return { ok: false, error: r.error };
    query = r.data;
  }
  if (contract.body) {
    const r = contract.body.safeParse(req.body ?? {});
    if (!r.success) return { ok: false, error: r.error };
    body = r.data;
  }
  return { ok: true, params, query, body };
}
