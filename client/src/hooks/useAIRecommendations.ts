import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/safeStorage";
import type {
  RecommendationExplanation,
  RecommendationFeedbackValue,
} from "@shared/recommendations";
import type { ResourceKind } from "@shared/resourceKinds";

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
  /** Public resource resolver fields used by ResourceCard badges. */
  kind?: ResourceKind | null;
  resolvedKind?: ResourceKind;
  metadata?: Record<string, unknown>;
}

export interface RecommendationResult {
  resource: Resource;
  confidence: number; // 0-100
  reason: string;
  type: 'ai_powered' | 'rule_based' | 'hybrid';
  score?: number;
  explanation: RecommendationExplanation;
  feedback: RecommendationFeedbackValue | null;
  personalized: boolean;
}

export interface RecommendationsResponse {
  recommendations: RecommendationResult[];
}

interface UseAIRecommendationsOptions {
  limit?: number;
  autoLoad?: boolean;
  cacheTime?: number;
  cacheUserId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRecommendationResult(value: unknown): value is RecommendationResult {
  if (!isRecord(value) || !isRecord(value.resource)) return false;
  return (
    typeof value.resource.id === "number"
    && typeof value.resource.title === "string"
    && typeof value.resource.url === "string"
    && typeof value.confidence === "number"
    && typeof value.reason === "string"
  );
}

function normalizeRecommendationsResponse(raw: unknown): RecommendationsResponse {
  if (Array.isArray(raw)) {
    return {
      recommendations: raw.filter(isRecommendationResult),
    };
  }
  if (!isRecord(raw)) return { recommendations: [] };
  return {
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.filter(isRecommendationResult)
      : [],
  };
}

function parseCachedRecommendations(
  raw: string,
): { data: RecommendationsResponse; timestamp: number } | null {
  const parsed: unknown = JSON.parse(raw);
  if (
    !isRecord(parsed)
    || typeof parsed.timestamp !== "number"
    || !isRecord(parsed.data)
  ) {
    return null;
  }
  return {
    data: normalizeRecommendationsResponse(parsed.data),
    timestamp: parsed.timestamp,
  };
}

// Main hook for AI recommendations
export function useAIRecommendations(
  userProfile?: UserProfile,
  options: UseAIRecommendationsOptions = {}
) {
  const {
    limit = 10,
    autoLoad = false,
    cacheTime = 5 * 60 * 1000,
    cacheUserId,
  } = options;
  const [localCache, setLocalCache] = useState<RecommendationsResponse | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const cacheKey = `ai_recommendations_cache:${cacheUserId ?? userProfile?.userId ?? 'anonymous'}`;

  // Fetch recommendations mutation
  const recommendationsMutation = useMutation({
    mutationFn: async ({
      profile,
      forceRefresh = false,
    }: {
      profile?: UserProfile;
      forceRefresh?: boolean;
    }): Promise<RecommendationsResponse> => {
      const url = `/api/recommendations?limit=${limit}${forceRefresh ? '&refresh=true' : ''}`;
      const finalProfile = profile ?? userProfile;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20_000);

      try {
        // Authenticated profile fields are ignored by the server except as the
        // signal to use POST; saved account preferences remain authoritative.
        const raw: unknown = finalProfile
          ? await apiRequest(url, {
              method: 'POST',
              body: JSON.stringify({}),
              signal: controller.signal,
            })
          : await apiRequest(url, { method: 'GET', signal: controller.signal });

        return normalizeRecommendationsResponse(raw);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Recommendation refresh timed out. Your saved results are still available.');
        }
        throw error;
      } finally {
        window.clearTimeout(timeout);
      }
    },
    onSuccess: (data) => {
      setLocalCache(data);
      setIsStale(false);
      setIsFromCache(false);
      setLastUpdatedAt(Date.now());
      if (typeof window !== 'undefined') {
        safeSetItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    }
  });

  // A stale user-scoped cache is still useful: render it immediately, label it,
  // and refresh in the background rather than replacing the panel with blanks.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLocalCache(null);
    setLastUpdatedAt(null);
    setIsStale(false);
    setIsFromCache(false);
    const cached = safeGetItem(cacheKey);
    if (cached) {
      try {
        const parsed = parseCachedRecommendations(cached);
        if (parsed) {
          setLocalCache(parsed.data);
          setLastUpdatedAt(parsed.timestamp);
          setIsStale(Date.now() - parsed.timestamp >= cacheTime);
          setIsFromCache(true);
        } else {
          safeRemoveItem(cacheKey);
        }
      } catch {
        safeRemoveItem(cacheKey);
      }
    }
  }, [cacheKey, cacheTime]);

  // Keep concurrently mounted recommendation surfaces in sync without
  // removing undoable "not for me" / "already known" cards from the surface
  // where the choice was just made. Hidden cards disappear immediately; all
  // other values update their selected state until the next refresh.
  useEffect(() => {
    const handleFeedbackSaved = (event: Event) => {
      const detail = (event as CustomEvent<{
        resourceId?: unknown;
        feedback?: unknown;
      }>).detail;
      if (typeof detail?.resourceId !== "number") return;
      setLocalCache((current) => {
        if (!current) return current;
        if (detail.feedback === "hidden") {
          return {
            ...current,
            recommendations: current.recommendations.filter(
              (recommendation) =>
                recommendation.resource.id !== detail.resourceId,
            ),
          };
        }
        return {
          ...current,
          recommendations: current.recommendations.map((recommendation) =>
            recommendation.resource.id === detail.resourceId
              ? {
                  ...recommendation,
                  feedback:
                    typeof detail.feedback === "string"
                      ? detail.feedback as RecommendationFeedbackValue
                      : null,
                }
              : recommendation,
          ),
        };
      });
    };
    window.addEventListener("recommendation-feedback-saved", handleFeedbackSaved);
    return () => {
      window.removeEventListener(
        "recommendation-feedback-saved",
        handleFeedbackSaved,
      );
    };
  }, []);

  useEffect(() => {
    if (autoLoad && userProfile && !localCache && !recommendationsMutation.isPending) {
      recommendationsMutation.mutate({ profile: userProfile });
    }
  }, [autoLoad, userProfile, localCache, recommendationsMutation]);

  const recommendations =
    localCache?.recommendations
    ?? recommendationsMutation.data?.recommendations
    ?? [];

  return {
    // Data
    recommendations,
    
    // Actions
    generateRecommendations: (profile?: UserProfile) =>
      recommendationsMutation.mutate({ profile }),
    generateRecommendationsAsync: (profile?: UserProfile) =>
      recommendationsMutation.mutateAsync({ profile }),
    refreshRecommendations: (profile?: UserProfile) =>
      recommendationsMutation.mutate({ profile, forceRefresh: true }),
    clearCache: () => {
      setLocalCache(null);
      setIsStale(false);
      setIsFromCache(false);
      setLastUpdatedAt(null);
      if (typeof window !== 'undefined') {
        safeRemoveItem(cacheKey);
      }
    },
    
    // State
    isLoading: recommendationsMutation.isPending,
    isError: recommendationsMutation.isError,
    error: recommendationsMutation.error,
    isSuccess: recommendationsMutation.isSuccess || recommendations.length > 0,
    hasUsefulResults: recommendations.length > 0,
    isStale,
    isFromCache,
    lastUpdatedAt,
    
    // Utils
    reset: recommendationsMutation.reset,
  };
}
