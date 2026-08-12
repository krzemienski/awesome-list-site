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

function parseLearningPreferencesResponse(
  value: unknown,
): LearningPreferencesResponse {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid learning preferences response");
  }
  const response = value as Partial<LearningPreferencesResponse>;
  if (
    response.revision !== null
    && response.revision !== undefined
    && typeof response.revision !== "number"
  ) {
    throw new Error("Invalid learning preferences response");
  }
  if (
    response.preferences !== null
    && response.preferences !== undefined
    && typeof response.preferences !== "object"
  ) {
    throw new Error("Invalid learning preferences response");
  }
  return {
    preferences: response.preferences ?? null,
    revision: response.revision ?? null,
  };
}

export function useLearningPreferences() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
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
      const response: unknown = await apiRequest("/api/user/preferences", {
        method: "PUT",
        body: JSON.stringify({
          ...update,
          expectedRevision:
            current?.revision ?? current?.preferences?.revision ?? null,
        }),
      });
      return parseLearningPreferencesResponse(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user/preferences"], data);
      // Recommendation results are derived from these values. Drop the old
      // client cache so the next clearly labeled personalized surface uses the
      // newly saved profile.
      try {
        window.localStorage.removeItem("ai_recommendations_cache");
        if (user?.id) {
          window.localStorage.removeItem(`ai_recommendations_cache:${user.id}`);
        }
      } catch {
        // Storage may be unavailable in private browsing; the server save still
        // succeeded and the mounted recommendations panel will re-run.
      }
      void queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (): Promise<LearningPreferencesResponse> => {
      const current = queryClient.getQueryData<LearningPreferencesResponse>([
        "/api/user/preferences",
      ]);
      const response: unknown = await apiRequest("/api/user/preferences", {
        method: "DELETE",
        body: JSON.stringify({
          expectedRevision:
            current?.revision ?? current?.preferences?.revision ?? null,
        }),
      });
      return parseLearningPreferencesResponse(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user/preferences"], data);
      try {
        window.localStorage.removeItem("ai_recommendations_cache");
        if (user?.id) {
          window.localStorage.removeItem(`ai_recommendations_cache:${user.id}`);
        }
      } catch {
        // See save mutation above.
      }
      void queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
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