import dns from "dns/promises";
import { safeFetch, isPublicAddress } from "./safeFetch";
import { decryptAuthToken, encryptAuthToken, isConfigEncryptionAvailable } from "./configCrypto";
import { configuredBaseUrl, resolveAnthropicCredentials, resolveFlowModel } from "./anthropicConfig";
import { baseUrlSyntaxError } from "@shared/validation";

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

/**
 * Default model for the enrichment flow when no per-run override is supplied,
 * resolved from the shared config at call time (ANTHROPIC_DEFAULT_*). The
 * Researcher resolves its models strictly instead — see researchRunConfig.ts.
 */
export function defaultEnrichmentModel(): string {
  return resolveFlowModel("enrichment");
}

/**
 * Validate a custom Anthropic-compatible base URL: must be http or https and must not resolve
 * to a private/loopback/link-local address (SSRF guard). Returns a normalized URL (no trailing
 * slash). Throws with a user-facing message on failure. Note: over plain http the auth token
 * travels unencrypted — the admin UI warns about this.
 */
export async function validateBaseUrl(raw: string): Promise<string> {
  const syntaxError = baseUrlSyntaxError(raw);
  if (syntaxError) throw new Error(syntaxError);
  const u = new URL(raw.trim());

  let addresses: string[] = [];
  try {
    const results = await dns.lookup(u.hostname.replace(/^\[|\]$/g, ''), { all: true });
    addresses = results.map((r) => r.address);
  } catch {
    throw new Error(`Could not resolve host: ${u.hostname}`);
  }
  if (addresses.length === 0) throw new Error(`Could not resolve host: ${u.hostname}`);
  if (addresses.some(address => !isPublicAddress(address))) {
    throw new Error("Base URL resolves to a private or loopback address, which is not allowed");
  }

  const normalizedPath = u.pathname.replace(/\/$/, "");
  return u.origin + normalizedPath;
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
  try {
    const res = await safeFetch(url, { timeout: timeoutMs, maxBytes: 64 * 1024, followRedirects: false });
    return { reachable: true, status: res.status };
  } catch (e: any) {
    return { reachable: false, detail: String(e?.message || e).slice(0, 200) };
  }
}

// Every credential-bearing variable the Claude Code subprocess could pick up.
// buildAgentEnv strips ALL of them and re-adds exactly the resolved set so the
// subprocess can never combine a key from one source with a URL from another.
const CREDENTIAL_ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "AI_INTEGRATIONS_ANTHROPIC_API_KEY",
  "AI_INTEGRATIONS_ANTHROPIC_BASE_URL",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "ANTHROPIC_CUSTOM_HEADERS",
];

const TOKEN_ONLY_NEEDS_BASE_URL =
  "An auth token without a base URL is sent to the server's ANTHROPIC_BASE_URL, which is not set — enter a base URL too.";

/**
 * Build the env map passed to query() options.env for a run.
 *
 * Starts from process.env (PATH/HOME/etc + the ANTHROPIC_DEFAULT_<TIER>_MODEL
 * alias map, which the CLI uses to resolve "haiku"/"sonnet"/... exactly like
 * our own tier resolver), strips every credential variable, then applies the
 * SAME endpoint/credential resolution as the direct Messages calls
 * (anthropicConfig.resolveAnthropicCredentials): router bearer token >
 * router api key > managed integration > direct key.
 *
 * Per-run admin overrides win over all of that: whenever a custom base URL is
 * set, no platform credential is passed (the API key/token is only valid
 * against the platform host and must NEVER travel to a third-party endpoint);
 * the run authenticates only with the admin-supplied token, which
 * parseAgentConfigFromRequest requires alongside any custom base URL. A
 * token-only override always goes to ANTHROPIC_BASE_URL and throws when it is
 * unset, so an admin token never reaches api.anthropic.com by default.
 *
 * Also disables the CLI's non-essential network traffic (telemetry, error
 * reporting, auto-updater, version checks) — a server-side agent has no use
 * for it and it adds latency + noise to every run.
 */
export function buildAgentEnv(config: AgentRunConfig): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") env[k] = v;
  }
  for (const k of CREDENTIAL_ENV_KEYS) delete env[k];

  if (config.baseUrl || config.authTokenEncrypted) {
    // Per-run override: custom endpoint and/or custom token, nothing platform-side.
    if (config.baseUrl) {
      env.ANTHROPIC_BASE_URL = config.baseUrl;
    } else {
      // Token-only override: the admin token replaces the credential, the
      // endpoint stays the configured router whether or not the server also
      // has a credential for it. Without ANTHROPIC_BASE_URL the CLI would
      // send the token to api.anthropic.com, which nobody configured.
      const routerUrl = configuredBaseUrl();
      if (!routerUrl) throw new Error(TOKEN_ONLY_NEEDS_BASE_URL);
      env.ANTHROPIC_BASE_URL = routerUrl;
    }
    if (config.authTokenEncrypted) {
      env.ANTHROPIC_AUTH_TOKEN = decryptAuthToken(config.authTokenEncrypted);
    } else {
      // A token-less custom endpoint cannot be reached with platform
      // credentials by design; parseAgentConfigFromRequest rejects this
      // combination up front, so this branch only guards legacy job rows.
      const creds = resolveAnthropicCredentials();
      if (creds.kind === "router" && creds.baseURL === config.baseUrl) {
        if (creds.authToken) env.ANTHROPIC_AUTH_TOKEN = creds.authToken;
        else if (creds.apiKey) env.ANTHROPIC_API_KEY = creds.apiKey;
      }
    }
  } else {
    const creds = resolveAnthropicCredentials();
    if (creds.baseURL) env.ANTHROPIC_BASE_URL = creds.baseURL;
    if (creds.authToken) env.ANTHROPIC_AUTH_TOKEN = creds.authToken;
    else if (creds.apiKey) env.ANTHROPIC_API_KEY = creds.apiKey;
  }

  // Hygiene for a headless, server-side agent.
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  env.DISABLE_TELEMETRY = "1";
  env.DISABLE_ERROR_REPORTING = "1";
  env.DISABLE_AUTOUPDATER = "1";
  env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE = "1";
  return env;
}

export function resolveModel(config: AgentRunConfig, fallback: string): string {
  return config.model && config.model.trim() ? config.model.trim() : fallback;
}

export interface ParsedAgentConfig {
  model: string | null;
  baseUrl: string | null;
  authTokenEncrypted: string | null;
  authTokenLast4: string | null;
}

/**
 * Parse + validate per-run agent config from an admin request body. A custom base URL is
 * protocol/SSRF-validated (http or https; throws a user-facing message on failure) and a plaintext auth token is
 * encrypted at rest via AES-256-GCM (only the last 4 chars are retained for display). Throws a
 * user-facing Error on any invalid input so the caller can surface it as a 400.
 */
export async function parseAgentConfigFromRequest(body: any): Promise<ParsedAgentConfig> {
  const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : null;

  let baseUrl: string | null = null;
  const rawBaseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim() : "";
  if (rawBaseUrl) {
    baseUrl = await validateBaseUrl(rawBaseUrl);
  }

  let authTokenEncrypted: string | null = null;
  let authTokenLast4: string | null = null;
  const rawToken = typeof body?.authToken === "string" ? body.authToken.trim() : "";
  if (baseUrl && !rawToken) {
    throw new Error(
      "A custom base URL requires an auth token — the platform key is never sent to a custom endpoint.",
    );
  }
  if (rawToken && !baseUrl && !configuredBaseUrl()) {
    throw new Error(TOKEN_ONLY_NEEDS_BASE_URL);
  }
  if (rawToken) {
    if (!isConfigEncryptionAvailable()) {
      throw new Error(
        "Cannot store a custom auth token: server encryption key (CONFIG_ENCRYPTION_KEY) is not configured.",
      );
    }
    const enc = encryptAuthToken(rawToken);
    authTokenEncrypted = enc.encrypted;
    authTokenLast4 = enc.last4;
  }

  return { model, baseUrl, authTokenEncrypted, authTokenLast4 };
}

/**
 * Remove the encrypted auth-token blob from a job row before returning it to any client.
 * The masked `authTokenLast4` field is preserved so the UI can show which token was used.
 * Internal worker-liveness bookkeeping (process identity + heartbeat, see
 * server/ai/jobLiveness.ts) is infrastructure detail and is dropped too.
 */
export function stripJobAuthSecret<T extends Record<string, any>>(job: T): T {
  if (!job || typeof job !== "object") return job;
  const rest: Record<string, unknown> = { ...job };
  delete rest.authTokenEncrypted;
  delete rest.workerId;
  delete rest.heartbeatAt;
  return rest as T;
}
