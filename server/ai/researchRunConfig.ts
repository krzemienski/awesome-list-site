import type { ResearchPreflightIssue, ResolvedResearchConfig } from "@shared/researcherContract";
import { insecureHttpRefusal } from "@shared/validation";
import { FLOW_TIERS, MODEL_TIERS, tierEnvVar } from "./anthropicConfig";

/**
 * Strict endpoint / credential / model resolution for Researcher runs.
 *
 * Unlike the shared resolver in anthropicConfig.ts (which serves every other
 * AI flow and falls back across credential sources and first-party model ids),
 * a research run uses exactly what is configured or does not launch:
 *   - endpoint + credential: ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN, unless
 *     the admin supplied a per-run override;
 *   - orchestrator: ANTHROPIC_MODEL, unless overridden;
 *   - scout: the scout tier alias, which the Agent SDK CLI maps through
 *     ANTHROPIC_DEFAULT_<TIER>_MODEL. The variable must be set: without it the
 *     CLI silently substitutes its own first-party model. The alias, not the
 *     resolved id, goes in the subagent definition because the CLI checks
 *     per-agent model ids against an Anthropic allowlist and silently swaps
 *     unknown ones (router "cc/…" ids included); aliases always pass. A scout
 *     override is therefore only accepted as a tier alias (or the id one maps
 *     to) with its variable set, or as the orchestrator model ("inherit").
 * Every missing piece is a preflight issue; the launch route refuses the run.
 */

type Env = Record<string, string | undefined>;

export interface ResearchRunConfigInput {
  model?: string | null;
  scoutModel?: string | null;
  /** Override base URL, already validated by agentRuntime.validateBaseUrl. */
  baseUrl?: string | null;
  hasAuthToken: boolean;
  authTokenLast4?: string | null;
  allowInsecureHttp?: boolean;
}

function clean(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

function parseEndpoint(raw: string): { host: string; baseUrl: string; scheme: "https" | "http" } | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.username = "";
    u.password = "";
    // Recorded in research_jobs and shown to admins: never keep a ?key=.
    u.search = "";
    u.hash = "";
    return { host: u.host, baseUrl: u.toString().replace(/\/+$/, ""), scheme: u.protocol === "http:" ? "http" : "https" };
  } catch {
    return null;
  }
}

function missing(variable: string, why: string): ResearchPreflightIssue {
  return { code: "missing_env", variable, message: `${variable} is not set: ${why}` };
}

/**
 * A scout override must run exactly as recorded. The orchestrator id runs as
 * "inherit"; a tier alias, or the id an ANTHROPIC_DEFAULT_<TIER>_MODEL maps
 * to, runs as that alias. Any other id is refused: the CLI's per-agent
 * allowlist would silently swap it for its own default model.
 */
function resolveScoutOverride(
  requested: string,
  orchestratorModel: string | null,
  env: Env,
  issues: ResearchPreflightIssue[],
): ResolvedResearchConfig["scout"] {
  if (requested === orchestratorModel) return { value: "inherit", model: requested, source: "override" };
  const tier = MODEL_TIERS.find((t) => t === requested.toLowerCase())
    ?? MODEL_TIERS.find((t) => clean(env[tierEnvVar(t)]) === requested);
  if (!tier) {
    issues.push({
      code: "unsupported_scout_model",
      message: `Scout model "${requested}" cannot be guaranteed: the Agent SDK can swap a subagent model id for its own default, so the scout only runs on a tier alias (${MODEL_TIERS.join(", ")}) whose ANTHROPIC_DEFAULT_<TIER>_MODEL is set, the id one of those variables maps to, or the orchestrator model.`,
    });
    return { value: null, model: null, source: "override" };
  }
  const variable = tierEnvVar(tier);
  const id = clean(env[variable]);
  if (!id) issues.push(missing(variable, `the scout override "${requested}" runs on the "${tier}" alias, which the Agent SDK maps through it (without it the SDK silently uses its own default model).`));
  return { value: tier, model: id, source: "override" };
}

export function resolveResearchRunConfig(input: ResearchRunConfigInput, env: Env = process.env): ResolvedResearchConfig {
  const issues: ResearchPreflightIssue[] = [];
  const overrideBase = clean(input.baseUrl);
  const overrideModel = clean(input.model);
  const overrideScout = clean(input.scoutModel);

  const endpointRaw = overrideBase ?? clean(env.ANTHROPIC_BASE_URL);
  const endpoint = endpointRaw ? parseEndpoint(endpointRaw) : null;
  if (!endpointRaw) {
    issues.push(missing("ANTHROPIC_BASE_URL", "research runs need the configured router endpoint."));
  } else if (!endpoint) {
    issues.push({ code: "invalid_base_url", message: `${overrideBase ? "The override base URL" : "ANTHROPIC_BASE_URL"} is not a valid http(s) URL.` });
  }
  const insecureHttp = insecureHttpRefusal(overrideBase, !!input.allowInsecureHttp);
  if (insecureHttp) issues.push({ code: "insecure_http_unconfirmed", message: insecureHttp });

  let credentialLabel: string;
  if (input.hasAuthToken) {
    credentialLabel = input.authTokenLast4 ? `override token ••••${input.authTokenLast4}` : "override token";
  } else {
    credentialLabel = "router via ANTHROPIC_BASE_URL";
    if (overrideBase) {
      issues.push({ code: "override_token_required", message: "A custom base URL requires an auth token — the platform credential is never sent to a custom endpoint." });
    } else if (!clean(env.ANTHROPIC_AUTH_TOKEN)) {
      issues.push(missing(
        "ANTHROPIC_AUTH_TOKEN",
        clean(env.ANTHROPIC_API_KEY)
          ? "research runs authenticate to the router with its bearer token; ANTHROPIC_API_KEY is not used for them."
          : "research runs authenticate to the router with its bearer token.",
      ));
    }
  }

  const orchestratorModel = overrideModel ?? clean(env.ANTHROPIC_MODEL);
  if (!orchestratorModel) issues.push(missing("ANTHROPIC_MODEL", "it names the orchestrator model."));

  let scout: ResolvedResearchConfig["scout"];
  if (overrideScout) {
    scout = resolveScoutOverride(overrideScout, orchestratorModel, env, issues);
  } else if (overrideModel) {
    // A custom orchestrator id may not exist behind the scout alias; the CLI's
    // per-agent allowlist would also swap a custom id. "inherit" reuses it verbatim.
    scout = { value: "inherit", model: orchestratorModel, source: "inherit" };
  } else {
    const tier = FLOW_TIERS.researchScout;
    const variable = tierEnvVar(tier);
    const id = clean(env[variable]);
    if (!id) issues.push(missing(variable, `the scout runs on the "${tier}" alias, which the Agent SDK maps through it (without it the SDK silently uses its own default model).`));
    scout = { value: tier, model: id, source: variable };
  }

  return {
    version: 1,
    endpoint: {
      host: endpoint?.host ?? null,
      baseUrl: endpoint?.baseUrl ?? null,
      scheme: endpoint?.scheme ?? null,
      source: overrideBase ? "override" : "env",
    },
    credential: {
      source: input.hasAuthToken ? "override" : "env",
      label: credentialLabel,
      tokenLast4: input.hasAuthToken ? input.authTokenLast4 ?? null : null,
    },
    orchestrator: { model: orchestratorModel, source: overrideModel ? "override" : "ANTHROPIC_MODEL" },
    scout,
    overrides: {
      baseUrl: !!overrideBase,
      authToken: input.hasAuthToken,
      model: !!overrideModel,
      scoutModel: !!overrideScout,
      insecureHttp: !!overrideBase && endpoint?.scheme === "http" && !!input.allowInsecureHttp,
    },
    preflight: { ok: issues.length === 0, issues },
  };
}

/** One message for a refused launch. */
export function researchPreflightMessage(config: ResolvedResearchConfig): string {
  return `Research run not started — ${config.preflight.issues.map((i) => i.message).join(" ")}`;
}

/** Secret-free one-line summary for the run's first log line and server logs. */
export function describeResearchRunConfig(config: ResolvedResearchConfig): string {
  const o = config.overrides;
  const endpointTags = [o.baseUrl ? "OVERRIDE base URL" : null, o.insecureHttp ? "plain http CONFIRMED" : null].filter(Boolean);
  const endpoint = `Endpoint ${config.endpoint.host ?? "(unresolved)"}${endpointTags.length ? ` [${endpointTags.join(", ")}]` : ""} (${config.credential.label}${o.authToken ? " [OVERRIDE]" : ""})`;
  const orchestrator = `Orchestrator ${config.orchestrator.model ?? "(unresolved)"} (${config.orchestrator.source === "override" ? "OVERRIDE" : config.orchestrator.source})`;
  const s = config.scout;
  const scoutSource = s.source === "override" ? `OVERRIDE as ${s.value}` : s.source === "inherit" ? "inherit from orchestrator" : `${s.value} via ${s.source}`;
  const scout = `Scout ${s.model ?? "(unresolved)"} (${scoutSource})`;
  return `${endpoint} · ${orchestrator} · ${scout}`;
}
