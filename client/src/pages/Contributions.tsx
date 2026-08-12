import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  FilePenLine,
  FilePlus2,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Undo2,
  XCircle,
} from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Paginator } from "@/components/ui/paginator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ApiError, apiRequest, queryClient } from "@/lib/queryClient";
import { writeFilterParams } from "@/lib/url-filter-state";

type ContributionKind = "resource" | "edit";
type ContributionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "superseded";
type FilterKind = "all" | ContributionKind;
type FilterStatus = "all" | ContributionStatus;
type SortOrder = "newest" | "oldest";
type ChangeValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>;

interface ContributionItem {
  id: number;
  kind: ContributionKind;
  status: ContributionStatus;
  title: string;
  submittedAt: string;
  changedAt: string;
  canWithdraw: boolean;
  rejectionReason: string | null;
  publicResource: { id: number; title: string; path: string } | null;
  submission?: {
    url: string;
    description: string;
    category: string;
    subcategory: string | null;
    subSubcategory: string | null;
    tags: string[];
  };
  changes?: Array<{ field: string; old: ChangeValue; new: ChangeValue }>;
}

interface ContributionsResponse {
  items: ContributionItem[];
  pagination: {
    page: number;
    requestedPage: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    withdrawn: number;
    superseded: number;
    acceptedContributions: number;
    publicResources: number;
    recordedViews: number;
  };
  definitions: {
    acceptedContributions: string;
    publicResources: string;
    recordedViews: string;
  };
}

interface FilterState {
  type: FilterKind;
  status: FilterStatus;
  sort: SortOrder;
  q: string;
  page: number;
}

const PAGE_SIZE = 12;
const contributionKinds = new Set<FilterKind>(["all", "resource", "edit"]);
const contributionStatuses = new Set<FilterStatus>([
  "all",
  "pending",
  "approved",
  "rejected",
  "withdrawn",
  "superseded",
]);
const sortOrders = new Set<SortOrder>(["newest", "oldest"]);

function readState(search: string): FilterState {
  const params = new URLSearchParams(search);
  const rawType = params.get("type") as FilterKind | null;
  const rawStatus = params.get("status") as FilterStatus | null;
  const rawSort = params.get("sort") as SortOrder | null;
  const rawPage = params.get("page");
  const parsedPage =
    rawPage && /^\d+$/.test(rawPage) ? Number.parseInt(rawPage, 10) : 1;
  return {
    type: rawType && contributionKinds.has(rawType) ? rawType : "all",
    status:
      rawStatus && contributionStatuses.has(rawStatus) ? rawStatus : "all",
    sort: rawSort && sortOrders.has(rawSort) ? rawSort : "newest",
    q: (params.get("q") ?? "").slice(0, 100),
    page:
      Number.isSafeInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1,
  };
}

const statusConfig: Record<
  ContributionStatus,
  {
    label: string;
    description: string;
    className: string;
    icon: typeof Clock3;
  }
> = {
  pending: {
    label: "Pending",
    description: "Waiting for moderator review.",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: Clock3,
  },
  approved: {
    label: "Approved",
    description: "Accepted by a moderator.",
    className:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    description: "Not accepted after review.",
    className:
      "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    icon: XCircle,
  },
  withdrawn: {
    label: "Withdrawn",
    description: "Withdrawn by you before review.",
    className:
      "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    icon: Undo2,
  },
  superseded: {
    label: "Superseded",
    description: "The resource changed before this work could be handled.",
    className:
      "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    icon: RefreshCw,
  },
};

const fieldLabels: Record<string, string> = {
  title: "Title",
  url: "URL",
  description: "Description",
  category: "Category",
  subcategory: "Subcategory",
  subSubcategory: "Topic",
  tags: "Tags",
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return formatDistanceToNow(date, { addSuffix: true });
}

function displayValue(value: ChangeValue): string {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (value === null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function StatusBadge({ status }: { status: ContributionStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={`shrink-0 gap-1 ${config.className}`}
      title={config.description}
      data-testid={`status-${status}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}

function ContributionCard({
  item,
  onWithdraw,
  withdrawing,
}: {
  item: ContributionItem;
  onWithdraw: (item: ContributionItem) => void;
  withdrawing: boolean;
}) {
  const KindIcon = item.kind === "resource" ? FilePlus2 : FilePenLine;
  const kindLabel =
    item.kind === "resource" ? "Resource submission" : "Edit suggestion";

  return (
    <article
      className="relative border border-[var(--border)] bg-[var(--surface)]"
      data-testid={`contribution-${item.kind}-${item.id}`}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--border)] bg-muted/40">
            <KindIcon className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="eyebrow">{kindLabel}</span>
              <StatusBadge status={item.status} />
            </div>
            <h2 className="break-words text-lg font-semibold leading-snug">
              {item.title}
            </h2>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Submitted {formatWhen(item.submittedAt)}</span>
              {item.status !== "pending" && (
                <span data-testid={`changed-at-${item.kind}-${item.id}`}>
                  Status changed {formatWhen(item.changedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {item.kind === "resource" && item.submission && (
          <div className="grid gap-3 border-l-2 border-[var(--accent)] pl-4">
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {item.submission.description}
            </p>
            <a
              href={item.submission.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 min-w-0 items-center gap-1.5 text-sm text-[var(--accent)] underline-offset-4 hover:underline"
              title={item.submission.url}
            >
              <span className="truncate">{item.submission.url}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
            <div className="flex flex-wrap gap-2">
              <Badge variant="chip">{item.submission.category}</Badge>
              {item.submission.subcategory && (
                <Badge variant="chip">{item.submission.subcategory}</Badge>
              )}
              {item.submission.subSubcategory && (
                <Badge variant="chip">{item.submission.subSubcategory}</Badge>
              )}
              {item.submission.tags.map((tag) => (
                <Badge variant="chip" key={tag}>
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {item.kind === "edit" && item.changes && item.changes.length > 0 && (
          <details className="group border border-[var(--border)] bg-muted/20" open>
            <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium">
              {item.changes.length} proposed{" "}
              {item.changes.length === 1 ? "change" : "changes"}
            </summary>
            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {item.changes.map((change) => (
                <div
                  key={change.field}
                  className="grid min-w-0 gap-2 px-4 py-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]"
                >
                  <span className="font-medium">
                    {fieldLabels[change.field] ?? change.field}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="break-words text-muted-foreground line-through">
                      {displayValue(change.old)}
                    </p>
                    <p className="break-words text-foreground">
                      {displayValue(change.new)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {item.status === "rejected" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Review outcome</AlertTitle>
            <AlertDescription>
              {item.rejectionReason ??
                "A contributor-facing reason was not provided for this decision."}
            </AlertDescription>
          </Alert>
        )}

        {item.status === "superseded" && (
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>This suggestion is no longer current</AlertTitle>
            <AlertDescription>
              The public resource changed after you submitted this suggestion,
              so it can no longer be applied safely.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {statusConfig[item.status].description}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {item.publicResource && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={item.publicResource.path}
                  data-testid={`link-public-${item.kind}-${item.id}`}
                >
                  View public resource
                  <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
            {item.canWithdraw && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onWithdraw(item)}
                disabled={withdrawing}
                data-testid={`button-withdraw-${item.kind}-${item.id}`}
              >
                <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Withdraw
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Contributions() {
  const searchString = useSearch();
  const { toast } = useToast();
  const [state, setState] = useState<FilterState>(() => readState(searchString));
  const [searchInput, setSearchInput] = useState(state.q);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [withdrawTarget, setWithdrawTarget] =
    useState<ContributionItem | null>(null);

  useEffect(() => {
    const next = readState(searchString);
    setState(next);
    setSearchInput(next.q);
  }, [searchString]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === state.q) return;
      setState((current) => ({ ...current, q: searchInput, page: 1 }));
      writeFilterParams(
        { q: searchInput || null, page: null },
        "replace",
      );
      setPageNotice(null);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, state.q]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: state.type,
      status: state.status,
      sort: state.sort,
      page: String(state.page),
      limit: String(PAGE_SIZE),
    });
    if (state.q) params.set("q", state.q);
    return `/api/user/contributions?${params.toString()}`;
  }, [state]);

  const query = useQuery<ContributionsResponse>({
    queryKey: ["/api/user/contributions", queryUrl],
    queryFn: () => apiRequest(queryUrl, { method: "GET" }),
  });

  useEffect(() => {
    const effectivePage = query.data?.pagination.page;
    if (!effectivePage || effectivePage === state.page) return;
    const requestedPage = state.page;
    setState((current) => ({ ...current, page: effectivePage }));
    writeFilterParams(
      { page: effectivePage > 1 ? String(effectivePage) : null },
      "replace",
    );
    setPageNotice(
      `Page ${requestedPage} is beyond the available results. Showing page ${effectivePage}.`,
    );
  }, [query.data?.pagination.page, state.page]);

  const withdrawMutation = useMutation({
    mutationFn: (item: ContributionItem) =>
      apiRequest(
        `/api/user/contributions/${item.kind}/${item.id}/withdraw`,
        { method: "POST" },
      ),
    onSuccess: (_, item) => {
      setWithdrawTarget(null);
      void queryClient.invalidateQueries({
        queryKey: ["/api/user/contributions"],
      });
      toast({
        title: "Contribution withdrawn",
        description:
          item.kind === "resource"
            ? "Your resource submission remains in your history as Withdrawn."
            : "Your edit suggestion remains in your history as Withdrawn.",
      });
    },
    onError: (error: Error) => {
      setWithdrawTarget(null);
      void queryClient.invalidateQueries({
        queryKey: ["/api/user/contributions"],
      });
      const conflict = error instanceof ApiError && error.status === 409;
      toast({
        title: conflict
          ? "This contribution has already changed"
          : "Couldn't withdraw contribution",
        description: conflict
          ? "Its latest moderation state is now shown in your timeline."
          : error.message || "Please try again.",
        variant: conflict ? "default" : "destructive",
      });
    },
  });

  const updateFilter = (
    key: "type" | "status" | "sort",
    value: string,
  ) => {
    const next = { ...state, [key]: value, page: 1 } as FilterState;
    setState(next);
    writeFilterParams(
      {
        [key]:
          (key === "type" && value === "all") ||
          (key === "status" && value === "all") ||
          (key === "sort" && value === "newest")
            ? null
            : value,
        page: null,
      },
      "push",
    );
    setPageNotice(null);
  };

  const clearFilters = () => {
    const next = { type: "all", status: "all", sort: "newest", q: "", page: 1 } as const;
    setState(next);
    setSearchInput("");
    writeFilterParams(
      { type: null, status: null, sort: null, q: null, page: null },
      "push",
    );
    setPageNotice(null);
  };

  const gotoPage = (page: number) => {
    setState((current) => ({ ...current, page }));
    writeFilterParams({ page: page > 1 ? String(page) : null }, "push");
    setPageNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const makePageHref = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const queryString = params.toString();
    return `/contributions${queryString ? `?${queryString}` : ""}`;
  };

  const summary = query.data?.summary;
  const definitions = query.data?.definitions;
  const hasFilters =
    state.type !== "all" ||
    state.status !== "all" ||
    state.sort !== "newest" ||
    !!state.q;

  const metricCards = [
    {
      label: "Accepted contributions",
      value: summary?.acceptedContributions,
      definition:
        definitions?.acceptedContributions ??
        "Approved resource submissions and edit suggestions.",
      icon: CheckCircle2,
    },
    {
      label: "Live resources improved",
      value: summary?.publicResources,
      definition:
        definitions?.publicResources ??
        "Currently public resources you submitted or improved.",
      icon: BarChart3,
    },
    {
      label: "Distinct signed-in viewers",
      value: summary?.recordedViews,
      definition:
        definitions?.recordedViews ??
        "Distinct signed-in accounts with a recorded resource detail view across those currently public resources. Each account is counted once.",
      icon: Eye,
    },
    {
      label: "Awaiting review",
      value: summary?.pending,
      definition: "Your resource submissions and edit suggestions still pending.",
      icon: Clock3,
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <SEOHead
        title="Your Contributions — Awesome Video"
        description="Track your resource submissions, edit suggestions, and public impact."
        noindex
      />

      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <div className="eyebrow mb-3">// Contributor dashboard</div>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="display-h text-3xl sm:text-4xl">
              Your contributions
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Follow every resource submission and edit suggestion from review
              to outcome, then see the impact of accepted work.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/submit">
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              Submit a resource
            </Link>
          </Button>
        </div>
      </header>

      <section aria-labelledby="impact-heading" className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="impact-heading" className="text-lg font-semibold">
              Recorded impact
            </h2>
            <p className="text-xs text-muted-foreground">
              Definitions are shown under every metric.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="rounded-none">
                <CardContent className="p-4">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="eyebrow">{metric.label}</span>
                    <Icon
                      className="h-4 w-4 text-[var(--accent)]"
                      aria-hidden="true"
                    />
                  </div>
                  {query.isLoading ? (
                    <Skeleton className="mb-2 h-9 w-16" />
                  ) : (
                    <p
                      className="font-mono text-3xl font-semibold tabular-nums"
                      data-testid={`metric-${metric.label
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {metric.value ?? 0}
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {metric.definition}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="timeline-heading">
        <div className="mb-4">
          <h2 id="timeline-heading" className="text-lg font-semibold">
            Contribution timeline
          </h2>
          <p className="text-xs text-muted-foreground">
            This private timeline is visible only to you.
          </p>
        </div>

        <Card className="mb-5 rounded-none">
          <CardHeader className="p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(13rem,1fr)_repeat(3,minmax(9rem,auto))]">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value.slice(0, 100))
                  }
                  maxLength={100}
                  placeholder="Search your contributions"
                  aria-label="Search your contributions"
                  className="min-h-11 pl-10"
                  data-testid="input-contributions-search"
                />
              </div>
              <Select
                value={state.type}
                onValueChange={(value) => updateFilter("type", value)}
              >
                <SelectTrigger
                  className="min-h-11"
                  aria-label="Filter by contribution type"
                  data-testid="select-contribution-type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="resource">Resource submissions</SelectItem>
                  <SelectItem value="edit">Edit suggestions</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={state.status}
                onValueChange={(value) => updateFilter("status", value)}
              >
                <SelectTrigger
                  className="min-h-11"
                  aria-label="Filter by status"
                  data-testid="select-contribution-status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                      {summary
                        ? ` (${summary[value as ContributionStatus]})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={state.sort}
                onValueChange={(value) => updateFilter("sort", value)}
              >
                <SelectTrigger
                  className="min-h-11"
                  aria-label="Sort contributions"
                  data-testid="select-contribution-sort"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest activity</SelectItem>
                  <SelectItem value="oldest">Oldest activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {pageNotice && (
          <Alert className="mb-4" data-testid="notice-contribution-page-adjusted">
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>Page adjusted</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{pageNotice}</span>
              <button
                type="button"
                onClick={() => setPageNotice(null)}
                className="min-h-8 underline underline-offset-4"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        {query.isLoading ? (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Loading contributions"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="space-y-4 border border-[var(--border)] p-5"
              >
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-none" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <Card className="rounded-none">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <RefreshCw className="h-8 w-8 text-[var(--accent)]" />
              <h3 className="font-semibold">We couldn't load your contributions</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Your data is unchanged. Check your connection and try again.
              </p>
              <Button
                variant="outline"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
                data-testid="button-retry-contributions"
              >
                {query.isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : summary?.total === 0 ? (
          <Card className="rounded-none">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No contributions yet</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Submit a useful video-development resource, or suggest an edit
                from any resource page. Both will appear here.
              </p>
              <Button asChild>
                <Link href="/submit">Submit your first resource</Link>
              </Button>
            </CardContent>
          </Card>
        ) : query.data?.items.length === 0 ? (
          <Card className="rounded-none">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <h3 className="font-semibold">No contributions match</h3>
              <p className="text-sm text-muted-foreground">
                Try a different type, status, or search.
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  data-testid="button-clear-contribution-filters"
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <p
              className="mb-3 text-sm text-muted-foreground"
              data-testid="text-contribution-count"
            >
              {query.data?.pagination.total ?? 0} matching{" "}
              {(query.data?.pagination.total ?? 0) === 1
                ? "contribution"
                : "contributions"}
            </p>
            <div className="space-y-3">
              {query.data?.items.map((item) => (
                <ContributionCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onWithdraw={setWithdrawTarget}
                  withdrawing={withdrawMutation.isPending}
                />
              ))}
            </div>
            <Paginator
              currentPage={query.data?.pagination.page ?? 1}
              totalPages={query.data?.pagination.totalPages ?? 1}
              makeHref={makePageHref}
              onNavigate={gotoPage}
              testIds={{
                container: "contributions-pagination",
                prev: "button-contributions-prev",
                next: "button-contributions-next",
                jump: "input-contributions-page-jump",
              }}
            />
          </>
        )}
      </section>

      <AlertDialog
        open={!!withdrawTarget}
        onOpenChange={(open) => {
          if (!open && !withdrawMutation.isPending) setWithdrawTarget(null);
        }}
      >
        <AlertDialogContent data-testid="dialog-withdraw-contribution">
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this contribution?</AlertDialogTitle>
            <AlertDialogDescription>
              “{withdrawTarget?.title}” will leave the moderation queue but stay
              in your private timeline as Withdrawn. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawMutation.isPending}>
              Keep pending
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={withdrawMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (withdrawTarget) withdrawMutation.mutate(withdrawTarget);
              }}
              data-testid="button-confirm-withdraw-contribution"
            >
              {withdrawMutation.isPending ? "Withdrawing…" : "Withdraw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}