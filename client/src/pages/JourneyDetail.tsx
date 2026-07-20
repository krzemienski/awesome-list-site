import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BookOpen, 
  Clock, 
  Award, 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Circle,
  ExternalLink,
  Trophy,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { humanizeApiError } from "@/lib/apiError";
import SEOHead from "@/components/layout/SEOHead";

interface JourneyStep {
  id: number;
  journeyId: number;
  resourceId: number;
  stepNumber: number;
  title: string;
  description: string;
  isOptional: boolean;
  resource?: {
    id: number;
    title: string;
    url: string;
    description: string;
  };
}

interface Journey {
  id: number;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  icon: string;
  category: string;
  status: string;
  steps: JourneyStep[];
  progress?: UserProgress;
}

interface UserProgress {
  id: number;
  userId: string;
  journeyId: number;
  currentStepId: number | null;
  completedSteps: number[];
  startedAt: string;
  lastAccessedAt: string;
  completedAt: string | null;
}

export default function JourneyDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch journey details (includes progress if authenticated)
  const { data: journey, isLoading: journeyLoading } = useQuery<Journey>({
    queryKey: [`/api/journeys/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/journeys/${id}`);
      if (!response.ok) throw new Error('Failed to fetch journey');
      return response.json();
    },
  });

  // Start journey mutation
  const startJourneyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/journeys/${id}/start`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      // NB-018 (run23): Profile's "My Journeys" card reads /api/user/journeys —
      // invalidate it too or it shows stale enrollment/progress until reload.
      queryClient.invalidateQueries({ queryKey: ['/api/user/journeys'] });
      toast({
        title: "Journey Started!",
        description: "You've successfully enrolled in this learning journey.",
      });
    },
    onError: (error: Error) => {
      // Run21 R4-057: map raw "STATUS: body" / 500 stringification to friendly
      // copy — the internal error text never reaches the toast.
      toast({
        title: "Failed to Start Journey",
        description: humanizeApiError(error, "Something went wrong. Please try again."),
        variant: "destructive",
      });
    },
  });

  // Mark step as complete mutation.
  // A logical step maps to up to 3 backend rows (one per linked resource, all
  // sharing the same stepNumber). The backend only sets completedAt once EVERY
  // non-optional row id is in completedSteps, so completing a logical step must
  // mark all of its row ids — otherwise the journey can never finalize.
  // Run17 BUG-016: all row ids go in ONE PUT (stepIds + explicit completed
  // flag) instead of a sequential per-row PUT loop (3 writes per click).
  const completeStepMutation = useMutation({
    mutationFn: async ({ stepIds, completed }: { stepIds: number[]; completed: boolean }) => {
      return await apiRequest(`/api/journeys/${id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ stepIds, completed }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    // Run22 BUG-035: optimistic toggle — flip completedSteps in the cache
    // immediately (feedback well under 300ms instead of waiting ~1.4s for the
    // PUT + refetch), snapshot for rollback on a real failure.
    onMutate: async ({ stepIds, completed }: { stepIds: number[]; completed: boolean }) => {
      await queryClient.cancelQueries({ queryKey: [`/api/journeys/${id}`] });
      const previous = queryClient.getQueryData<Journey>([`/api/journeys/${id}`]);
      if (previous?.progress) {
        const current = (previous.progress.completedSteps || []).map(Number);
        const next = completed
          ? Array.from(new Set([...current, ...stepIds]))
          : current.filter((sid: number) => !stepIds.includes(sid));
        queryClient.setQueryData<Journey>([`/api/journeys/${id}`], {
          ...previous,
          progress: { ...previous.progress, completedSteps: next },
        });
      }
      return { previous };
    },
    onSuccess: () => {
      toast({
        title: "Progress Updated",
        description: "Your journey progress has been saved.",
      });
    },
    onError: (error: Error, _vars, context) => {
      // Roll back the optimistic flip to the pre-mutation snapshot.
      if (context?.previous) {
        queryClient.setQueryData([`/api/journeys/${id}`], context.previous);
      }
      // Run21 R4-057: friendly copy instead of raw server error stringification.
      toast({
        title: "Failed to Update Progress",
        description: humanizeApiError(error, "Something went wrong. Please try again."),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Reconcile with the server truth either way (completedAt, currentStepId).
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      // NB-018 (run23): keep Profile's journeys card in sync with progress.
      queryClient.invalidateQueries({ queryKey: ['/api/user/journeys'] });
    },
  });

  // NB-059/NB-060 (run18): single entry point for step toggles.
  // - NB-059: early-return while a PUT is in flight so rapid clicks can't fire
  //   duplicate PUTs (the buttons use aria-disabled, not the native disabled
  //   attribute, to avoid dropping focus to <body>).
  // - NB-060: when offline, tell the user immediately and DO NOT fire the
  //   mutation (no silent queue that surprises them with a toast on reconnect).
  const handleToggleStep = (stepIds: number[], completed: boolean) => {
    if (completeStepMutation.isPending) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast({
        title: "You're offline",
        description: "You're offline — change not saved. Reconnect and try again.",
        variant: "destructive",
      });
      return;
    }
    completeStepMutation.mutate({ stepIds, completed });
  };

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

  if (journeyLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl" aria-busy={true} aria-live="polite">
        {/* BUG-031 (run22): swap the head with the route — never leave the
            previous route's title/canonical up while the journey loads. */}
        <SEOHead title="Loading journey" description="Loading learning journey on Awesome Video." />
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-12 w-96 mb-4" />
        <Skeleton className="h-24 w-full mb-8" />
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* BUG-031 (run22): not-found state gets its own head (noindex — matches
            the server's soft-404 contract) instead of inheriting a stale one. */}
        <SEOHead title="Journey Not Found" description="This learning journey may have been removed or archived." noindex />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Journey not found. It may have been removed or archived.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => setLocation('/journeys')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Journeys
        </Button>
      </div>
    );
  }

  const isEnrolled = !!journey?.progress;
  const completedSteps = journey?.progress?.completedSteps || [];

  // The API stores up to 3 resource rows per logical step (same stepNumber).
  // Group them so each logical step renders once with all of its resources,
  // and so counts match the backend's logical stepCount.
  const logicalSteps = (() => {
    const map = new Map<number, {
      stepNumber: number;
      title: string;
      description: string;
      isOptional: boolean;
      rowIds: number[];
      resources: NonNullable<JourneyStep["resource"]>[];
    }>();
    for (const s of journey?.steps || []) {
      let g = map.get(s.stepNumber);
      if (!g) {
        g = { stepNumber: s.stepNumber, title: s.title, description: s.description, isOptional: s.isOptional, rowIds: [], resources: [] };
        map.set(s.stepNumber, g);
      }
      g.rowIds.push(s.id);
      if (s.resource) g.resources.push(s.resource);
    }
    return Array.from(map.values()).sort((a, b) => a.stepNumber - b.stepNumber);
  })();

  const totalSteps = logicalSteps.length;
  const completedCount = logicalSteps.filter((g) => g.rowIds.some((rid) => completedSteps.includes(rid))).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const isCompleted = !!journey?.progress?.completedAt;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <SEOHead
        title={`${journey.title} — Learning Journey`}
        description={journey.description || `Multi-step learning journey on Awesome Video: ${journey.title}.`}
      />
      
      {/* Back Button */}
      <Button 
        variant="ghost" 
        className="mb-6"
        onClick={() => setLocation('/journeys')}
        data-testid="button-back-to-journeys"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Journeys
      </Button>

      {/* Journey Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between mb-4">
            <BookOpen
              className="h-14 w-14 flex-shrink-0"
              style={{ color: 'var(--accent)' }}
              aria-hidden
              data-testid="icon-journey-header"
            />
            <div className="flex flex-col gap-2 items-end">
              <Badge 
                variant="outline"
                className={cn("text-xs capitalize", getDifficultyColor(journey.difficulty))}
                data-testid="badge-journey-difficulty"
              >
                <Award className="h-3 w-3 mr-1" />
                {journey.difficulty}
              </Badge>
              {isCompleted && (
                <Badge 
                  variant="outline"
                  className="bg-green-500/10 text-green-500 border-green-500/30"
                  data-testid="badge-journey-completed"
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl mb-2 font-semibold leading-none tracking-tight">{journey.title}</h1>
          <CardDescription className="text-sm sm:text-base">{journey.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-3 mb-6">
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              {journey.estimatedDuration}
            </Badge>
            <Badge variant="secondary">
              {journey.category}
            </Badge>
            <Badge variant="secondary">
              {totalSteps} {totalSteps === 1 ? 'step' : 'steps'}
            </Badge>
          </div>

          {/* Progress Section */}
          {isEnrolled && (
            <>
              <Separator className="mb-6" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {/* Run22 BUG-037: h2 — this section heading rendered before
                      the "Learning Path" h2, so an h3 here skipped a level. */}
                  <h2 className="text-sm font-semibold">Your Progress</h2>
                  <span className="text-sm font-medium text-primary">
                    {progressPercent}%
                  </span>
                </div>
                <Progress
                  value={progressPercent}
                  className="h-3"
                  aria-label={`${journey.title} progress: ${progressPercent}%`}
                  data-testid="progress-bar-journey"
                />
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {totalSteps} steps completed
                </p>
              </div>
            </>
          )}

          {/* Enroll Button */}
          {!isAuthenticated ? (
            <Alert className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please <button 
                  className="underline font-medium min-h-[44px] px-2 inline-flex items-center"
                  onClick={() => setLocation('/login')}
                >
                  log in
                </button> to start this journey and track your progress.
              </AlertDescription>
            </Alert>
          ) : !isEnrolled && (
            <Button 
              className="w-full mt-6"
              onClick={() => startJourneyMutation.mutate()}
              disabled={startJourneyMutation.isPending}
              data-testid="button-start-journey"
            >
              {startJourneyMutation.isPending ? (
                <>Starting Journey...</>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Journey
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Journey Steps */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Learning Path</h2>
        
        {logicalSteps.length > 0 ? (
          logicalSteps.map((step, index: number) => {
              const isStepCompleted = step.rowIds.some((rid) => completedSteps.includes(rid));
              const isCurrentStep = step.rowIds.includes(journey?.progress?.currentStepId ?? -1);

              return (
                <Card 
                  key={step.stepNumber}
                  className={cn(
                    "transition-all",
                    isStepCompleted && "border-green-500/30 bg-green-500/5",
                    isCurrentStep && !isStepCompleted && "border-primary/50 shadow-lg"
                  )}
                  data-testid={`card-step-${step.stepNumber}`}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Step Number/Status */}
                      <div className={cn(
                        "flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm",
                        isStepCompleted 
                          ? "bg-green-500 text-white" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {isStepCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          step.stepNumber
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-semibold mb-1">
                              {step.title}
                              {step.isOptional && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Optional
                                </Badge>
                              )}
                            </h3>
                            {step.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Resource Links */}
                        {step.resources.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {step.resources.map((resource) => (
                              <div key={resource.id} className="p-3 bg-muted/50 rounded-lg">
                                {/* Run3 audit R3-30: the resource title links to the
                                    internal detail page (keeps users in the journey
                                    flow); the external-link icon still opens the
                                    source site in a new tab. */}
                                <div className="flex items-center gap-1">
                                  <Link
                                    href={`/resource/${resource.id}`}
                                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors min-h-[44px] py-2 flex-1 min-w-0"
                                    data-testid={`link-resource-${resource.id}`}
                                  >
                                    <BookOpen className="h-4 w-4 flex-shrink-0" />
                                    {/* R-10 (run23): resource titles in journey step
                                        rows were wrapping 4–5 lines at 375px — clamp
                                        to two lines on the span itself (the clamp
                                        must live on the text element, not the flex
                                        anchor); full title stays available via the
                                        title attribute + detail page. */}
                                    <span
                                      className="font-medium line-clamp-2 break-words min-w-0"
                                      title={resource.title}
                                    >
                                      {resource.title}
                                    </span>
                                  </Link>
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                    aria-label={`Open ${resource.title} on its source site (new tab)`}
                                    data-testid={`link-resource-external-${resource.id}`}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </div>
                                {resource.description && (
                                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                                    {resource.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Complete Button */}
                        {isEnrolled && !isStepCompleted && (
                          <Button 
                            variant="outline"
                            className={cn(
                              "min-h-[44px]",
                              completeStepMutation.isPending && "opacity-60",
                            )}
                            onClick={() => handleToggleStep(step.rowIds, true)}
                            aria-disabled={completeStepMutation.isPending}
                            aria-busy={completeStepMutation.isPending}
                            data-testid={`button-complete-step-${step.stepNumber}`}
                          >
                            {completeStepMutation.isPending ? (
                              <>Marking as Complete...</>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Complete
                              </>
                            )}
                          </Button>
                        )}

                        {isStepCompleted && (
                          <Button
                            variant="ghost"
                            className={cn(
                              "min-h-[44px] px-2 text-green-500 hover:text-green-600",
                              completeStepMutation.isPending && "opacity-60",
                            )}
                            onClick={() => handleToggleStep(step.rowIds, false)}
                            aria-disabled={completeStepMutation.isPending}
                            aria-busy={completeStepMutation.isPending}
                            data-testid={`button-uncomplete-step-${step.stepNumber}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {completeStepMutation.isPending ? "Updating..." : "Completed — Undo"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This journey doesn't have any steps yet. Check back later!
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Completion Message */}
      {isCompleted && (
        <Card className="mt-8 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30">
          <CardContent className="p-6 text-center">
            <Trophy className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">🎉 Congratulations!</h3>
            <p className="text-muted-foreground">
              You've completed the "{journey.title}" learning journey!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
