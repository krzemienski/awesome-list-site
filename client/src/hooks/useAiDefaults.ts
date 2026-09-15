import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

/**
 * Secret-free AI endpoint + model configuration as reported by the server
 * (`GET /api/health/ai`, admin shape). Lets the Researcher / Enrichment panels
 * show the real defaults a run will use — the same values the server resolves
 * from ANTHROPIC_MODEL / ANTHROPIC_DEFAULT_<TIER>_MODEL — instead of
 * hard-coded placeholders that drift from the deployment.
 */
export interface AiConfigSummary {
  endpoint: "router" | "managed" | "direct" | "none";
  label: string;
  baseUrlHost: string;
  /** Full endpoint URL (no credentials), e.g. "https://router.example" */
  baseUrl: string;
  primaryModel: string;
  models: { haiku: string; sonnet: string; opus: string; fable: string };
  flows: Record<string, string>;
}

export interface AiHealthResponse {
  status?: string;
  available?: boolean;
  config?: AiConfigSummary;
}

export function useAiDefaults() {
  const query = useQuery<AiHealthResponse>({
    queryKey: ["/api/health/ai"],
    queryFn: () => apiRequest("/api/health/ai"),
    staleTime: 5 * 60_000,
  });
  const config = query.data?.config;
  return {
    config,
    isLoading: query.isLoading,
    /** Default model for a named server flow, or undefined until loaded. */
    flowModel: (flow: string): string | undefined => config?.flows?.[flow],
  };
}
