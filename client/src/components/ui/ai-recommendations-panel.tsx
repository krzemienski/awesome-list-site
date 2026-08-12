import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  EyeOff,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RecommendationCard from "@/components/ai/RecommendationCard";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";
import {
  useRecommendationFeedback,
  useRecommendationFeedbackStates,
} from "@/hooks/useRecommendationFeedback";
import { useLearningPreferences } from "@/hooks/use-learning-preferences";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Resource } from "@/types/awesome-list";
import {
  DEFAULT_LEARNING_PREFERENCES,
  LEARNING_FORMAT_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  hasMeaningfulLearningPreferences,
} from "@shared/onboarding";
import type { RecommendationFeedbackValue } from "@shared/recommendations";

interface AIRecommendationsPanelProps {
  resources?: Resource[];
  showHeader?: boolean;
}

export default function AIRecommendationsPanel({
  showHeader = true,
}: AIRecommendationsPanelProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { userProfile: localProfile, isLoaded: localProfileLoaded } =
    useUserProfile();
  const { preferences, isLoading: preferencesLoading } =
    useLearningPreferences();
  const {
    data: feedbackStates = [],
    isError: feedbackStatesError,
    isLoading: feedbackStatesLoading,
    refetch: refetchFeedbackStates,
  } = useRecommendationFeedbackStates(user?.id, isAuthenticated);
  const { recordFeedbackAsync, isLoading: isRestoring } =
    useRecommendationFeedback();
  const [locallyHidden, setLocallyHidden] = useState<Set<number>>(new Set());

  const hasSavedPreferences =
    isAuthenticated && hasMeaningfulLearningPreferences(preferences);
  const effectiveProfile = useMemo(
    () => ({
      userId: user?.id ?? localProfile.userId,
      preferredCategories:
        preferences?.preferredCategories
        ?? DEFAULT_LEARNING_PREFERENCES.preferredCategories,
      skillLevel:
        preferences?.skillLevel ?? DEFAULT_LEARNING_PREFERENCES.skillLevel,
      learningGoals:
        preferences?.learningGoals ?? DEFAULT_LEARNING_PREFERENCES.learningGoals,
      preferredResourceTypes:
        preferences?.preferredResourceTypes
        ?? DEFAULT_LEARNING_PREFERENCES.preferredResourceTypes,
      timeCommitment:
        preferences?.timeCommitment ?? DEFAULT_LEARNING_PREFERENCES.timeCommitment,
      viewHistory: localProfile.viewHistory,
      bookmarks: localProfile.bookmarks,
      completedResources: localProfile.completedResources,
      ratings: localProfile.ratings,
    }),
    [user?.id, localProfile, preferences],
  );

  const {
    generateRecommendations,
    refreshRecommendations,
    recommendations,
    isLoading,
    isError,
    error,
    hasUsefulResults,
    isStale,
    isFromCache,
    lastUpdatedAt,
  } = useAIRecommendations(undefined, {
    limit: 10,
    cacheUserId: user?.id,
  });

  const generationKey = JSON.stringify({
    userId: effectiveProfile.userId,
    categories: effectiveProfile.preferredCategories,
    skill: effectiveProfile.skillLevel,
    goals: effectiveProfile.learningGoals,
    formats: effectiveProfile.preferredResourceTypes,
    time: effectiveProfile.timeCommitment,
  });
  const generatedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isAuthenticated
      || !localProfileLoaded
      || preferencesLoading
      || !effectiveProfile.userId
      || generatedKeyRef.current === generationKey
    ) {
      return;
    }
    generatedKeyRef.current = generationKey;
    generateRecommendations(effectiveProfile);
  }, [
    isAuthenticated,
    localProfileLoaded,
    preferencesLoading,
    effectiveProfile,
    generationKey,
    generateRecommendations,
  ]);

  const goalLabels = useMemo(
    () => new Map(LEARNING_GOAL_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );
  const formatLabels = useMemo(
    () => new Map(LEARNING_FORMAT_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );

  const authoritativeExcludedIds = new Set(
    feedbackStates
      .filter((state) =>
        state.feedback === "hidden"
        || (isFromCache && (
          state.feedback === "not_for_me"
          || state.feedback === "already_known"
        )),
      )
      .map((state) => state.resourceId),
  );
  const canRenderRecommendations =
    !isFromCache || (!feedbackStatesLoading && !feedbackStatesError);
  const visibleRecommendations = canRenderRecommendations
    ? recommendations.filter(
        (recommendation) =>
          !locallyHidden.has(recommendation.resource.id)
          && !authoritativeExcludedIds.has(recommendation.resource.id),
      )
    : [];
  const hiddenStates = feedbackStates.filter(
    (state) => state.feedback === "hidden" && state.resource,
  );

  const handleFeedbackChange = (
    resourceId: number,
    feedback: RecommendationFeedbackValue | null,
  ) => {
    setLocallyHidden((current) => {
      const next = new Set(current);
      if (feedback === "hidden") next.add(resourceId);
      else next.delete(resourceId);
      return next;
    });
  };

  const restoreHidden = async (resourceId: number) => {
    try {
      await recordFeedbackAsync({ resourceId, feedback: null });
      setLocallyHidden((current) => {
        const next = new Set(current);
        next.delete(resourceId);
        return next;
      });
      toast({
        title: "Recommendation restored",
        description: "It can appear the next time recommendations are refreshed.",
      });
    } catch {
      toast({
        title: "Couldn’t restore recommendation",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const retry = () => refreshRecommendations(effectiveProfile);

  return (
    <div className="space-y-6">
      {showHeader ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Personalized Recommendations
            </CardTitle>
            <CardDescription>
              Account preferences, learning activity, and your feedback shape these picks.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-lg">
            {hasSavedPreferences
              ? "Using your saved learning profile"
              : "Using your account activity"}
          </CardTitle>
          <CardDescription>
            {hasSavedPreferences
              ? "These results use your saved topics, goals, formats, skill level, and available time."
              : "Add learning preferences for more precise matches. Existing activity and feedback still shape your results."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasSavedPreferences ? (
            <div className="flex flex-wrap gap-2" data-testid="active-preference-summary">
              <Badge variant="secondary">{effectiveProfile.skillLevel}</Badge>
              {effectiveProfile.preferredCategories.map((category) => (
                <Badge key={category} variant="outline">{category}</Badge>
              ))}
              {effectiveProfile.learningGoals.map((goal) => (
                <Badge key={goal} variant="outline">
                  {goalLabels.get(goal) ?? goal}
                </Badge>
              ))}
              {effectiveProfile.preferredResourceTypes.map((format) => (
                <Badge key={format} variant="outline">
                  {formatLabels.get(format) ?? format}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild variant="outline">
              <Link href="/settings#learning-preferences">
                {hasSavedPreferences
                  ? "Edit learning preferences"
                  : "Choose learning preferences"}
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={retry}
              disabled={isLoading}
              data-testid="button-generate-recommendations"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Refreshing…" : "Refresh recommendations"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hiddenStates.length > 0 ? (
        <details className="no-print rounded-lg border bg-card p-4">
          <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="inline-flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Hidden recommendations ({hiddenStates.length})
            </span>
          </summary>
          <ul className="mt-3 space-y-2">
            {hiddenStates.map((state) => (
              <li
                key={state.resourceId}
                className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0 break-words text-sm font-medium">
                  {state.resource?.title}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRestoring}
                  onClick={() => void restoreHidden(state.resourceId)}
                  data-testid={`restore-hidden-${state.resourceId}`}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {feedbackStatesError ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Saved feedback is temporarily unavailable</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Saved cards are paused until hidden choices can be checked, so no
              dismissed resource is shown by mistake.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refetchFeedbackStates()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isFromCache && feedbackStatesLoading ? (
        <Card aria-busy="true" data-testid="feedback-sync-state">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Syncing saved recommendation choices…
          </CardContent>
        </Card>
      ) : null}

      {(isStale || (isError && hasUsefulResults)) ? (
        <Alert data-testid="stale-recommendations-state">
          <RefreshCw className="h-4 w-4" />
          <AlertTitle>Showing your last useful recommendations</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              {isError
                ? "The latest refresh failed, so these saved results were kept."
                : "These saved results may be out of date."}
              {lastUpdatedAt
                ? ` Last updated ${new Date(lastUpdatedAt).toLocaleString()}.`
                : ""}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading && !hasUsefulResults ? (
        <Card data-testid="loading-state">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 animate-pulse text-primary" />
              Building your recommendations…
            </CardTitle>
            <CardDescription>
              Matching saved preferences and feedback with catalog resources.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="space-y-3 rounded-lg border p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isError && !hasUsefulResults ? (
        <Alert variant="destructive" data-testid="error-state">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Recommendations couldn’t be refreshed</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error instanceof Error ? error.message : "An unexpected error occurred."}</p>
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {visibleRecommendations.length > 0 ? (
        <section className="space-y-4" data-testid="recommendations-list">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Target className="h-5 w-5 text-primary" />
              Your personalized recommendations
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {visibleRecommendations.length} resources selected from real profile and catalog signals.
            </p>
          </div>
          <div className="grid items-stretch gap-4 md:grid-cols-2">
            {visibleRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.resource.id}
                className="min-w-0"
                resource={{
                  id: String(recommendation.resource.id),
                  name: recommendation.resource.title,
                  url: recommendation.resource.url,
                  description: recommendation.resource.description,
                  category: recommendation.resource.category ?? "Catalog",
                  tags: [
                    recommendation.resource.subcategory,
                    recommendation.resource.subSubcategory,
                  ].filter((value): value is string => Boolean(value)),
                  confidence: recommendation.confidence,
                  isAIBased: recommendation.type === "ai_powered",
                  personalized: recommendation.personalized !== false,
                  explanation: recommendation.explanation ?? {
                    summary: recommendation.reason,
                    signals: [],
                  },
                  feedback: recommendation.feedback,
                }}
                onFeedbackChange={(feedback) =>
                  handleFeedbackChange(recommendation.resource.id, feedback)
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading && !isError && recommendations.length === 0 ? (
        <Alert data-testid="no-recommendations">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No unseen recommendations right now</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Restore hidden items, update your preferences, or try again to look for new catalog matches.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}