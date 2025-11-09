import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface UserProfile {
  userId: string;
  preferredCategories: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  learningGoals: string[];
  preferredResourceTypes: string[];
  timeCommitment: 'daily' | 'weekly' | 'flexible';
  viewHistory: string[];
  bookmarks: string[];
  completedResources: string[];
  ratings: Record<string, number>;
}

export interface AIRecommendationResult {
  resourceId: string;
  score: number;
  reason: string;
  category: string;
  confidenceLevel: number;
  aiGenerated: boolean;
}

interface UseAIRecommendationsOptions {
  limit?: number;
}

export function useAIRecommendations(options: UseAIRecommendationsOptions = {}) {
  const { limit = 10 } = options;

  const mutation = useMutation({
    mutationFn: async (userProfile: UserProfile): Promise<AIRecommendationResult[]> => {
      const url = `/api/recommendations?limit=${limit}`;
      const response = await apiRequest('POST', url, userProfile);
      return response.json();
    },
  });

  return {
    generateRecommendations: mutation.mutate,
    generateRecommendationsAsync: mutation.mutateAsync,
    recommendations: mutation.data,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
