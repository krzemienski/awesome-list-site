import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
  ExternalLink,
  Trophy,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, ApiError } from "@/lib/queryClient";
import { humanizeApiError } from "@/lib/apiError";
import { mpTrack } from "@/lib/mixpanel";
import {
  trackJourneyStart,
  trackJourneyStepComplete,
  trackJourneyComplete,
} from "@/lib/analytics";
import SEOHead from "@/components/layout/SEOHead";
import { isLogicalJourneyStepComplete } from "@shared/journeyProgress";
import { journeySeoDescription } from "@shared/seo-templates";
import "@/styles/pages/discovery-journeys.css";

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
  const {
    data: journey,
    isLoading: journeyLoading,
    isError: journeyError,
    error: journeyFetchError,
    refetch: refetchJourney,
  } = useQuery<Journey>({
    queryKey: [`/api/journeys/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/journeys/${id}`);
      if (!response.ok) throw new ApiError(response.status, await response.text());
      return response.json();
    },
  });

  // Task #330: logical step count (distinct stepNumbers) for funnel events —
  // the same accounting the server uses for stepCount, never raw row count.
  const totalLogicalSteps = new Set(
    (journey?.steps || []).map((s) => s.stepNumber),
  ).size;

  // Resume links target a logical stepNumber (not an underlying row id). The
  // element mounts after the journey query resolves, so perform the hash scroll
  // and keyboard focus here rather than relying on the browser's initial-load
  // anchor pass.
  useEffect(() => {
    if (!journey || !window.location.hash.startsWith("#step-")) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [journey?.id, journey?.steps?.length]);

  // Start journey mutation
  const startJourneyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/journeys/${id}/start`, {
        method: 'POST',
      });
    },
    onSuccess: (data: { created?: boolean }) => {
      // A stale detail tab can still show this button after another device
      // enrolled. Track only the UPSERT's server-authoritative creation flag.
      if (data.created) {
        trackJourneyStart({
          journeyId: String(id),
          journeyTitle: journey?.title ?? "",
          totalSteps: totalLogicalSteps,
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      // NB-018 (run23): Profile's "My Journeys" card reads /api/user/journeys —
      // invalidate it too or it shows stale enrollment/progress until reload.
      queryClient.invalidateQueries({ queryKey: ['/api/user/journeys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/continue-learning'] });
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
  // NB-024/NB-059 (run24): latest desired toggle recorded while a PUT is in
  // flight; onSettled converges toward it with at most one follow-up PUT.
  const pendingDesiredRef = useRef<{
    stepIds: number[];
    completed: boolean;
    stepNumber: number;
    stepPosition: number;
  } | null>(null);

  // Run17 BUG-016: all row ids go in ONE PUT (stepIds + explicit completed
  // flag) instead of a sequential per-row PUT loop (3 writes per click).
  const completeStepMutation = useMutation({
    // stepNumber/stepPosition ride along for funnel events only — the API
    // payload stays { stepIds, completed }.
    mutationFn: async ({ stepIds, completed }: {
      stepIds: number[];
      completed: boolean;
      stepNumber: number;
      stepPosition: number;
    }) => {
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
    onMutate: async ({ stepIds, completed }: {
      stepIds: number[];
      completed: boolean;
      stepNumber: number;
      stepPosition: number;
    }) => {
      // (stepNumber/stepPosition are analytics-only; the cache flip below
      // operates purely on row ids.)
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
    onSuccess: (data, vars, context) => {
      const transition = data as {
        logicalStepBecameComplete?: boolean;
        journeyBecameComplete?: boolean;
      };
      // Task #232/#330: one funnel event per logical-step transition, never
      // per row id. The server serializes writes and reports the transition,
      // preventing duplicate events from stale tabs/retried idempotent PUTs.
      if (vars.completed && transition.logicalStepBecameComplete) {
        trackJourneyStepComplete({
          journeyId: String(id),
          journeyTitle: journey?.title ?? "",
          stepNumber: vars.stepNumber,
          stepPosition: vars.stepPosition,
          totalSteps: totalLogicalSteps,
          stepRowCount: vars.stepIds.length,
        });
      } else {
        // Un-complete is not part of the GA4 funnel — Mixpanel-only signal
        // (pre-existing event name preserved for dashboard continuity).
        mpTrack('journey_step_uncompleted', {
          journey_id: String(id),
          journey_title: journey?.title,
          step_number: vars.stepNumber,
          step_row_count: vars.stepIds.length,
        });
      }
      // Completion is likewise server-authoritative rather than inferred from
      // a potentially stale cache snapshot.
      if (vars.completed && transition.journeyBecameComplete) {
        trackJourneyComplete({
          journeyId: String(id),
          journeyTitle: journey?.title ?? "",
          totalSteps: totalLogicalSteps,
        });
      }
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
    onSettled: (_data, _error, vars) => {
      // NB-024/NB-059 (run24): latest-wins — if clicks landed while this PUT
      // was in flight, fire at most ONE follow-up PUT toward the latest
      // desired state instead of dropping them or queueing one per click.
      const desired = pendingDesiredRef.current;
      pendingDesiredRef.current = null;
      if (
        desired &&
        !(desired.completed === vars.completed &&
          desired.stepIds.length === vars.stepIds.length &&
          desired.stepIds.every((sid) => vars.stepIds.includes(sid)))
      ) {
        completeStepMutation.mutate(desired);
        return; // reconcile after the follow-up settles instead
      }
      // Reconcile with the server truth either way (completedAt, currentStepId).
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      // NB-018 (run23): keep Profile's journeys card in sync with progress.
      queryClient.invalidateQueries({ queryKey: ['/api/user/journeys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/continue-learning'] });
    },
  });

  // NB-059/NB-060 (run18): single entry point for step toggles.
  // - NB-059: early-return while a PUT is in flight so rapid clicks can't fire
  //   duplicate PUTs (the buttons use aria-disabled, not the native disabled
  //   attribute, to avoid dropping focus to <body>).
  // - NB-060: when offline, tell the user immediately and DO NOT fire the
  //   mutation (no silent queue that surprises them with a toast on reconnect).
  const handleToggleStep = (
    stepIds: number[],
    completed: boolean,
    stepNumber: number,
    stepPosition: number,
  ) => {
    // NB-024/NB-059 (run24): a click during an in-flight PUT flips the cache
    // optimistically and records the desired final state; the mutation's
    // onSettled converges with one follow-up PUT (latest wins).
    if (completeStepMutation.isPending) {
      pendingDesiredRef.current = { stepIds, completed, stepNumber, stepPosition };
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
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast({
        title: "You're offline",
        description: "You're offline — change not saved. Reconnect and try again.",
        variant: "destructive",
      });
      return;
    }
    completeStepMutation.mutate({ stepIds, completed, stepNumber, stepPosition });
  };

  if (journeyLoading) {
    return (
      <div className="journey-detail-page journey-detail-page--loading" aria-busy={true} aria-live="polite">
        {/* BUG-031 (run22): swap the head with the route — never leave the
            previous route's title/canonical up while the journey loads. */}
        <SEOHead title="Loading journey" description="Loading learning journey on Awesome Video." />
        <Skeleton className="journey-detail-skeleton__back" />
        <Skeleton className="journey-detail-skeleton__title" />
        <Skeleton className="journey-detail-skeleton__lede" />
        <div className="journey-detail-skeleton__steps">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="journey-detail-skeleton__step" />
          ))}
        </div>
      </div>
    );
  }

  if (journeyError && !(journeyFetchError instanceof ApiError && journeyFetchError.status === 404)) {
    return (
      <div className="journey-detail-page journey-detail-page--state" role="alert">
        <SEOHead
          title="Journey unavailable"
          description="This learning journey could not be loaded."
          noindex
        />
        <div className="journeys-state journeys-state--error">
          <Badge variant="destructive" className="journeys-state__error-label">
            Error · unavailable
          </Badge>
          <h1 className="display-h journeys-state__title">Couldn’t load this journey.</h1>
          <p className="journeys-state__copy">
            Something went wrong while fetching the learning path. Please try again.
          </p>
          <Button
            variant="outline"
            className="journeys-state__action"
            onClick={() => void refetchJourney()}
            data-testid="button-retry-journey"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="journey-detail-page journey-detail-page--state">
        {/* BUG-031 (run22): not-found state gets its own head (noindex — matches
            the server's soft-404 contract) instead of inheriting a stale one. */}
        <SEOHead title="Journey Not Found" description="This learning journey may have been removed or archived." noindex />
        <Alert variant="destructive" className="journeys-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Journey not found. It may have been removed or archived.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="journeys-state__action mt-4"
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
      rows: Array<{ id: number; stepNumber: number; isOptional: boolean }>;
      resources: NonNullable<JourneyStep["resource"]>[];
    }>();
    for (const s of journey?.steps || []) {
      let g = map.get(s.stepNumber);
      if (!g) {
        g = { stepNumber: s.stepNumber, title: s.title, description: s.description, isOptional: true, rowIds: [], rows: [], resources: [] };
        map.set(s.stepNumber, g);
      }
      g.rowIds.push(s.id);
      g.rows.push({ id: s.id, stepNumber: s.stepNumber, isOptional: s.isOptional });
      g.isOptional = g.isOptional && s.isOptional;
      if (s.resource) g.resources.push(s.resource);
    }
    return Array.from(map.values()).sort((a, b) => a.stepNumber - b.stepNumber);
  })();

  const totalSteps = logicalSteps.length;
  const completedRowIds = new Set(completedSteps);
  const completedCount = logicalSteps.filter((g) =>
    isLogicalJourneyStepComplete(g.rows, completedRowIds),
  ).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const isCompleted = !!journey?.progress?.completedAt;

  return (
    <div className="journey-detail-page">
      {/* BUG-035 (run27): mirror the server's ONE journey title template
          ("<Name> — Awesome Video") — the old "— Learning Journey" suffix
          survived the SERP clamp only for short names, so 2 of 5 journeys
          rendered a different template. */}
      <SEOHead
        title={journey.title}
        description={journeySeoDescription(journey.title, journey.description)}
      />
      
      {/* Back Button */}
      <Button 
        variant="ghost" 
        className="journey-detail__back"
        onClick={() => setLocation('/journeys')}
        data-testid="button-back-to-journeys"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Journeys
      </Button>

      {/* Journey Header */}
      <Card className="journey-detail-card journey-detail-card--hero">
        <CardHeader className="journey-detail-card__header">
          <div className="journey-detail-card__topline">
            <BookOpen
              className="journey-detail-card__icon"
              aria-hidden
              data-testid="icon-journey-header"
            />
            <div className="flex flex-col gap-2 items-end">
              <Badge 
                variant="outline"
                className={cn(
                  "journey-difficulty text-xs capitalize",
                  `journey-difficulty--${journey.difficulty}`,
                )}
                data-testid="badge-journey-difficulty"
              >
                <Award className="h-3 w-3 mr-1" />
                {journey.difficulty}
              </Badge>
              {isCompleted && (
                <Badge 
                  variant="outline"
                  className="journey-status journey-status--complete"
                  data-testid="badge-journey-completed"
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>
          <h1 className="display-h journey-detail-card__title">{journey.title}</h1>
          <CardDescription className="journey-detail-card__description">{journey.description}</CardDescription>
        </CardHeader>

        <CardContent className="journey-detail-card__content">
          <div className="journey-detail-card__meta">
            <Badge variant="chip">
              <Clock className="h-3 w-3 mr-1" />
              {journey.estimatedDuration}
            </Badge>
            <Badge variant="chip">
              {journey.category}
            </Badge>
            <Badge variant="chip">
              {totalSteps} {totalSteps === 1 ? 'step' : 'steps'}
            </Badge>
          </div>

          {/* Progress Section */}
          {isEnrolled && (
            <>
              <Separator className="journey-detail-card__rule mb-6" />
              <div className="journey-detail-card__progress">
                <div className="journey-detail-card__progress-label">
                  {/* Run22 BUG-037: h2 — this section heading rendered before
                      the "Learning Path" h2, so an h3 here skipped a level. */}
                  <h2 className="text-sm font-semibold">Your Progress</h2>
                  <span className="journey-detail-card__progress-value">
                    {progressPercent}%
                  </span>
                </div>
                <Progress
                  value={progressPercent}
                  className="journey-detail-card__progress-bar h-3"
                  aria-label={`${journey.title} progress: ${progressPercent}%`}
                  data-testid="progress-bar-journey"
                />
                <p className="journey-detail-card__progress-copy">
                  {completedCount} of {totalSteps} steps completed
                </p>
              </div>
            </>
          )}

          {/* Enroll Button */}
          {!isAuthenticated ? (
            <Alert className="journey-enroll-note mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {/* R5-027 (run24): print-keep-text — in print this button's
                    text stays inline so the sentence prints grammatically. */}
                Please <button 
                  className="print-keep-text underline font-medium min-h-[44px] px-2 inline-flex items-center"
                  onClick={() => {
                    // P1-08: mirror /submit's auth hand-off — route to the
                    // canonical /sign-in with a redirect_url back to this
                    // journey (same /^\/(?![/\\])/ safe-path guard the legacy
                    // /login redirect uses) instead of a bare /login hop that
                    // dropped the return path after sign-in.
                    const current = window.location.pathname + window.location.search;
                    const safe = /^\/(?![/\\])/.test(current)
                      ? `/sign-in?redirect_url=${encodeURIComponent(current)}`
                      : '/sign-in';
                    setLocation(safe);
                  }}
                  data-testid="button-login-journey"
                >
                  log in
                </button> to start this journey and track your progress.
              </AlertDescription>
            </Alert>
          ) : !isEnrolled && (
            <Button
              className="journey-detail-card__start mt-6"
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
      <div className="journey-syllabus" data-seo-section="journey-syllabus">
        <h2 className="journey-syllabus__title">Learning Path</h2>
        
        {logicalSteps.length > 0 ? (
          logicalSteps.map((step, index: number) => {
              const isStepCompleted = isLogicalJourneyStepComplete(
                step.rows,
                completedRowIds,
              );
              const isCurrentStep = step.rowIds.includes(journey?.progress?.currentStepId ?? -1);

              return (
                <Card 
                  key={step.stepNumber}
                  id={`step-${step.stepNumber}`}
                  tabIndex={-1}
                  className={cn(
                    "journey-step-card scroll-mt-24",
                    isStepCompleted && "journey-step-card--complete",
                    isCurrentStep && !isStepCompleted && "journey-step-card--current"
                  )}
                  data-testid={`card-step-${step.stepNumber}`}
                >
                  <CardContent className="journey-step-card__content">
                    <div className="journey-step-card__layout">
                      {/* Step Number/Status */}
                      <div className={cn(
                        "journey-step-card__number",
                        isStepCompleted
                          ? "journey-step-card__number--complete"
                          : "journey-step-card__number--pending"
                      )}>
                        {isStepCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          step.stepNumber
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="journey-step-card__body min-w-0">
                        <div className="journey-step-card__heading">
                          <div className="flex-1">
                            <h3 className="journey-step-card__title">
                              {step.title}
                              {step.isOptional && (
                                <Badge variant="chip" className="journey-step-card__optional ml-2 text-xs">
                                  Optional
                                </Badge>
                              )}
                            </h3>
                            {step.description && (
                              <p className="journey-step-card__description mb-3" data-seo-step-description>
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Resource Links */}
                        {step.resources.length > 0 && (
                          <div className="journey-step-card__resources mb-4">
                            {step.resources.map((resource) => (
                              <div key={resource.id} className="journey-resource">
                                {/* Run3 audit R3-30: the resource title links to the
                                    internal detail page (keeps users in the journey
                                    flow); the external-link icon still opens the
                                    source site in a new tab. */}
                                <div className="flex items-center gap-1">
                                  <Link
                                    href={`/resource/${resource.id}`}
                                    className="journey-resource__link flex items-center gap-2 text-sm min-h-[44px] py-2 flex-1 min-w-0"
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
                                    className="journey-resource__external flex items-center justify-center min-h-[44px] min-w-[44px] flex-shrink-0"
                                    aria-label={`Open ${resource.title} on its source site (new tab)`}
                                    data-testid={`link-resource-external-${resource.id}`}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </div>
                                {/* Task #379 (uxv4-07): full descriptions turned the
                                    mobile syllabus into a wall of prose, so a step's
                                    resource list could not be scanned. Clamp to two
                                    lines on small screens (the element that directly
                                    holds the text node, or -webkit-line-clamp is a
                                    no-op) and show the rest from ~640px up. Print is
                                    unaffected: index.css un-clamps line-clamp-* in
                                    the print stylesheet. */}
                                {resource.description && (
                                  <p
                                    className="journey-resource__description text-xs mt-1 ml-6 line-clamp-2 sm:line-clamp-none"
                                    title={resource.description}
                                  >
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
                              "journey-step-card__complete min-h-[44px]",
                              completeStepMutation.isPending && "journey-step-card__complete--pending",
                            )}
                            onClick={() => handleToggleStep(step.rowIds, true, step.stepNumber, index + 1)}
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
                              "journey-step-card__undo min-h-[44px] px-2",
                              completeStepMutation.isPending && "journey-step-card__complete--pending",
                            )}
                            onClick={() => handleToggleStep(step.rowIds, false, step.stepNumber, index + 1)}
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
          <Alert className="journeys-alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This journey doesn't have any steps yet. Check back later!
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Completion Message — DS-OK: status ok, journey-complete celebration surface */}
      {isCompleted && (
        <Card className="journey-completion-card mt-8">
          <CardContent className="journey-completion-card__content p-6 text-center">
            <Trophy className="journey-completion-card__icon" aria-hidden />
            <h3 className="journey-completion-card__title">🎉 Congratulations!</h3>
            <p className="journey-completion-card__copy">
              You've completed the "{journey.title}" learning journey!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
