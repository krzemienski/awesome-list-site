/**
 * Server-owned contract for the signed-in Continue Learning experience.
 *
 * Dates cross the HTTP boundary as ISO strings. The contract deliberately
 * contains no user id, raw interaction metadata, or journey-step row ids.
 */
export interface ContinueLearningJourney {
  progressId: number;
  journeyId: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedDuration: string | null;
  isAvailable: boolean;
  totalSteps: number;
  completedSteps: number;
  progressPercent: number;
  startedAt: string;
  lastAccessedAt: string;
  completedAt: string | null;
  href: string;
  nextStep: {
    stepNumber: number;
    title: string;
    href: string;
  } | null;
}

export interface ContinueLearningRecentResource {
  resourceId: number;
  title: string;
  category: string;
  viewedAt: string;
  isAvailable: boolean;
  href: string;
}

export interface ContinueLearningSuggestion {
  journeyId: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedDuration: string | null;
  reason: string;
  href: string;
}

export interface ContinueLearningEmptyState {
  skillLevel: string | null;
  preferredCategories: string[];
  learningGoals: string[];
}

export interface ContinueLearningSummary {
  activeJourneys: ContinueLearningJourney[];
  recentResources: ContinueLearningRecentResource[];
  completedMilestones: ContinueLearningJourney[];
  suggestedJourneys: ContinueLearningSuggestion[];
  emptyState: ContinueLearningEmptyState;
}