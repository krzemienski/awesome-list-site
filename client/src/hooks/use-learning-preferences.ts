import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  LearningPreferencesUpdate,
  LearningPreferencesValues,
  HomeLayout,
  OnboardingStatus,
  ThemePreferencesValues,
} from "@shared/onboarding-values";
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
  homeLayout: HomeLayout;
  theme: {
    systemId: ThemePreferencesValues["themeSystem"];
    accentId: ThemePreferencesValues["themeAccent"];
  } | null;
  revision: number | null;
}

function parseLearningPreferencesResponse(
  value: unknown,
): LearningPreferencesResponse {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid learning preferences response");
  }
  const response = value as Partial<LearningPreferencesResponse>;
  if (response.homeLayout !== "index" && response.homeLayout !== "curated") {
    throw new Error("Invalid learning preferences response");
  }
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
    homeLayout: response.homeLayout,
    theme: response.theme ?? null,
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

  const saveThemeMutation = useMutation({
    mutationFn: async (
      theme: ThemePreferencesValues,
    ): Promise<LearningPreferencesResponse> => {
      const current = queryClient.getQueryData<LearningPreferencesResponse>([
        "/api/user/preferences",
      ]);
      const response: unknown = await apiRequest("/api/user/preferences", {
        method: "PUT",
        body: JSON.stringify({
          ...theme,
          expectedRevision:
            current?.revision ?? current?.preferences?.revision ?? null,
        }),
      });
      return parseLearningPreferencesResponse(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user/preferences"], data);
    },
  });

  return {
    preferences: query.data?.preferences ?? null,
    homeLayout: query.data?.homeLayout ?? "index",
    theme: query.data?.theme ?? null,
    isAuthenticated,
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
    saveThemeAsync: saveThemeMutation.mutateAsync,
    isSavingTheme: saveThemeMutation.isPending,
    saveThemeError: saveThemeMutation.error,
  };
}