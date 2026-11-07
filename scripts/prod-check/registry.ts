import type { HttpClient } from "./lib/http.ts";
import type { BrowserKit, KitContext } from "./lib/browser.ts";

export type Status = "pass" | "fail" | "skip" | "info";

export interface Result {
  status: Status;
  detail?: string;
  values?: Record<string, unknown>;
  evidence?: string[];
}

export type Need = "owner";

export interface Ctx {
  base: string;
  runId: string;
  schedule: boolean;
  outRoot: string;
  http: HttpClient;
  browser?: BrowserKit;
  /** Browser context signed in as the audit admin, when audit-admin.env exists; admin-page checks reuse it. */
  adminKit?: KitContext;
  shared: Map<string, unknown>;
}

export interface Check {
  id: string;
  tier: 0 | 1 | 2 | 3;
  kind: "api" | "browser";
  blocking: boolean;
  needs?: Need[];
  run(ctx: Ctx): Promise<Result>;
}

const registry: Check[] = [];

export function register(...checks: Check[]): void {
  registry.push(...checks);
}

export const pass = (detail?: string, values?: Record<string, unknown>): Result => ({ status: "pass", detail, values });
export const fail = (detail: string, values?: Record<string, unknown>): Result => ({ status: "fail", detail, values });
export const info = (detail: string, values?: Record<string, unknown>): Result => ({ status: "info", detail, values });
export const skip = (detail: string): Result => ({ status: "skip", detail });

/** Passes when every problem list is empty, otherwise fails with the problems joined. */
export function verdict(problems: string[], okDetail: string, values?: Record<string, unknown>): Result {
  return problems.length ? fail(problems.join("; "), values) : pass(okDetail, values);
}

export function select(tiers: number[], only: string[]): Check[] {
  return registry
    .filter((c) => tiers.includes(c.tier) && (only.length === 0 || only.includes(c.id)))
    .sort((a, b) => a.tier - b.tier);
}
