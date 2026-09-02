export const RECOMMENDATION_FEEDBACK_VALUES = [
  "helpful",
  "not_for_me",
  "already_known",
  "hidden",
] as const;

export type RecommendationFeedbackValue =
  (typeof RECOMMENDATION_FEEDBACK_VALUES)[number];

// Type contract only — nothing iterates the codes at runtime (unlike
// RECOMMENDATION_FEEDBACK_VALUES above, which callers validate against).
export type RecommendationSignalCode =
  | "goal_match"
  | "format_match"
  | "time_fit"
  | "topic_match"
  | "skill_match"
  | "journey_context"
  | "positive_feedback"
  | "popular";

/**
 * Only server-derived, named evidence is exposed to recommendation clients.
 * `evidence` is a controlled preference/catalog label, never model prose.
 */
export interface RecommendationExplanationSignal {
  code: RecommendationSignalCode;
  label: string;
  evidence?: string;
}

export interface RecommendationExplanation {
  summary: string;
  signals: RecommendationExplanationSignal[];
}

export interface RecommendationFeedbackState {
  resourceId: number;
  feedback: RecommendationFeedbackValue;
  updatedAt: string;
  resource?: {
    id: number;
    title: string;
    url: string;
    category: string;
    description?: string;
  };
}