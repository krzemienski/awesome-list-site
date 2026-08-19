#!/usr/bin/env tsx
/**
 * Blocking runtime/OpenAPI contract drift gate.
 *
 * Builds the real Express registration graph (without listening), then proves:
 *  - the pre-refactor method/path surface is unchanged;
 *  - every concrete /api route has exactly one named runtime contract;
 *  - generated OpenAPI has the same method/path set;
 *  - request, response/error, and auth declarations are present.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import SwaggerParser from "@apidevtools/swagger-parser";
import { dump } from "js-yaml";
import { registerRoutes } from "../../server/routes";
import { getSwaggerSpec } from "../../server/openapi";
import {
  canonicalKey,
  collectExpressRoutes,
  compareDrift,
  contracts,
} from "../../server/contracts";

// Task #307 (Clerk migration): the legacy auth surface (local login, register,
// forgot/reset password, logout, replit-probe, oidc-analytics-consent,
// change-password, /api/login, /api/callback) was removed and
// /api/auth/logout-all was reintroduced Clerk-backed. Route registration no
// longer branches on REPL_ID, so both environments share one baseline.
const BASELINES = {
  replit: {
    apiCount: 174,
    apiHash: "acde34b78e4bd2d5f6bc9a06f2ca0fe6caf679aef14872257065d523dd44bb7f",
    nonApiCount: 7,
    nonApiHash: "d8f02ed21a7ee98464146ef8958d38a24113b0a47dbbe4132e2da54f00d61a89",
  },
  portable: {
    apiCount: 174,
    apiHash: "acde34b78e4bd2d5f6bc9a06f2ca0fe6caf679aef14872257065d523dd44bb7f",
    nonApiCount: 7,
    nonApiHash: "d8f02ed21a7ee98464146ef8958d38a24113b0a47dbbe4132e2da54f00d61a89",
  },
} as const;

function hashKeys(keys: string[]): string {
  return createHash("sha256").update(keys.slice().sort().join("\n")).digest("hex");
}

function fail(messages: string[]): never {
  console.error("OpenAPI/runtime contract drift detected:");
  for (const message of messages) console.error(`  - ${message}`);
  process.exit(1);
}

async function main() {
  const app = express();
  await registerRoutes(app);

  const routes = collectExpressRoutes(app);
  const apiRoutes = routes.filter((route) => route.path.startsWith("/api"));
  const nonApiRoutes = routes.filter((route) => !route.path.startsWith("/api"));
  const baseline = process.env.REPL_ID ? BASELINES.replit : BASELINES.portable;
  const errors: string[] = [];

  if (
    apiRoutes.length !== baseline.apiCount ||
    hashKeys(apiRoutes.map((route) => route.key)) !== baseline.apiHash
  ) {
    errors.push(
      `API baseline changed (expected ${baseline.apiCount}/${baseline.apiHash}, got ${apiRoutes.length}/${hashKeys(apiRoutes.map((route) => route.key))})`,
    );
  }
  if (
    nonApiRoutes.length !== baseline.nonApiCount ||
    hashKeys(nonApiRoutes.map((route) => route.key)) !== baseline.nonApiHash
  ) {
    errors.push(
      `non-API baseline changed (expected ${baseline.nonApiCount}/${baseline.nonApiHash}, got ${nonApiRoutes.length}/${hashKeys(nonApiRoutes.map((route) => route.key))})`,
    );
  }

  const drift = compareDrift({ includePrefixes: ["/api"] });
  if (drift.hasDrift) {
    errors.push(
      `registry/runtime mismatch: ${drift.undocumented.length} undocumented, ${drift.missing.length} missing`,
    );
  }

  const document = getSwaggerSpec();
  const documented = new Set<string>();
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of Object.keys(pathItem as Record<string, unknown>)) {
      documented.add(canonicalKey(method, path));
    }
  }
  const runtime = new Set(apiRoutes.map((route) => canonicalKey(route.method, route.path)));
  const componentSchemas = document.components?.schemas ?? {};
  const docsOnly = [...documented].filter((key) => !runtime.has(key));
  const runtimeOnly = [...runtime].filter((key) => !documented.has(key));
  if (docsOnly.length || runtimeOnly.length) {
    errors.push(
      `OpenAPI path/method mismatch: ${docsOnly.length} docs-only, ${runtimeOnly.length} runtime-only`,
    );
  }

  for (const contract of contracts.all()) {
    if (!contract.name || !contract.query || !contract.queryName) {
      errors.push(`${contract.key} lacks a named query contract`);
    } else if (!componentSchemas[contract.queryName]) {
      errors.push(`${contract.key} query component ${contract.queryName} is missing`);
    }
    if (
      /\/:/.test(contract.path) &&
      !contract.params
    ) {
      errors.push(`${contract.key} lacks a path-parameter contract`);
    } else if (contract.params && (!contract.paramsName || !componentSchemas[contract.paramsName])) {
      errors.push(`${contract.key} lacks its named path-parameter component`);
    }
    if (
      ["post", "put", "patch", "delete"].includes(contract.method) &&
      !contract.body
    ) {
      errors.push(`${contract.key} lacks a request-body contract`);
    } else if (contract.body && (!contract.bodyName || !componentSchemas[contract.bodyName])) {
      errors.push(`${contract.key} lacks its named request-body component`);
    }
    for (const status of ["200", "400", "401", "403", "404", "409", "413", "429", "500"]) {
      if (!contract.responses?.[status]) {
        errors.push(`${contract.key} lacks response/error contract ${status}`);
      }
    }
    const openapiPath = contract.path.replace(
      /:([A-Za-z0-9_]+)(\((?:\\.|[^\\()])*\))?[?+*]?/g,
      "{$1}",
    );
    const operation = document.paths?.[openapiPath]?.[contract.method];
    if (!operation) continue;
    for (const [status, response] of Object.entries(contract.responses ?? {})) {
      if (!response.name) {
        errors.push(`${contract.key} response ${status} has no schema name`);
        continue;
      }
      if (response.schema && !componentSchemas[response.name]) {
        errors.push(`${contract.key} response component ${response.name} is missing`);
      }
      const documentedRef =
        operation.responses?.[status]?.content?.["application/json"]?.schema?.$ref;
      if (
        response.schema &&
        documentedRef !== `#/components/schemas/${response.name}`
      ) {
        errors.push(`${contract.key} response ${status} does not reference ${response.name}`);
      }
    }
    const expectedSecurity = contract.meta?.requiresAuth
      ? [
          contract.meta.middleware?.some((name) => /requireapikey/i.test(name))
            ? { BearerAuth: [] }
            : { SessionCookie: [] },
        ]
      : undefined;
    if (JSON.stringify(operation.security) !== JSON.stringify(expectedSecurity)) {
      errors.push(`${contract.key} OpenAPI security metadata drifted`);
    }
    if (
      JSON.stringify(operation["x-rate-limiters"] ?? []) !==
      JSON.stringify(contract.meta?.rateLimiters ?? [])
    ) {
      errors.push(`${contract.key} OpenAPI rate-limit metadata drifted`);
    }
    if (
      contract.body &&
      operation.requestBody?.required !== (contract.bodyRequired ?? false)
    ) {
      errors.push(`${contract.key} OpenAPI request-body requiredness drifted`);
    }
    if (
      contract.bodyName &&
      operation.requestBody?.content?.["application/json"]?.schema?.$ref !==
        `#/components/schemas/${contract.bodyName}`
    ) {
      errors.push(`${contract.key} request body does not reference ${contract.bodyName}`);
    }
  }

  // Serialize before SwaggerParser.validate(): recursive schemas are valid via
  // $ref, and the parser may dereference them into circular object references.
  const yamlPath = join(process.cwd(), "docs", "api", "openapi.yaml");
  const expectedYaml = dump(document, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });

  try {
    await SwaggerParser.validate(document as any);
  } catch (error) {
    errors.push(
      `generated document failed standards validation: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  try {
    const committedYaml = readFileSync(yamlPath, "utf8");
    if (committedYaml !== expectedYaml) {
      errors.push(
        "docs/api/openapi.yaml is stale; run npx tsx scripts/export-openapi-yaml.ts",
      );
    } else {
      await SwaggerParser.validate(yamlPath);
    }
  } catch (error) {
    errors.push(
      `committed OpenAPI YAML failed parse/validation: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (errors.length) fail(errors);
  console.log(
    `OpenAPI drift PASS: ${apiRoutes.length} API routes, ${contracts.size} named contracts, ${Object.keys(document.paths ?? {}).length} paths`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});