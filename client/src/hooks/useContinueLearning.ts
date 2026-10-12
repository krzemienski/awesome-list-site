import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { ContinueLearningSummary } from "@shared/continueLearning";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackJourneyResumed, type ResumeSurface } from "@/lib/analytics-contributions";

const SUMMARY_KEY = ["/api/user/continue-learning"] as const;

export function useContinueLearningSummary(enabled: boolean) {
  return useQuery<ContinueLearningSummary>({
    queryKey: SUMMARY_KEY,
    enabled,
    staleTime: 60_000,
  });
}

export function useResumeJourney(surface: ResumeSurface) {
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async ({
      journeyId,
      href,
    }: {
      journeyId: number;
      href: string;
      /** Analytics only: whether the resume lands on a specific next step. */
      hasNextStep: boolean;
      progressPercent?: number;
    }) => {
      await apiRequest(`/api/journeys/${journeyId}/start`, {
        method: "POST",
      });
      return href;
    },
    onSuccess: (href, variables) => {
      // Server-confirmed resume. Never journey_started: that event belongs to
      // the journey page's first enrollment only.
      trackJourneyResumed({
        journeyId: variables.journeyId,
        surface,
        hasNextStep: variables.hasNextStep,
        progressPercent: variables.progressPercent,
      });
      void queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["/api/user/journeys"] });
      void queryClient.invalidateQueries({
        queryKey: [`/api/journeys/${variables.journeyId}`],
      });
      setLocation(href);
    },
  });
}