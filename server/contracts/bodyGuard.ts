/**
 * ============================================================================
 * CONTRACTS/BODYGUARD.TS - Recursive structural body validator
 * ============================================================================
 *
 * Task #303 integration: a generic JSON body guard that REJECTS structurally
 * abusive payloads while PRESERVING every legitimate value byte-for-byte. It
 * never rewrites the body — it only decides accept/reject.
 *
 * What it rejects (all configurable via BodyGuardLimits):
 *  - NUL / C0 control characters inside any string (except \t \n \r) and DEL.
 *  - Nesting deeper than maxDepth (billion-laughs / stack-blowout shapes).
 *  - Objects with more than maxKeys keys.
 *  - Arrays longer than maxArrayLength.
 *  - Strings longer than maxStringLength.
 *  - More than maxTotalNodes nodes overall (fan-out bomb).
 *
 * The core `inspectBody` is a pure function (no zod, no Express) so it is
 * trivially unit-testable. `buildBodyGuardSchema` wraps it in a zod schema for
 * uniform use alongside params/query schemas.
 * ============================================================================
 */
import { z } from "zod";
import type { ZodTypeAny } from "zod";

export interface BodyGuardLimits {
  maxDepth: number;
  maxKeys: number;
  maxArrayLength: number;
  maxStringLength: number;
  maxTotalNodes: number;
}

/** Conservative defaults: generous for real payloads, hostile to abuse. */
export const DEFAULT_BODY_LIMITS: BodyGuardLimits = {
  maxDepth: 32,
  maxKeys: 2000,
  maxArrayLength: 10000,
  maxStringLength: 100000,
  maxTotalNodes: 100000,
};

/** Control chars rejected inside strings: C0 + DEL, but NOT \t (\x09) \n (\x0A) \r (\x0D). */
const FORBIDDEN_CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export interface BodyIssue {
  /** Dotted path to the offending node (e.g. "items.3.name"). */
  path: (string | number)[];
  message: string;
}

export interface BodyInspectResult {
  ok: boolean;
  issues: BodyIssue[];
}

/**
 * Recursively inspect a parsed JSON value against structural limits.
 * PURE: returns the list of issues; never mutates the input. Short-circuits at
 * the first several issues to bound its own work on pathological inputs.
 */
export function inspectBody(
  value: unknown,
  limits: BodyGuardLimits = DEFAULT_BODY_LIMITS,
): BodyInspectResult {
  const issues: BodyIssue[] = [];
  let nodeCount = 0;
  const MAX_ISSUES = 20;

  const add = (path: (string | number)[], message: string) => {
    if (issues.length < MAX_ISSUES) issues.push({ path: path.slice(), message });
  };

  const visit = (node: unknown, depth: number, path: (string | number)[]): void => {
    if (issues.length >= MAX_ISSUES) return;

    nodeCount++;
    if (nodeCount > limits.maxTotalNodes) {
      add(path, `payload has too many nodes (max ${limits.maxTotalNodes})`);
      return;
    }
    if (depth > limits.maxDepth) {
      add(path, `nesting too deep (max ${limits.maxDepth})`);
      return;
    }

    if (typeof node === "string") {
      if (node.length > limits.maxStringLength) {
        add(path, `string too long (max ${limits.maxStringLength} characters)`);
      } else if (FORBIDDEN_CONTROL_RE.test(node)) {
        add(path, "must not contain control characters");
      }
      return;
    }

    if (Array.isArray(node)) {
      if (node.length > limits.maxArrayLength) {
        add(path, `array too long (max ${limits.maxArrayLength} items)`);
        return;
      }
      for (let i = 0; i < node.length; i++) {
        visit(node[i], depth + 1, [...path, i]);
        if (issues.length >= MAX_ISSUES) return;
      }
      return;
    }

    if (node !== null && typeof node === "object") {
      const keys = Object.keys(node as Record<string, unknown>);
      if (keys.length > limits.maxKeys) {
        add(path, `object has too many keys (max ${limits.maxKeys})`);
        return;
      }
      for (const key of keys) {
        // A key itself is client-controlled text; guard it too.
        if (key.length > limits.maxStringLength) {
          add([...path, key], "object key too long");
          continue;
        }
        if (FORBIDDEN_CONTROL_RE.test(key)) {
          add([...path, key], "object key must not contain control characters");
          continue;
        }
        visit((node as Record<string, unknown>)[key], depth + 1, [...path, key]);
        if (issues.length >= MAX_ISSUES) return;
      }
      return;
    }

    // number | boolean | null | undefined — always fine, value preserved.
  };

  visit(value, 0, []);
  return { ok: issues.length === 0, issues };
}

/**
 * Build a zod schema that runs the structural body guard. On success it yields
 * the ORIGINAL value unchanged (no transform); on failure it emits one zod
 * issue per structural problem so failures flow through the same envelope as
 * every other validation error.
 */
export function buildBodyGuardSchema(
  limits: BodyGuardLimits = DEFAULT_BODY_LIMITS,
): ZodTypeAny {
  return z.unknown().superRefine((val, ctx) => {
    const result = inspectBody(val, limits);
    if (result.ok) return;
    for (const issue of result.issues) {
      ctx.addIssue({
        code: "custom",
        message: issue.message,
        path: issue.path,
      });
    }
  });
}

/** Shared instance built with default limits. */
export const bodyGuardSchema = buildBodyGuardSchema();

/**
 * API mutation bodies, when present, are JSON objects. This rejects primitive
 * and array top-level bodies while retaining the same recursive safety limits.
 * Absence/requiredness is handled separately because action-style POST/DELETE
 * routes legitimately have no body.
 */
export function buildObjectBodyGuardSchema(
  limits: BodyGuardLimits = DEFAULT_BODY_LIMITS,
): ZodTypeAny {
  return z.record(z.string(), z.unknown()).superRefine((val, ctx) => {
    const result = inspectBody(val, limits);
    for (const issue of result.issues) {
      ctx.addIssue({
        code: "custom",
        message: issue.message,
        path: issue.path,
      });
    }
  });
}

export const objectBodyGuardSchema = buildObjectBodyGuardSchema();
