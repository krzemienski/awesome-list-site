import { formatDistanceToNow } from "date-fns";
import { ArrowRight, BookOpen, Clock3, History, Play } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useContinueLearningSummary,
  useResumeJourney,
} from "@/hooks/useContinueLearning";

function relativeTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "recently"
    : formatDistanceToNow(date, { addSuffix: true });
}

export default function ContinueLearningPreview() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useContinueLearningSummary(true);
  const resumeJourney = useResumeJourney();

  if (isLoading) {
    return (
      <Card data-testid="continue-learning-preview" aria-busy="true" aria-live="polite">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card data-testid="continue-learning-preview" role="alert">
        <CardHeader>
          <CardTitle className="text-lg">Continue Learning</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            We couldn't load your learning activity.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-retry-learning-preview"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const active = data.activeJourneys[0];
  const recent = data.recentResources[0];
  const preference = data.emptyState.preferredCategories[0];

  return (
    <Card
      data-testid="continue-learning-preview"
      className="overflow-hidden border-[color:color-mix(in_srgb,var(--accent)_35%,var(--border))]"
    >
      <div
        className="h-1"
        aria-hidden
        style={{ background: "var(--accent)" }}
      />
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-1" aria-hidden>
              // Your learning
            </p>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-[var(--accent)]" />
              Continue Learning
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/continue-learning" data-testid="link-open-continue-learning">
              View dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {active ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="font-semibold leading-tight break-words">
                  {active.title}
                </h2>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {relativeTime(active.lastAccessedAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {active.nextStep
                  ? `Next: ${active.nextStep.title}`
                  : active.isAvailable
                    ? "Open the journey to review your next move."
                    : "This journey is unavailable. Choose another path to continue."}
              </p>
              <div className="flex items-center gap-3">
                <Progress
                  value={active.progressPercent}
                  aria-label={`${active.title} progress: ${active.progressPercent}%`}
                  className="h-2 flex-1"
                />
                <span className="shrink-0 text-xs font-medium">
                  {active.progressPercent}%
                </span>
              </div>
            </div>
            {active.isAvailable ? (
              <Button
                onClick={() =>
                  resumeJourney.mutate({
                    journeyId: active.journeyId,
                    href: active.nextStep?.href || active.href,
                  })
                }
                disabled={resumeJourney.isPending}
                data-testid={`button-preview-resume-${active.journeyId}`}
              >
                <Play className="mr-2 h-4 w-4" />
                {resumeJourney.isPending ? "Opening…" : "Resume"}
              </Button>
            ) : (
              <Button asChild>
                <Link href="/journeys">Find a journey</Link>
              </Button>
            )}
          </div>
        ) : recent ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="h-4 w-4" />
                Recently opened {relativeTime(recent.viewedAt)}
              </p>
              <Link
                href={recent.href}
                className="mt-1 block min-h-8 truncate font-semibold leading-8 hover:text-[var(--accent)] hover:underline"
              >
                {recent.title}
              </Link>
            </div>
            <Button asChild>
              <Link href={recent.href}>Open resource</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {preference
                ? `Start with a journey or resource related to ${preference}.`
                : "Start a guided journey and your next step will always be waiting here."}
            </p>
            <Button asChild>
              <Link href="/journeys">Explore journeys</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}