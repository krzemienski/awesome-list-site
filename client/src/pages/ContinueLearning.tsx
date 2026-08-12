import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  History,
  LogIn,
  Play,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Link } from "wouter";
import type {
  ContinueLearningJourney,
  ContinueLearningRecentResource,
} from "@shared/continueLearning";
import SEOHead from "@/components/layout/SEOHead";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
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

function ActiveJourneyCard({
  item,
  pending,
  onResume,
}: {
  item: ContinueLearningJourney;
  pending: boolean;
  onResume: (item: ContinueLearningJourney) => void;
}) {
  return (
    <Card className="flex h-full flex-col" data-testid={`card-active-journey-${item.journeyId}`}>
      <CardHeader>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">{item.category}</Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {relativeTime(item.lastAccessedAt)}
          </span>
        </div>
        <CardTitle className="text-xl leading-tight">{item.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {item.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {item.completedSteps} of {item.totalSteps} steps
            </span>
            <span className="font-semibold">{item.progressPercent}%</span>
          </div>
          <Progress
            value={item.progressPercent}
            aria-label={`${item.title} progress: ${item.progressPercent}%`}
            data-testid={`progress-active-journey-${item.journeyId}`}
          />
        </div>
        <div className="border-l-2 border-[var(--accent)] pl-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next logical step
          </p>
          <p className="mt-1 text-sm font-semibold">
            {item.nextStep?.title ||
              (item.isAvailable
                ? "Review the journey"
                : "Choose a current journey")}
          </p>
        </div>
      </CardContent>
      <CardFooter>
        {item.isAvailable ? (
          <Button
            className="w-full"
            onClick={() => onResume(item)}
            disabled={pending}
            data-testid={`button-resume-journey-${item.journeyId}`}
          >
            <Play className="mr-2 h-4 w-4" />
            {pending ? "Opening…" : item.nextStep ? "Resume next step" : "Open journey"}
          </Button>
        ) : (
          <Button className="w-full" variant="outline" asChild>
            <Link href="/journeys">Browse available journeys</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function RecentResourceCard({ item }: { item: ContinueLearningRecentResource }) {
  return (
    <Link
      href={item.href}
      className="group block min-w-0 border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      data-testid={`link-recent-resource-${item.resourceId}`}
    >
      <span className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="truncate">{item.category}</span>
        <span className="shrink-0">{relativeTime(item.viewedAt)}</span>
      </span>
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 break-words font-semibold leading-snug group-hover:text-[var(--accent)]">
          {item.title}
        </span>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
      </span>
      {!item.isAvailable ? (
        <span className="mt-2 block text-xs text-muted-foreground">
          This resource moved; browse current resources instead.
        </span>
      ) : null}
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}

export default function ContinueLearning() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useContinueLearningSummary(isAuthenticated);
  const resumeJourney = useResumeJourney();

  if (authLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <SEOHead title="Continue Learning" description="Resume your learning activity on Awesome Video." noindex />
        <LoadingState />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <SEOHead title="Continue Learning" description="Sign in to resume your learning activity on Awesome Video." noindex />
        <Card className="overflow-hidden text-center" data-testid="continue-learning-sign-in">
          <div className="h-1 bg-[var(--accent)]" aria-hidden />
          <CardHeader className="items-center pt-10">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--accent)_15%,transparent)]">
              <LogIn className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <CardTitle className="text-2xl">Your progress lives with your account</CardTitle>
            <CardDescription className="max-w-xl text-base">
              Sign in to see the journeys you started, your exact next step,
              recently opened resources, and completed milestones. We won't make
              private learning requests until you sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-3 pb-10">
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/journeys">Browse journeys as a guest</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <SEOHead title="Continue Learning" description="Resume your learning activity on Awesome Video." noindex />
        <LoadingState />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <SEOHead title="Continue Learning" description="Resume your learning activity on Awesome Video." noindex />
        <Alert variant="destructive" data-testid="continue-learning-error">
          <RefreshCw className="h-4 w-4" />
          <AlertTitle>We couldn't load your learning activity</AlertTitle>
          <AlertDescription className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <span>Your progress is still saved. Try loading the dashboard again.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-retry-continue-learning"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasHistory =
    data.activeJourneys.length > 0 ||
    data.recentResources.length > 0 ||
    data.completedMilestones.length > 0;
  const preferredCategory = data.emptyState.preferredCategories[0];

  return (
    <div className="container mx-auto max-w-6xl space-y-10 px-4 py-8">
      <SEOHead
        title="Continue Learning"
        description="Resume journeys, revisit resources, and see learning milestones on Awesome Video."
        noindex
      />

      <header className="max-w-3xl space-y-3">
        <p className="eyebrow" aria-hidden>
          // Learning dashboard
        </p>
        <h1 className="display-h text-3xl sm:text-4xl">Continue Learning</h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Pick up from your exact next step, revisit recent resources, and see
          what you've completed—all from the progress you already made.
        </p>
      </header>

      {!hasHistory ? (
        <Card className="overflow-hidden" data-testid="continue-learning-empty">
          <div className="h-1 bg-[var(--accent)]" aria-hidden />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BookOpen className="h-6 w-6 text-[var(--accent)]" />
              Build your first learning thread
            </CardTitle>
            <CardDescription className="text-base">
              {preferredCategory
                ? `Based on your preferences, ${preferredCategory} is a good place to begin. Start a journey or browse related resources; your next visit will resume here.`
                : data.emptyState.skillLevel
                  ? `Choose a ${data.emptyState.skillLevel} journey or open a resource that interests you. Your next visit will resume here.`
                  : "Start a guided journey or open a resource that interests you. Your next visit will resume here."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/journeys">Start a journey</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                href={
                  preferredCategory
                    ? `/search?q=${encodeURIComponent(preferredCategory)}`
                    : "/search"
                }
              >
                {preferredCategory
                  ? `Browse ${preferredCategory} resources`
                  : "Browse resources"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {data.activeJourneys.length > 0 ? (
        <section aria-labelledby="active-learning-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow mb-1" aria-hidden>
                // In progress
              </p>
              <h2 id="active-learning-heading" className="text-2xl font-bold">
                Resume a journey
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              Ordered by your latest activity
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.activeJourneys.map((item) => (
              <ActiveJourneyCard
                key={item.progressId}
                item={item}
                pending={
                  resumeJourney.isPending &&
                  resumeJourney.variables?.journeyId === item.journeyId
                }
                onResume={(selected) =>
                  resumeJourney.mutate({
                    journeyId: selected.journeyId,
                    href: selected.nextStep?.href || selected.href,
                  })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {data.recentResources.length > 0 ? (
        <section aria-labelledby="recent-resources-heading">
          <div className="mb-4">
            <p className="eyebrow mb-1" aria-hidden>
              // Recent
            </p>
            <h2 id="recent-resources-heading" className="flex items-center gap-2 text-2xl font-bold">
              <History className="h-5 w-5 text-[var(--accent)]" />
              Recently opened resources
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentResources.map((item) => (
              <RecentResourceCard key={item.resourceId} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {data.completedMilestones.length > 0 ? (
        <section aria-labelledby="completed-learning-heading">
          <div className="mb-4">
            <p className="eyebrow mb-1" aria-hidden>
              // Milestones
            </p>
            <h2 id="completed-learning-heading" className="flex items-center gap-2 text-2xl font-bold">
              <Trophy className="h-5 w-5 text-[var(--accent)]" />
              Completed journeys
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.completedMilestones.map((item) => (
              <Card key={item.progressId} data-testid={`card-completed-journey-${item.journeyId}`}>
                <CardContent className="flex h-full flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Completed {relativeTime(item.completedAt!)}
                    </p>
                    <h3 className="break-words font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.completedSteps} logical steps completed
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={item.href}>{item.isAvailable ? "Review" : "Find another"}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {data.suggestedJourneys.length > 0 ? (
        <section aria-labelledby="suggested-learning-heading">
          <div className="mb-4">
            <p className="eyebrow mb-1" aria-hidden>
              // Next up
            </p>
            <h2 id="suggested-learning-heading" className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              Suggested journeys
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {data.suggestedJourneys.map((item) => (
              <Card key={item.journeyId} className="flex h-full flex-col">
                <CardHeader className="flex-1">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{item.category}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {item.difficulty}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium text-[var(--accent)]">
                    {item.reason}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline" asChild>
                    <Link href={item.href}>
                      View journey
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}