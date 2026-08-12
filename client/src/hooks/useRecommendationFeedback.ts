import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import {
  recommendationFeedbackQueryKey,
  updateSerializedRecommendationCache,
} from "@/lib/recommendation-cache";
import { useAuth } from "@/hooks/useAuth";
import type {
  RecommendationFeedbackState,
  RecommendationFeedbackValue,
} from "@shared/recommendations";
import { RECOMMENDATION_FEEDBACK_VALUES } from "@shared/recommendations";

export interface FeedbackParams {
  resourceId: number;
  feedback: RecommendationFeedbackValue | null;
}

export interface FeedbackResponse {
  resourceId: number;
  feedback: RecommendationFeedbackValue | null;
  updatedAt: string;
}

function isRecommendationFeedbackValue(
  value: unknown,
): value is RecommendationFeedbackValue {
  return (RECOMMENDATION_FEEDBACK_VALUES as readonly unknown[]).includes(value);
}

function isFeedbackState(value: unknown): value is RecommendationFeedbackState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<RecommendationFeedbackState>;
  return (
    typeof state.resourceId === "number"
    && typeof state.updatedAt === "string"
    && isRecommendationFeedbackValue(state.feedback)
  );
}

function patchStoredRecommendationCache(
  userId: string,
  resourceId: number,
  feedback: RecommendationFeedbackValue | null,
): void {
  const key = `ai_recommendations_cache:${userId}`;
  const serialized = safeGetItem(key);
  if (serialized) {
    const updated = updateSerializedRecommendationCache(
      serialized,
      resourceId,
      feedback,
    );
    if (updated) safeSetItem(key, updated);
  }
  window.dispatchEvent(new CustomEvent("recommendation-feedback-saved", {
    detail: { resourceId, feedback },
  }));
}

/**
 * Hook for recording user feedback on AI recommendations
 * Automatically invalidates recommendation cache on successful feedback submission
 */
export function useRecommendationFeedback() {
  const { user } = useAuth();
  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({
      resourceId,
      feedback
    }: FeedbackParams): Promise<FeedbackResponse> => {
      const raw: unknown = await apiRequest(`/api/recommendations/${resourceId}/feedback`, {
        method: 'PUT',
        body: JSON.stringify({ feedback })
      });
      if (!raw || typeof raw !== "object") {
        throw new Error("Invalid feedback response");
      }
      const response = raw as Partial<FeedbackResponse>;
      if (
        typeof response.resourceId !== "number"
        || typeof response.updatedAt !== "string"
        || (
          response.feedback !== null
          && !isRecommendationFeedbackValue(response.feedback)
        )
      ) {
        throw new Error("Invalid feedback response");
      }
      return {
        resourceId: response.resourceId,
        feedback: response.feedback ?? null,
        updatedAt: response.updatedAt,
      };
    },
    onSuccess: (data) => {
      if (user?.id) {
        patchStoredRecommendationCache(user.id, data.resourceId, data.feedback);
      }
      if (user?.id) {
        void queryClient.invalidateQueries({
          queryKey: recommendationFeedbackQueryKey(user.id),
        });
      }
    }
  });

  return {
    // Actions
    recordFeedback: feedbackMutation.mutate,
    recordFeedbackAsync: feedbackMutation.mutateAsync,

    // State
    isLoading: feedbackMutation.isPending,
    isError: feedbackMutation.isError,
    error: feedbackMutation.error,
    isSuccess: feedbackMutation.isSuccess,

    // Utils
    reset: feedbackMutation.reset,
  };
}

export function useRecommendationFeedbackStates(
  userId?: string,
  enabled = true,
) {
  return useQuery<RecommendationFeedbackState[]>({
    queryKey: recommendationFeedbackQueryKey(userId),
    queryFn: async () => {
      const raw: unknown = await apiRequest(
        '/api/recommendations/feedback',
        { method: 'GET' },
      );
      if (!Array.isArray(raw)) throw new Error("Invalid feedback response");
      return raw.filter(isFeedbackState);
    },
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
  });
}
