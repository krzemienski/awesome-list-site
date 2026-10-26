import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminLoadError } from "@/components/admin/AdminLoadError";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentEventLog } from "@/components/admin/AgentEventLog";
import { AgentCommsGraph } from "@/components/admin/AgentCommsGraph";
import { StatusChip, TableShell } from "@/components/admin/AdminOpsPrimitives";
import { ResearchLaunchGuide, type ResearchLaunchGuideHandle } from "@/components/admin/ResearchLaunchGuide";
import { ResearchRunView } from "@/components/admin/ResearchRunView";
import { CancelResearchRunDialog } from "@/components/admin/CancelResearchRunDialog";
import { ResearchRunConfigSummary } from "@/components/admin/ResearchRunConfigSummary";
import {
  BAD_TEXT,
  COST_BASIS_NOTE,
  OK_SOLID_BUTTON,
  OK_TEXT,
  formatCost,
  getDiscoveryStatusBadge,
  getStatusBadge,
  getVerificationBadges,
  humanizeJobError,
  isActiveJobStatus,
} from "@/components/admin/researchDisplay";
import { useDiscoveryReview } from "@/components/admin/useDiscoveryReview";
import {
  Search,
  XCircle,
  RefreshCw,
  AlertCircle,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
} from "lucide-react";
import { formatAdminDate } from "@/lib/utils";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { focusElement } from "@/hooks/focus-handoff";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAiDefaults } from "@/hooks/useAiDefaults";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { describeWriteError } from "@/lib/apiError";
import { sanitizeDisplay } from "@/lib/sanitize-display";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import type { ResearchJob, ResearchDiscovery } from "@shared/schema";
import "./queues-agent.css";
import "./research-run.css";
import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

const CANONICAL_JOB_ROWS = 5;

/** The fields this tab reads from the shared awesome-list catalog snapshot. */
interface CatalogSnapshot {
  categories?: { name?: string; title?: string }[];
  resources?: unknown[];
}

/**
 * Agent roles use the global DS status/info constants. Related role variants
 * retain hierarchy through opacity rather than separate palette shades.
 */
const AGENT_ROLE_BADGE_STYLES: Record<string, string> = {
  error: "border-[var(--status-bad)]/50 text-[var(--status-bad)]", // DS-OK: status bad
  tool_error: "border-[var(--status-bad)]/50 text-[var(--status-bad)]", // DS-OK: status bad
  system: "border-[var(--status-warn)]/50 text-[var(--status-warn)]", // DS-OK: status warn
  tool_call: "border-[var(--status-info)]/50 text-[var(--status-info)]", // DS-OK: cyan info (DS chart/info constant)
  tool_result: "border-[var(--status-ok)]/50 text-[var(--status-ok)]", // DS-OK: status ok
  web_search: "border-[var(--status-info-2)]/50 text-[var(--status-info-2)]", // DS-OK: violet info (DS chart/info constant)
  web_search_result: "border-[var(--status-info-2)]/30 text-[var(--status-info-2)]/80", // DS-OK: violet info (DS chart/info constant)
  assistant: "border-[var(--status-info)]/50 text-[var(--status-info)]/80", // DS-OK: cyan info (DS chart/info constant)
};

const AGENT_ROLE_TEXT_STYLES: Record<string, string> = {
  error: "text-[var(--status-bad)]", // DS-OK: status bad
  tool_error: "text-[var(--status-bad)]", // DS-OK: status bad
  system: "text-[var(--status-warn)]", // DS-OK: status warn
  tool_call: "text-[var(--status-info)]", // DS-OK: cyan info (DS chart/info constant)
  tool_result: "text-[var(--status-ok)]", // DS-OK: status ok
  web_search: "text-[var(--status-info-2)]", // DS-OK: violet info (DS chart/info constant)
  web_search_result: "text-[var(--status-info-2)]/80", // DS-OK: violet info (DS chart/info constant)
  assistant: "text-[var(--status-info)]/80", // DS-OK: cyan info (DS chart/info constant)
};

// Cancelling a job that the server failed to stop: it may still be running.
const CANCEL_OUTCOME = "The job may still be running. Refresh the job list, then try again.";

/** Job id from a ?jobId= deep link (the Research workspace's "Review candidates"). */
function jobIdFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const value = Number(new URLSearchParams(window.location.search).get("jobId"));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export type ResearcherInitialTab = "review" | "history";

interface ResearcherTabProps {
  initialTab?: ResearcherInitialTab;
}

export default function ResearcherTab({ initialTab = "review" }: ResearcherTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const aiDefaults = useAiDefaults();
  const defaultOrchestratorModel = aiDefaults.flowModel("researchOrchestrator");
  const defaultScoutModel = aiDefaults.flowModel("researchScout");

  // The guided view follows one run: the one just launched, the active run
  // found on load, or a ?jobId= deep link. Null shows the launch steps.
  const [followJobId, setFollowJobId] = useState<number | null>(jobIdFromUrl);
  const [focusRunOnMount, setFocusRunOnMount] = useState(false);
  const autoFollowed = useRef(followJobId !== null);
  const guideRef = useRef<ResearchLaunchGuideHandle>(null);
  const [historyJobId, setHistoryJobId] = useState<number | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const review = useDiscoveryReview();
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);

  const [isPolling, setIsPolling] = useState(false);

  // Run23 NB-039: the endpoint returns { jobs, total } so the history table
  // can say "showing latest 20 of N" instead of silently truncating.
  // R5-011 (run24): "Load more" grows the requested window past the default
  // 20 (server caps at 200). Key stays prefixed by '/api/researcher/jobs' so
  // existing prefix invalidations keep working.
  const [jobsLimit, setJobsLimit] = useState(20);
  const {
    data: jobsData,
    error: jobsError,
    isError: jobsIsError,
    isLoading: jobsLoading,
    isFetching: jobsFetching,
    refetch: refetchJobs,
  } = useQuery<{ jobs: ResearchJob[]; total: number }>({
    queryKey: ['/api/researcher/jobs', { limit: jobsLimit }],
    queryFn: async () => {
      const res = await fetch(`/api/researcher/jobs?limit=${jobsLimit}`, { credentials: 'include' });
      if (!res.ok) throw new ApiError(res.status, await res.text());
      return res.json();
    },
    refetchInterval: isPolling ? 3000 : false,
    // R5-037: refresh admin data when the operator returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // C3-V5A-04: each "Load more" is a new key. Holding the current rows keeps
    // the button mounted while the next window loads, so focus stays on it.
    placeholderData: keepPreviousData,
  });
  const jobs = jobsData?.jobs;
  const jobsTotal = jobsData?.total ?? 0;
  const [showAllJobs, setShowAllJobs] = useState(false);
  const visibleJobs = showAllJobs ? (jobs ?? []) : (jobs ?? []).slice(0, CANONICAL_JOB_ROWS);
  const hasMoreJobs = !!jobs && (jobs.length > visibleJobs.length || jobsTotal > jobs.length);
  // When the last "Load more" removes the button, hand focus to the table
  // region instead of letting it fall to <body>.
  const jobsRegionRef = useRef<HTMLDivElement>(null);
  const jobsMoreFocusPending = useRef(false);
  useEffect(() => {
    if (!jobsMoreFocusPending.current || jobsFetching) return;
    jobsMoreFocusPending.current = false;
    if (!hasMoreJobs) jobsRegionRef.current?.focus();
  }, [hasMoreJobs, jobsFetching]);
  // A failed or still-loading job list cannot establish whether a research
  // job is active. Keep paid launches disabled until that state is known.
  const activeJobStateKnown =
    !jobsLoading &&
    !jobsFetching &&
    !jobsIsError &&
    Array.isArray(jobsData?.jobs);

  // BUG-045 (run25): cost guidance is DERIVED from actual job history instead
  // of a hardcoded range that drifts stale as models/scopes change.
  const finishedCosts = (jobs || [])
    .map((j) => Number(j.estimatedCostUsd))
    .filter((c) => Number.isFinite(c) && c > 0);
  const costMin = finishedCosts.length > 0 ? Math.min(...finishedCosts) : null;
  const costMax = finishedCosts.length > 0 ? Math.max(...finishedCosts) : null;

  const {
    data: selectedJob,
    error: selectedJobError,
    isError: selectedJobIsError,
    isFetching: selectedJobFetching,
    refetch: refetchSelectedJob,
  } = useQuery<ResearchJob & { isActive: boolean }>({
    queryKey: ['/api/researcher/jobs', selectedJobId],
    enabled: !!selectedJobId,
    // Explicit queryFn — the default fetcher only reads queryKey[0] and would
    // hit the LIST endpoint instead of /jobs/:id, leaving the popover bound
    // to an array (everything undefined → "No log entries" forever).
    queryFn: async () => {
      const res = await fetch(`/api/researcher/jobs/${selectedJobId}`, { credentials: 'include' });
      if (!res.ok) throw new ApiError(res.status, `Failed to fetch job ${selectedJobId}: ${res.status}`);
      return res.json();
    },
    refetchInterval: (query) => {
      const j = query.state.data as ResearchJob | undefined;
      // Stream while job is still running, even if dialog is closed.
      if (j && (j.status === 'processing' || j.status === 'pending')) return 2000;
      if (showJobDetails) return 3000;
      return false;
    },
  });

  const {
    data: pendingDiscoveries,
    error: pendingDiscoveriesError,
    isError: pendingDiscoveriesIsError,
    isLoading: pendingDiscoveriesLoading,
    isFetching: pendingDiscoveriesFetching,
    refetch: refetchPendingDiscoveries,
  } = useQuery<ResearchDiscovery[]>({
    queryKey: ['/api/researcher/discoveries'],
    refetchInterval: isPolling ? 10000 : false,
  });

  const {
    data: jobDiscoveries,
    error: jobDiscoveriesError,
    isError: jobDiscoveriesIsError,
    isFetching: jobDiscoveriesFetching,
    refetch: refetchJobDiscoveries,
  } = useQuery<ResearchDiscovery[]>({
    queryKey: ['/api/researcher/discoveries', selectedJobId ? `?jobId=${selectedJobId}` : ''],
    enabled: !!selectedJobId && showJobDetails,
    queryFn: async () => {
      const res = await fetch(`/api/researcher/discoveries?jobId=${selectedJobId}`, { credentials: 'include' });
      if (!res.ok) throw new ApiError(res.status, 'Failed to fetch');
      return res.json();
    },
  });

  // R4-033 (run21): same cache entry as App.tsx — no second catalog download.
  const { data: categoriesData } = useQuery<CatalogSnapshot>({
    queryKey: ["awesome-list-data"],
    queryFn: () => fetchStaticAwesomeList() as Promise<CatalogSnapshot>,
    staleTime: 1000 * 60 * 60,
  });

  const categoryNames: string[] = (categoriesData?.categories ?? [])
    .map((c) => c.name ?? c.title ?? "")
    .filter((name) => name !== "");

  const [jobToCancel, setJobToCancel] = useState<number | null>(null);
  const cancelMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return await apiRequest(`/api/researcher/jobs/${jobId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      setJobToCancel(null);
      void queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      toast({ title: "Job cancelled" });
    },
    onError: (error, jobId) => {
      toast({
        title: `Could not cancel job #${jobId}`,
        description: describeWriteError(error, { outcome: CANCEL_OUTCOME }),
        variant: "destructive",
        action: <ToastAction altText="Retry cancellation" onClick={() => {
          if (!cancelMutation.isPending) cancelMutation.mutate(jobId);
        }}>Retry</ToastAction>,
      });
    },
  });

  // Bulk approve every pending discovery (server auto-rejects exact-URL
  // duplicates instead of double-inserting them as resources).
  const approveAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/researcher/discoveries/approve-all', { method: 'POST', body: JSON.stringify({}) });
    },
    onSuccess: (data: any) => {
      setConfirmApproveAll(false);
      void queryClient.invalidateQueries({ queryKey: ['/api/researcher/discoveries'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      const parts = [`${data?.approved ?? 0} approved`];
      if (data?.skippedDuplicates) parts.push(`${data.skippedDuplicates} skipped as duplicates`);
      if (data?.failed?.length) parts.push(`${data.failed.length} failed`);
      toast({
        title: "Bulk approval finished",
        description: parts.join(', ') + '.',
        variant: data?.failed?.length ? "destructive" : undefined,
      });
    },
    // The confirmation dialog stays mounted on failure so its inline error
    // remains visible and the operator can retry without a toast remount.
  });

  const activeJobs = jobs?.filter(j => j.status === 'processing' || j.status === 'pending') || [];

  useEffect(() => {
    const hasActive = activeJobs.length > 0;
    if (hasActive !== isPolling) {
      setIsPolling(hasActive);
    }
  }, [activeJobs.length, isPolling]);

  const activeJob = jobs?.find((j) => isActiveJobStatus(j.status)) ?? null;

  // Landing on the tab while a run is going follows it (once per visit).
  useEffect(() => {
    if (autoFollowed.current || !activeJobStateKnown) return;
    autoFollowed.current = true;
    if (activeJob) setFollowJobId(activeJob.id);
  }, [activeJobStateKnown, activeJob]);

  // ?jobId= names the run being followed, so the live view can be shared or
  // reloaded; following none drops it. replaceState keeps Back unchanged.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.pathname.startsWith("/admin")) return;
    const linked = followJobId === null ? null : String(followJobId);
    if (url.searchParams.get("jobId") === linked) return;
    if (linked === null) url.searchParams.delete("jobId");
    else url.searchParams.set("jobId", linked);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [followJobId]);

  // Leaving the run view removes the focused button. Commit that change inside
  // the click and move focus straight away: a deferred (rAF) focus never runs
  // in a tab that is not producing frames, and focus stays on <body>.
  const relaunchHigherCap = () => {
    flushSync(() => setFollowJobId(null));
    guideRef.current?.focusBudget();
  };

  const showHistory = (jobId: number) => {
    flushSync(() => {
      setHistoryJobId(jobId);
      setFollowJobId(null);
    });
    jobsRegionRef.current?.scrollIntoView({ block: "center" });
    focusElement(jobsRegionRef.current);
  };

  return (
    <div className="queues-agent queues-agent--research">
      <CancelResearchRunDialog
        jobId={jobToCancel}
        pending={cancelMutation.isPending}
        error={cancelMutation.isError ? cancelMutation.error : null}
        onConfirm={(id) => cancelMutation.mutate(id)}
        onDismiss={() => setJobToCancel(null)}
      />
      {cancelMutation.isError && jobToCancel === null && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Could not cancel job #{cancelMutation.variables}: {describeWriteError(cancelMutation.error, { outcome: CANCEL_OUTCOME })}
            <Button variant="outline" disabled={cancelMutation.isPending}
              onClick={() => {
                if (cancelMutation.variables != null) cancelMutation.mutate(cancelMutation.variables);
              }}>Retry cancellation</Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="queues-agent__canonical">
        <section className="card queues-agent__research-form research-guided" data-testid="research-guided">
          <div hidden={followJobId !== null}>
            <div className="research-guided">
              <h3>Run a research task</h3>
              <p className="text-sm text-muted-foreground">Five steps: what to look for, where, how far to go, which endpoint, then launch. You can follow the run live and review what it finds right here.</p>
              <ResearchLaunchGuide
                ref={guideRef}
                categoryNames={categoryNames}
                activeStateKnown={activeJobStateKnown}
                activeStateError={jobsIsError}
                activeJobId={activeJob?.id ?? null}
                onFollow={(id) => { setFocusRunOnMount(true); setFollowJobId(id); }}
                onLaunched={(id) => {
                  setFocusRunOnMount(true);
                  setFollowJobId(id);
                  setIsPolling(true);
                }}
                costRange={costMin !== null && costMax !== null ? { min: costMin, max: costMax } : null}
                catalogSize={categoriesData?.resources?.length ?? null}
              />
            </div>
          </div>
          {followJobId !== null && (
            <ResearchRunView
              key={followJobId}
              jobId={followJobId}
              focusOnMount={focusRunOnMount}
              onStartNew={() => setFollowJobId(null)}
              onRelaunchHigherCap={relaunchHigherCap}
              onShowHistory={() => showHistory(followJobId)}
            />
          )}
        </section>
        <TableShell
          title="Researcher jobs"
          sub={jobs && jobsTotal > visibleJobs.length
            ? `Latest ${visibleJobs.length} of ${jobsTotal} research runs`
            : "Recent agentic research runs"}
        >
          <div
            ref={jobsRegionRef}
            className="queues-agent__canonical-table queues-agent__canonical-table--research focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            tabIndex={0}
            role="region"
            aria-label="Researcher jobs table, scrollable"
          >
            <table className="table">
              <thead>
                <tr><th>Status</th><th>Prompt</th><th>Found</th><th>Approved / Rejected</th><th>Cost</th><th>Turns</th><th>Created</th></tr>
              </thead>
              <tbody>
                {visibleJobs.map((job) => (
                  <tr key={job.id} aria-current={job.id === historyJobId ? "true" : undefined} className={job.id === historyJobId ? "bg-muted/50" : undefined}>
                    <td><StatusChip status={job.status} /></td>
                    <td className="prompt">{job.prompt || "Auto-generated research brief"}</td>
                    <td className="mono queues-agent__cell-mono">{job.totalDiscoveries || 0}</td>
                    <td className="mono queues-agent__cell-mono">{job.approvedDiscoveries || 0}/{job.rejectedDiscoveries || 0}</td>
                    <td className="mono queues-agent__cell-mono">
                      {formatCost(job.estimatedCostUsd)}
                      {job.costBasis && COST_BASIS_NOTE[job.costBasis] && (
                        <span className="block text-[10px] text-muted-foreground">{COST_BASIS_NOTE[job.costBasis]}</span>
                      )}
                    </td>
                    <td className="mono queues-agent__cell-mono">{job.turnsUsed || 0}/{job.maxTurns ?? "∞"}</td>
                    <td className="mono muted queues-agent__cell-mono queues-agent__cell-muted queues-agent__cell-created">{job.createdAt ? formatAdminDate(job.createdAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {jobsIsError ? (
              <AdminLoadError
                subject="research jobs"
                error={jobsError}
                note={jobs ? "The rows above may be out of date." : undefined}
                onRetry={() => { void refetchJobs(); }}
                retrying={jobsFetching}
                className="queues-agent__inline-error"
                testId="error-research-jobs-canonical"
                retryTestId="button-retry-research-jobs-canonical"
              />
            ) : !jobsLoading && (jobs || []).length === 0 ? <p className="queues-agent__empty">No research jobs found.</p> : null}
          </div>
          {jobs && hasMoreJobs ? (
            <div className="queues-agent__table-more">
              <Button
                type="button"
                className="btn ghost"
                variant="ghost"
                onClick={() => {
                  jobsMoreFocusPending.current = true;
                  if (showAllJobs) setJobsLimit((l) => Math.min(l + 20, 200));
                  setShowAllJobs(true);
                }}
                aria-label={showAllJobs ? `Load more (${jobs.length} of ${jobsTotal}) in the Researcher jobs table` : undefined}
                data-testid="button-show-more-research-jobs"
              >
                {showAllJobs ? `Load more (${jobs.length} of ${jobsTotal})` : "Show more"}
              </Button>
            </div>
          ) : null}
        </TableShell>
      </div>
      <details className="queues-agent__more">
        <summary className="btn ghost">All pending discoveries &amp; full job history</summary>
      <Tabs defaultValue={initialTab} className="w-full queues-agent__tabs">
        {/* Run16 BUG-030: wrap at narrow widths — the fixed inline-flex bar
            was 465px wide and pushed "Job History" off-screen at 375px. */}
        <TabsList className="mb-4 flex flex-wrap h-auto w-full justify-start gap-1">
          <TabsTrigger value="review">
            <Search className="w-4 h-4 mr-1" />Review Discoveries
            {pendingDiscoveries && pendingDiscoveries.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{pendingDiscoveries.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history"><Clock className="w-4 h-4 mr-1" />Job History</TabsTrigger>
        </TabsList>

        <TabsContent value="review">
          <Card className="queues-agent__table-shell" data-testid="research-review-panel">
            <CardHeader className="queues-agent__table-heading">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="queues-agent__table-title flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Pending Discoveries
                    {pendingDiscoveries && pendingDiscoveries.length > 0 && (
                      <Badge variant="destructive" className="queues-agent__status queues-agent__status--bad ml-2">{pendingDiscoveries.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="queues-agent__table-description mt-1.5">Review and approve or reject AI-discovered resources</CardDescription>
                </div>
                {pendingDiscoveries && pendingDiscoveries.length > 0 && (
                  <Button
                    size="sm"
                    className={`${OK_SOLID_BUTTON} shrink-0`}
                    onClick={() => setConfirmApproveAll(true)}
                    disabled={approveAllMutation.isPending}
                    data-testid="button-approve-all"
                  >
                    {approveAllMutation.isPending ? (
                      <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Approving...</>
                    ) : (
                      <><ThumbsUp className="w-3.5 h-3.5 mr-1.5" />Approve All ({pendingDiscoveries.length})</>
                    )}
                  </Button>
                )}
              </div>
              {/* Explicit confirmation — bulk approval creates real resources. */}
              <AlertDialog open={confirmApproveAll} onOpenChange={(open) => { if (!open && !approveAllMutation.isPending) setConfirmApproveAll(false); }}>
                <AlertDialogContent className="queues-agent__dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve all pending discoveries?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This approves all {pendingDiscoveries?.length ?? 0} pending discoveries and publishes them as live resources. Discoveries whose URL already exists in the database are skipped as duplicates. This cannot be undone in bulk — each resource would need to be removed individually.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {approveAllMutation.isError && (
                    <Alert variant="destructive" className="queues-agent__inline-error" role="alert">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{describeWriteError(approveAllMutation.error, { outcome: "Some discoveries may already be approved. Refresh the list, then try again." })}</AlertDescription>
                    </Alert>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-approve-all" disabled={approveAllMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      data-testid="button-confirm-approve-all"
                      onClick={(event) => {
                        event.preventDefault();
                        approveAllMutation.mutate();
                      }}
                      disabled={approveAllMutation.isPending}
                    >
                      {approveAllMutation.isPending ? "Approving…" : "Approve All"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent className="queues-agent__table-body">
              {pendingDiscoveriesLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading pending discoveries…
                </div>
              ) : pendingDiscoveriesIsError ? (
                <AdminLoadError
                  subject="pending discoveries"
                  error={pendingDiscoveriesError}
                  onRetry={() => { void refetchPendingDiscoveries(); }}
                  retrying={pendingDiscoveriesFetching}
                  className="queues-agent__inline-error"
                  testId="error-research-discoveries"
                  retryTestId="button-retry-research-discoveries"
                />
              ) : !pendingDiscoveries || pendingDiscoveries.length === 0 ? (
                <p className="admin-empty text-center">No pending discoveries to review</p>
              ) : (
                <div className="overflow-auto" role="region" aria-label="Pending discoveries table, scrollable" tabIndex={0}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDiscoveries.map(d => (
                        <TableRow key={d.id} data-testid={`row-research-discovery-${d.id}`}>
                          <TableCell className="max-w-[320px]">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium line-clamp-1 break-words" title={sanitizeDisplay(d.title)}>{sanitizeDisplay(d.title)}</span>
                                {getVerificationBadges(d)}
                              </div>
                              <a href={d.url} target="_blank" rel="noopener noreferrer"
                                className="mt-1 flex min-h-6 min-w-0 items-center gap-1 truncate text-xs text-primary hover:underline">
                                <span className="truncate">{sanitizeDisplay(d.url)}</span><ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                              {d.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={sanitizeDisplay(d.description)}>{sanitizeDisplay(d.description)}</p>}
                              {d.reasoning && <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground" title={sanitizeDisplay(d.reasoning)}>"{sanitizeDisplay(d.reasoning)}"</p>}
                            </div>
                          </TableCell>
                          <TableCell>{getDiscoveryStatusBadge(d.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {d.suggestedCategory && <Badge variant="secondary" className="w-fit text-xs">{d.suggestedCategory}</Badge>}
                              {d.suggestedSubcategory && <Badge variant="outline" className="w-fit text-xs">{d.suggestedSubcategory}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="queues-agent__mono">{d.confidence ? `${d.confidence}%` : "—"}</TableCell>
                          <TableCell className="queues-agent__mono">#{d.jobId}</TableCell>
                          <TableCell className="text-right">
                            {d.status === "pending_review" ? (
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="default" className={OK_SOLID_BUTTON} onClick={() => review.approve.mutate(d.id)} disabled={review.approve.isPending}>
                                  <ThumbsUp className="h-3 w-3 mr-1" />Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => review.requestReject(d.id)}>
                                  <ThumbsDown className="h-3 w-3 mr-1" />Reject
                                </Button>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">Reviewed</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="queues-agent__table-shell">
            <CardHeader className="queues-agent__table-heading">
              <CardTitle className="queues-agent__table-title">Research Job History</CardTitle>
              <CardDescription className="queues-agent__table-description" data-testid="text-job-history-range">
                {/* Run23 NB-039: say when the list is truncated instead of
                    silently capping at the latest 20. */}
                {jobs && jobsTotal > jobs.length
                  ? `Showing latest ${jobs.length} of ${jobsTotal} research jobs`
                  : 'All past research jobs and their results'}
              </CardDescription>
            </CardHeader>
            <CardContent className="queues-agent__table-body">
              {jobsLoading ? (
                /* Run16 BUG-077: skeleton rows instead of a bare text node. */
                <div className="space-y-3 py-2" aria-label="Loading research jobs">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : jobsIsError ? (
                <AdminLoadError
                  subject="research jobs"
                  error={jobsError}
                  onRetry={() => { void refetchJobs(); }}
                  retrying={jobsFetching}
                  className="queues-agent__inline-error"
                  testId="error-research-jobs"
                  retryTestId="button-retry-research-jobs"
                />
              ) : !jobs || jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No research jobs yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead>Found</TableHead>
                      {/* BUG-017 (run25): "Approved" alone read as one number
                          and 173 found / "0" looked like lost discoveries —
                          name both halves and surface the pending remainder. */}
                      <TableHead>Approved / Rejected</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Turns</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map(job => ([
                        <TableRow key={`${job.id}-main`}>
                          <TableCell className="font-medium">#{job.id}</TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">{job.prompt}</TableCell>
                          {/* NB-031 (run18): a cancelled run can't have accrued
                              metrics it never reached — show "—" for zeroed
                              approved/cost/turns; keep a real "found" count but
                              annotate that it was found before cancellation. */}
                          <TableCell>
                            {job.status === 'cancelled' && (job.totalDiscoveries || 0) > 0 ? (
                              /* NB-031: visible annotation (was tooltip-only). */
                              <span title="found before cancellation">
                                {job.totalDiscoveries}
                                <span className="block text-[10px] text-muted-foreground whitespace-nowrap">
                                  pre-cancel
                                </span>
                              </span>
                            ) : (
                              job.totalDiscoveries || 0
                            )}
                          </TableCell>
                          <TableCell>
                            {job.status === 'cancelled' && (job.approvedDiscoveries || 0) === 0 && (job.rejectedDiscoveries || 0) === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <>
                                <span className={OK_TEXT}>{job.approvedDiscoveries || 0}</span>
                                {' / '}
                                <span className={BAD_TEXT}>{job.rejectedDiscoveries || 0}</span>
                                {/* BUG-017 (run25): found = approved + rejected
                                    + pending must reconcile VISIBLY. */}
                                {(() => {
                                  const pending = Math.max(
                                    0,
                                    (job.totalDiscoveries || 0) - (job.approvedDiscoveries || 0) - (job.rejectedDiscoveries || 0)
                                  );
                                  return pending > 0 ? (
                                    <span className="block text-[10px] text-muted-foreground whitespace-nowrap">
                                      {pending} awaiting review
                                    </span>
                                  ) : null;
                                })()}
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            {job.status === 'cancelled' && (!job.estimatedCostUsd || Number(job.estimatedCostUsd) === 0) ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <>
                                {formatCost(job.estimatedCostUsd)}
                                {job.costBasis && COST_BASIS_NOTE[job.costBasis] && (
                                  <span className="block text-[10px] text-muted-foreground whitespace-nowrap">{COST_BASIS_NOTE[job.costBasis]}</span>
                                )}
                              </>
                            )}
                          </TableCell>
                          {/* NB-032 (run18): turnsUsed accumulates across
                              continuation runs while maxTurns is per-run, so used
                              can exceed the cap — annotate instead of hiding. */}
                          <TableCell>
                            {job.status === 'cancelled' && (job.turnsUsed || 0) === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : job.maxTurns == null ? (
                              /* Unlimited-turns job: no cap to annotate against. */
                              <>{job.turnsUsed || 0}/∞</>
                            ) : (job.turnsUsed || 0) > (job.maxTurns || 0) ? (
                              /* NB-032: visible continuation annotation (was
                                 tooltip-only) — turns accrue across runs while
                                 the cap is per-run. */
                              <span title={`used across continuation runs (cap ${job.maxTurns}/run)`}>
                                {job.turnsUsed}/{job.maxTurns}
                                <span className="block text-[10px] text-muted-foreground whitespace-nowrap">
                                  over cap: continued runs
                                </span>
                              </span>
                            ) : (
                              <>{job.turnsUsed || 0}/{job.maxTurns}</>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {job.createdAt ? formatAdminDate(job.createdAt) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setSelectedJobId(job.id); setShowJobDetails(true); }}
                                aria-label={`View details for job #${job.id}`}
                                data-testid={`button-research-details-${job.id}`}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              {(job.status === 'processing' || job.status === 'pending') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => { cancelMutation.reset(); setJobToCancel(job.id); }}
                                  disabled={cancelMutation.isPending}
                                  aria-label={`Cancel job #${job.id}`}
                                >
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>,
                        (job.status === 'failed' || (job.status === 'completed' && (job.totalDiscoveries || 0) === 0)) && job.errorMessage ? (
                          <TableRow key={`${job.id}-error`}>
                            <TableCell colSpan={9} className="p-0">
                              <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
                                <AlertCircle className="w-4 h-4" />
                                <AlertDescription className="text-xs break-all">
                                  Job #{job.id}: {humanizeJobError(job.errorMessage)}
                                </AlertDescription>
                              </Alert>
                            </TableCell>
                          </TableRow>
                        ) : null,
                    ]))}
                  </TableBody>
                </Table>
              )}
              {/* R5-011 (run24): reach jobs older than the latest window. */}
              {!jobsLoading && jobs && jobsTotal > jobs.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setJobsLimit((l) => Math.min(l + 20, 200))}
                    aria-label={`Load more (${jobs.length} of ${jobsTotal}) in Job History`}
                    data-testid="button-load-more-jobs"
                  >
                    Load more ({jobs.length} of {jobsTotal})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="queues-agent__dialog max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Research Job #{selectedJob?.id ?? selectedJobId}
              {selectedJob && getStatusBadge(selectedJob.status)}
              {selectedJob?.isActive && (
                <Badge variant="outline" className="text-[10px]">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Streaming
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Live agent log, token usage, cost, and discovery results for this research run.
            </DialogDescription>
          </DialogHeader>
          {selectedJobIsError && (
            <AdminLoadError
              subject="this job's details"
              error={selectedJobError}
              note={selectedJob ? "The details below may be out of date." : undefined}
              onRetry={() => { void refetchSelectedJob(); }}
              retrying={selectedJobFetching}
              className="queues-agent__inline-error"
              testId="error-research-job-detail"
              retryTestId="button-retry-research-job-detail"
            />
          )}
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">{selectedJob.totalDiscoveries || 0}</div>
                  <div className="text-xs text-muted-foreground">Discovered</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className={`text-lg font-bold ${OK_TEXT}`}>{selectedJob.approvedDiscoveries || 0}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">{selectedJob.duplicatesSkipped || 0}</div>
                  <div className="text-xs text-muted-foreground">Duplicates</div>
                </div>
                <div className="text-center p-2 border rounded">
                  {/* NB-033 (run18): same 4-decimal formatter as the table. */}
                  <div className="text-lg font-bold">{formatCost(selectedJob.estimatedCostUsd)}</div>
                  <div className="text-xs text-muted-foreground" data-testid="text-research-cost-basis">
                    Cost{selectedJob.costBasis && COST_BASIS_NOTE[selectedJob.costBasis] ? ` (${COST_BASIS_NOTE[selectedJob.costBasis]})` : ""}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Prompt</Label>
                <p className="text-sm mt-1">{selectedJob.prompt}</p>
              </div>

              {selectedJob.categoryFocus && (
                <div>
                  <Label className="text-xs text-muted-foreground">Focus</Label>
                  <p className="text-sm mt-1">{selectedJob.categoryFocus}</p>
                </div>
              )}

              {selectedJob.resolvedConfig ? (
                <div className="space-y-3">
                  <ResearchRunConfigSummary config={selectedJob.resolvedConfig} testId="research-job-config" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Discovery Target</Label>
                    <p className="text-xs font-mono mt-1">{selectedJob.targetDiscoveries != null ? `Stop after ${selectedJob.targetDiscoveries}` : 'None'}</p>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <p className="text-xs font-mono mt-1">{selectedJob.model || (defaultOrchestratorModel ? `${defaultOrchestratorModel} (default)` : 'default')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Scout Model</Label>
                  <p className="text-xs font-mono mt-1">{selectedJob.scoutModel || (selectedJob.model ? 'Auto (inherit)' : defaultScoutModel ? `Auto (${defaultScoutModel})` : 'Auto')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Discovery Target</Label>
                  <p className="text-xs font-mono mt-1">{selectedJob.targetDiscoveries != null ? `Stop after ${selectedJob.targetDiscoveries}` : 'None'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Base URL</Label>
                  <p className="text-xs font-mono mt-1 break-all">{selectedJob.baseUrl || 'Platform default'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Auth Token</Label>
                  <p className="text-xs font-mono mt-1">{selectedJob.authTokenLast4 ? `••••${selectedJob.authTokenLast4}` : 'Platform key'}</p>
                </div>
              </div>
              )}

              {selectedJob.errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  {/* NB-018 (run18): long unbroken tokens/URLs in agent errors
                      blew the banner to ~1,786px inside the dialog — force the
                      text to wrap and clip within the modal width. */}
                  <AlertDescription className="max-w-full overflow-hidden break-all whitespace-pre-wrap">
                    {humanizeJobError(selectedJob.errorMessage)}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  {/* NB-032 (run18): annotate turns that exceed the per-run cap. */}
                  Turns:{' '}
                  {selectedJob.maxTurns == null ? (
                    /* Unlimited-turns job: no cap to annotate against. */
                    <>{selectedJob.turnsUsed || 0}/∞</>
                  ) : (selectedJob.turnsUsed || 0) > (selectedJob.maxTurns || 0) ? (
                    /* NB-032: visible continuation annotation. */
                    <span title={`used across continuation runs (cap ${selectedJob.maxTurns}/run)`}>
                      {selectedJob.turnsUsed}/{selectedJob.maxTurns} (continued runs; cap {selectedJob.maxTurns}/run)
                    </span>
                  ) : (
                    <>{selectedJob.turnsUsed || 0}/{selectedJob.maxTurns}</>
                  )}{' '}·
                  In: {(selectedJob.totalInputTokens || 0).toLocaleString()} ·
                  Out: {(selectedJob.totalOutputTokens || 0).toLocaleString()} tok
                </Label>
                <Label className="text-xs text-muted-foreground">
                  Agent Log
                  {selectedJob.agentLog && (
                    <span className="ml-1">
                      ({(selectedJob.agentLog as any[]).length} entries)
                    </span>
                  )}
                </Label>
              </div>

              {/* NB-018: min-w-0 down the flex chain so a single long unbroken
                  log token wraps inside the dialog instead of blowing the row
                  out to >1,600px. */}
              {selectedJob.agentLog && (selectedJob.agentLog as any[]).length > 0 ? (
                <ScrollArea
                  className="h-[420px] max-w-full border rounded p-2 bg-black/40"
                  viewportClassName="[&>div]:!block [&>div]:!w-full [&>div]:!min-w-0"
                >
                  <div className="space-y-1 font-mono text-xs min-w-0 max-w-full w-full">
                    {(selectedJob.agentLog as Array<{ role: string; content: string; timestamp: string }>).map((entry, i) => (
                      <div key={i} className="flex gap-2 items-start min-w-0 max-w-full">
                        <span className="text-muted-foreground shrink-0 w-[68px]">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge
                          variant="outline"
                          className={"shrink-0 h-5 text-[10px] " + (AGENT_ROLE_BADGE_STYLES[entry.role] || '')}
                        >
                          {entry.role}
                        </Badge>
                        <span
                          className={'whitespace-pre-wrap break-words break-all flex-1 min-w-0 ' + (AGENT_ROLE_TEXT_STYLES[entry.role] || 'text-foreground')}
                        >
                          {entry.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[120px] border rounded p-4 flex items-center justify-center text-xs text-muted-foreground">
                  {selectedJob.isActive ? 'Waiting for first log entry…' : 'No log entries recorded.'}
                </div>
              )}

              <Separator />
              <AgentCommsGraph jobType="research" jobId={selectedJob.id} isActive={selectedJob.isActive} />

              <Separator />
              <AgentEventLog jobType="research" jobId={selectedJob.id} isActive={selectedJob.isActive} />

              {jobDiscoveries && jobDiscoveries.length > 0 && (
                <>
                  <Separator />
                  <Label className="text-xs text-muted-foreground">Discoveries from this job</Label>
                  <div className="space-y-2">
                    {jobDiscoveries.map(d => (
                      <div key={d.id} className="flex items-center justify-between border rounded p-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium line-clamp-1 break-words min-w-0" title={sanitizeDisplay(d.title)}>{sanitizeDisplay(d.title)}</span>
                            {getDiscoveryStatusBadge(d.status)}
                            {getVerificationBadges(d)}
                          </div>
                          <a href={d.url} target="_blank" rel="noopener noreferrer"
                            className="block truncate text-xs leading-6 text-primary hover:underline">
                            {sanitizeDisplay(d.url)}
                          </a>
                        </div>
                        {d.status === 'pending_review' && (
                          <div className="flex gap-1 ml-2">
                            <Button size="sm" variant="ghost" className={`${OK_TEXT} h-7`}
                              aria-label={`Approve discovery: ${sanitizeDisplay(d.title)}`}
                              onClick={() => review.approve.mutate(d.id)}>
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className={`${BAD_TEXT} h-7`}
                              aria-label={`Reject discovery: ${sanitizeDisplay(d.title)}`}
                              onClick={() => review.requestReject(d.id)}>
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {jobDiscoveriesIsError && (
                <AdminLoadError
                  subject="this job's discoveries"
                  error={jobDiscoveriesError}
                  onRetry={() => { void refetchJobDiscoveries(); }}
                  retrying={jobDiscoveriesFetching}
                  className="queues-agent__inline-error"
                  testId="error-research-job-discoveries"
                  retryTestId="button-retry-research-job-discoveries"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </details>

      {review.rejectDialog}
    </div>
  );
}
