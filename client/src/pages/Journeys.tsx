import { JourneyCardSkeleton } from "@/components/ui/skeletons";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { journeysHubDescription } from "@shared/seo-templates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Award, ArrowRight, Play, CheckCircle2, Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { humanizeApiError } from "@/lib/apiError";
import { trackJourneyStart } from "@/lib/analytics";
import SEOHead from "@/components/layout/SEOHead";
import { writeFilterParams, usePopstateParams } from "@/lib/url-filter-state";
import "@/styles/pages/discovery-journeys.css";

interface Journey {
  id: number;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  icon: string;
  orderIndex: number;
  category: string;
  status: 'published' | 'draft' | 'archived';
  stepCount?: number;
  completedStepCount?: number;
  isEnrolled?: boolean;
  // Task #330: first incomplete logical step (server-computed with the same
  // grouped-step accounting as completedStepCount); null when complete/empty.
  nextStepNumber?: number | null;
}

export default function Journeys() {
  const [, setLocation] = useLocation();
  // BUG-033 (run19): the category filter is URL-synced (?category=...) so a
  // filtered view survives reload and can be shared — read it on mount, write
  // it on change.
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("category");
    return fromUrl && fromUrl.trim() !== "" ? fromUrl : "all";
  });
  const handleCategoryChange = (next: string) => {
    setSelectedCategory(next);
    // Run22 BUG-016: push (not replace) so Back steps through filter changes.
    writeFilterParams({ category: next === "all" ? null : next });
  };

  // Run22 BUG-016: Back/Forward restore the category filter from the URL.
  usePopstateParams((params) => {
    const fromUrl = params.get("category");
    setSelectedCategory(fromUrl && fromUrl.trim() !== "" ? fromUrl : "all");
  });
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch all published journeys (includes enrollment and progress data)
  const {
    data: journeys = [],
    isLoading: journeysLoading,
    isError: journeysError,
    refetch: refetchJourneys,
  } = useQuery<Journey[]>({
    queryKey: ['/api/journeys'],
  });

  // Deep-link target for start/continue: the first incomplete logical step,
  // falling back to the journey top when there's nothing to jump to.
  const journeyNextStepHref = (journey: Journey) =>
    journey.nextStepNumber != null
      ? `/journey/${journey.id}#step-${journey.nextStepNumber}`
      : `/journey/${journey.id}`;

  // Task #330: one-click start — the listing CTA enrolls signed-in users
  // directly (previously it just navigated and enrollment needed a second
  // click on the detail page), then lands them on their first step.
  const startJourneyMutation = useMutation({
    mutationFn: async (journey: Journey) => {
      const result = await apiRequest(
        `/api/journeys/${journey.id}/start`,
        { method: 'POST' },
      ) as { created: boolean };
      return { journey, created: result.created };
    },
    onSuccess: ({ journey, created }) => {
      // The list can be stale in another tab. Only the PostgreSQL UPSERT's
      // authoritative created flag means this request truly enrolled the user.
      if (created) {
        trackJourneyStart({
          journeyId: journey.id,
          journeyTitle: journey.title,
          totalSteps: journey.stepCount,
        });
      }
      // Same cache set the detail page's start button invalidates (NB-018).
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${journey.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/journeys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/continue-learning'] });
      toast({
        title: "Journey Started!",
        description: "You've successfully enrolled in this learning journey.",
      });
      setLocation(journeyNextStepHref(journey));
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Journey",
        description: humanizeApiError(error, "Something went wrong. Please try again."),
        variant: "destructive",
      });
    },
  });

  const handleJourneyCta = (journey: Journey, enrolled: boolean, progressPercent: number) => {
    // Anonymous visitors keep the read-only detail view with its sign-in
    // explainer — enrollment requires an account.
    if (!isAuthenticated) {
      setLocation(`/journey/${journey.id}`);
      return;
    }
    if (enrolled) {
      // Already enrolled: never re-POST start (and never re-fire
      // journey_start) — completed journeys open at the top for review,
      // in-progress ones jump straight to the next incomplete step.
      setLocation(
        progressPercent === 100 ? `/journey/${journey.id}` : journeyNextStepHref(journey),
      );
      return;
    }
    if (startJourneyMutation.isPending) return;
    startJourneyMutation.mutate(journey);
  };

  // Get unique categories from journeys. Filter out empty/nullish values:
  // Radix <SelectItem> throws at render time on an empty-string value, and with
  // no ErrorBoundary that crash blanks the whole page (BUG-022).
  const categories = Array.from(
    new Set(journeys.map((j) => j.category).filter((c): c is string => !!c && c.trim() !== "")),
  ).sort();

  // Filter journeys by category
  const filteredJourneys = selectedCategory === "all" 
    ? journeys 
    : journeys.filter(j => j.category === selectedCategory);

  if (journeysLoading) {
    return (
      <div className="journeys-page journeys-page--loading" aria-busy={true} aria-live="polite">
        <SEOHead
          title="Learning Journeys"
          description={journeysHubDescription}
        />
        <div className="journeys-page__header journeys-page__header--loading">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="journeys-grid">
          {Array(6).fill(0).map((_, i) => (
            <JourneyCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (journeysError) {
    return (
      <div className="journeys-page journeys-page--state" role="alert">
        <SEOHead
          title="Learning Journeys"
          description={journeysHubDescription}
        />
        <div className="journeys-state journeys-state--error">
          <Badge variant="destructive" className="journeys-state__error-label">
            Error · unavailable
          </Badge>
          <h1 className="display-h journeys-state__title">Couldn’t load journeys.</h1>
          <p className="journeys-state__copy">
            Something went wrong while fetching the learning paths. Please try again.
          </p>
          <Button
            variant="outline"
            className="journeys-state__action"
            onClick={() => void refetchJourneys()}
            data-testid="button-retry-journeys"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="journeys-page">
      <SEOHead
        title="Learning Journeys"
        description={journeysHubDescription}
      />
      
      {/* Header */}
      <header className="journeys-page__header">
          <span className="eyebrow journeys-page__eyebrow">
          <BookOpen className="journeys-page__eyebrow-icon" aria-hidden />
          Discovery · Learning paths
        </span>
        <h1 className="display-h journeys-page__title">
          Learning Journeys
        </h1>
        <p className="journeys-page__lede">
          Explore structured learning paths to master new skills step by step
        </p>
      </header>

      {/* Filters */}
      <div className="journeys-toolbar">
        <div className="journeys-filter">
          <span className="journeys-filter__label">Filter by category:</span>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="journeys-filter__control" aria-label="Filter by category" data-testid="select-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="journeys-toolbar__count">
          {filteredJourneys.length} {filteredJourneys.length === 1 ? 'journey' : 'journeys'} available
        </div>
      </div>

      {/* Journey Grid */}
      {filteredJourneys.length === 0 ? (
        <Card className="journeys-state journeys-state--empty">
          <div className="journeys-state__content">
            <BookOpen className="journeys-state__icon" aria-hidden />
            <div>
              <span className="eyebrow journeys-state__eyebrow">No journeys</span>
              {/* BUG-037 (run26): h2 — /journeys had no heading level below
                  the H1, so the empty state and card titles are now h2s. */}
              <h2 className="journeys-state__title">No journeys found</h2>
              <p className="journeys-state__copy">
                {selectedCategory === "all" 
                  ? "No learning journeys are available at the moment." 
                  : `No journeys found in the "${selectedCategory}" category.`}
              </p>
            </div>
            {selectedCategory !== "all" && (
              <Button 
                variant="outline" 
                className="journeys-state__action"
                onClick={() => handleCategoryChange("all")}
                data-testid="button-clear-filter"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </Card>
      ) : (
        // BUG-012 (run22): 3 columns only from xl — at lg (1024–1279) the
        // docked sidebar left ~220px cards and the CTA labels ellipsized.
        <div className="journeys-grid">
          {filteredJourneys.map((journey) => {
            const enrolled = journey.isEnrolled || false;
            const progressPercent = journey.stepCount && journey.stepCount > 0
              ? Math.round(((journey.completedStepCount || 0) / journey.stepCount) * 100)
              : 0;
            const isStartingThis =
              startJourneyMutation.isPending &&
              startJourneyMutation.variables?.id === journey.id;

            return (
              <Card 
                key={journey.id}
                className={cn(
                  "journey-card flex flex-col",
                  enrolled && "journey-card--enrolled"
                )}
                data-testid={`card-journey-${journey.id}`}
              >
                <CardHeader className="journey-card__header">
                  <div className="journey-card__topline">
                    <BookOpen
                      className="journey-card__icon"
                      aria-hidden
                      data-testid={`icon-journey-${journey.id}`}
                    />
                    <Badge 
                      variant="outline"
                      className={cn("journey-difficulty text-xs capitalize", `journey-difficulty--${journey.difficulty}`)}
                      data-testid={`badge-difficulty-${journey.id}`}
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {journey.difficulty}
                    </Badge>
                  </div>
                  {/* BUG-037 (run26): real <h2> heading (CardTitle is a div) so
                      the journey list has a navigable heading structure. */}
                  <h2 className="journey-card__title">
                    {/* BUG-010 (run13): journey titles are links, matching the
                        card-title-as-link pattern used on resource cards. */}
                    {/* Run17 BUG-048: ≥24px tap target. */}
                    {/* Run22 BUG-036: readable left-aligned mobile titles capped
                        at two lines (line-clamp-2) with word-boundary wrapping. */}
                    <Link
                      href={`/journey/${journey.id}`}
                      className="journey-card__title-link line-clamp-2 break-words"
                      title={journey.title}
                      data-testid={`link-journey-title-${journey.id}`}
                    >
                      {journey.title}
                    </Link>
                  </h2>
                  {/* Full text is shown (no clamp), so an unbreakable token in a
                      description must not be able to widen the card. */}
                  <CardDescription
                    className="journey-card__description min-w-0 break-words"
                    data-testid={`description-journey-${journey.id}`}
                  >
                    {journey.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="journey-card__content flex-1">
                  <div className="journey-card__details">
                    {/* Meta Information */}
                    <div className="journey-card__meta">
                      <Badge variant="chip" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {journey.estimatedDuration}
                      </Badge>
                      <Badge variant="chip" className="text-xs">
                        {journey.category}
                      </Badge>
                      {journey.stepCount && (
                        <Badge variant="chip" className="text-xs">
                          {journey.stepCount} steps
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar for Enrolled Journeys */}
                    {enrolled && journey.stepCount && journey.stepCount > 0 && (
                      <div className="journey-card__progress">
                        <div className="journey-card__progress-label">
                          <span>Progress</span>
                          <span className="journey-card__progress-value">
                            {progressPercent}%
                          </span>
                        </div>
                        {/* NB-058 (run18): progress bar exposes progressbar ARIA
                            semantics so assistive tech announces the percent. */}
                        <div
                          className="journey-card__progress-track"
                          role="progressbar"
                          aria-valuenow={progressPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${journey.title} progress: ${progressPercent}%`}
                          data-testid={`progressbar-journey-${journey.id}`}
                        >
                          <div 
                            className="journey-card__progress-fill"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="journey-card__progress-copy">
                          {journey.completedStepCount || 0} of {journey.stepCount} steps completed
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="journey-card__footer">
                  <Button 
                    className={cn(
                      "journey-card__cta group h-auto min-h-10 whitespace-normal",
                      enrolled && "journey-card__cta--enrolled"
                    )}
                    variant={enrolled ? "outline" : "default"}
                    // Task #330: one-click start/continue — signed-in users
                    // enroll right here (or jump to their next incomplete
                    // step); anonymous users still get the read-only view.
                    onClick={() => handleJourneyCta(journey, enrolled, progressPercent)}
                    disabled={isStartingThis}
                    data-testid={`button-view-journey-${journey.id}`}
                    // BUG-037 (audit2): five cards all announced an identical
                    // "Start Journey" — the accessible name now appends the
                    // journey title (visible label stays the prefix, WCAG 2.5.3).
                    aria-label={`${
                      enrolled && progressPercent === 100
                        ? "Completed · Review"
                        : enrolled && (journey.completedStepCount || 0) > 0
                          ? "Continue Journey"
                          : "Start Journey"
                    }: ${journey.title}`}
                  >
                    {/* BUG-037 (run14): shrink-0 icons — at 768px the flex
                        button squeezed the leading icon and clipped it. */}
                    {/* BUG-012 (run22): never ellipsize the CTA — labels stay
                        full at every width (whitespace-normal + h-auto lets the
                        text wrap in the worst case instead of clipping); the
                        decorative trailing arrow hides below 900px to keep the
                        label on one line at 768–899px. */}
                    {/* Run17 BUG-046: "Continue" only once real progress exists —
                        enrolled-with-zero-progress previously showed "Continue
                        Journey" on journeys the user had never actually begun.
                        Run21 R4-075: a 100%-complete journey gets its own
                        Completed-state label instead of still saying "Continue". */}
                    {isStartingThis ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />
                        <span className="text-left">Starting Journey...</span>
                      </>
                    ) : enrolled && progressPercent === 100 ? (
                      <>
                        <Trophy className="h-4 w-4 mr-2 shrink-0" />
                        <span className="text-left">Completed · Review</span>
                      </>
                    ) : enrolled && (journey.completedStepCount || 0) > 0 ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                        <span className="text-left">Continue Journey</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2 shrink-0" />
                        <span className="text-left">Start Journey</span>
                      </>
                    )}
                    <ArrowRight className="hidden min-[900px]:block h-4 w-4 ml-auto shrink-0 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
