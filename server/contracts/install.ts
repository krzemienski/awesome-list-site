/**
 * ============================================================================
 * CONTRACTS/INSTALL.TS - Auto-registration installer for the composition root
 * ============================================================================
 *
 * Task #303 integration. `installApiContractRegistration(app)` (aliased as
 * `createContractedApp(app)`) patches an Express app's route-registration
 * methods (get/post/put/patch/delete) so that EVERY concrete `/api` route
 * registered afterwards is, automatically and non-breakingly:
 *
 *   1. declared as a stable NAMED contract (method + normalized path);
 *   2. guarded by inferred params/query/body validation that runs IMMEDIATELY
 *      before the final handler — inserted at the end of the middleware chain
 *      so existing auth + rate-limit middleware keep their exact order and run
 *      first;
 *   3. tagged with inferred domain/auth/rate-limit metadata (from the path and
 *      the names of the middleware in the chain);
 *   4. observed on the way out: outgoing JSON is checked against any named
 *      response schema in dev/CI but NEVER blocked.
 *
 * Validation is additive and fail-safe:
 *   - Only STRING `/api` paths are intercepted. RegExp/array paths, non-/api
 *     paths, `app.all(...)` fallbacks, and the `app.get(setting)` getter
 *     overload are passed straight through untouched.
 *   - The inserted guard answers 400 with the canonical
 *     {error,message,fieldErrors,errors} envelope ONLY when the payload is
 *     genuinely malformed. Well-formed requests are untouched (no transform).
 *
 * Idempotency: contracts are registered via getOrRegister, and the installer
 * marks an app so a second install call is a no-op — repeated app construction
 * in one process never double-patches or double-registers.
 * ============================================================================
 */
import type {
  Express,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { z, type ZodTypeAny } from "zod";
import {
  contracts,
  ApiContractRegistry,
  type ApiContract,
  type HttpMethod,
} from "./registry";
import {
  deriveContractName,
  toOpenApiPath,
  inferParamsSchema,
  genericQuerySchema,
  inferMetaFromMiddleware,
} from "./inference";
import { objectBodyGuardSchema } from "./bodyGuard";
import { buildValidationEnvelope, normalizeValidationBody } from "./envelope";

/** Methods whose registrations carry a request body worth guarding. */
const BODY_METHODS = new Set<HttpMethod>(["post", "put", "patch", "delete"]);

// ---------------------------------------------------------------------------
// Per-route 200 response schema overrides
// ---------------------------------------------------------------------------

/**
 * Per-route override map for the 200 success schema. Keys are
 * `"METHOD /api/path"` (e.g. `"get /api/auth/user"`). When present,
 * `inferredResponsesFor` uses the registered schema instead of the generic
 * `jsonResponseSchema`, making the observer catch real field-level drift.
 *
 * Call `setRouteResponseSchema` before `installApiContractRegistration` is
 * invoked (or before the first route is registered via `app.get/post/...`).
 * Because `getOrRegister` is idempotent, a pre-registered override will be
 * returned as-is when the auto-installer later tries to declare the same
 * endpoint; when called after registration, the override map is still checked
 * on every future call to `inferredResponsesFor` for any new registration.
 */
const routeResponseOverrideMap = new Map<string, import("./registry").NamedResponseSchema>();

/**
 * Register a structural 200 response schema for a specific endpoint. Must be
 * called before `installApiContractRegistration` (i.e. before any route with
 * this path+method is registered on the app).
 *
 * @param method  Lowercase HTTP method ("get", "post", …)
 * @param path    Express-style path, e.g. "/api/auth/user"
 * @param schema  Named response schema entry (name + description + zod schema)
 */
export function setRouteResponseSchema(
  method: string,
  path: string,
  schema: import("./registry").NamedResponseSchema,
): void {
  routeResponseOverrideMap.set(`${method.toLowerCase()} ${path}`, schema);
}

/** Named, reusable wire contracts shared by every inferred endpoint. */
/**
 * "JSON response" must describe the WIRE format, not the in-memory object.
 * `z.json()` rejects Date instances (and other toJSON-able values) that
 * Express's res.json serializes perfectly well, which made every DB-backed
 * payload with a timestamp log a false "[contract] response mismatch".
 * So we validate serializability the same way res.json does: the body must
 * survive JSON.stringify to a defined value without throwing (circular
 * structures, BigInt, bare undefined/functions/symbols still fail).
 */
const jsonResponseSchema = z.custom<unknown>(
  (value) => {
    if (value === undefined || typeof value === "function" || typeof value === "symbol") {
      return false;
    }
    try {
      return JSON.stringify(value) !== undefined;
    } catch {
      return false;
    }
  },
  { message: "Response body is not JSON-serializable" },
);
const jsonObjectResponseSchema = z
  .object({ message: z.string() })
  .passthrough();
const validationResponseSchema = z
  .object({
    error: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.unknown()),
    errors: z.array(z.unknown()),
  })
  .passthrough();
const inferredErrors = {
  "400": {
    name: "ValidationError",
    description: "Request validation failed",
    schema: validationResponseSchema,
  },
  "401": { name: "ErrorResponse", description: "Authentication required", schema: jsonObjectResponseSchema },
  "403": { name: "ErrorResponse", description: "Insufficient permission", schema: jsonObjectResponseSchema },
  "404": { name: "ErrorResponse", description: "Resource not found", schema: jsonObjectResponseSchema },
  "409": { name: "ErrorResponse", description: "Request conflicts with current state", schema: jsonObjectResponseSchema },
  "413": { name: "ValidationError", description: "Request body too large", schema: validationResponseSchema },
  "422": { name: "ErrorResponse", description: "Request could not be processed", schema: jsonObjectResponseSchema },
  "429": { name: "ErrorResponse", description: "Rate limit exceeded", schema: jsonObjectResponseSchema },
  "500": { name: "ErrorResponse", description: "Internal server error", schema: jsonObjectResponseSchema },
  "503": { name: "ErrorResponse", description: "Service temporarily unavailable", schema: jsonObjectResponseSchema },
} satisfies import("./registry").ResponseSchemaMap;

function inferredResponsesFor(
  method: HttpMethod,
  path: string,
  explicitStatuses: number[],
): import("./registry").ResponseSchemaMap {
  const override = routeResponseOverrideMap.get(`${method} ${path}`);
  const success: import("./registry").ResponseSchemaMap =
    path === "/api/docs"
      ? { "200": { name: "HtmlResponse", description: "HTML API documentation" } }
      : override
        ? { "200": override }
        : { "200": { name: "JsonResponse", description: "Successful response", schema: jsonResponseSchema } };
  for (const status of explicitStatuses) {
    if (status < 200 || status >= 400 || status === 200) continue;
    success[String(status)] =
      status === 204 || status === 304
        ? { name: "NoContent", description: "Successful response with no body" }
        : status >= 300
          ? { name: "Redirect", description: "Redirect" }
          : { name: "JsonResponse", description: "Successful response", schema: jsonResponseSchema };
  }
  return {
    ...success,
    ...inferredErrors,
  };
}

/** Methods the installer intercepts. `all`/`use`/`options`/`head` are skipped. */
const INTERCEPTED_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete"];

const INSTALLED_FLAG = "__apiContractInstalled__";

export interface InstallOptions {
  /**
   * Registry to declare contracts into. Defaults to the shared singleton.
   * Pass a fresh ApiContractRegistry for a per-app registry that avoids any
   * cross-app collisions in the same process.
   */
  registry?: ApiContractRegistry;
  /** Only intercept paths under these prefixes. Defaults to ["/api"]. */
  prefixes?: string[];
  /**
   * Enforce request validation (answer 400 on malformed input). Defaults to
   * true — the whole point of the installer. Set false to only DECLARE and
   * observe without ever rejecting.
   */
  enforce?: boolean;
  /**
   * Observe outgoing JSON against named response schemas. Defaults to true in
   * non-production, false in production.
   */
  observeResponses?: boolean;
  /** Reporter for response-schema mismatches (defaults to console.warn). */
  onResponseMismatch?: (info: {
    contract: string;
    status: number;
    method: string;
    path: string;
    issues: { path: (string | number)[]; message: string }[];
  }) => void;
}

/** Result handle returned by the installer (mostly for tests/diagnostics). */
export interface InstalledContractApp {
  app: Express;
  registry: ApiContractRegistry;
  /** Undo the patching (restore original method functions). */
  uninstall: () => void;
}

/** Detect the `app.get(settingName)` getter overload (single string arg). */
export function isSettingsGetterCall(method: HttpMethod, args: unknown[]): boolean {
  return method === "get" && args.length === 1 && typeof args[0] === "string";
}

/** A route registration is interceptable only when its path is a `/api` string. */
export function isInterceptablePath(path: unknown, prefixes: string[]): path is string {
  if (typeof path !== "string") return false;
  return prefixes.some((pre) => path === pre || path.startsWith(pre));
}

/** Extract a readable name for a middleware function (falls back to ""). */
function middlewareName(fn: unknown): string {
  if (typeof fn !== "function") return "";
  return (fn as { name?: string }).name ?? "";
}

/** Schema metadata attached by the shared validateBody middleware. */
function middlewareBodySchema(fn: unknown): ZodTypeAny | undefined {
  if (typeof fn !== "function") return undefined;
  const schema = (fn as { validationSchema?: unknown }).validationSchema;
  return schema && typeof (schema as ZodTypeAny).safeParse === "function"
    ? (schema as ZodTypeAny)
    : undefined;
}

/**
 * Read literal res.status/sendStatus/redirect codes from the mounted chain.
 * This keeps generated success/redirect statuses tied to the actual handlers
 * instead of advertising 201/202/204 on every mutation.
 */
function explicitResponseStatuses(handlers: unknown[]): number[] {
  const statuses = new Set<number>();
  for (const handler of handlers) {
    if (typeof handler !== "function") continue;
    const source = Function.prototype.toString.call(handler);
    for (const match of source.matchAll(
      /\.(?:status|sendStatus)\(\s*(\d{3})\s*\)|\.redirect\(\s*(\d{3})\s*,/g,
    )) {
      const status = Number(match[1] ?? match[2]);
      if (status >= 100 && status <= 599) statuses.add(status);
    }
  }
  return [...statuses].sort((a, b) => a - b);
}

/**
 * Build the guard middleware for a contract. It runs LAST (immediately before
 * the final handler), validating params/query/body and answering 400 with the
 * canonical envelope on failure. On success it calls next() WITHOUT mutating
 * the request, preserving every downstream expectation.
 */
function buildGuard(
  paramsSchema: ZodTypeAny | undefined,
  querySchema: ZodTypeAny | undefined,
  bodySchema: ZodTypeAny | undefined,
  enforce: boolean,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!enforce) return next();

    if (paramsSchema) {
      const r = paramsSchema.safeParse(req.params ?? {});
      if (!r.success) return respond400(res, r.error, "Invalid request parameters");
    }
    if (querySchema) {
      const r = querySchema.safeParse(req.query ?? {});
      if (!r.success) return respond400(res, r.error, "Invalid query parameters");
    }
    if (bodySchema && req.body !== undefined && req.body !== null) {
      const r = bodySchema.safeParse(req.body);
      if (!r.success) return respond400(res, r.error, "Invalid request body");
    }
    return next();
  };
}

function respond400(res: Response, error: import("zod").ZodError, message: string): void {
  // Canonical additive envelope; keep the specific message.
  res.status(400).json(buildValidationEnvelope(error, message));
}

/**
 * Build the outermost wrapper mounted on every intercepted route. It wraps
 * res.json to do two additive, non-blocking things:
 *
 *   1. Normalize any 400 response body to the canonical validation envelope
 *      (keeps the handler's original message + all its fields; only fills in
 *      the missing error/fieldErrors/errors keys). This makes EVERY 400 on an
 *      /api route consistent, including handler-produced ones.
 *   2. When a named response schema exists for the outgoing status, validate
 *      the body and REPORT mismatches (dev/CI) — never blocks or rewrites.
 *
 * A 500 response is reduced to the stable public error contract so raw
 * exception, database, or upstream details cannot cross the API boundary.
 * Errors inside the wrapper can never break the response.
 */
function buildResponseObserver(
  contract: ApiContract | undefined,
  observeResponses: boolean,
  report: NonNullable<InstallOptions["onResponseMismatch"]>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      let outgoing = body;
      try {
        if (res.statusCode === 400) {
          outgoing = normalizeValidationBody(body);
        }
        if (res.statusCode === 500) {
          outgoing = {
            message: "Internal Server Error",
            ...(body !== null &&
            typeof body === "object" &&
            !Array.isArray(body) &&
            typeof (body as Record<string, unknown>).success === "boolean"
              ? { success: (body as Record<string, unknown>).success }
              : {}),
          };
        }
        if (observeResponses && contract?.responses) {
          const named = contract.responses[String(res.statusCode)];
          if (named?.schema) {
            const result = named.schema.safeParse(outgoing);
            if (!result.success) {
              report({
                contract: contract.name,
                status: res.statusCode,
                method: req.method,
                path: req.originalUrl ?? req.path,
                issues: result.error.issues.map((i) => ({
                  path: i.path as (string | number)[],
                  message: i.message,
                })),
              });
            }
          }
        }
      } catch {
        /* observation/normalization must never break a response */
        outgoing = body;
      }
      return originalJson(outgoing);
    }) as Response["json"];
    return next();
  };
}

function defaultMismatchReporter(info: {
  contract: string;
  status: number;
  method: string;
  path: string;
  issues: { path: (string | number)[]; message: string }[];
}): void {
  console.warn(
    `[contract] response mismatch for "${info.contract}" (${info.method} ${info.path}) status ${info.status}:`,
    info.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; "),
  );
}

/**
 * Install auto-registration onto an Express app. Idempotent per app.
 */
export function installApiContractRegistration(
  app: Express,
  options: InstallOptions = {},
): InstalledContractApp {
  const registry = options.registry ?? contracts;
  const prefixes = options.prefixes ?? ["/api"];
  const enforce = options.enforce ?? true;
  const observeResponses =
    options.observeResponses ?? process.env.NODE_ENV !== "production";
  const report = options.onResponseMismatch ?? defaultMismatchReporter;

  const anyApp = app as unknown as Record<string, unknown> & {
    [INSTALLED_FLAG]?: boolean;
  };

  // Idempotent: never double-patch the same app instance.
  if (anyApp[INSTALLED_FLAG]) {
    return {
      app,
      registry,
      uninstall: () => {
        /* already returned a no-op; real uninstall lives on the first handle */
      },
    };
  }

  type AnyFn = (...args: unknown[]) => unknown;
  const originals: Partial<Record<HttpMethod, AnyFn>> = {};

  for (const method of INTERCEPTED_METHODS) {
    const original = (app as unknown as Record<string, AnyFn>)[method];
    originals[method] = original;

    (app as unknown as Record<string, AnyFn>)[method] = function patched(
      this: unknown,
      ...args: unknown[]
    ): unknown {
      // Pass-through cases: settings getter, non-string / non-/api paths.
      if (isSettingsGetterCall(method, args)) {
        return original.apply(this, args);
      }
      const path = args[0];
      if (!isInterceptablePath(path, prefixes)) {
        return original.apply(this, args);
      }

      const handlers = args.slice(1).flat() as unknown[];
      // Nothing to guard (e.g. app.get("/api", ) with no handler) — pass through.
      if (handlers.length === 0) {
        return original.apply(this, args);
      }

      const routeBodySchema = handlers
        .map(middlewareBodySchema)
        .filter((schema): schema is ZodTypeAny => Boolean(schema))
        .at(-1);

      // Declare / reuse the contract for this concrete endpoint.
      const contract = declareContract(
        registry,
        method,
        path,
        handlers.map(middlewareName),
        enforce,
        observeResponses,
        routeBodySchema,
        explicitResponseStatuses(handlers),
      );

      // Build the guard chain: response observer (outermost, wraps res.json
      // up front) + validation guard inserted immediately BEFORE the final
      // handler so all pre-existing auth/rate-limit middleware still run first.
      const finalHandler = handlers[handlers.length - 1];
      const priorMiddleware = handlers.slice(0, -1);

      const paramsSchema = inferParamsSchema(path, method);
      const querySchema = genericQuerySchema;
      // Always run the structural guard here. A route-specific validateBody
      // middleware has already run in the preserved prior chain and its exact
      // schema is recorded in the contract/OpenAPI declaration above.
      const bodySchema = BODY_METHODS.has(method)
        ? objectBodyGuardSchema
        : undefined;
      const guard = buildGuard(paramsSchema, querySchema, bodySchema, enforce);

      // The observer is mounted OUTERMOST so it wraps res.json before any
      // prior middleware (auth/rate-limit) can respond — that guarantees even
      // a 401/403/429 with a bare { message } is left untouched (only 400s are
      // normalized) and any 400 they emit still gets the canonical envelope.
      const chain: unknown[] = [];
      chain.push(buildResponseObserver(contract, observeResponses, report));
      chain.push(...priorMiddleware);
      chain.push(guard);
      chain.push(finalHandler);

      return original.apply(this, [path, ...chain]);
    };
  }

  anyApp[INSTALLED_FLAG] = true;

  const uninstall = () => {
    for (const method of INTERCEPTED_METHODS) {
      const orig = originals[method];
      if (orig) (app as unknown as Record<string, AnyFn>)[method] = orig;
    }
    delete anyApp[INSTALLED_FLAG];
  };

  return { app, registry, uninstall };
}

/** Alias matching the requested public name. */
export const createContractedApp = installApiContractRegistration;

/**
 * Declare (idempotently) a contract for a concrete endpoint, attaching inferred
 * request/response schemas and metadata. Extracted as a named helper so it is
 * unit-testable without patching an app.
 */
export function declareContract(
  registry: ApiContractRegistry,
  method: HttpMethod,
  path: string,
  middlewareNames: string[],
  enforce: boolean,
  validateResponse: boolean,
  routeBodySchema?: ZodTypeAny,
  explicitStatuses: number[] = [],
): ApiContract {
  const meta = inferMetaFromMiddleware(path, middlewareNames);
  const paramsSchema = inferParamsSchema(path, method);
  const schemaBase = deriveContractName(method, path).replace(
    /[^A-Za-z0-9.-]/g,
    (char) => `_${char.charCodeAt(0).toString(16)}_`,
  );

  return registry.getOrRegister({
    name: deriveContractName(method, path),
    method,
    path,
    tags: meta.domain ? [meta.domain] : undefined,
    params: paramsSchema,
    paramsName: paramsSchema ? `${schemaBase}.Params` : undefined,
    query: genericQuerySchema,
    queryName: `${schemaBase}.Query`,
    body: BODY_METHODS.has(method)
      ? routeBodySchema ?? objectBodyGuardSchema
      : undefined,
    bodyName: BODY_METHODS.has(method)
      ? routeBodySchema
        ? `${schemaBase}.Body`
        : "JsonObjectBody"
      : undefined,
    bodyRequired: Boolean(routeBodySchema),
    responses: inferredResponsesFor(method, path, explicitStatuses),
    enforceRequest: enforce,
    validateResponse,
    meta,
  });
}

/** Convenience re-export so callers can normalize a path for docs/drift. */
export { toOpenApiPath };
