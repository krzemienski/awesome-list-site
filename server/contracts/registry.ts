/**
 * ============================================================================
 * CONTRACTS/REGISTRY.TS - Named ApiContract registry
 * ============================================================================
 *
 * Task #303: a single, in-memory registry of every declared API contract.
 * A contract is a DECLARATION of an endpoint's shape — method + path, its
 * request schemas (params / query / body) and its named response/error
 * schemas. Declaring a contract does nothing on its own; the observer
 * middleware in ./middleware.ts is what actually records live routes and
 * (opt-in) validates against these declarations.
 *
 * The registry powers three consumers:
 *   1. request/response validation (./middleware.ts, ./responseValidation.ts)
 *   2. OpenAPI 3 generation (./openapiGenerator.ts)
 *   3. drift comparison against live-observed routes (./drift.ts)
 *
 * Everything is zod v4 and fully typed; nothing here imports Express, so the
 * registry can be consumed by build scripts (scripts/validation/*) too.
 * ============================================================================
 */
import type { ZodTypeAny } from "zod";

/** HTTP methods a contract can describe (lowercase, Express-style). */
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "head" | "options";

export const HTTP_METHODS: readonly HttpMethod[] = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
];

/** Named response schemas keyed by HTTP status code (as a string, e.g. "200"). */
export type ResponseSchemaMap = Record<string, NamedResponseSchema>;

export interface NamedResponseSchema {
  /** Stable component name used by generated OpenAPI. */
  name: string;
  /** Human description for OpenAPI. */
  description: string;
  /** Optional zod schema for the response body at this status. */
  schema?: ZodTypeAny;
}

export interface ApiContractInput {
  /** Unique, stable name for this contract (e.g. "public.resources.list"). */
  name: string;
  method: HttpMethod;
  /** Express-style path, e.g. "/api/public/resources/:id". */
  path: string;
  /** Optional human summary / description for docs. */
  summary?: string;
  description?: string;
  /** OpenAPI grouping tags. */
  tags?: string[];
  /** Schema for path params (object of param -> schema). */
  params?: ZodTypeAny;
  paramsName?: string;
  /** Schema for the query string. */
  query?: ZodTypeAny;
  queryName?: string;
  /** Schema for the JSON request body. */
  body?: ZodTypeAny;
  bodyName?: string;
  /** Whether the endpoint rejects an absent JSON request body. */
  bodyRequired?: boolean;
  /** Named success/error response schemas keyed by status code. */
  responses?: ResponseSchemaMap;
  /**
   * Whether the observer middleware should ENFORCE request validation
   * (answer 400 on mismatch). Defaults to false — declaring a contract is
   * safe and non-breaking until a caller opts in per-route.
   */
  enforceRequest?: boolean;
  /**
   * Whether to validate responses (dev-only diagnostics, never mutates the
   * response). Defaults to false.
   */
  validateResponse?: boolean;
  /**
   * Inferred metadata about the endpoint, derived from its path segment and
   * the names of the middleware guarding it. Surfaced in OpenAPI security and
   * `x-*` extensions. Purely descriptive — it never changes runtime behavior.
   */
  meta?: ContractMeta;
}

/** Descriptive, inferred metadata about a contract's endpoint. */
export interface ContractMeta {
  /** Coarse domain grouping inferred from the path (e.g. "admin", "auth"). */
  domain?: string;
  /** Whether the endpoint is guarded by an authentication middleware. */
  requiresAuth?: boolean;
  /** Whether the endpoint requires an admin role. */
  requiresAdmin?: boolean;
  /** Names of rate-limit middleware guarding the endpoint. */
  rateLimiters?: string[];
  /** Names (function.name) of every middleware in the mounted chain. */
  middleware?: string[];
}

export interface ApiContract extends ApiContractInput {
  /** Normalized `${METHOD} ${path}` key used for lookups and drift. */
  readonly key: string;
}

/** Build the canonical key for a method+path pair. */
export function contractKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${normalizePath(path)}`;
}

/**
 * Normalize an Express path for comparison: collapse duplicate slashes, drop a
 * trailing slash (except root), and canonicalize param names to `:param` so
 * "/x/:id" and "/x/:resourceId" compare structurally when needed elsewhere.
 * (Kept conservative — param NAMES are preserved here; drift.ts does the
 * structural collapse.)
 */
export function normalizePath(path: string): string {
  let p = path.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

/**
 * The named registry. Instantiate your own for tests, or use the shared
 * `contracts` singleton exported below.
 */
export class ApiContractRegistry {
  private readonly byKey = new Map<string, ApiContract>();
  private readonly byName = new Map<string, ApiContract>();

  /**
   * Register a contract. Throws on duplicate name or duplicate method+path so
   * conflicts surface at boot, not at request time.
   */
  register(input: ApiContractInput): ApiContract {
    const key = contractKey(input.method, input.path);
    if (this.byName.has(input.name)) {
      throw new Error(`ApiContract name already registered: "${input.name}"`);
    }
    if (this.byKey.has(key)) {
      throw new Error(`ApiContract already registered for ${key}`);
    }
    const contract: ApiContract = { ...input, key };
    this.byName.set(input.name, contract);
    this.byKey.set(key, contract);
    return contract;
  }

  /** Register many at once (returns the created contracts). */
  registerAll(inputs: ApiContractInput[]): ApiContract[] {
    return inputs.map((i) => this.register(i));
  }

  /**
   * Idempotent register: if a contract with the same method+path already
   * exists, return it unchanged instead of throwing. This is what the
   * auto-registration installer uses so repeated `createContractedApp(app)`
   * calls within one process never explode on duplicate keys.
   *
   * The `name` in the input is only used when creating a fresh contract; a
   * name collision on an OTHERWISE-new key still throws (that is a real bug).
   */
  getOrRegister(input: ApiContractInput): ApiContract {
    const existing = this.byKey.get(contractKey(input.method, input.path));
    if (existing) return existing;
    return this.register(input);
  }

  getByName(name: string): ApiContract | undefined {
    return this.byName.get(name);
  }

  getByKey(method: string, path: string): ApiContract | undefined {
    return this.byKey.get(contractKey(method, path));
  }

  has(method: string, path: string): boolean {
    return this.byKey.has(contractKey(method, path));
  }

  /** All contracts in registration order. */
  all(): ApiContract[] {
    return Array.from(this.byName.values());
  }

  /** All canonical `${METHOD} ${path}` keys. */
  keys(): string[] {
    return Array.from(this.byKey.keys());
  }

  /** Remove everything (test helper). */
  clear(): void {
    this.byKey.clear();
    this.byName.clear();
  }

  get size(): number {
    return this.byName.size;
  }
}

/** Shared, process-wide contract registry. */
export const contracts = new ApiContractRegistry();

/** Convenience: register on the shared singleton. */
export function defineContract(input: ApiContractInput): ApiContract {
  return contracts.register(input);
}
