import dns from "dns/promises";
import net from "net";
import { decryptAuthToken } from "./configCrypto";

/**
 * Shared runtime helpers for the Claude Agent SDK multi-agent flows (Researcher + Enrichment):
 * - per-run endpoint/auth resolution via options.env (custom base URL + decrypted bearer token)
 * - per-run model resolution
 * - SSRF-guarded https base-URL validation + optional reachability preflight
 */

export interface AgentRunConfig {
  model?: string | null;
  baseUrl?: string | null;
  authTokenEncrypted?: string | null;
}

// Default models for each flow when no per-run override is supplied.
export const DEFAULT_RESEARCH_MODEL = "claude-sonnet-4-5";
export const DEFAULT_ENRICHMENT_MODEL = "claude-haiku-4-5";

const PRIVATE_V4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
];

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return PRIVATE_V4_PATTERNS.some((r) => r.test(ip));
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
  if (mapped) return isPrivateIp(mapped[1]);
  return false;
}

/**
 * Validate a custom Anthropic-compatible base URL: must be https and must not resolve to a
 * private/loopback/link-local address (SSRF guard). Returns a normalized URL (no trailing slash).
 * Throws with a user-facing message on failure.
 */
export async function validateBaseUrl(raw: string): Promise<string> {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error("Base URL is not a valid URL");
  }
  if (u.protocol !== "https:") throw new Error("Base URL must use https://");
  if (!u.hostname) throw new Error("Base URL must include a host");

  let addresses: string[] = [];
  try {
    const results = await dns.lookup(u.hostname, { all: true });
    addresses = results.map((r) => r.address);
  } catch {
    throw new Error(`Could not resolve host: ${u.hostname}`);
  }
  if (addresses.length === 0) throw new Error(`Could not resolve host: ${u.hostname}`);
  if (addresses.some(isPrivateIp)) {
    throw new Error("Base URL resolves to a private or loopback address, which is not allowed");
  }

  const normalizedPath = u.pathname.replace(/\/$/, "");
  return u.origin + normalizedPath + (u.search || "");
}

export interface PreflightResult {
  reachable: boolean;
  status?: number;
  detail?: string;
}

/**
 * Best-effort reachability check for a base URL. Never throws; returns a result the caller
 * can surface as a warning. A 4xx (e.g. 401/404 on the bare origin) still counts as reachable
 * because it proves the host answered.
 */
export async function preflightBaseUrl(url: string, timeoutMs = 5000): Promise<PreflightResult> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: ac.signal, redirect: "manual" });
    return { reachable: true, status: res.status };
  } catch (e: any) {
    return { reachable: false, detail: String(e?.message || e).slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build the env map passed to query() options.env for a run. Starts from process.env so the
 * subprocess keeps PATH/HOME/etc, then applies per-run overrides. When a custom bearer token is
 * configured, ANTHROPIC_API_KEY is removed so the custom ANTHROPIC_AUTH_TOKEN is used unambiguously.
 */
export function buildAgentEnv(config: AgentRunConfig): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") env[k] = v;
  }
  if (config.baseUrl) env.ANTHROPIC_BASE_URL = config.baseUrl;
  if (config.authTokenEncrypted) {
    const token = decryptAuthToken(config.authTokenEncrypted);
    env.ANTHROPIC_AUTH_TOKEN = token;
    delete env.ANTHROPIC_API_KEY;
  }
  return env;
}

export function resolveModel(config: AgentRunConfig, fallback: string): string {
  return config.model && config.model.trim() ? config.model.trim() : fallback;
}
