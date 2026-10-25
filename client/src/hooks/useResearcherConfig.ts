import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ResolvedResearchConfig } from "@shared/researcherContract";

export interface ResearcherConfigOverrides {
  model?: string;
  scoutModel?: string;
  baseUrl?: string;
  hasAuthToken?: boolean;
  allowInsecureHttp?: boolean;
}

/** URL of GET /api/researcher/config for a set of launch-form overrides. */
export function researcherConfigUrl(o: ResearcherConfigOverrides = {}): string {
  const p = new URLSearchParams();
  if (o.model?.trim()) p.set("model", o.model.trim());
  if (o.scoutModel?.trim()) p.set("scoutModel", o.scoutModel.trim());
  if (o.baseUrl?.trim()) p.set("baseUrl", o.baseUrl.trim());
  if (o.hasAuthToken) p.set("hasAuthToken", "1");
  if (o.allowInsecureHttp) p.set("allowInsecureHttp", "1");
  const qs = p.toString();
  return `/api/researcher/config${qs ? `?${qs}` : ""}`;
}

/**
 * The configuration a research run would launch with (endpoint host,
 * credential source, models, override flags, preflight), resolved by the
 * server exactly as POST /api/researcher/start resolves it.
 */
export function useResearcherConfig(overrides: ResearcherConfigOverrides, enabled = true) {
  const url = researcherConfigUrl(overrides);
  return useQuery<{ success: boolean; config: ResolvedResearchConfig }>({
    // The default fetcher reads only queryKey[0], so the full URL goes there.
    queryKey: [url],
    queryFn: () => apiRequest(url),
    enabled,
    staleTime: 30_000,
  });
}
