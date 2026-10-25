/**
 * Researcher run contract shared by the server, the admin UI and the guided
 * researcher view. Documented in docs/AI-SERVICES.md ("Researcher run
 * contract"). Everything here is secret-free: tokens never appear, only the
 * last four characters of a per-run override token.
 */

export type ResearchConfigSource = "env" | "override";

/** Why a run cannot launch with the given configuration. */
export type ResearchPreflightCode =
  | "missing_env"
  | "override_token_required"
  | "insecure_http_unconfirmed"
  | "invalid_base_url"
  /** A scout model override the Agent SDK could silently replace. */
  | "unsupported_scout_model";

export interface ResearchPreflightIssue {
  code: ResearchPreflightCode;
  message: string;
  /** Environment variable involved, when the issue is a missing variable. */
  variable?: string;
}

export interface ResolvedResearchConfig {
  version: 1;
  endpoint: {
    /** Host the run's API calls go to, e.g. "router.hack.ski". Null when unresolvable. */
    host: string | null;
    /** Endpoint URL without credentials. Null when unresolvable. */
    baseUrl: string | null;
    scheme: "https" | "http" | null;
    source: ResearchConfigSource;
  };
  credential: {
    source: ResearchConfigSource;
    /** Human label, e.g. "router via ANTHROPIC_BASE_URL" or "override token ••••1a2b". */
    label: string;
    /** Last four characters of a per-run override token; null for env credentials. */
    tokenLast4: string | null;
  };
  orchestrator: {
    /** Model id passed to the Agent SDK. Null when unresolvable. */
    model: string | null;
    /** "ANTHROPIC_MODEL" or "override". */
    source: string;
  };
  scout: {
    /** Value handed to the subagent definition: a tier alias, "inherit" or a literal id. */
    value: string | null;
    /** Model id the scout actually runs on. Null when unresolvable. */
    model: string | null;
    /** e.g. "ANTHROPIC_DEFAULT_HAIKU_MODEL", "inherit" or "override". */
    source: string;
  };
  overrides: {
    baseUrl: boolean;
    authToken: boolean;
    model: boolean;
    scoutModel: boolean;
    /** True when a plain-http override base URL was explicitly confirmed. */
    insecureHttp: boolean;
  };
  preflight: { ok: boolean; issues: ResearchPreflightIssue[] };
}

/**
 * How a run's estimated_cost_usd was obtained.
 * - reported: the Agent SDK result's total_cost_usd.
 * - lower_bound: no result arrived (cancel, abort), so the cost is priced from
 *   the agents' streamed per-model usage. It leaves out model calls made inside
 *   tools (WebSearch) and any model without a known price, so the real cost is
 *   higher — about 2x on a measured run (docs/AI-SERVICES.md, Accounting).
 * - unknown: tokens were used but no model that ran had a known price.
 */
export type CostBasis = "reported" | "lower_bound" | "unknown";

export const RESEARCH_PHASES = ["planning", "scouting", "verifying", "saving", "finishing"] as const;
export type ResearchPhase = (typeof RESEARCH_PHASES)[number];

/** `detail` of an agent_events row with eventType "phase". */
export interface ResearchPhaseEventDetail {
  phase: ResearchPhase;
  previous: ResearchPhase | null;
  /** What caused the transition, e.g. "run_started", "scout_started", "tool:check_duplicate". */
  trigger: string;
  /** Present on "finishing": the outcome the run is ending with. */
  outcome?: string;
}

/** `detail` of an agent_events row with eventType "scout_start". */
export interface ScoutStartEventDetail {
  /** 1-based order in which scouts started during the run. */
  scoutIndex: number;
  taskId: string;
  toolUseId: string | null;
  description: string;
  /** Scouts running at this moment, including this one. */
  concurrent: number;
}

/** `detail` of an agent_events row with eventType "scout_end". */
export interface ScoutEndEventDetail {
  scoutIndex: number;
  taskId: string;
  toolUseId: string | null;
  status: "completed" | "failed" | "aborted";
  durationMs: number;
  webSearches: number;
  /** Candidate URLs found in the scout's report. */
  candidateUrls: number;
}
