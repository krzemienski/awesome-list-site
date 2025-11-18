import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";

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

export interface Resource {
  id: number;
  title: string;
  url: string;
  description: string;
  category?: string;
  subcategory?: string;
  subSubcategory?: string;
}

export interface RecommendationResult {
  resource: Resource;
  confidence: number; // 0-100
  reason: string;
  type: 'ai_powered' | 'rule_based' | 'hybrid';
  score?: number;
}

export interface LearningPathRecommendation {
  id: number | string;
  title: string;
  difficulty: string;
  duration: string;
  resourceCount: number;
  matchScore: number; // 0-100
  category?: string;
  description?: string;
  resources?: Resource[];
}

export interface RecommendationsResponse {
  recommendations: RecommendationResult[];
  learningPaths: LearningPathRecommendation[];
}

interface UseAIRecommendationsOptions {
  limit?: number;
  autoLoad?: boolean;
  cacheTime?: number;
}

// Main hook for AI recommendations
export function useAIRecommendations(
  userProfile?: UserProfile,
  options: UseAIRecommendationsOptions = {}
) {
  const { limit = 10, autoLoad = false, cacheTime = 5 * 60 * 1000 } = options;
  const [localCache, setLocalCache] = useState<RecommendationsResponse | null>(null);

  // Fetch recommendations mutation
  const recommendationsMutation = useMutation({
    mutationFn: async (profile?: UserProfile): Promise<RecommendationsResponse> => {
      const url = `/api/recommendations?limit=${limit}`;
      const finalProfile = profile || userProfile;
      
      if (finalProfile) {
        return await apiRequest(url, { 
          method: 'POST', 
          body: JSON.stringify(finalProfile) 
        });
      } else {
        // Use GET for anonymous users
        return await apiRequest(url, { method: 'GET' });
      }
    },
    onSuccess: (data) => {
      // Cache locally
      setLocalCache(data);
      // Cache in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_recommendations_cache', JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    }
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      resourceId, 
      feedback, 
      rating 
    }: { 
      userId: string;
      resourceId: number;
      feedback: 'clicked' | 'dismissed' | 'completed';
      rating?: number;
    }) => {
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

  // Load from local cache on mount
  useEffect(() => {
    if (autoLoad && !localCache && typeof window !== 'undefined') {
      const cached = localStorage.getItem('ai_recommendations_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheTime) {
          setLocalCache(data);
        } else if (userProfile) {
          // Auto-refresh if cache is stale and we have a user profile
          recommendationsMutation.mutate(userProfile);
        }
      } else if (userProfile) {
        // No cache, auto-load if profile available
        recommendationsMutation.mutate(userProfile);
      }
    }
  }, [autoLoad, userProfile]);

  return {
    // Data
    recommendations: localCache?.recommendations || recommendationsMutation.data?.recommendations || [],
    learningPaths: localCache?.learningPaths || recommendationsMutation.data?.learningPaths || [],
    
    // Actions
    generateRecommendations: recommendationsMutation.mutate,
    generateRecommendationsAsync: recommendationsMutation.mutateAsync,
    recordFeedback: feedbackMutation.mutate,
    recordFeedbackAsync: feedbackMutation.mutateAsync,
    clearCache: () => {
      setLocalCache(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ai_recommendations_cache');
      }
    },
    
    // State
    isLoading: recommendationsMutation.isPending,
    isError: recommendationsMutation.isError,
    error: recommendationsMutation.error,
    isSuccess: recommendationsMutation.isSuccess,
    isFeedbackLoading: feedbackMutation.isPending,
    
    // Utils
    reset: recommendationsMutation.reset,
  };
}

// Hook for learning path generation
export function useLearningPaths() {
  // Generate custom learning path
  const generatePathMutation = useMutation({
    mutationFn: async ({ 
      userProfile, 
      category, 
      customGoals 
    }: { 
      userProfile: UserProfile;
      category?: string;
      customGoals?: string[];
    }) => {
      return await apiRequest('/api/learning-paths/generate', {
        method: 'POST',
        body: JSON.stringify({ userProfile, category, customGoals })
      });
    }
  });

  // Get suggested paths query
  const useSuggestedPaths = (params?: {
    userId?: string;
    categories?: string[];
    skillLevel?: string;
    goals?: string[];
    limit?: number;
  }) => {
    const queryString = new URLSearchParams();
    if (params?.userId) queryString.append('userId', params.userId);
    if (params?.categories) queryString.append('categories', params.categories.join(','));
    if (params?.skillLevel) queryString.append('skillLevel', params.skillLevel);
    if (params?.goals) queryString.append('goals', params.goals.join(','));
    if (params?.limit) queryString.append('limit', params.limit.toString());

    return useQuery({
      queryKey: ['/api/learning-paths/suggested', params],
      queryFn: async () => {
        const url = `/api/learning-paths/suggested${queryString.toString() ? '?' + queryString.toString() : ''}`;
        return await apiRequest(url, { method: 'GET' });
      },
      enabled: !!params
    });
  };

  return {
    generatePath: generatePathMutation.mutate,
    generatePathAsync: generatePathMutation.mutateAsync,
    isGenerating: generatePathMutation.isPending,
    generationError: generatePathMutation.error,
    useSuggestedPaths
  };
}

// Hook for quick recommendations without full profile
export function useQuickRecommendations(categories?: string[], skillLevel?: string) {
  return useQuery({
    queryKey: ['/api/recommendations', 'quick', categories, skillLevel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categories?.length) params.append('categories', categories.join(','));
      if (skillLevel) params.append('skillLevel', skillLevel);
      params.append('limit', '5');

      const url = `/api/recommendations${params.toString() ? '?' + params.toString() : ''}`;
      return await apiRequest(url, { method: 'GET' });
    },
    enabled: !!categories || !!skillLevel,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}