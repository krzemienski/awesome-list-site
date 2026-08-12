/**
 * ============================================================================
 * CONTRACTS/RESPONSEVALIDATION.TS - Non-breaking response validation hook
 * ============================================================================
 *
 * Task #303: a middleware that checks outgoing JSON responses against a
 * contract's named response/error schemas WITHOUT ever altering the response.
 *
 * How it stays safe:
 *  - It wraps res.json only to observe the payload; the original payload is
 *    always sent through, byte-for-byte. It never rewrites, strips, or
 *    reorders fields.
 *  - A schema mismatch is a DIAGNOSTIC: by default it calls an `onMismatch`
 *    reporter (console.warn) — it does NOT change the status code or body.
 *  - It only checks a status code that has a named schema in the contract;
 *    every other response passes straight through.
 *
 * This lets us assert "the /resources list really matches its declared
 * PaginatedResourcesResponse" in dev/CI, while production traffic is untouched.
 * ============================================================================
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { contracts, type ApiContract } from "./registry";

export interface ResponseMismatch {
  contract: string;
  status: number;
  method: string;
  path: string;
  issues: import("zod").ZodError["issues"];
}

export interface ResponseValidationOptions {
  enforce?: boolean; // reserved; default false — never enforced, only observed
  registry?: typeof contracts;
  onMismatch?: (mismatch: ResponseMismatch) => void;
}

function defaultReporter(m: ResponseMismatch): void {
  console.warn(
    `[contract] response mismatch for "${m.contract}" (${m.method} ${m.path}) status ${m.status}:`,
    m.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; "),
  );
}

/**
 * Response-validation middleware bound to a contract by name. Observes the
 * JSON body sent for a status code that has a declared response schema and
 * reports (never enforces) mismatches.
 */
export function responseValidator(name: string, options: ResponseValidationOptions = {}): RequestHandler {
  const registry = options.registry ?? contracts;
  const report = options.onMismatch ?? defaultReporter;

  return (req: Request, res: Response, next: NextFunction) => {
    const contract = registry.getByName(name);
    if (!contract || !contract.responses) return next();
    // Skip work entirely unless the contract asked to be validated.
    if (contract.validateResponse === false) return next();

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      try {
        checkResponse(contract, res.statusCode, body, req, report);
      } catch {
        /* validation must never break the response */
      }
      return originalJson(body);
    }) as Response["json"];

    return next();
  };
}

/** Validate one response body against the contract's named schema for its status. */
export function checkResponse(
  contract: ApiContract,
  status: number,
  body: unknown,
  req: Pick<Request, "method" | "originalUrl" | "path">,
  report: (m: ResponseMismatch) => void,
): boolean {
  const named = contract.responses?.[String(status)];
  if (!named || !named.schema) return true;
  const result = named.schema.safeParse(body);
  if (result.success) return true;
  report({
    contract: contract.name,
    status,
    method: req.method,
    path: req.originalUrl ?? req.path,
    issues: result.error.issues,
  });
  return false;
}
