import type { RecommendationFeedbackValue } from "@shared/recommendations";

interface CachedRecommendation {
  resource?: { id?: unknown };
  feedback?: RecommendationFeedbackValue | null;
}

interface RecommendationCacheEnvelope {
  data?: { recommendations?: unknown[] };
  timestamp?: number;
}

export function recommendationFeedbackQueryKey(userId?: string) {
  return [
    "/api/recommendations/feedback",
    userId ?? "signed-out",
  ] as const;
}

/**
 * Applies a durable feedback choice to a serialized recommendation cache.
 * Excluded choices prune the exact resource; Helpful/restore retain the card
 * and update its selected state. Invalid cache data is left for the normal
 * cache parser to discard.
 */
export function updateSerializedRecommendationCache(
  serialized: string,
  resourceId: number,
  feedback: RecommendationFeedbackValue | null,
): string | null {
  try {
    const cached: unknown = JSON.parse(serialized);
    if (!cached || typeof cached !== "object") return null;
    const envelope = cached as RecommendationCacheEnvelope;
    if (!Array.isArray(envelope.data?.recommendations)) return null;

    const excluded =
      feedback === "hidden"
      || feedback === "not_for_me"
      || feedback === "already_known";
    envelope.data.recommendations = excluded
      ? envelope.data.recommendations.filter((item) => {
          if (!item || typeof item !== "object") return true;
          const recommendation = item as CachedRecommendation;
          return recommendation.resource?.id !== resourceId;
        })
      : envelope.data.recommendations.map((item) => {
          if (!item || typeof item !== "object") return item;
          const recommendation = item as CachedRecommendation;
          return recommendation.resource?.id === resourceId
            ? { ...recommendation, feedback }
            : item;
        });

    return JSON.stringify(envelope);
  } catch {
    return null;
  }
}