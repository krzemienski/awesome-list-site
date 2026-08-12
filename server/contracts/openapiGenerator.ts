/**
 * ============================================================================
 * CONTRACTS/OPENAPIGENERATOR.TS - OpenAPI 3 from registered contracts
 * ============================================================================
 *
 * Task #303: turn the ApiContract registry into an OpenAPI 3.0 document using
 * zod v4's built-in `z.toJSONSchema(schema, { target: "openapi-3.0" })`.
 *
 * This is ADDITIVE — it does not touch the hand-written spec in
 * server/openapi.ts. A caller can either serve this generated spec on its own
 * path, or merge its `paths`/`components.schemas` into the existing swaggerSpec
 * (mergeContractPaths below), leaving the existing document authoritative
 * wherever the two overlap.
 * ============================================================================
 */
import { z } from "zod";
import type { ZodTypeAny } from "zod";
import { contracts, type ApiContract, type HttpMethod } from "./registry";

/** Convert a zod schema to an OpenAPI-3.0 Schema Object (input side). */
function toOpenApiSchema(schema: ZodTypeAny, io: "input" | "output" = "input"): Record<string, any> {
  return z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io,
    // Unrepresentable types (Date, transforms, etc.) become {} instead of
    // throwing, so a single exotic schema never breaks doc generation.
    unrepresentable: "any",
  }) as Record<string, any>;
}

/**
 * Zod represents recursive references relative to the schema root as `#`.
 * Once that root is moved into components.schemas, those references must be
 * rebased or `#` incorrectly points at the whole OpenAPI document.
 */
function toComponentSchema(
  schema: ZodTypeAny,
  componentName: string,
  io: "input" | "output" = "input",
): Record<string, any> {
  const root = toOpenApiSchema(schema, io);
  const componentRef = `#/components/schemas/${componentName}`;
  const rebase = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(rebase);
    if (value === null || typeof value !== "object") return value;
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = key === "$ref" && child === "#" ? componentRef : rebase(child);
    }
    return output;
  };
  return rebase(root) as Record<string, any>;
}

import { toOpenApiPath as normalizeOpenApiPath, parsePathParams } from "./inference";

/**
 * Express path -> OpenAPI "{param}" path plus param names. Handles regex
 * params like `:id(\d+)` and modifiers like `:slug?` via the shared inference
 * helpers so docs/drift agree with the auto-registration installer.
 */
function toOpenApiPath(path: string): { openapiPath: string; params: string[] } {
  return {
    openapiPath: normalizeOpenApiPath(path),
    params: parsePathParams(path).map((p) => p.name),
  };
}

/**
 * Build the OpenAPI `parameters` array for a contract from its params/query
 * schemas. Path params are marked required; query fields are marked required
 * only when the zod object reports them as required.
 */
function buildParameters(contract: ApiContract): any[] {
  const parameters: any[] = [];
  const { params: pathParamNames } = toOpenApiPath(contract.path);

  if (contract.params) {
    const jsonSchema = toOpenApiSchema(contract.params);
    const props = jsonSchema.properties ?? {};
    const required: string[] = jsonSchema.required ?? pathParamNames;
    for (const name of Object.keys(props)) {
      parameters.push({
        name,
        in: "path",
        required: required.includes(name) || pathParamNames.includes(name),
        schema: props[name],
      });
    }
    // Path params declared in the URL but not in the schema still surface.
    for (const name of pathParamNames) {
      if (!props[name]) {
        parameters.push({ name, in: "path", required: true, schema: { type: "string" } });
      }
    }
  } else {
    for (const name of pathParamNames) {
      parameters.push({ name, in: "path", required: true, schema: { type: "string" } });
    }
  }

  if (contract.query) {
    const jsonSchema = toOpenApiSchema(contract.query);
    const props = jsonSchema.properties ?? {};
    const required: string[] = jsonSchema.required ?? [];
    for (const name of Object.keys(props)) {
      parameters.push({
        name,
        in: "query",
        required: required.includes(name),
        schema: props[name],
      });
    }
  }

  return parameters;
}

function buildResponses(contract: ApiContract): Record<string, any> {
  const responses: Record<string, any> = {};
  const entries = Object.entries(contract.responses ?? {});
  if (entries.length === 0) {
    responses["200"] = { description: "Successful response" };
    return responses;
  }
  for (const [status, named] of entries) {
    const response: Record<string, any> = { description: named.description };
    if (named.schema) {
      response.content = {
        "application/json": {
          schema: { $ref: `#/components/schemas/${named.name}` },
        },
      };
    }
    responses[status] = response;
  }
  return responses;
}

/** Build a single OpenAPI Operation Object from a contract. */
export function contractToOperation(contract: ApiContract): Record<string, any> {
  const operation: Record<string, any> = {
    operationId: contract.name,
    responses: buildResponses(contract),
  };
  if (contract.summary) operation.summary = contract.summary;
  if (contract.description) operation.description = contract.description;
  if (contract.tags?.length) operation.tags = contract.tags;

  const parameters = buildParameters(contract);
  if (parameters.length) operation.parameters = parameters;

  if (contract.body) {
    operation.requestBody = {
      required: contract.bodyRequired ?? false,
      content: {
        "application/json": {
          schema: contract.bodyName
            ? { $ref: `#/components/schemas/${contract.bodyName}` }
            : toOpenApiSchema(contract.body, "input"),
        },
      },
    };
  }

  // Surface inferred metadata: security requirement + x-* extensions.
  const meta = contract.meta;
  if (meta) {
    if (meta.requiresAuth) {
      const usesApiKey = meta.middleware?.some((name) =>
        /requireapikey/i.test(name),
      );
      operation.security = [
        usesApiKey ? { BearerAuth: [] } : { SessionCookie: [] },
      ];
    }
    if (meta.domain) operation["x-domain"] = meta.domain;
    if (meta.requiresAuth) operation["x-requires-auth"] = true;
    if (meta.requiresAdmin) operation["x-requires-admin"] = true;
    if (meta.rateLimiters?.length) operation["x-rate-limiters"] = meta.rateLimiters;
    if (meta.middleware?.length) {
      operation["x-middleware"] = meta.middleware.filter(Boolean);
    }
  }
  operation["x-contract-schemas"] = {
    ...(contract.paramsName ? { params: contract.paramsName } : {}),
    ...(contract.queryName ? { query: contract.queryName } : {}),
    ...(contract.bodyName ? { body: contract.bodyName } : {}),
  };

  return operation;
}

export interface OpenApiDocOptions {
  title?: string;
  version?: string;
  description?: string;
  servers?: { url: string; description?: string }[];
  registry?: typeof contracts;
}

/**
 * Generate a complete OpenAPI 3.0 document from every registered contract.
 * Contracts sharing a path are merged under that path's method map.
 */
export function generateOpenApiDocument(options: OpenApiDocOptions = {}): Record<string, any> {
  const registry = options.registry ?? contracts;
  const paths: Record<string, any> = {};
  const tagNames = new Set<string>();
  const schemas: Record<string, any> = {};

  for (const contract of registry.all()) {
    const { openapiPath } = toOpenApiPath(contract.path);
    paths[openapiPath] ??= {};
    paths[openapiPath][contract.method as HttpMethod] = contractToOperation(contract);
    for (const t of contract.tags ?? []) tagNames.add(t);
    if (contract.params && contract.paramsName) {
      schemas[contract.paramsName] ??= toComponentSchema(
        contract.params,
        contract.paramsName,
      );
    }
    if (contract.query && contract.queryName) {
      schemas[contract.queryName] ??= toComponentSchema(
        contract.query,
        contract.queryName,
      );
    }
    if (contract.body && contract.bodyName) {
      schemas[contract.bodyName] ??= toComponentSchema(
        contract.body,
        contract.bodyName,
      );
    }
    for (const response of Object.values(contract.responses ?? {})) {
      if (response.schema) {
        schemas[response.name] ??= toComponentSchema(
          response.schema,
          response.name,
          "output",
        );
      }
    }
  }

  return {
    openapi: "3.0.0",
    info: {
      title: options.title ?? "Awesome List Site - Contract API",
      version: options.version ?? "1.0.0",
      description: options.description ?? "OpenAPI document generated from registered API contracts.",
    },
    servers: options.servers ?? [{ url: "http://localhost:5000", description: "Development server" }],
    components: {
      schemas,
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
        },
        SessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
        },
      },
    },
    paths,
    tags: Array.from(tagNames).map((name) => ({ name })),
  };
}

/**
 * Merge contract-generated `paths` into an existing OpenAPI document
 * (e.g. server/openapi.ts's swaggerSpec) WITHOUT overwriting anything already
 * present. Returns a new object; the input `base` is not mutated. The existing
 * hand-written document stays authoritative wherever the two overlap.
 */
export function mergeContractPaths(
  base: Record<string, any>,
  options: OpenApiDocOptions = {},
): Record<string, any> {
  const generated = generateOpenApiDocument(options);
  const merged: Record<string, any> = {
    ...base,
    paths: { ...(generated.paths ?? {}) },
  };
  // Existing paths win: layer base paths on top of generated ones.
  for (const [p, methods] of Object.entries(base.paths ?? {})) {
    merged.paths[p] = { ...(merged.paths[p] ?? {}), ...(methods as object) };
  }
  return merged;
}
