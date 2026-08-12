import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  LearningPreferencesUpdate,
  LearningPreferencesValues,
  OnboardingStatus,
} from "@shared/onboarding";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export interface LearningPreferencesRecord extends LearningPreferencesValues {
  id: number;
  userId: string;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  onboardingDismissedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  revision: number;
}

interface LearningPreferencesResponse {
  preferences: LearningPreferencesRecord | null;
  revision: number | null;
}

export function useLearningPreferences() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const query = useQuery<LearningPreferencesResponse>({
    queryKey: ["/api/user/preferences"],
    enabled: !authLoading && isAuthenticated,
  });

  const saveMutation = useMutation({
    mutationFn: async (
      update: LearningPreferencesUpdate,
    ): Promise<LearningPreferencesResponse> => {
      const current = queryClient.getQueryData<LearningPreferencesResponse>([
        "/api/user/preferences",
      ]);
      return apiRequest("/api/user/preferences", {
        method: "PUT",
        body: JSON.stringify({
          ...update,
          expectedRevision:
            current?.revision ?? current?.preferences?.revision ?? null,
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user/preferences"], data);
      // Recommendation results are derived from these values. Drop the old
      // client cache so the next clearly labeled personalized surface uses the
      // newly saved profile.
      try {
        window.localStorage.removeItem("ai_recommendations_cache");
      } catch {
        // Storage may be unavailable in private browsing; the server save still
        // succeeded and the mounted recommendations panel will re-run.
      }
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (): Promise<LearningPreferencesResponse> => {
      const current = queryClient.getQueryData<LearningPreferencesResponse>([
        "/api/user/preferences",
      ]);
      return apiRequest("/api/user/preferences", {
        method: "DELETE",
        body: JSON.stringify({
          expectedRevision:
            current?.revision ?? current?.preferences?.revision ?? null,
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user/preferences"], data);
      try {
        window.localStorage.removeItem("ai_recommendations_cache");
      } catch {
        // See save mutation above.
      }
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
  });

  return {
    preferences: query.data?.preferences ?? null,
    isLoading: authLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    savePreferences: saveMutation.mutate,
    savePreferencesAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    resetPreferences: resetMutation.mutate,
    resetPreferencesAsync: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
    resetError: resetMutation.error,
  };
}