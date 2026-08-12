import { useEffect, useMemo, useRef } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useLearningPreferences } from "@/hooks/use-learning-preferences";
import { useAuth } from "@/hooks/useAuth";
import { Resource } from "@/types/awesome-list";
import RecommendationFeedback from "@/components/ui/recommendation-feedback";
import { queryClient } from "@/lib/queryClient";
import {
  DEFAULT_LEARNING_PREFERENCES,
  LEARNING_FORMAT_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  hasMeaningfulLearningPreferences,
} from "@shared/onboarding";
import {
  Sparkles,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
  Zap,
} from "lucide-react";

interface AIRecommendationsPanelProps {
  /**
   * Run23 R-06: optional — each /api/recommendations item already embeds a
   * full Resource (rec.resource), so the corpus prop is only an enrichment
   * for callers that happen to have it loaded (e.g. /recommendations).
   */
  resources?: Resource[];
  /**
   * Run16 BUG-048: pages that already render their own "Personalized
   * Recommendations" heading (Home, /recommendations) pass false so the
   * panel doesn't repeat it back-to-back.
   */
  showHeader?: boolean;
}

export default function AIRecommendationsPanel({ resources = [], showHeader = true }: AIRecommendationsPanelProps) {
  const { user, isAuthenticated } = useAuth();
  const { userProfile: localProfile, isLoaded: localProfileLoaded } =
    useUserProfile();
  const {
    preferences,
    isLoading: preferencesLoading,
  } = useLearningPreferences();
  const {
    generateRecommendations,
    recommendations,
    isLoading,
    isError,
    error,
    isSuccess,
  } = useAIRecommendations(undefined, { limit: 10 });
  const hasPersonalization =
    isAuthenticated && hasMeaningfulLearningPreferences(preferences);
  const effectiveProfile = useMemo(
    () => ({
      userId: user?.id ?? localProfile.userId,
      preferredCategories:
        preferences?.preferredCategories ??
        DEFAULT_LEARNING_PREFERENCES.preferredCategories,
      skillLevel:
        preferences?.skillLevel ?? DEFAULT_LEARNING_PREFERENCES.skillLevel,
      learningGoals:
        preferences?.learningGoals ??
        DEFAULT_LEARNING_PREFERENCES.learningGoals,
      preferredResourceTypes:
        preferences?.preferredResourceTypes ??
        DEFAULT_LEARNING_PREFERENCES.preferredResourceTypes,
      timeCommitment:
        preferences?.timeCommitment ??
        DEFAULT_LEARNING_PREFERENCES.timeCommitment,
      viewHistory: localProfile.viewHistory,
      bookmarks: localProfile.bookmarks,
      completedResources: localProfile.completedResources,
      ratings: localProfile.ratings,
    }),
    [
      user?.id,
      preferences,
      localProfile.userId,
      localProfile.viewHistory,
      localProfile.bookmarks,
      localProfile.completedResources,
      localProfile.ratings,
    ],
  );
  const generationKey = JSON.stringify({
    userId: effectiveProfile.userId,
    categories: effectiveProfile.preferredCategories,
    skill: effectiveProfile.skillLevel,
    goals: effectiveProfile.learningGoals,
    formats: effectiveProfile.preferredResourceTypes,
    time: effectiveProfile.timeCommitment,
    personalized: hasPersonalization,
  });
  const generatedKeyRef = useRef<string | null>(null);

  // Saved account preferences immediately drive this clearly labeled surface.
  // Anonymous/default visitors use the public GET endpoint and are described as
  // receiving general picks, never personalized results.
  useEffect(() => {
    if (
      !localProfileLoaded ||
      (isAuthenticated && preferencesLoading) ||
      !effectiveProfile.userId ||
      generatedKeyRef.current === generationKey
    ) {
      return;
    }
    generatedKeyRef.current = generationKey;
    generateRecommendations(
      hasPersonalization ? effectiveProfile : undefined,
    );
  }, [
    localProfileLoaded,
    isAuthenticated,
    preferencesLoading,
    generationKey,
    hasPersonalization,
    effectiveProfile,
    generateRecommendations,
  ]);

  const goalLabels = new Map(
    LEARNING_GOAL_OPTIONS.map((option) => [option.value, option.label]),
  );
  const formatLabels = new Map(
    LEARNING_FORMAT_OPTIONS.map((option) => [option.value, option.label]),
  );

  const getResourceDetails = (resourceUrl: string): Resource | undefined => {
    // Try exact URL match first
    let resource = resources.find(r => r.url === resourceUrl);

    // If not found, try matching by ID or title as fallback
    if (!resource) {
      resource = resources.find(r => r.id?.toString() === resourceUrl);
    }

    // Additional fallback: try partial URL match
    if (!resource) {
      resource = resources.find(r => r.url?.includes(resourceUrl) || resourceUrl.includes(r.url || ''));
    }

    return resource;
  };

  // Run16 BUG-019: the badge previously hardcoded text-green-500 on top of the
  // default (red) badge background — 4.20:1 at 12px, failing WCAG AA, and a
  // red/green pairing hostile to color-vision deficiency. (confidence is a
  // 0–100 percent here, so the old >= 0.8 check was also always true.) The
  // badge now relies on each variant's own AA-compliant foreground color and
  // tiers by variant only.
  const getConfidenceBadgeVariant = (confidence: number): "default" | "secondary" | "outline" => {
    if (confidence >= 80) return "default";
    if (confidence >= 60) return "secondary";
    return "outline";
  };

  const handleFeedbackChange = (feedback: 'helpful' | 'not_helpful' | null) => {
    // Invalidate recommendations cache to refresh with updated user preferences
    queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
  };

  return (
    <div className="space-y-6">
      {/* Header (suppressed where the page renders its own — Run16 BUG-048) */}
      {showHeader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Personalized Recommendations
            </CardTitle>
            <CardDescription>
              Get personalized resource recommendations based on your learning profile and goals
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* The canonical editor lives in Settings and is shared with onboarding.
          This personalized surface only summarizes what it is using. */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-lg">
            {hasPersonalization
              ? "Using your saved learning profile"
              : "General recommendations"}
          </CardTitle>
          <CardDescription>
            {hasPersonalization
              ? "These results use your saved topics, goals, formats, skill level, and available time."
              : "No completed learning profile is being used, so these are popular picks from across the catalog."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPersonalization ? (
            <div className="flex flex-wrap gap-2" data-testid="active-preference-summary">
              <Badge variant="secondary">{effectiveProfile.skillLevel}</Badge>
              {effectiveProfile.preferredCategories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
              {effectiveProfile.learningGoals.map((goal) => (
                <Badge key={goal} variant="outline">
                  {goalLabels.get(goal as any) ?? goal}
                </Badge>
              ))}
              {effectiveProfile.preferredResourceTypes.map((format) => (
                <Badge key={format} variant="outline">
                  {formatLabels.get(format as any) ?? format}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            {isAuthenticated ? (
              <Button asChild variant="outline">
                <Link href="/settings#learning-preferences">
                  {hasPersonalization
                    ? "Edit learning preferences"
                    : "Choose learning preferences"}
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant={isAuthenticated ? "ghost" : "outline"}
              onClick={() =>
                generateRecommendations(
                  hasPersonalization ? effectiveProfile : undefined,
                )
              }
              disabled={isLoading}
              data-testid="button-generate-recommendations"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isLoading ? "Refreshing…" : "Refresh recommendations"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card data-testid="loading-state">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary animate-pulse" />
              Analyzing Your Profile...
            </CardTitle>
            <CardDescription>
              Generating personalized recommendations based on your preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Alert variant="destructive" data-testid="error-state">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Generating Recommendations</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
              
              {/* Specific error handling for different failure modes */}
              {error?.message?.includes('401') || error?.message?.includes('Unauthorized') ? (
                <div className="mt-2 p-2 bg-background/50 rounded border">
                  <p className="font-semibold">🔑 API Key Issue</p>
                  <p className="text-sm">The Anthropic API key is missing or invalid. Please configure it in the integration settings.</p>
                </div>
              ) : error?.message?.includes('fetch') || error?.message?.includes('network') || error?.message?.includes('Failed to fetch') ? (
                <div className="mt-2 p-2 bg-background/50 rounded border">
                  <p className="font-semibold">🌐 Network Error</p>
                  <p className="text-sm">Unable to connect to the AI service. Please check your internet connection and try again.</p>
                </div>
              ) : error?.message?.includes('timeout') ? (
                <div className="mt-2 p-2 bg-background/50 rounded border">
                  <p className="font-semibold">⏱️ Request Timeout</p>
                  <p className="text-sm">The AI service took too long to respond. Please try again.</p>
                </div>
              ) : (
                <div className="mt-2 p-2 bg-background/50 rounded border">
                  <p className="font-semibold">ℹ️ Error Details</p>
                  <p className="text-sm">If this persists, try adjusting your preferences or contact support.</p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success State - Recommendations */}
      {isSuccess && recommendations && recommendations.length > 0 && (
        <div className="space-y-4" data-testid="recommendations-list">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {hasPersonalization
                  ? "Your Personalized Recommendations"
                  : "Recommended Resources"}
              </CardTitle>
              {/* Run17 BUG-043: only claim personalization when the user has
                  actually set preferences — otherwise be honest that these
                  are general picks. */}
              <CardDescription>
                {hasPersonalization
                  ? `${recommendations.length} resources selected specifically for your learning journey`
                  : `${recommendations.length} recommended resources — popular picks from across the catalog. Set learning preferences in Settings for personalized results.`}
                {recommendations.some(r => r.type === 'ai_powered') && (
                  <Badge variant="outline" className="ml-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
          </Card>

          {recommendations.map((rec, index) => {
            // Run23 R-06: prefer the corpus lookup when a corpus was passed,
            // but fall back to the full Resource embedded in the response —
            // Home no longer passes the 3.1MB corpus just for this panel.
            const resource =
              getResourceDetails(rec.resource.url) ??
              (rec.resource?.id ? rec.resource : undefined);
            
            // Fallback display info when resource lookup fails
            const displayTitle = resource?.title || rec.resource.title || rec.resource.url.split('/').pop()?.replace(/-/g, ' ') || rec.resource.url;
            const hasResourceDetails = !!resource;
            
            return (
              <Card 
                key={rec.resource.url} 
                className="hover:border-primary transition-colors"
                data-testid={`recommendation-${index}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">
                          {displayTitle}
                        </CardTitle>
                        {rec.type === 'ai_powered' && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-ai-${index}`}>
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                        {!hasResourceDetails && (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10">
                            External
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        {rec.resource.category && (
                          <Badge variant="secondary" data-testid={`badge-category-${index}`}>
                            {rec.resource.category}
                          </Badge>
                        )}
                        <Badge 
                          variant={getConfidenceBadgeVariant(rec.confidence)}
                          data-testid={`badge-confidence-${index}`}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {Math.round(rec.confidence)}% match
                        </Badge>
                        {rec.score !== undefined && (
                          <Badge 
                            variant="outline"
                            data-testid={`badge-score-${index}`}
                          >
                            Score: {rec.score.toFixed(2)}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI Reasoning */}
                  <div className="flex gap-2" data-testid={`reason-${index}`}>
                    <Lightbulb className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Why this matches: </span>
                      {rec.reason}
                    </p>
                  </div>

                  {/* Resource Description - show if available */}
                  {(resource?.description || rec.resource.description) && (
                    <p className="text-sm" data-testid={`description-${index}`}>
                      {resource?.description || rec.resource.description}
                    </p>
                  )}
                  
                  {/* Fallback info when resource details unavailable */}
                  {!hasResourceDetails && (
                    <div className="p-3 bg-muted/50 rounded-md border border-dashed">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">URL:</span> {rec.resource.url}
                      </p>
                    </div>
                  )}

                  {/* Additional resource metadata if available */}
                  {(resource?.subcategory || rec.resource.subcategory) && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Subcategory:</span> {resource?.subcategory || rec.resource.subcategory}
                    </p>
                  )}

                  {/* Action Button and Feedback */}
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      asChild
                      data-testid={`button-view-${index}`}
                    >
                      <a
                        href={rec.resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Resource
                      </a>
                    </Button>

                    {/* Feedback Buttons */}
                    {/* R5-027 (run24): no-print hides the vote block as one unit in print. */}
                    {resource?.id && (
                      <div className="no-print flex items-center justify-center gap-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Was this helpful?</span>
                        <RecommendationFeedback
                          resourceId={parseInt(String(resource.id), 10)}
                          userId={effectiveProfile.userId}
                          size="sm"
                          onFeedbackChange={handleFeedbackChange}
                          data-testid={`feedback-${index}`}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* No Recommendations State */}
      {isSuccess && recommendations && recommendations.length === 0 && (
        <Alert data-testid="no-recommendations">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>No Recommendations Found</AlertTitle>
          <AlertDescription>
            Try adjusting your preferences or selecting different categories to get personalized recommendations.
          </AlertDescription>
        </Alert>
      )}

      {/* API Unavailable Fallback */}
      {!isLoading && !isSuccess && !isError && (
        <Card data-testid="initial-state">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ready to Get Started
            </CardTitle>
            <CardDescription>
               Recommendations will load automatically. You can refresh them or update your learning preferences in Settings.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
