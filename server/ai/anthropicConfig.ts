import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/**
 * ============================================================================
 * ANTHROPIC CONFIG — single source of truth for every AI call in the app
 * ============================================================================
 *
 * Every Claude call (direct Messages API via `@anthropic-ai/sdk` AND the
 * Claude Agent SDK subprocess used by the Researcher / Enrichment agents)
 * resolves its endpoint, credentials and model ids through this module so the
 * whole app follows ONE configuration.
 *
 * ENDPOINT / CREDENTIAL PRECEDENCE (first match wins):
 *   1. ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN   → "router"  (Bearer auth; the
 *      configured gateway, e.g. an Anthropic-compatible router)
 *   2. ANTHROPIC_BASE_URL + ANTHROPIC_API_KEY      → "router"  (x-api-key auth)
 *   3. AI_INTEGRATIONS_ANTHROPIC_API_KEY + _BASE_URL → "managed" (Replit-billed proxy)
 *   4. ANTHROPIC_API_KEY                           → "direct"  (api.anthropic.com)
 *   5. nothing                                     → "none"    (AI features off)
 *
 * MODEL TIERS: callers ask for a tier ("haiku" | "sonnet" | "opus" | "fable"),
 * never a hard-coded id. A tier resolves to ANTHROPIC_DEFAULT_<TIER>_MODEL when
 * set (these are the same variables the Claude Agent SDK / Claude Code use to
 * map their aliases, so both pipelines agree), else to the first-party id.
 * ANTHROPIC_MODEL, when set, is the "primary" model used for the most demanding
 * flow (the Researcher orchestrator).
 *
 * Per-run admin overrides (custom base URL + token typed into the admin UI)
 * still take precedence over all of the above for that run — see
 * agentRuntime.buildAgentEnv.
 */

export type ModelTier = "haiku" | "sonnet" | "opus" | "fable";

const TIER_ENV: Record<ModelTier, string> = {
  haiku: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  sonnet: "ANTHROPIC_DEFAULT_SONNET_MODEL",
  opus: "ANTHROPIC_DEFAULT_OPUS_MODEL",
  fable: "ANTHROPIC_DEFAULT_FABLE_MODEL",
};

// First-party ids used only when no ANTHROPIC_DEFAULT_<TIER>_MODEL override exists.
const FIRST_PARTY_TIER_MODELS: Record<ModelTier, string> = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-5",
  opus: "claude-opus-4-1",
  fable: "claude-sonnet-4-5",
};

/** Which tier each product flow runs on. Change here, not at the call sites. */
export const FLOW_TIERS = {
  /** Admin "analyze URL" + contribution auto-metadata (single short JSON call). */
  urlAnalysis: "haiku",
  /** Resource tagging on submit (single short JSON call). */
  tagging: "haiku",
  /** Personalized recommendations (single short JSON call, user-facing latency). */
  recommendations: "haiku",
  /** Learning-journey seeding (CLI, quality over cost). */
  journeySeeding: "sonnet",
  /** Batch enrichment agent (many cheap tool-calling turns). */
  enrichment: "haiku",
  /** Researcher scout subagent (a few web searches + a candidate list). */
  researchScout: "haiku",
  /** Researcher orchestrator — see resolvePrimaryModel (ANTHROPIC_MODEL wins). */
  researchOrchestrator: "sonnet",
} as const satisfies Record<string, ModelTier>;

export type FlowName = keyof typeof FLOW_TIERS;

type Env = Record<string, string | undefined>;

function clean(v: string | undefined): string | undefined {
  const t = (v ?? "").trim();
  return t ? t : undefined;
}

function stripTrailingSlash(u: string): string {
  return u.replace(/\/+$/, "");
}

/** Resolve the model id for a tier (env override → first-party default). */
export function resolveTierModel(tier: ModelTier, env: Env = process.env): string {
  return clean(env[TIER_ENV[tier]]) ?? FIRST_PARTY_TIER_MODELS[tier];
}

/** Resolve the model id for a named product flow. */
export function resolveFlowModel(flow: FlowName, env: Env = process.env): string {
  if (flow === "researchOrchestrator") return resolvePrimaryModel(env);
  return resolveTierModel(FLOW_TIERS[flow], env);
}

/** ANTHROPIC_MODEL when set, else the sonnet tier. */
export function resolvePrimaryModel(env: Env = process.env): string {
  return clean(env.ANTHROPIC_MODEL) ?? resolveTierModel("sonnet", env);
}

/**
 * Model value to hand the Claude Agent SDK for a SUBAGENT definition. The CLI
 * validates per-agent model ids against an internal allowlist and silently
 * swaps unknown ids for its default subagent model (which a custom endpoint
 * then rejects). Aliases always pass and are mapped by the CLI through the
 * same ANTHROPIC_DEFAULT_<TIER>_MODEL variables we use here, so subagents get
 * the tier alias rather than the resolved id.
 */
export function subagentModelForTier(tier: ModelTier): string {
  return tier;
}

export type CredentialKind = "router" | "managed" | "direct" | "none";

export interface AnthropicCredentials {
  kind: CredentialKind;
  /** Base URL for the Messages API (undefined = api.anthropic.com). */
  baseURL?: string;
  /** Sent as `x-api-key`. */
  apiKey?: string;
  /** Sent as `Authorization: Bearer`. */
  authToken?: string;
  /** Human-readable, secret-free description for logs / health output. */
  label: string;
}

export function resolveAnthropicCredentials(env: Env = process.env): AnthropicCredentials {
  const baseUrl = clean(env.ANTHROPIC_BASE_URL);
  const authToken = clean(env.ANTHROPIC_AUTH_TOKEN);
  const apiKey = clean(env.ANTHROPIC_API_KEY);
  const managedKey = clean(env.AI_INTEGRATIONS_ANTHROPIC_API_KEY);
  const managedBase = clean(env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL);

  if (baseUrl && authToken) {
    const host = safeHost(baseUrl);
    return { kind: "router", baseURL: stripTrailingSlash(baseUrl), authToken, label: `router ${host} (bearer token)` };
  }
  if (baseUrl && apiKey) {
    const host = safeHost(baseUrl);
    return { kind: "router", baseURL: stripTrailingSlash(baseUrl), apiKey, label: `router ${host} (api key)` };
  }
  if (baseUrl) {
    // Fail closed: a custom endpoint with no matching credential must NOT fall
    // through to the managed integration or the default Anthropic host —
    // that would silently route traffic somewhere the operator did not intend.
    return {
      kind: "none",
      label: `misconfigured: ANTHROPIC_BASE_URL (${safeHost(baseUrl)}) is set without ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY`,
    };
  }
  if (managedKey && managedBase) {
    return { kind: "managed", baseURL: stripTrailingSlash(managedBase), apiKey: managedKey, label: "Replit-managed Anthropic integration" };
  }
  if (apiKey) {
    return { kind: "direct", apiKey, label: "direct Anthropic API key" };
  }
  return { kind: "none", label: "not configured" };
}

function safeUrlWithoutUserinfo(u: string): string {
  try {
    const url = new URL(u);
    url.username = "";
    url.password = "";
    return stripTrailingSlash(url.toString());
  } catch {
    return "(invalid url)";
  }
}

function safeHost(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return "(invalid url)";
  }
}

export function isAnthropicConfigured(env: Env = process.env): boolean {
  return resolveAnthropicCredentials(env).kind !== "none";
}

/** Secret-free snapshot for health endpoints, admin panels and boot logs. */
export function describeAnthropicConfig(env: Env = process.env) {
  const creds = resolveAnthropicCredentials(env);
  return {
    endpoint: creds.kind,
    label: creds.label,
    baseUrlHost: creds.baseURL ? safeHost(creds.baseURL) : "api.anthropic.com",
    /** Endpoint the calls go to (userinfo stripped; env URLs carry no secrets). */
    baseUrl: creds.baseURL ? safeUrlWithoutUserinfo(creds.baseURL) : "https://api.anthropic.com",
    primaryModel: resolvePrimaryModel(env),
    models: {
      haiku: resolveTierModel("haiku", env),
      sonnet: resolveTierModel("sonnet", env),
      opus: resolveTierModel("opus", env),
      fable: resolveTierModel("fable", env),
    },
    flows: Object.fromEntries(
      (Object.keys(FLOW_TIERS) as FlowName[]).map((f) => [f, resolveFlowModel(f, env)]),
    ) as Record<FlowName, string>,
  };
}

/** Default request timeout for single-shot Messages calls (the router adds latency). */
export const DEFAULT_REQUEST_TIMEOUT_MS = 90_000;

let cachedClient: Anthropic | null | undefined;
let cachedClientKey = "";

/**
 * Shared Anthropic client (one per credential set). Returns null when no
 * credentials are configured so callers can degrade explicitly. Retries are
 * left to the SDK (2 attempts with backoff on 408/409/429/5xx).
 */
export function getAnthropicClient(): Anthropic | null {
  const creds = resolveAnthropicCredentials();
  // Fingerprint the credential IDENTITY (not just presence) so a rotated token
  // on the same host yields a fresh client. The hash is never logged.
  const key = createHash("sha256")
    .update(`${creds.kind}|${creds.baseURL ?? ""}|${creds.apiKey ?? ""}|${creds.authToken ?? ""}`)
    .digest("hex");
  if (cachedClient !== undefined && cachedClientKey === key) return cachedClient;
  cachedClientKey = key;
  if (creds.kind === "none") {
    cachedClient = null;
    return null;
  }
  cachedClient = new Anthropic({
    baseURL: creds.baseURL,
    // Only ONE credential is ever attached: a bearer token when the endpoint
    // is a router, otherwise the api key. Never both.
    apiKey: creds.authToken ? null : creds.apiKey,
    authToken: creds.authToken ?? null,
    timeout: DEFAULT_REQUEST_TIMEOUT_MS,
    maxRetries: 2,
  });
  return cachedClient;
}

/** Test hook: drop the memoized client so a changed environment is re-read. */
export function resetAnthropicClientForTests(): void {
  cachedClient = undefined;
  cachedClientKey = "";
}

export interface StructuredCallParams {
  model: string;
  /** System prompt. Long, static prompts are marked cacheable automatically. */
  system: string;
  /** The user turn. */
  user: string;
  maxTokens: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface StructuredCallResult<T> {
  data: T;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
  };
}

/**
 * Error raised when the model cannot deliver the requested schema: output
 * truncated at max_tokens, a refusal, or a response that fails validation.
 * Callers must surface this (or fall back EXPLICITLY) — never mask it.
 */
export class StructuredOutputError extends Error {
  constructor(
    message: string,
    public readonly reason: "max_tokens" | "refusal" | "invalid" | "empty",
    public readonly stopReason?: string | null,
  ) {
    super(message);
    this.name = "StructuredOutputError";
  }
}

// Prompt caching only pays off above the model minimum (1024 tokens for most
// models, 4096 for Haiku 4.5 / Opus 4.1); shorter blocks are ignored by the
// API, so marking them is harmless but pointless. ~4 chars/token.
const CACHE_MIN_CHARS = 4096 * 4;

/**
 * One structured-output Messages call: the response is constrained to `schema`
 * by the API (`output_config.format`) and validated by zod on the way back.
 * Replaces the old "ask for JSON, regex the braces, hope" pattern.
 */
export async function createStructuredMessage<T>(
  schema: z.ZodType<T>,
  params: StructuredCallParams,
): Promise<StructuredCallResult<T>> {
  const client = getAnthropicClient();
  if (!client) throw new Error("Anthropic is not configured (no credentials resolved)");

  const system: Anthropic.TextBlockParam[] = [
    params.system.length >= CACHE_MIN_CHARS
      ? { type: "text", text: params.system, cache_control: { type: "ephemeral" } }
      : { type: "text", text: params.system },
  ];

  const response = await client.messages.parse(
    {
      model: params.model,
      max_tokens: params.maxTokens,
      system,
      messages: [{ role: "user", content: params.user }],
      output_config: { format: zodOutputFormat(schema) },
    },
    { timeout: params.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS, signal: params.signal },
  );

  const usage = {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    cacheReadInputTokens: response.usage?.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: response.usage?.cache_creation_input_tokens ?? 0,
  };

  if (response.stop_reason === "max_tokens") {
    throw new StructuredOutputError(
      `Structured output truncated at max_tokens=${params.maxTokens} (model ${params.model})`,
      "max_tokens",
      response.stop_reason,
    );
  }
  if (response.stop_reason === "refusal") {
    throw new StructuredOutputError("Model refused the request", "refusal", response.stop_reason);
  }
  const parsed = response.parsed_output;
  if (parsed === null || parsed === undefined) {
    throw new StructuredOutputError(
      `Model returned no parseable structured output (stop_reason ${response.stop_reason})`,
      "empty",
      response.stop_reason,
    );
  }
  return { data: parsed as T, model: response.model, usage };
}
