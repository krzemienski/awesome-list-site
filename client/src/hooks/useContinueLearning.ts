import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { ContinueLearningSummary } from "@shared/continueLearning";
import { apiRequest, queryClient } from "@/lib/queryClient";

const SUMMARY_KEY = ["/api/user/continue-learning"] as const;

export function useContinueLearningSummary(enabled: boolean) {
  return useQuery<ContinueLearningSummary>({
    queryKey: SUMMARY_KEY,
    enabled,
    staleTime: 60_000,
  });
}

export function useResumeJourney() {
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async ({
      journeyId,
      href,
    }: {
      journeyId: number;
      href: string;
    }) => {
      await apiRequest(`/api/journeys/${journeyId}/start`, {
        method: "POST",
      });
      return href;
    },
    onSuccess: (href, variables) => {
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/user/journeys"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/journeys/${variables.journeyId}`],
      });
      setLocation(href);
    },
  });
}