/**
 * ============================================================================
 * CONTRACTS/INDEX.TS - Public API for the shared contract infrastructure
 * ============================================================================
 *
 * Task #303: safer modular API architecture. This barrel is the single import
 * surface the parent agent integrates with. Everything here is additive and
 * non-breaking — nothing runs until it is explicitly mounted/called.
 *
 * Typical integration (all opt-in, none wired automatically):
 *
 *   import {
 *     defineContract, contracts,
 *     contractGuard, observeRoutes,
 *     responseValidator,
 *     generateOpenApiDocument, mergeContractPaths,
 *     compareDrift, formatDriftReport,
 *     pgIdParamSchema, paginationQuerySchema,
 *   } from "./contracts";
 *
 *   // 1. declare a contract
 *   defineContract({
 *     name: "public.resources.get",
 *     method: "get",
 *     path: "/api/public/resources/:id",
 *     params: z.object({ id: pgIdParamSchema }),
 *     responses: { "200": { description: "ok", schema: resourceSchema } },
 *   });
 *
 *   // 2. (optional) enforce it on the route
 *   app.get("/api/public/resources/:id", contractGuard("public.resources.get"), handler);
 *
 *   // 3. after registerRoutes(app), record live routes for drift detection
 *   observeRoutes(app);
 *
 *   // 4. generate docs or check drift in a build script
 *   const doc = generateOpenApiDocument();
 *   const report = compareDrift({ includePrefixes: ["/api"] });
 * ============================================================================
 */

// --- Registry ---
export {
  ApiContractRegistry,
  contracts,
  defineContract,
  contractKey,
  normalizePath,
  HTTP_METHODS,
} from "./registry";
export type {
  ApiContract,
  ApiContractInput,
  ContractMeta,
  HttpMethod,
  NamedResponseSchema,
  ResponseSchemaMap,
} from "./registry";

// --- Auto-registration installer (the primary integration surface) ---
export {
  installApiContractRegistration,
  createContractedApp,
  declareContract,
  isSettingsGetterCall,
  isInterceptablePath,
  toOpenApiPath,
  setRouteResponseSchema,
} from "./install";
export type { InstallOptions, InstalledContractApp } from "./install";

// --- Per-endpoint structural response schemas (task #319) ---
export { registerCoreEndpointSchemas } from "./endpointSchemas";

// --- Inference helpers (pure, unit-testable) ---
export {
  parsePathParams,
  canonicalizePath,
  deriveContractName,
  isIdParamName,
  inferDomain,
  inferMetaFromMiddleware,
  inferParamsSchema,
  buildGenericQuerySchema,
  genericQuerySchema,
  boundedIntStringSchema,
  boundedSafeStringSchema,
  MAX_PARAM_LENGTH,
  PAGINATION_INT_KEYS,
} from "./inference";
export type { ParsedParam } from "./inference";

// --- Body structural guard (pure inspector + zod schema) ---
export {
  inspectBody,
  buildBodyGuardSchema,
  buildObjectBodyGuardSchema,
  bodyGuardSchema,
  objectBodyGuardSchema,
  DEFAULT_BODY_LIMITS,
} from "./bodyGuard";
export type { BodyGuardLimits, BodyIssue, BodyInspectResult } from "./bodyGuard";

// --- Validation envelope ---
export { buildValidationEnvelope, toEnvelope, normalizeValidationBody } from "./envelope";
export type { ValidationEnvelope } from "./envelope";

// --- Request-validation + observer middleware ---
export {
  contractGuard,
  observeRoutes,
  collectExpressRoutes,
  validateRequestAgainstContract,
  observedRoutes,
  ObservedRouteStore,
} from "./middleware";
export type { ObservedRoute, ContractGuardOptions } from "./middleware";

// --- Response validation hook ---
export { responseValidator, checkResponse } from "./responseValidation";
export type { ResponseMismatch, ResponseValidationOptions } from "./responseValidation";

// --- OpenAPI 3 generation ---
export {
  generateOpenApiDocument,
  mergeContractPaths,
  contractToOperation,
} from "./openapiGenerator";
export type { OpenApiDocOptions } from "./openapiGenerator";

// --- Drift comparison ---
export { compareDrift, formatDriftReport, canonicalKey } from "./drift";
export type { DriftReport, DriftEntry, DriftOptions } from "./drift";

// --- Reusable zod schemas / primitives ---
export {
  PG_INT4_MAX,
  pgIdSchema,
  pgIdParamSchema,
  pageQuerySchema,
  limitQuerySchema,
  paginationQuerySchema,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  httpsUrlContractSchema,
  webUrlContractSchema,
  searchQuerySchema,
  slugParamSchema,
  nonEmptyStringSchema,
  uuidSchema,
  booleanQuerySchema,
} from "./schemas";
