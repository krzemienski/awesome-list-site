import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface FeedbackParams {
  userId: string;
  resourceId: number;
  feedback: 'clicked' | 'dismissed' | 'completed';
  rating?: number;
}

export interface FeedbackResponse {
  success: boolean;
  message?: string;
}

/**
 * Hook for recording user feedback on AI recommendations
 * Automatically invalidates recommendation cache on successful feedback submission
 */
export function useRecommendationFeedback() {
  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({
      userId,
      resourceId,
      feedback,
      rating
    }: FeedbackParams): Promise<FeedbackResponse> => {
      return await apiRequest('/api/recommendations/feedback', {
        method: 'POST',
        body: JSON.stringify({ userId, resourceId, feedback, rating })
      });
    },
    onSuccess: () => {
      // Invalidate recommendations cache to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
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
