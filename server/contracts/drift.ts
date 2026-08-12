/**
 * ============================================================================
 * CONTRACTS/DRIFT.TS - Drift comparison between contracts and live routes
 * ============================================================================
 *
 * Task #303: compare the DECLARED contracts (registry) against the OBSERVED
 * live routes (from the observer middleware) and report the gaps:
 *
 *   - undocumented: a live route with no contract (the API grew, docs didn't).
 *   - missing:      a contract with no live route (docs claim an endpoint that
 *                   isn't mounted — stale or renamed).
 *   - matched:      both sides agree.
 *
 * Comparison is STRUCTURAL: param names are canonicalized (":id" and
 * ":resourceId" both become ":*") so a rename doesn't masquerade as drift.
 * This is a read-only helper — a CI script (scripts/validation/*) can call it
 * and fail the build on drift without any runtime impact.
 * ============================================================================
 */
import type { ApiContractRegistry } from "./registry";
import { contracts } from "./registry";
import type { ObservedRoute, ObservedRouteStore } from "./middleware";
import { observedRoutes } from "./middleware";

export interface DriftEntry {
  method: string;
  path: string;
  /** Structural comparison key (params canonicalized). */
  canonical: string;
  /** Contract name, when this entry corresponds to a declared contract. */
  contract?: string;
}

export interface DriftReport {
  matched: DriftEntry[];
  undocumented: DriftEntry[];
  missing: DriftEntry[];
  hasDrift: boolean;
}

/**
 * Canonicalize a method+path into a structural key: uppercase method, params
 * collapsed to ":*", slashes normalized. So "GET /x/:id", "GET /x/:userId",
 * "GET /x/:id(\\d+)", "GET /x/:slug?" and "GET /x/{id}" all map to
 * "GET /x/:*". Inline regex constraints and +/*?/ modifiers are stripped so a
 * regex-constrained param never masquerades as drift.
 */
export function canonicalKey(method: string, path: string): string {
  let p = path
    // Express params, incl. inline regex `(\d+)` and +/*/? modifiers.
    .replace(/:([A-Za-z0-9_]+)(\((?:\\.|[^\\()])*\))?[?+*]?/g, ":*")
    // OpenAPI-style `{param}` params.
    .replace(/\{[^}]+\}/g, ":*");
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return `${method.toUpperCase()} ${p || "/"}`;
}

export interface DriftOptions {
  registry?: ApiContractRegistry;
  observed?: ObservedRouteStore;
  /**
   * Only compare routes whose path starts with one of these prefixes
   * (e.g. ["/api"]). Defaults to no filter (compare everything observed).
   */
  includePrefixes?: string[];
  /** Live routes matching any of these are ignored (health checks, assets…). */
  ignore?: (RegExp | string)[];
}

function matchesIgnore(path: string, ignore: (RegExp | string)[]): boolean {
  return ignore.some((rule) =>
    typeof rule === "string" ? path === rule || path.startsWith(rule) : rule.test(path),
  );
}

function matchesPrefix(path: string, prefixes?: string[]): boolean {
  if (!prefixes || prefixes.length === 0) return true;
  return prefixes.some((pre) => path === pre || path.startsWith(pre));
}

/**
 * Compare declared contracts against observed live routes and produce a drift
 * report. Callers must have run observeRoutes(app) first to populate the
 * observed store (or pass their own).
 */
export function compareDrift(options: DriftOptions = {}): DriftReport {
  const registry = options.registry ?? contracts;
  const observedStore = options.observed ?? observedRoutes;
  const ignore = options.ignore ?? [];

  // Index contracts by structural key.
  const contractByCanonical = new Map<string, { name: string; method: string; path: string }>();
  for (const c of registry.all()) {
    contractByCanonical.set(canonicalKey(c.method, c.path), {
      name: c.name,
      method: c.method,
      path: c.path,
    });
  }

  // Index observed routes by structural key.
  const observedByCanonical = new Map<string, ObservedRoute>();
  for (const r of observedStore.all()) {
    if (!matchesPrefix(r.path, options.includePrefixes)) continue;
    if (matchesIgnore(r.path, ignore)) continue;
    observedByCanonical.set(canonicalKey(r.method, r.path), r);
  }

  const matched: DriftEntry[] = [];
  const undocumented: DriftEntry[] = [];
  const missing: DriftEntry[] = [];

  for (const [canonical, route] of observedByCanonical) {
    const contract = contractByCanonical.get(canonical);
    if (contract) {
      matched.push({ method: route.method, path: route.path, canonical, contract: contract.name });
    } else {
      undocumented.push({ method: route.method, path: route.path, canonical });
    }
  }

  for (const [canonical, contract] of contractByCanonical) {
    if (!observedByCanonical.has(canonical)) {
      missing.push({
        method: contract.method,
        path: contract.path,
        canonical,
        contract: contract.name,
      });
    }
  }

  return {
    matched,
    undocumented,
    missing,
    hasDrift: undocumented.length > 0 || missing.length > 0,
  };
}

/** Format a drift report as a human-readable string (for CI logs). */
export function formatDriftReport(report: DriftReport): string {
  const lines: string[] = [];
  lines.push(`Contract drift: ${report.hasDrift ? "DRIFT DETECTED" : "clean"}`);
  lines.push(`  matched:      ${report.matched.length}`);
  lines.push(`  undocumented: ${report.undocumented.length}`);
  lines.push(`  missing:      ${report.missing.length}`);
  if (report.undocumented.length) {
    lines.push("  -- live routes with no contract --");
    for (const e of report.undocumented) lines.push(`     ${e.method.toUpperCase()} ${e.path}`);
  }
  if (report.missing.length) {
    lines.push("  -- contracts with no live route --");
    for (const e of report.missing) lines.push(`     ${e.method.toUpperCase()} ${e.path} (${e.contract})`);
  }
  return lines.join("\n");
}
