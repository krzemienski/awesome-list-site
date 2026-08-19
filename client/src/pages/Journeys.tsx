import { JourneyCardSkeleton } from "@/components/ui/skeletons";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { data: journeys = [], isLoading: journeysLoading } = useQuery<Journey[]>({
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/10 text-green-500 border-green-500/30";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "advanced":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "●";
      case "intermediate":
        return "●●";
      case "advanced":
        return "●●●";
      default:
        return "●";
    }
  };

  if (journeysLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl" aria-busy={true} aria-live="polite">
        <SEOHead
          title="Learning Journeys"
          description={journeysHubDescription}
        />
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <JourneyCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <SEOHead
        title="Learning Journeys"
        description={journeysHubDescription}
      />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="display-h text-2xl sm:text-3xl md:text-4xl mb-2 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Learning Journeys
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Explore structured learning paths to master new skills step by step
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground">Filter by category:</span>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter by category" data-testid="select-category-filter">
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
        <div className="text-sm text-muted-foreground">
          {filteredJourneys.length} {filteredJourneys.length === 1 ? 'journey' : 'journeys'} available
        </div>
      </div>

      {/* Journey Grid */}
      {filteredJourneys.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <div>
              {/* BUG-037 (run26): h2 — /journeys had no heading level below
                  the H1, so the empty state and card titles are now h2s. */}
              <h2 className="text-lg font-semibold mb-2">No journeys found</h2>
              <p className="text-sm text-muted-foreground">
                {selectedCategory === "all" 
                  ? "No learning journeys are available at the moment." 
                  : `No journeys found in the "${selectedCategory}" category.`}
              </p>
            </div>
            {selectedCategory !== "all" && (
              <Button 
                variant="outline" 
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  "overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg flex flex-col",
                  enrolled && "border-primary/30"
                )}
                data-testid={`card-journey-${journey.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <BookOpen
                      className="h-10 w-10 flex-shrink-0"
                      style={{ color: 'var(--accent)' }}
                      aria-hidden
                      data-testid={`icon-journey-${journey.id}`}
                    />
                    <Badge 
                      variant="outline"
                      className={cn("text-xs capitalize", getDifficultyColor(journey.difficulty))}
                      data-testid={`badge-difficulty-${journey.id}`}
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {journey.difficulty}
                    </Badge>
                  </div>
                  {/* BUG-037 (run26): real <h2> heading (CardTitle is a div) so
                      the journey list has a navigable heading structure. */}
                  <h2 className="text-lg sm:text-xl font-semibold leading-tight tracking-tight">
                    {/* BUG-010 (run13): journey titles are links, matching the
                        card-title-as-link pattern used on resource cards. */}
                    {/* Run17 BUG-048: ≥24px tap target. */}
                    {/* Run22 BUG-036: readable left-aligned mobile titles capped
                        at two lines (line-clamp-2) with word-boundary wrapping. */}
                    <Link
                      href={`/journey/${journey.id}`}
                      className="hover:underline hover:text-[var(--accent)] transition-colors line-clamp-2 break-words min-h-[32px] text-left"
                      title={journey.title}
                      data-testid={`link-journey-title-${journey.id}`}
                    >
                      {journey.title}
                    </Link>
                  </h2>
                  <CardDescription className="line-clamp-3">
                    {journey.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="space-y-3">
                    {/* Meta Information */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {journey.estimatedDuration}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {journey.category}
                      </Badge>
                      {journey.stepCount && (
                        <Badge variant="secondary" className="text-xs">
                          {journey.stepCount} steps
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar for Enrolled Journeys */}
                    {enrolled && journey.stepCount && journey.stepCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-primary">
                            {progressPercent}%
                          </span>
                        </div>
                        {/* NB-058 (run18): progress bar exposes progressbar ARIA
                            semantics so assistive tech announces the percent. */}
                        <div
                          className="h-2 bg-muted rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={progressPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${journey.title} progress: ${progressPercent}%`}
                          data-testid={`progressbar-journey-${journey.id}`}
                        >
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {journey.completedStepCount || 0} of {journey.stepCount} steps completed
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button 
                    className={cn(
                      "w-full group h-auto min-h-9 whitespace-normal",
                      enrolled ? "bg-primary/20 hover:bg-primary/30 text-primary" : ""
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
